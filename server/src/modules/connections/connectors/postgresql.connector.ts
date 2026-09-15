import { Client } from 'pg';
import type {
  ConnectionInput,
  ConstraintMetadata,
  IndexMetadata,
  SchemaMetadata,
  SqlExecutionResult,
  TableMetadata,
} from '../../databases/database.types';
import type { Catalog, Connector } from './connector';
import { page, pgIdentifier as quote, safeSqlError, SqlQueryError, sqlValue } from './connector';

interface PgArrayResult {
  command: string;
  rowCount: number | null;
  fields: { name: string; dataTypeID: number }[];
  rows: unknown[][];
}

export class PostgreSQLConnector implements Connector {
  private async use<T>(
    input: ConnectionInput,
    work: (client: Client) => Promise<T>,
    readOnly = true,
  ): Promise<T> {
    const client = new Client({
      host: input.host,
      port: input.port,
      database: input.databaseName,
      user: input.username,
      password: input.password,
      ssl: input.tls ? { rejectUnauthorized: true } : false,
      connectionTimeoutMillis: 5000,
      statement_timeout: readOnly ? 10000 : 30000,
      query_timeout: readOnly ? 12000 : 32000,
      options: readOnly ? '-c default_transaction_read_only=on' : undefined,
      application_name: 'DatabaseEnjoyer',
    });
    client.on('error', () => {
      /* Requests surface sanitized errors; idle sockets are short lived. */
    });
    try {
      await client.connect();
      return await work(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
  test(input: ConnectionInput) {
    return this.use(input, async (c) =>
      String((await c.query('SELECT version() AS version')).rows[0].version),
    );
  }
  introspect(input: ConnectionInput): Promise<Catalog> {
    return this.use(input, async (c) => {
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const version = String((await c.query('SELECT version() AS version')).rows[0].version);
      const namespaces = (
        await c.query(`SELECT nspname AS name FROM pg_namespace
        WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema' ORDER BY nspname`)
      ).rows;
      const objects = (
        await c.query(`SELECT t.oid::text AS oid, n.nspname AS namespace, t.relname AS name,
        CASE t.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized_view' ELSE 'table' END AS kind,
        obj_description(t.oid, 'pg_class') AS comment
        FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE t.relkind IN ('r','p','v','m') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
        ORDER BY n.nspname,t.relname`)
      ).rows;
      const columns = (
        await c.query(`SELECT a.attrelid::text AS oid, a.attname AS name, a.attnum AS ordinal,
        format_type(a.atttypid,a.atttypmod) AS data_type, NOT a.attnotnull AS nullable,
        pg_get_expr(d.adbin,d.adrelid) AS default_value, col_description(a.attrelid,a.attnum) AS comment,
        a.attidentity AS identity, a.attgenerated AS generated,
        EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=a.attrelid AND k.contype='p' AND a.attnum=ANY(k.conkey)) AS primary_key
        FROM pg_attribute a JOIN pg_class t ON t.oid=a.attrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attnum>0 AND NOT a.attisdropped AND t.relkind IN ('r','p','v','m')
          AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' ORDER BY a.attrelid,a.attnum`)
      ).rows;
      const indexes = (
        await c.query(`SELECT i.indrelid::text AS oid, t.relname AS name, i.indisunique AS is_unique,
        i.indisprimary AS is_primary, pg_get_indexdef(i.indexrelid) AS definition,
        ARRAY(SELECT pg_get_indexdef(i.indexrelid,k,true) FROM generate_series(1,i.indnatts) k) AS columns
        FROM pg_index i JOIN pg_class t ON t.oid=i.indexrelid
        JOIN pg_class o ON o.oid=i.indrelid JOIN pg_namespace n ON n.oid=o.relnamespace
        WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' ORDER BY i.indrelid,t.relname`)
      ).rows;
      const constraints = (
        await c.query(`SELECT k.conrelid::text AS oid,k.conname AS name,
        CASE k.contype WHEN 'p' THEN 'primary_key' WHEN 'f' THEN 'foreign_key' WHEN 'u' THEN 'unique' WHEN 'c' THEN 'check' ELSE k.contype::text END AS kind,
        pg_get_constraintdef(k.oid,true) AS definition,
        ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY x(num,pos) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.num ORDER BY x.pos) AS columns,
        rn.nspname AS referenced_namespace, rt.relname AS referenced_object,
        ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY x(num,pos) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.num ORDER BY x.pos) AS referenced_columns
        FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        LEFT JOIN pg_class rt ON rt.oid=k.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rt.relnamespace
        WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' ORDER BY k.conrelid,k.conname`)
      ).rows;
      const schemas: SchemaMetadata[] = namespaces.map((n) => ({
        name: String(n.name),
        tables: objects
          .filter((o) => o.namespace === n.name)
          .map((o) => ({
            name: String(o.name),
            kind: o.kind as TableMetadata['kind'],
            comment: o.comment ?? undefined,
            columns: columns
              .filter((a) => a.oid === o.oid)
              .map((a) => ({
                name: String(a.name),
                dataType: String(a.data_type),
                nullable: Boolean(a.nullable),
                primaryKey: Boolean(a.primary_key),
                defaultValue: a.default_value ?? undefined,
                comment: a.comment ?? undefined,
                extra: { identity: a.identity, generated: a.generated },
              })),
            indexes: indexes
              .filter((i) => i.oid === o.oid)
              .map(
                (i) =>
                  ({
                    name: i.name,
                    unique: i.is_unique,
                    primary: i.is_primary,
                    columns: i.columns,
                    definition: i.definition,
                  }) as IndexMetadata,
              ),
            constraints: constraints
              .filter((k) => k.oid === o.oid)
              .map(
                (k) =>
                  ({
                    name: k.name,
                    kind: k.kind,
                    columns: k.columns,
                    definition: k.definition,
                    referencedNamespace: k.referenced_namespace ?? undefined,
                    referencedObject: k.referenced_object ?? undefined,
                    referencedColumns: k.referenced_columns,
                  }) as ConstraintMetadata,
              ),
          })),
      }));
      await c.query('COMMIT');
      return { schemas, serverVersion: version };
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
      const result = await c.query(
        `SELECT * FROM ${quote(namespace)}.${quote(object.name)}${ordered.length ? ' ORDER BY ' + ordered.map(quote).join(',') : ''} LIMIT $1 OFFSET $2`,
        [limit + 1, offset],
      );
      return page(
        result.fields.map((f) => f.name),
        result.rows,
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
          const response = await c.query({ text: sql, rowMode: 'array' });
          const sets = (Array.isArray(response)
            ? response
            : [response]) as unknown as PgArrayResult[];
          return {
            durationMs: Math.round((performance.now() - started) * 10) / 10,
            results: sets.map((result) => ({
              command: result.command || 'QUERY',
              rowCount: result.rowCount ?? result.rows.length,
              columns: result.fields.map((field) => ({
                name: field.name,
                dataType: String(field.dataTypeID),
              })),
              rows: result.rows.slice(0, maxRows).map((row) => row.map((value) => sqlValue(value))),
              truncated: result.rows.length > maxRows,
            })),
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
