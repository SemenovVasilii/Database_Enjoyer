import type { ApiError, DatabaseEngine } from '@/shared/api/contracts';

export const engineLabels: Record<DatabaseEngine, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  sqlite: 'SQLite',
  mssql: 'SQL Server',
  other: 'Другая БД',
};

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data as Partial<ApiError> | undefined;
    if (data?.message) return Array.isArray(data.message) ? data.message.join('; ') : data.message;
  }
  return 'Не удалось связаться с API. Проверьте, что сервер и PostgreSQL запущены.';
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}
