import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Code2, Database, GitFork, Layers, Table2 } from 'lucide-react';
import { useGetDatabaseQuery, useSyncConnectionMutation } from '@/entities/database';
import { DeleteDatabaseButton } from '@/features/delete-database';
import { EditConnectionButton } from '@/features/connect-database';
import { DatabaseExplorer } from '@/widgets/database-explorer';
import { engineLabels, errorMessage, formatDate } from '@/shared/lib';
import { Button, ErrorState, LoadingState } from '@/shared/ui';

export function DatabasePage() {
  const { databaseId } = useParams({ from: '/databases/$databaseId' });
  const { data: database, isLoading, error, refetch } = useGetDatabaseQuery(databaseId);
  const [sync, { isLoading: syncing }] = useSyncConnectionMutation();
  const [syncError, setSyncError] = useState('');
  async function refresh() {
    setSyncError('');
    try {
      await sync(databaseId).unwrap();
    } catch (error) {
      setSyncError(errorMessage(error));
    }
  }
  return (
    <div className="mx-auto max-w-[1440px]">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted hover:text-accent"
      >
        <ArrowLeft size={14} />
        Все базы данных
      </Link>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState retry={() => void refetch()}>{errorMessage(error)}</ErrorState>
      ) : (
        database && (
          <>
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <span className="rounded-xl border border-line bg-surface p-3 text-accent">
                  <Database size={25} />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow mb-2">
                    {engineLabels[database.engine]} ·{' '}
                    {database.source === 'connection'
                      ? `${database.host}:${database.port} / ${database.databaseName}`
                      : 'JSON-снимок'}
                  </p>
                  <h1 className="break-all font-mono text-2xl font-semibold">{database.name}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                    {database.description || 'Импортированный снимок структуры базы данных'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  to="/er"
                  search={{ connection: database.id }}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[10px] border border-ink/14 bg-surface px-3 py-2 text-sm leading-4 font-semibold text-secondary shadow-[0_1px_2px_rgba(9,9,11,0.05)] transition hover:bg-elevated"
                >
                  <GitFork size={15} />
                  ER
                </Link>
                {database.source === 'connection' &&
                  (database.engine === 'postgresql' || database.engine === 'mysql') && (
                    <Link
                      to="/sql"
                      search={{ connection: database.id }}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[10px] border border-ink/14 bg-surface px-3 py-2 text-sm leading-4 font-semibold text-secondary shadow-[0_1px_2px_rgba(9,9,11,0.05)] transition hover:bg-elevated"
                    >
                      <Code2 size={15} />
                      SQL
                    </Link>
                  )}
                {database.source === 'connection' && <EditConnectionButton connection={database} />}
                {database.source === 'connection' && (
                  <Button variant="secondary" disabled={syncing} onClick={() => void refresh()}>
                    <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">
                      {syncing ? 'Обновляем…' : 'Обновить структуру'}
                    </span>
                  </Button>
                )}
                <DeleteDatabaseButton
                  id={database.id}
                  name={database.name}
                  connection={database.source === 'connection'}
                />
              </div>
            </div>
            {database.source === 'connection' && (
              <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Хост', database.host],
                  ['Порт', database.port],
                  ['Пользователь', database.username],
                  ['TLS', database.tls ? 'Включён' : 'Выключен'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-surface px-4 py-3">
                    <dt className="text-[10px] font-medium tracking-wide text-muted uppercase">
                      {label}
                    </dt>
                    <dd
                      className="mt-1 truncate font-mono text-xs text-secondary"
                      title={String(value ?? '—')}
                    >
                      {value ?? '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Layers size={14} />
                {database.schemaCount} схем
              </span>
              <span className="flex items-center gap-1.5">
                <Table2 size={14} />
                {database.tableCount} таблиц
              </span>
              <span>{database.columnCount} колонок</span>
              <span className="sm:ml-auto">
                {database.source === 'connection' ? 'Структура обновлена' : 'Импортирован'}{' '}
                {formatDate(database.importedAt)}
              </span>
            </div>
            {(syncError || database.lastError) && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
              >
                {syncError || database.lastError}{' '}
                {database.schemas.length > 0 && 'Показана последняя успешно сохранённая структура.'}
              </p>
            )}
            <DatabaseExplorer key={database.id} database={database} />
          </>
        )
      )}
    </div>
  );
}
