import { Injectable, NotFoundException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { DatabaseService } from '../../database/database.service';
import type {
  ConnectionEngine,
  ConnectionInput,
  DatabaseDetails,
  DatabaseSummary,
  SchemaMetadata,
  TableMetadata,
} from '../databases/database.types';
import type { Catalog } from './connectors/connector';
import type { EncryptedSecret } from './secrets.service';

export interface ProfileRow extends QueryResultRow {
  id: string;
  name: string;
  engine: ConnectionEngine;
  host: string;
  port: number;
  database_name: string;
  username: string;
  auth_database: string | null;
  tls: boolean;
  description: string;
  active_sync_id: string | null;
  last_error: string | null;
  created_at: Date;
  completed_at: Date | null;
  schema_count: number | null;
  object_count: number | null;
  column_count: number | null;
}
const profileSql = `SELECT c.*,s.completed_at,s.schema_count,s.object_count,s.column_count
  FROM connections c LEFT JOIN metadata_syncs s ON s.id=c.active_sync_id`;
@Injectable()
export class ConnectionsRepository {
  constructor(private readonly db: DatabaseService) {}
  async list(): Promise<DatabaseSummary[]> {
    return (await this.db.query<ProfileRow>(profileSql + ' ORDER BY c.created_at DESC')).rows.map(
      (r) => this.summary(r),
    );
  }
  async profile(id: string): Promise<ProfileRow> {
    const row = (await this.db.query<ProfileRow>(profileSql + ' WHERE c.id=$1', [id])).rows[0];
    if (!row) throw new NotFoundException('Подключение не найдено');
    return row;
  }
  async credentials(id: string) {
    const row = (
      await this.db.query<EncryptedSecret & QueryResultRow>(
        'SELECT ciphertext,nonce,auth_tag FROM connection_secrets WHERE connection_id=$1',
        [id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException('Реквизиты подключения не найдены');
    return row;
  }
  async create(id: string, input: ConnectionInput, secret: EncryptedSecret) {
    await this.db.transaction(async (c) => {
      await c.query(
        `INSERT INTO connections(id,name,engine,host,port,database_name,username,auth_database,tls,description)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          input.name,
          input.engine,
          input.host,
          input.port,
          input.databaseName,
          input.username,
          input.authDatabase || null,
          input.tls ?? false,
          input.description ?? '',
        ],
      );
      await c.query(
        'INSERT INTO connection_secrets(connection_id,ciphertext,nonce,auth_tag) VALUES($1,$2,$3,$4)',
        [id, secret.ciphertext, secret.nonce, secret.auth_tag],
      );
    });
  }
  async beginSync(id: string): Promise<string> {
    return this.db.transaction(async (c) => {
      // Recover only expired operations, without disturbing a sync running in another request.
      await c.query(
        `UPDATE metadata_syncs SET status='failed',completed_at=now(),error_message='Синхронизация прервана или превысила время ожидания' WHERE connection_id=$1 AND status='running' AND started_at<now()-interval '5 minutes'`,
        [id],
      );
      return String(
        (
          await c.query(
            "INSERT INTO metadata_syncs(connection_id,status) VALUES($1,'running') RETURNING id",
            [id],
          )
        ).rows[0].id,
      );
    });
  }
  async failSync(id: string, sync: string, message: string) {
    await this.db.transaction(async (c) => {
      await c.query(
        "UPDATE metadata_syncs SET status='failed',completed_at=now(),error_message=$2 WHERE id=$1 AND status='running'",
        [sync, message],
      );
      await c.query(
        'UPDATE connections SET last_error=$2,last_checked_at=now(),updated_at=now() WHERE id=$1',
        [id, message],
      );
    });
  }
  async saveCatalog(id: string, sync: string, catalog: Catalog) {
    let objectCount = 0,
      columnCount = 0;
    await this.db.transaction(async (c) => {
      // Lock the profile and sync before publication; deletion and concurrent expiry cannot publish partial data.
      const locked = await c.query(
        "SELECT s.id FROM metadata_syncs s JOIN connections c ON c.id=s.connection_id WHERE s.id=$1 AND s.status='running' FOR UPDATE OF c,s",
        [sync],
      );
      if (!locked.rowCount) throw new NotFoundException('Синхронизация уже завершена');
      for (const schema of catalog.schemas) {
        const ns = (
          await c.query(
            'INSERT INTO metadata_namespaces(sync_id,name) VALUES($1,$2) RETURNING id',
            [sync, schema.name],
          )
        ).rows[0].id;
        for (const table of schema.tables) {
          objectCount++;
          columnCount += table.columns.length;
          const obj = (
            await c.query(
              'INSERT INTO metadata_objects(namespace_id,name,kind,comment,extra) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id',
              [
                ns,
                table.name,
                table.kind ?? 'table',
                table.comment ?? null,
                JSON.stringify(table.extra ?? {}),
              ],
            )
          ).rows[0].id;
          for (const [ordinal, column] of table.columns.entries())
            await c.query(
              `INSERT INTO metadata_columns(object_id,name,ordinal,data_type,nullable,primary_key,default_value,comment,extra) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
              [
                obj,
                column.name,
                ordinal + 1,
                column.dataType,
                column.nullable,
                column.primaryKey ?? false,
                column.defaultValue ?? null,
                column.comment ?? null,
                JSON.stringify(column.extra ?? {}),
              ],
            );
          for (const index of table.indexes ?? [])
            await c.query(
              `INSERT INTO metadata_indexes(object_id,name,is_unique,is_primary,columns,definition,extra) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)`,
              [
                obj,
                index.name,
                index.unique,
                index.primary,
                JSON.stringify(index.columns),
                index.definition ?? null,
                JSON.stringify(index.extra ?? {}),
              ],
            );
          for (const constraint of table.constraints ?? [])
            await c.query(
              `INSERT INTO metadata_constraints(object_id,name,kind,columns,definition,referenced_namespace,referenced_object,referenced_columns,extra) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9::jsonb)`,
              [
                obj,
                constraint.name,
                constraint.kind,
                JSON.stringify(constraint.columns),
                constraint.definition ?? null,
                constraint.referencedNamespace ?? null,
                constraint.referencedObject ?? null,
                JSON.stringify(constraint.referencedColumns ?? []),
                JSON.stringify(constraint.extra ?? {}),
              ],
            );
        }
      }
      await c.query(
        `UPDATE metadata_syncs SET status='success',completed_at=now(),server_version=$2,schema_count=$3,object_count=$4,column_count=$5 WHERE id=$1`,
        [sync, catalog.serverVersion, catalog.schemas.length, objectCount, columnCount],
      );
      await c.query(
        'UPDATE connections SET active_sync_id=$2,last_error=NULL,last_checked_at=now(),updated_at=now() WHERE id=$1',
        [id, sync],
      );
    });
  }
  async find(id: string): Promise<DatabaseDetails> {
    const profile = await this.profile(id);
    if (!profile.active_sync_id) return { ...this.summary(profile), schemas: [] };
    const sync = profile.active_sync_id;
    const [namespaces, objects, columns, indexes, constraints] = await Promise.all([
      this.db.query('SELECT * FROM metadata_namespaces WHERE sync_id=$1 ORDER BY name', [sync]),
      this.db.query(
        'SELECT o.* FROM metadata_objects o JOIN metadata_namespaces n ON n.id=o.namespace_id WHERE n.sync_id=$1 ORDER BY o.name',
        [sync],
      ),
      this.db.query(
        'SELECT a.* FROM metadata_columns a JOIN metadata_objects o ON o.id=a.object_id JOIN metadata_namespaces n ON n.id=o.namespace_id WHERE n.sync_id=$1 ORDER BY a.ordinal',
        [sync],
      ),
      this.db.query(
        'SELECT i.* FROM metadata_indexes i JOIN metadata_objects o ON o.id=i.object_id JOIN metadata_namespaces n ON n.id=o.namespace_id WHERE n.sync_id=$1 ORDER BY i.name',
        [sync],
      ),
      this.db.query(
        'SELECT k.* FROM metadata_constraints k JOIN metadata_objects o ON o.id=k.object_id JOIN metadata_namespaces n ON n.id=o.namespace_id WHERE n.sync_id=$1 ORDER BY k.name',
        [sync],
      ),
    ]);
    const schemas: SchemaMetadata[] = namespaces.rows.map((n) => ({
      name: n.name as string,
      tables: objects.rows
        .filter((o) => o.namespace_id === n.id)
        .map((o) => ({
          id: o.id as string,
          name: o.name as string,
          kind: o.kind as TableMetadata['kind'],
          comment: o.comment ?? undefined,
          extra: o.extra,
          columns: columns.rows
            .filter((a) => a.object_id === o.id)
            .map((a) => ({
              name: a.name as string,
              dataType: a.data_type as string,
              nullable: a.nullable as boolean,
              primaryKey: a.primary_key as boolean,
              defaultValue: a.default_value ?? undefined,
              comment: a.comment ?? undefined,
              extra: a.extra,
            })),
          indexes: indexes.rows
            .filter((i) => i.object_id === o.id)
            .map((i) => ({
              name: i.name as string,
              unique: i.is_unique as boolean,
              primary: i.is_primary as boolean,
              columns: i.columns,
              definition: i.definition ?? undefined,
              extra: i.extra,
            })),
          constraints: constraints.rows
            .filter((k) => k.object_id === o.id)
            .map((k) => ({
              name: k.name as string,
              kind: k.kind as string,
              columns: k.columns,
              definition: k.definition ?? undefined,
              referencedNamespace: k.referenced_namespace ?? undefined,
              referencedObject: k.referenced_object ?? undefined,
              referencedColumns: k.referenced_columns,
              extra: k.extra,
            })),
        })),
    }));
    return { ...this.summary(profile), schemas };
  }
  async history(id: string) {
    await this.profile(id);
    return (
      await this.db.query(
        `SELECT id,status,started_at,completed_at,server_version,error_message,schema_count,object_count,column_count FROM metadata_syncs WHERE connection_id=$1 ORDER BY started_at DESC LIMIT 20`,
        [id],
      )
    ).rows;
  }
  async remove(id: string) {
    const result = await this.db.query('DELETE FROM connections WHERE id=$1', [id]);
    if (!result.rowCount) throw new NotFoundException('Подключение не найдено');
  }
  private summary(row: ProfileRow): DatabaseSummary {
    return {
      id: row.id,
      name: row.name,
      engine: row.engine,
      description: row.description,
      source: 'connection',
      status: row.last_error ? 'error' : row.active_sync_id ? 'ready' : 'pending',
      host: row.host,
      port: row.port,
      databaseName: row.database_name,
      lastError: row.last_error,
      importedAt: (row.completed_at ?? row.created_at).toISOString(),
      schemaCount: row.schema_count ?? 0,
      tableCount: row.object_count ?? 0,
      columnCount: row.column_count ?? 0,
    };
  }
}
