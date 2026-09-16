import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ConnectionEngine, ConnectionInput } from '../databases/database.types';
import { SqlQueryError, type Connector } from './connectors/connector';
import { PostgreSQLConnector } from './connectors/postgresql.connector';
import { MySQLConnector } from './connectors/mysql.connector';
import { MongoDBConnector } from './connectors/mongodb.connector';
import { ConnectionsRepository } from './connections.repository';
import type { UpdateConnectionDto } from './connection.dto';
import { SecretsService } from './secrets.service';

function connectionError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['28P01', '28000', '1045', 'ER_ACCESS_DENIED_ERROR', '18'].includes(code))
    return 'Ошибка авторизации. Проверьте пользователя, пароль и базу аутентификации.';
  if (['3D000', '1049', 'ER_BAD_DB_ERROR'].includes(code))
    return 'База данных не найдена. Проверьте её название.';
  if (['42501', '13', 'ER_TABLEACCESS_DENIED_ERROR', '1142'].includes(code))
    return 'Недостаточно прав для чтения структуры или данных.';
  return 'Не удалось прочитать базу. Проверьте адрес, порт, TLS, права доступа и доступность БД для сервера. Попробуйте обновить структуру.';
}
@Injectable()
export class ConnectionsService {
  private readonly connectors: Record<ConnectionEngine, Connector> = {
    postgresql: new PostgreSQLConnector(),
    mysql: new MySQLConnector(),
    mongodb: new MongoDBConnector(),
  };
  constructor(
    private readonly repository: ConnectionsRepository,
    private readonly secrets: SecretsService,
  ) {}
  list(userId: string) {
    return this.repository.list(userId);
  }
  find(userId: string, id: string) {
    return this.repository.find(userId, id);
  }
  remove(userId: string, id: string) {
    return this.repository.remove(userId, id);
  }
  history(userId: string, id: string) {
    return this.repository.history(userId, id);
  }
  async test(input: ConnectionInput) {
    const started = Date.now();
    try {
      const serverVersion = await this.connectors[input.engine].test(input);
      return { status: 'ok', serverVersion, latencyMs: Date.now() - started };
    } catch (error) {
      throw new BadGatewayException(connectionError(error));
    }
  }
  async create(userId: string, input: ConnectionInput) {
    await this.test(input);
    const id = randomUUID();
    await this.repository.create(userId, id, input, this.secrets.encrypt(id, input.password));
    try {
      await this.refresh(userId, id);
    } catch (error) {
      if (!(error instanceof BadGatewayException))
        throw error; /* Failed sync is visible in the saved profile; the user can retry. */
    }
    return this.find(userId, id);
  }
  async update(userId: string, id: string, patch: UpdateConnectionDto) {
    const current = await this.input(userId, id);
    const passwordChanged = patch.password !== undefined && patch.password.length > 0;
    const input: ConnectionInput = {
      ...current,
      ...patch,
      password: passwordChanged ? patch.password! : current.password,
    };
    await this.test(input);
    await this.repository.update(
      id,
      input,
      passwordChanged ? this.secrets.encrypt(id, input.password) : undefined,
    );
    try {
      await this.refresh(userId, id);
    } catch (error) {
      if (!(error instanceof BadGatewayException)) throw error;
    }
    return this.find(userId, id);
  }
  private async input(userId: string, id: string): Promise<ConnectionInput> {
    const row = await this.repository.profile(userId, id);
    const secret = await this.repository.credentials(userId, id);
    return {
      name: row.name,
      engine: row.engine,
      host: row.host,
      port: row.port,
      databaseName: row.database_name,
      username: row.username,
      password: this.secrets.decrypt(id, secret),
      authDatabase: row.auth_database ?? undefined,
      tls: row.tls,
      description: row.description,
    };
  }
  async refresh(userId: string, id: string) {
    const input = await this.input(userId, id);
    let sync: string;
    try {
      sync = await this.repository.beginSync(id);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
        throw new ConflictException('Структура этого подключения уже обновляется');
      throw error;
    }
    try {
      const catalog = await this.connectors[input.engine].introspect(input);
      if (
        catalog.schemas.length > 100 ||
        catalog.schemas.reduce((n, s) => n + s.tables.length, 0) > 1000 ||
        catalog.schemas.flatMap((s) => s.tables).reduce((n, t) => n + t.columns.length, 0) > 50000
      )
        throw new Error('Catalog size limit exceeded');
      await this.repository.saveCatalog(id, sync, catalog);
    } catch (error) {
      const message = connectionError(error);
      await this.repository.failSync(id, sync, message);
      throw new BadGatewayException(message);
    }
    return this.find(userId, id);
  }
  async rows(userId: string, id: string, objectId: string, limit: number, offset: number) {
    const [catalog, input] = await Promise.all([this.find(userId, id), this.input(userId, id)]);
    const namespace = catalog.schemas.find((n) => n.tables.some((t) => t.id === objectId));
    const object = namespace?.tables.find((t) => t.id === objectId);
    if (!namespace || !object)
      throw new NotFoundException('Объект не найден в текущей структуре. Обновите страницу.');
    try {
      return await this.connectors[input.engine].rows(input, namespace.name, object, limit, offset);
    } catch (error) {
      throw new BadGatewayException(connectionError(error));
    }
  }

  async executeSql(userId: string, id: string, sql: string, maxRows: number) {
    const input = await this.input(userId, id);
    const execute = this.connectors[input.engine].executeSql;
    if (!execute)
      throw new UnprocessableEntityException({
        code: 'SQL_NOT_SUPPORTED',
        message:
          'SQL-редактор поддерживает PostgreSQL и MySQL. Для MongoDB нужен отдельный playground.',
      });
    try {
      return await execute.call(this.connectors[input.engine], input, sql, maxRows);
    } catch (error) {
      if (error instanceof SqlQueryError)
        throw new UnprocessableEntityException({
          code: error.code ?? 'QUERY_ERROR',
          message: error.message,
        });
      throw new BadGatewayException(connectionError(error));
    }
  }
}
