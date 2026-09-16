export type DatabaseEngine = 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'mssql' | 'other';

export interface ColumnMetadata {
  name: string;
  extra?: Record<string, unknown>;
  dataType: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface TableMetadata {
  id?: string;
  name: string;
  kind?: 'table' | 'view' | 'materialized_view' | 'collection';
  extra?: Record<string, unknown>;
  indexes?: IndexMetadata[];
  constraints?: ConstraintMetadata[];
  comment?: string;
  columns: ColumnMetadata[];
}

export interface SchemaMetadata {
  name: string;
  tables: TableMetadata[];
}

export interface ImportDatabaseInput {
  name: string;
  engine: DatabaseEngine;
  description?: string;
  schemas: SchemaMetadata[];
}

export interface DatabaseSummary {
  source?: 'connection' | 'snapshot';
  status?: 'ready' | 'error' | 'pending';
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  authDatabase?: string;
  tls?: boolean;
  lastError?: string | null;
  id: string;
  name: string;
  engine: DatabaseEngine;
  description: string;
  importedAt: string;
  schemaCount: number;
  tableCount: number;
  columnCount: number;
}

export interface DatabaseDetails extends DatabaseSummary {
  schemas: SchemaMetadata[];
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface IndexMetadata {
  name: string;
  unique: boolean;
  primary: boolean;
  columns: string[];
  definition?: string;
  extra?: Record<string, unknown>;
}
export interface ConstraintMetadata {
  name: string;
  kind: string;
  columns: string[];
  definition?: string;
  referencedNamespace?: string;
  referencedObject?: string;
  referencedColumns?: string[];
  extra?: Record<string, unknown>;
}
export type ConnectionEngine = 'postgresql' | 'mysql' | 'mongodb';
export interface ConnectionInput {
  name: string;
  engine: ConnectionEngine;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  authDatabase?: string;
  tls?: boolean;
  description?: string;
}
export type UpdateConnectionInput = Omit<ConnectionInput, 'password'> & { password?: string };
export interface DataPage {
  columns: string[];
  rows: Record<string, unknown>[];
  offset: number;
  limit: number;
  hasMore: boolean;
  orderedBy: string[];
}

export interface SqlColumn {
  name: string;
  dataType: string;
}

export interface SqlResultSet {
  command: string;
  rowCount: number;
  columns: SqlColumn[];
  rows: unknown[][];
  truncated: boolean;
}

export interface SqlExecutionResult {
  results: SqlResultSet[];
  durationMs: number;
}
