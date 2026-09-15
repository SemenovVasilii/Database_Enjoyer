import { useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CircleAlert, Code2, Database, Eraser, Play, Rows3 } from 'lucide-react';
import { useExecuteSqlMutation, useGetDatabasesQuery } from '@/entities/database';
import { SqlEditor, SqlResults } from '@/features/execute-sql';
import type { DatabaseSummary, SqlExecutionResult } from '@/shared/api/contracts';
import { engineLabels, errorMessage } from '@/shared/lib';
import { Button, ErrorState, LoadingState } from '@/shared/ui';

const draftKey = (id: string) => `database-enjoyer:sql-draft:${id}`;

function starterQuery(database: DatabaseSummary) {
  if (database.engine === 'postgresql')
    return `-- ${database.name}\nSELECT\n  current_database() AS database_name,\n  current_user AS user_name,\n  NOW() AS server_time;`;
  return `-- ${database.name}\nSELECT\n  DATABASE() AS database_name,\n  CURRENT_USER() AS user_name,\n  NOW() AS server_time;`;
}

function initialDraft(database: DatabaseSummary) {
  try {
    return localStorage.getItem(draftKey(database.id)) ?? starterQuery(database);
  } catch {
    return starterQuery(database);
  }
}

function SqlWorkspace({ selected }: { selected: DatabaseSummary }) {
  const [sql, setSql] = useState(() => initialDraft(selected));
  const [maxRows, setMaxRows] = useState(500);
  const [execution, setExecution] = useState<SqlExecutionResult>();
  const [queryError, setQueryError] = useState('');
  const [executeSql, { isLoading: isExecuting }] = useExecuteSqlMutation();

  function updateSql(value: string) {
    setSql(value);
    try {
      localStorage.setItem(draftKey(selected.id), value);
    } catch {
      /* The editor stays usable when browser storage is disabled. */
    }
  }

  async function run(statement: string) {
    if (!statement.trim()) {
      setQueryError('Введите SQL-запрос или выделите фрагмент для выполнения.');
      return;
    }
    setQueryError('');
    setExecution(undefined);
    try {
      setExecution(await executeSql({ id: selected.id, sql: statement, maxRows }).unwrap());
    } catch (error) {
      setQueryError(errorMessage(error));
    }
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-xl border border-b-0 border-line bg-elevated px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-secondary">{selected.name}</span>
        <span>{engineLabels[selected.engine]}</span>
        <span className="font-mono">
          {selected.host}:{selected.port}/{selected.databaseName}
        </span>
        <span className="ml-auto hidden sm:inline">Черновик хранится только в браузере</span>
      </div>
      <section className="overflow-hidden rounded-b-xl border border-line bg-surface shadow-[0_2px_4px_rgba(9,9,11,0.03)]">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <Code2 size={14} className="text-accent" /> Запрос
          </span>
          <div className="flex items-center gap-2">
            <label className="hidden items-center gap-2 text-[11px] text-muted sm:flex">
              Строк
              <select
                aria-label="Максимум строк в результате"
                className="field w-20 py-1"
                value={maxRows}
                onChange={(event) => setMaxRows(Number(event.target.value))}
                disabled={isExecuting}
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </label>
            <button
              type="button"
              className="hidden items-center gap-1.5 px-2 text-[11px] text-muted hover:text-secondary sm:flex"
              onClick={() => updateSql('')}
              disabled={isExecuting || !sql}
            >
              <Eraser size={13} /> Очистить
            </button>
            <Button onClick={() => void run(sql)} disabled={isExecuting}>
              <Play size={14} fill="currentColor" />
              {isExecuting ? 'Выполняем…' : 'Выполнить'}
            </Button>
          </div>
        </div>
        <div className="h-[340px]">
          <SqlEditor value={sql} onChange={updateSql} onRun={(statement) => void run(statement)} />
        </div>
      </section>

      {queryError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 p-4 text-sm text-danger"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Запрос не выполнен</p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {queryError}
            </p>
          </div>
        </div>
      )}

      <section className="panel mt-4 h-[380px] min-h-0 overflow-hidden">
        {execution ? (
          <SqlResults execution={execution} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-muted">
            <div>
              <Rows3 size={28} className="mx-auto" />
              <p className="mt-3 text-sm font-medium text-secondary">
                {isExecuting ? 'Выполняем запрос…' : 'Здесь появится результат'}
              </p>
              <p className="mt-1 text-xs">Таблица, число строк и время выполнения</p>
            </div>
          </div>
        )}
      </section>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        MongoDB использует собственный язык запросов и будет доступен в отдельном playground. После
        DDL-запросов обновите структуру подключения, чтобы синхронизировать каталог.
      </p>
    </>
  );
}

export function SqlPage() {
  const search = useSearch({ from: '/sql' });
  const navigate = useNavigate();
  const { data: databases, isLoading, error, refetch } = useGetDatabasesQuery();
  const supported = useMemo(
    () =>
      (databases ?? []).filter(
        (database) =>
          database.source === 'connection' &&
          (database.engine === 'postgresql' || database.engine === 'mysql'),
      ),
    [databases],
  );
  const selected = supported.find((database) => database.id === search.connection) ?? supported[0];

  function chooseConnection(id: string) {
    void navigate({ to: '/sql', search: { connection: id || undefined }, replace: true });
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState retry={() => void refetch()}>{errorMessage(error)}</ErrorState>;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-[1600px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow mb-2">Запросы к подключённым базам</p>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Code2 size={25} className="text-accent" /> SQL-редактор
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Выполните весь текст через кнопку или выделенный фрагмент сочетанием ⌘/Ctrl + Enter.
          </p>
        </div>
        <label className="min-w-72">
          <span className="mb-1.5 block text-[11px] font-semibold text-muted">ПОДКЛЮЧЕНИЕ</span>
          <select
            className="field"
            value={selected?.id ?? ''}
            onChange={(event) => chooseConnection(event.target.value)}
            disabled={!supported.length}
          >
            {!supported.length && <option value="">Нет SQL-подключений</option>}
            {supported.map((database) => (
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
            <h2 className="mt-4 text-base font-semibold">Нет подключения для SQL</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Создайте подключение PostgreSQL или MySQL на странице баз данных. JSON-снимки и
              MongoDB не выполняют SQL.
            </p>
          </div>
        </div>
      ) : (
        <SqlWorkspace key={selected.id} selected={selected} />
      )}
    </div>
  );
}
