import { useState } from 'react';
import { ArrowDownToLine, Columns3, Database, Layers, Search, Table2 } from 'lucide-react';
import { DatabaseCard, useGetDatabasesQuery } from '@/entities/database';
import { ConnectDatabaseButton } from '@/features/connect-database';
import { ImportDatabaseButton } from '@/features/import-database';
import { engineLabels, errorMessage } from '@/shared/lib';
import { ErrorState, LoadingState } from '@/shared/ui';
import type { DatabaseEngine } from '@/shared/api/contracts';

export function WorkspacePage() {
  const { data: databases, isLoading, error, refetch } = useGetDatabasesQuery();
  const [search, setSearch] = useState('');
  const [engine, setEngine] = useState('');
  const filtered = databases?.filter(
    (database) =>
      `${database.name} ${database.description}`.toLowerCase().includes(search.toLowerCase()) &&
      (!engine || database.engine === engine),
  );
  const stats = [
    {
      label: 'Базы данных',
      value: databases?.length,
      icon: Database,
      hint: 'Подключения и JSON-снимки',
    },
    {
      label: 'Схемы',
      value: databases?.reduce((sum, database) => sum + database.schemaCount, 0),
      icon: Layers,
      hint: 'Пространства имён',
    },
    {
      label: 'Таблицы',
      value: databases?.reduce((sum, database) => sum + database.tableCount, 0),
      icon: Table2,
      hint: 'Объекты структуры',
    },
    {
      label: 'Колонки',
      value: databases?.reduce((sum, database) => sum + database.columnCount, 0),
      icon: Columns3,
      hint: 'Типы и атрибуты',
    },
  ];
  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-2">Рабочее пространство</p>
          <h1 className="text-2xl font-semibold tracking-tight">Базы данных</h1>
          <p className="mt-2 text-sm text-muted">
            Подключайте PostgreSQL, MySQL и MongoDB. Исследуйте структуру и данные.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportDatabaseButton />
          <ConnectDatabaseButton />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="panel p-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{label}</span>
              <Icon size={16} className="text-placeholder" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight">
              {value?.toLocaleString('ru-RU') ?? '—'}
            </div>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </div>
        ))}
      </div>
      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Каталог баз</h2>
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              {databases?.length ?? '—'}
            </span>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="absolute top-2.5 left-3 text-muted" />
              <input
                aria-label="Поиск баз"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по названию…"
                className="field pl-9 sm:w-60"
              />
            </div>
            <select
              aria-label="Тип базы данных"
              value={engine}
              onChange={(event) => setEngine(event.target.value)}
              className="field w-auto max-w-40 text-xs"
            >
              <option value="">Все типы</option>
              {(Object.keys(engineLabels) as DatabaseEngine[]).map((key) => (
                <option key={key} value={key}>
                  {engineLabels[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState retry={() => void refetch()}>{errorMessage(error)}</ErrorState>
        ) : databases?.length ? (
          filtered?.length ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((database) => (
                <DatabaseCard key={database.id} database={database} />
              ))}
            </div>
          ) : (
            <div className="panel px-8 py-16 text-center">
              <Search size={28} className="mx-auto mb-4 text-muted" />
              <p className="text-sm text-muted">По вашему запросу ничего не найдено.</p>
              <button
                className="mt-4 text-xs text-accent"
                onClick={() => {
                  setSearch('');
                  setEngine('');
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )
        ) : (
          <div className="panel relative overflow-hidden px-6 py-16 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sidebar to-surface"
            />
            <div className="relative">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl border border-line bg-surface shadow-sm text-accent">
                <Database size={30} strokeWidth={1.4} />
              </div>
              <h3 className="text-lg font-semibold">Подключите первую базу</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
                Укажите адрес и реквизиты базы, чтобы увидеть её структуру и просматривать данные
                таблиц и коллекций.
              </p>
              <ConnectDatabaseButton className="mt-6" />
              <a
                href="/sample-metadata.json"
                download
                className="mt-4 flex items-center justify-center gap-2 text-xs text-muted hover:text-accent"
              >
                <ArrowDownToLine size={13} />
                Пример JSON для офлайн-импорта
              </a>
            </div>
          </div>
        )}
      </section>
      <div className="mt-7 flex items-center gap-2 text-[11px] text-muted">
        <span className="size-1 rounded-full bg-placeholder" />
        Каталог хранит метаданные · данные читаются из подключённых баз
      </div>
    </div>
  );
}
