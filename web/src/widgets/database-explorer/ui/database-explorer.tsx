import { DataGrid } from '@/features/browse-data';
import { useState } from 'react';
import { ChevronDown, Columns3, KeyRound, Layers, Search, Table2 } from 'lucide-react';
import type { DatabaseDetails } from '@/shared/api/contracts';

export function DatabaseExplorer({ database }: { database: DatabaseDetails }) {
  const [selection, setSelection] = useState<{ schema: string; table: string }>();
  const [search, setSearch] = useState('');
  const [columnSearch, setColumnSearch] = useState('');
  const [tab, setTab] = useState<'structure' | 'data' | 'indexes' | 'constraints'>(
    database.source === 'connection' ? 'data' : 'structure',
  );
  const tables = database.schemas.flatMap((schema) =>
    schema.tables.map((table) => ({ schema: schema.name, table })),
  );
  const selected =
    tables.find(
      (item) => item.schema === selection?.schema && item.table.name === selection?.table,
    ) ?? tables[0];
  const columns =
    selected?.table.columns.filter((column) =>
      `${column.name} ${column.dataType} ${column.comment ?? ''}`
        .toLowerCase()
        .includes(columnSearch.toLowerCase()),
    ) ?? [];

  return (
    <div className="panel mt-8 grid overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-sidebar lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between border-b border-line p-4">
          <span className="eyebrow">Объекты базы</span>
          <Layers size={14} className="text-muted" />
        </div>
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute top-2.5 left-3 text-muted" />
            <input
              aria-label="Поиск таблиц"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти таблицу…"
              className="field pl-9 text-xs"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-auto p-2 lg:max-h-[560px]">
          {database.schemas.map((schema) => {
            const filtered = schema.tables.filter((table) =>
              `${schema.name}.${table.name}`.toLowerCase().includes(search.toLowerCase()),
            );
            if (search && !filtered.length) return null;
            return (
              <details key={schema.name} open className="mb-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded px-2 py-2 text-xs text-muted">
                  <ChevronDown size={13} />
                  <Layers size={14} />
                  <span className="font-mono">{schema.name}</span>
                  <span className="ml-auto text-[10px]">{schema.tables.length}</span>
                </summary>
                {filtered.map((table) => (
                  <button
                    key={table.name}
                    aria-pressed={
                      selected?.schema === schema.name && selected.table.name === table.name
                    }
                    onClick={() => {
                      setSelection({ schema: schema.name, table: table.name });
                      setColumnSearch('');
                    }}
                    className={`my-0.5 flex w-full items-center gap-2 rounded-md py-2.5 pr-3 pl-8 text-left text-xs transition ${selected?.schema === schema.name && selected.table.name === table.name ? 'bg-accent/8 font-medium text-accent' : 'text-muted hover:bg-elevated'}`}
                  >
                    <Table2 size={13} className="shrink-0" />
                    <span className="truncate font-mono">{table.name}</span>
                  </button>
                ))}
                {!schema.tables.length && (
                  <p className="py-2 pl-8 text-[11px] text-muted">Нет таблиц</p>
                )}
              </details>
            );
          })}
          {search &&
            !tables.some((item) =>
              `${item.schema}.${item.table.name}`.toLowerCase().includes(search.toLowerCase()),
            ) && <p className="p-4 text-xs text-muted">Таблицы не найдены</p>}
          {!database.schemas.length && <p className="p-4 text-xs text-muted">В снимке нет схем</p>}
        </div>
      </aside>
      {selected ? (
        <section className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6">
            <div>
              <p className="mb-2 font-mono text-[11px] text-muted">
                {database.name} / {selected.schema}
              </p>
              <h2 className="flex items-center gap-2.5 font-mono text-xl">
                <Table2 size={20} className="text-accent" />
                {selected.table.name}
              </h2>
              {selected.table.comment && (
                <p className="mt-2 text-xs text-muted">{selected.table.comment}</p>
              )}
            </div>
            <span className="rounded-full border border-line px-3 py-1 text-[10px] text-muted">
              {selected.table.kind ?? 'table'}
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Содержимое объекта"
            className="flex gap-4 overflow-auto border-b border-line px-5"
          >
            {(
              [
                ['data', 'Данные'],
                ['structure', 'Структура'],
                ['indexes', 'Индексы'],
                ['constraints', 'Ограничения'],
              ] as const
            )
              .filter(([key]) => key !== 'data' || database.source === 'connection')
              .map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`border-b-2 py-3 text-sm font-medium whitespace-nowrap ${tab === key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-secondary'}`}
                >
                  {label}
                </button>
              ))}
          </div>
          {tab === 'data' && selected.table.id && (
            <DataGrid key={selected.table.id} id={database.id} objectId={selected.table.id} />
          )}
          {tab === 'structure' && (
            <>
              {Boolean(selected.table.extra?.schemaInferred) && (
                <p className="border-b border-line bg-accent/5 px-5 py-3 text-xs leading-relaxed text-muted">
                  Поля MongoDB определены по выборке до 200 документов. Это описание наблюдаемых
                  полей, а не строгая схема коллекции.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
                <span className="flex items-center gap-2 text-sm text-accent">
                  <Columns3 size={16} />
                  Колонки
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px]">
                    {selected.table.columns.length}
                  </span>
                </span>
                <input
                  aria-label="Поиск колонок"
                  placeholder="Найти колонку…"
                  className="field max-w-52 text-xs"
                  value={columnSearch}
                  onChange={(event) => setColumnSearch(event.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-elevated text-[11px] text-muted">
                    <tr>
                      {['КОЛОНКА', 'ТИП ДАННЫХ', 'NULL', 'ПО УМОЛЧАНИЮ', 'ОПИСАНИЕ'].map(
                        (title) => (
                          <th key={title} className="px-5 py-3 font-medium">
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column) => (
                      <tr
                        key={column.name}
                        className="border-t border-line transition hover:bg-elevated/50"
                      >
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-2 font-mono">
                            {column.primaryKey ? (
                              <KeyRound
                                size={13}
                                aria-label="Первичный ключ"
                                className="text-accent"
                              />
                            ) : (
                              <span className="size-[13px]" />
                            )}
                            {column.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="rounded border border-line bg-elevated px-2 py-1 text-secondary">
                            {column.dataType}
                          </code>
                        </td>
                        <td className="px-5 py-3.5 text-muted">{column.nullable ? 'Да' : 'Нет'}</td>
                        <td className="px-5 py-3.5 font-mono text-muted">
                          {column.defaultValue ?? '—'}
                        </td>
                        <td className="max-w-60 px-5 py-3.5 text-muted">{column.comment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!columns.length && (
                  <p className="p-8 text-center text-sm text-muted">
                    {columnSearch ? 'Колонки не найдены' : 'В таблице нет колонок'}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line px-6 py-4 text-[10px] text-muted">
                <span>
                  {columns.length} из {selected.table.columns.length} колонок
                </span>
                <span className="flex items-center gap-1.5">
                  <KeyRound size={11} className="text-accent" />
                  Первичный ключ
                </span>
              </div>
            </>
          )}
          {tab === 'indexes' && (
            <div className="overflow-auto p-5">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    {['Имя', 'Колонки / поля', 'Уникальный', 'Определение'].map((t) => (
                      <th key={t} className="px-3 py-3 font-medium">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selected.table.indexes ?? []).map((i) => (
                    <tr key={i.name} className="border-t border-line">
                      <td className="px-3 py-3 font-mono">
                        {i.name}
                        {i.primary && ' · PK'}
                      </td>
                      <td className="px-3 py-3 font-mono">{i.columns.join(', ')}</td>
                      <td className="px-3 py-3 text-muted">{i.unique ? 'Да' : 'Нет'}</td>
                      <td className="max-w-96 px-3 py-3 font-mono break-words text-muted">
                        {i.definition ?? JSON.stringify(i.extra)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!selected.table.indexes?.length && (
                <p className="p-6 text-center text-muted">Нет индексов в каталоге.</p>
              )}
            </div>
          )}
          {tab === 'constraints' && (
            <div className="space-y-3 p-5">
              {(selected.table.constraints ?? []).map((k) => (
                <div key={k.name} className="rounded-lg border border-line p-4">
                  <p className="text-sm font-medium">
                    {k.name}
                    <span className="ml-2 text-xs text-muted">{k.kind}</span>
                  </p>
                  <p className="mt-2 font-mono text-xs text-secondary">
                    {k.columns.join(', ')}
                    {k.referencedObject &&
                      ` → ${k.referencedNamespace}.${k.referencedObject} (${k.referencedColumns?.join(', ')})`}
                  </p>
                  {k.definition && (
                    <p className="mt-2 font-mono text-xs break-words text-muted">{k.definition}</p>
                  )}
                </div>
              ))}
              {Boolean(selected.table.extra?.validator) && (
                <div className="rounded-lg border border-line p-4">
                  <p className="mb-2 text-sm font-medium">MongoDB validator</p>
                  <pre className="overflow-auto text-xs text-muted">
                    {JSON.stringify(selected.table.extra?.validator, null, 2)}
                  </pre>
                </div>
              )}
              {!selected.table.constraints?.length && !selected.table.extra?.validator && (
                <p className="p-6 text-center text-muted">Нет ограничений в каталоге.</p>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-muted">
          <Table2 size={28} />
          <p className="text-sm">В этом снимке пока нет таблиц.</p>
        </div>
      )}
    </div>
  );
}
