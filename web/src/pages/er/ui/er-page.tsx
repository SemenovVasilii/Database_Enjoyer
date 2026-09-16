import { useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Database, GitFork, Network } from 'lucide-react';
import { useGetDatabaseQuery, useGetDatabasesQuery } from '@/entities/database';
import { ErDiagram } from '@/features/er-diagram';
import { engineLabels, errorMessage } from '@/shared/lib';
import { ErrorState, LoadingState } from '@/shared/ui';

export function ErPage() {
  const search = useSearch({ from: '/er' });
  const navigate = useNavigate();
  const { data: databases, isLoading, error, refetch } = useGetDatabasesQuery();
  const available = useMemo(
    () => (databases ?? []).filter((database) => database.schemaCount > 0),
    [databases],
  );
  const selected = available.find((database) => database.id === search.connection) ?? available[0];
  const details = useGetDatabaseQuery(selected?.id ?? '', { skip: !selected });

  function chooseConnection(id: string) {
    void navigate({ to: '/er', search: { connection: id || undefined }, replace: true });
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState retry={() => void refetch()}>{errorMessage(error)}</ErrorState>;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-[1800px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow mb-2">Структура подключённых баз</p>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <GitFork size={25} className="text-accent" /> ER-диаграмма
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Выберите базу, чтобы исследовать связи между таблицами. В сохранённом подключении можно
            менять расположение карточек; JSON-снимки доступны в режиме просмотра.
          </p>
        </div>
        <label className="min-w-72">
          <span className="mb-1.5 block text-[11px] font-semibold text-muted">БАЗА ДАННЫХ</span>
          <select
            className="field"
            value={selected?.id ?? ''}
            onChange={(event) => chooseConnection(event.target.value)}
            disabled={!available.length}
          >
            {!available.length && <option value="">Нет баз с метаданными</option>}
            {available.map((database) => (
              <option key={database.id} value={database.id}>
                {database.name} · {engineLabels[database.engine]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selected ? (
        <div className="panel mt-7 flex flex-1 items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <Database size={32} className="mx-auto text-muted" />
            <h2 className="mt-4 text-base font-semibold">Нет метаданных для диаграммы</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Создайте подключение и синхронизируйте структуру либо импортируйте JSON-снимок.
            </p>
          </div>
        </div>
      ) : details.isLoading ? (
        <LoadingState />
      ) : details.error ? (
        <ErrorState retry={() => void details.refetch()}>{errorMessage(details.error)}</ErrorState>
      ) : details.data ? (
        <section className="panel mt-7 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-elevated px-5 py-3 text-xs text-muted">
            <Network size={15} className="text-accent" />
            <span className="font-semibold text-secondary">{details.data.name}</span>
            <span>{engineLabels[details.data.engine]}</span>
            {details.data.source === 'connection' && (
              <span className="font-mono">
                {details.data.host}:{details.data.port}/{details.data.databaseName}
              </span>
            )}
            <span className="ml-auto text-[11px]">
              {details.data.source === 'connection'
                ? 'Раскладка доступна владельцу подключения'
                : 'Режим просмотра'}
            </span>
          </div>
          <ErDiagram
            key={`${details.data.id}:${details.data.importedAt}`}
            database={details.data}
            editable={details.data.source === 'connection'}
          />
        </section>
      ) : null}
    </div>
  );
}
