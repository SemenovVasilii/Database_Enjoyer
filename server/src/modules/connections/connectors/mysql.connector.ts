import { createConnection } from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import type {
  ConnectionInput,
  ConstraintMetadata,
  IndexMetadata,
  SqlExecutionResult,
  TableMetadata,
} from '../../databases/database.types';
import type { Catalog, Connector } from './connector';
import {
  page,
  mysqlIdentifier as quote,
  safeSqlError,
  sqlCommand,
  SqlQueryError,
  sqlValue,
} from './connector';

export class MySQLConnector implements Connector {
  private async use<T>(
    input: ConnectionInput,
    work: (client: Connection) => Promise<T>,
    readOnly = true,
  ): Promise<T> {
    const c = await createConnection({
      host: input.host,
      port: input.port,
      database: input.databaseName,
      user: input.username,
      password: input.password,
      ssl: input.tls ? { rejectUnauthorized: true } : undefined,
      connectTimeout: 5000,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      multipleStatements: false,
    });
    try {
      await c.query(`SET SESSION MAX_EXECUTION_TIME=${readOnly ? 10000 : 30000}`);
      if (readOnly) await c.query('SET SESSION TRANSACTION READ ONLY');
      return await work(c);
    } finally {
      await c.end().catch(() => c.destroy());
    }
  }
  private async query(c: Connection, sql: string, values: unknown[] = []) {
    const [rows] = await c.query<RowDataPacket[]>({ sql, timeout: 12000 }, values);
    return rows;
  }
  test(input: ConnectionInput) {
    return this.use(input, async (c) =>
      String((await this.query(c, 'SELECT VERSION() AS version'))[0]!.version),
    );
  }
  introspect(input: ConnectionInput): Promise<Catalog> {
    return this.use(input, async (c) => {
      const version = String((await this.query(c, 'SELECT VERSION() AS version'))[0]!.version);
      const objects = await this.query(
        c,
        `SELECT TABLE_NAME AS name,TABLE_TYPE AS kind,TABLE_COMMENT AS comment FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME`,
        [input.databaseName],
      );
      const columns = await this.query(
        c,
        `SELECT TABLE_NAME AS object_name,COLUMN_NAME AS name,COLUMN_TYPE AS data_type,IS_NULLABLE AS nullable,COLUMN_KEY AS key_kind,COLUMN_DEFAULT AS default_value,COLUMN_COMMENT AS comment,EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,ORDINAL_POSITION`,
        [input.databaseName],
      );
      const indexes = await this.query(
        c,
        `SELECT TABLE_NAME AS object_name,INDEX_NAME AS name,NON_UNIQUE AS non_unique,COLUMN_NAME AS column_name,EXPRESSION AS expression,INDEX_TYPE AS index_type,COLLATION AS direction FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX`,
        [input.databaseName],
      );
      const constraints = await this.query(
        c,
        `SELECT t.TABLE_NAME AS object_name,t.CONSTRAINT_NAME AS name,t.CONSTRAINT_TYPE AS kind,k.COLUMN_NAME AS column_name,k.REFERENCED_TABLE_SCHEMA AS ref_namespace,k.REFERENCED_TABLE_NAME AS ref_object,k.REFERENCED_COLUMN_NAME AS ref_column,r.UPDATE_RULE AS update_rule,r.DELETE_RULE AS delete_rule,ch.CHECK_CLAUSE AS check_clause
        FROM information_schema.TABLE_CONSTRAINTS t LEFT JOIN information_schema.KEY_COLUMN_USAGE k ON k.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND k.TABLE_NAME=t.TABLE_NAME AND k.CONSTRAINT_NAME=t.CONSTRAINT_NAME
        LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=t.CONSTRAINT_NAME AND r.TABLE_NAME=t.TABLE_NAME
        LEFT JOIN information_schema.CHECK_CONSTRAINTS ch ON ch.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND ch.CONSTRAINT_NAME=t.CONSTRAINT_NAME
        WHERE t.TABLE_SCHEMA=? ORDER BY t.TABLE_NAME,t.CONSTRAINT_NAME,k.ORDINAL_POSITION`,
        [input.databaseName],
      );
      const tables: TableMetadata[] = objects.map((o) => {
        const objectIndexes = indexes.filter((i) => i.object_name === o.name);
        const objectConstraints = constraints.filter((k) => k.object_name === o.name);
        return {
          name: o.name,
          kind: o.kind === 'VIEW' ? 'view' : 'table',
          comment: o.comment || undefined,
          columns: columns
            .filter((a) => a.object_name === o.name)
            .map((a) => ({
              name: a.name,
              dataType: a.data_type,
              nullable: a.nullable === 'YES',
              primaryKey: a.key_kind === 'PRI',
              defaultValue: a.default_value === null ? undefined : String(a.default_value),
              comment: a.comment || undefined,
              extra: { attributes: a.extra },
            })),
          indexes: [...new Set(objectIndexes.map((i) => i.name))].map((name) => {
            const rows = objectIndexes.filter((i) => i.name === name);
            return {
              name,
              unique: !rows[0]!.non_unique,
              primary: name === 'PRIMARY',
              columns: rows.map((i) => i.column_name ?? i.expression),
              extra: { type: rows[0]!.index_type, directions: rows.map((i) => i.direction) },
            } as IndexMetadata;
          }),
          constraints: [...new Set(objectConstraints.map((k) => k.name))].map((name) => {
            const rows = objectConstraints.filter((k) => k.name === name);
            return {
              name,
              kind: String(rows[0]!.kind).toLowerCase().replaceAll(' ', '_'),
              columns: rows.map((k) => k.column_name).filter(Boolean),
              definition: rows[0]!.check_clause ?? undefined,
              referencedNamespace: rows[0]!.ref_namespace ?? undefined,
              referencedObject: rows[0]!.ref_object ?? undefined,
              referencedColumns: rows.map((k) => k.ref_column).filter(Boolean),
              extra: {
                onUpdate: rows[0]!.update_rule ?? null,
                onDelete: rows[0]!.delete_rule ?? null,
              },
            } as ConstraintMetadata;
          }),
        };
      });
      return { serverVersion: version, schemas: [{ name: input.databaseName, tables }] };
    });
  }
  rows(
    input: ConnectionInput,
    namespace: string,
    object: TableMetadata,
    limit: number,
    offset: number,
  ) {
    return this.use(input, async (c) => {
      const ordered = object.columns.filter((a) => a.primaryKey).map((a) => a.name);
      const [rows, fields] = await c.query<RowDataPacket[]>(
        {
          sql: `SELECT /*+ MAX_EXECUTION_TIME(10000) */ * FROM ${quote(namespace)}.${quote(object.name)}${ordered.length ? ' ORDER BY ' + ordered.map(quote).join(',') : ''} LIMIT ? OFFSET ?`,
          timeout: 12000,
        },
        [limit + 1, offset],
      );
      return page(
        fields.map((f) => f.name),
        rows,
        limit,
        offset,
        ordered,
      );
    });
  }

  executeSql(input: ConnectionInput, sql: string, maxRows: number): Promise<SqlExecutionResult> {
    return this.use(
      input,
      async (c) => {
        const started = performance.now();
        try {
          const response = (await c.query({
            sql,
            timeout: 32000,
            rowsAsArray: true,
          })) as unknown as [unknown, { name: string; type: number }[] | undefined];
          const [rawRows, fields = []] = response;
          const rows = Array.isArray(rawRows) ? (rawRows as unknown[][]) : [];
          const affectedRows =
            rawRows && typeof rawRows === 'object' && 'affectedRows' in rawRows
              ? Number(rawRows.affectedRows)
              : rows.length;
          return {
            durationMs: Math.round((performance.now() - started) * 10) / 10,
            results: [
              {
                command: sqlCommand(sql),
                rowCount: affectedRows,
                columns: fields.map((field) => ({
                  name: field.name,
                  dataType: String(field.type),
                })),
                rows: rows.slice(0, maxRows).map((row) => row.map((value) => sqlValue(value))),
                truncated: rows.length > maxRows,
              },
            ],
          };
        } catch (error) {
          const { message, code } = safeSqlError(error);
          throw new SqlQueryError(message, code);
        }
      },
      false,
    );
  }
}
