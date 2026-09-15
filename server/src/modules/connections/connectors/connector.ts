import type {
  ConnectionInput,
  DataPage,
  SchemaMetadata,
  SqlExecutionResult,
  TableMetadata,
} from '../../databases/database.types';

export interface Catalog {
  schemas: SchemaMetadata[];
  serverVersion: string;
}
export interface Connector {
  test(input: ConnectionInput): Promise<string>;
  introspect(input: ConnectionInput): Promise<Catalog>;
  rows(
    input: ConnectionInput,
    namespace: string,
    object: TableMetadata,
    limit: number,
    offset: number,
  ): Promise<DataPage>;
  executeSql?(input: ConnectionInput, sql: string, maxRows: number): Promise<SqlExecutionResult>;
}

export class SqlQueryError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'SqlQueryError';
  }
}

export function safeSqlError(error: unknown): { message: string; code?: string } {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code).slice(0, 50)
      : undefined;
  const messages: Record<string, string> = {
    '42601': 'Синтаксическая ошибка в SQL-запросе.',
    '42501': 'Недостаточно прав для выполнения этой SQL-команды.',
    '42P01': 'Таблица или представление не найдено.',
    '42703': 'Колонка не найдена.',
    '23505': 'Операция нарушает ограничение уникальности.',
    '23503': 'Операция нарушает ограничение внешнего ключа.',
    '57014': 'Запрос отменён или превысил допустимое время.',
    ER_PARSE_ERROR: 'Синтаксическая ошибка в SQL-запросе.',
    ER_TABLEACCESS_DENIED_ERROR: 'Недостаточно прав для выполнения этой SQL-команды.',
    ER_DBACCESS_DENIED_ERROR: 'Недостаточно прав для доступа к базе данных.',
    ER_ACCESS_DENIED_ERROR: 'Недостаточно прав для выполнения этой SQL-команды.',
    ER_NO_SUCH_TABLE: 'Таблица или представление не найдено.',
    ER_BAD_FIELD_ERROR: 'Колонка не найдена.',
    ER_DUP_ENTRY: 'Операция нарушает ограничение уникальности.',
    ER_NO_REFERENCED_ROW_2: 'Операция нарушает ограничение внешнего ключа.',
    ER_ROW_IS_REFERENCED_2: 'Операция нарушает ограничение внешнего ключа.',
    ER_LOCK_WAIT_TIMEOUT: 'Истекло время ожидания блокировки.',
    PROTOCOL_SEQUENCE_TIMEOUT: 'Запрос превысил допустимое время.',
  };
  if (code && messages[code]) return { code, message: messages[code] };
  if (code?.startsWith('22'))
    return { code, message: 'Некорректное значение или преобразование типа в SQL-запросе.' };
  if (code?.startsWith('23'))
    return { code, message: 'Операция нарушает ограничение целостности данных.' };
  if (code?.startsWith('42'))
    return { code, message: 'SQL-запрос ссылается на неизвестный объект или содержит ошибку.' };
  return { code, message: 'База данных отклонила запрос. Проверьте SQL, права и ограничения.' };
}

export function sqlCommand(sql: string): string {
  const statement = sql.replace(/^(?:\s|--[^\n]*(?:\n|$)|#[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '');
  return statement.match(/^[a-z]+/i)?.[0]?.toUpperCase() ?? 'QUERY';
}

const MAX_STRING_LENGTH = 10_000;
const MAX_BINARY_LENGTH = 4_096;
const MAX_CONTAINER_ITEMS = 100;

/** Converts native driver values into bounded JSON-safe values for the REST response. */
export function sqlValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string')
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value))
    return {
      type: 'binary',
      encoding: 'base64',
      value: value.subarray(0, MAX_BINARY_LENGTH).toString('base64'),
      truncated: value.length > MAX_BINARY_LENGTH,
      byteLength: value.length,
    };
  if (depth >= 5) return '[depth limit]';
  if (Array.isArray(value))
    return value.slice(0, MAX_CONTAINER_ITEMS).map((item) => sqlValue(item, depth + 1));
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_CONTAINER_ITEMS)
        .map(([key, item]) => [key, sqlValue(item, depth + 1)]),
    );
  return String(value);
}
export function page(
  columns: string[],
  rows: Record<string, unknown>[],
  limit: number,
  offset: number,
  orderedBy: string[],
): DataPage {
  return {
    columns,
    rows: rows.slice(0, limit),
    hasMore: rows.length > limit,
    limit,
    offset,
    orderedBy,
  };
}
// Only identifiers from the stored catalog are accepted by the service; quoting is still mandatory.
export const pgIdentifier = (value: string) => '"' + value.replaceAll('"', '""') + '"';
export const mysqlIdentifier = (value: string) => '`' + value.replaceAll('`', '``') + '`';
