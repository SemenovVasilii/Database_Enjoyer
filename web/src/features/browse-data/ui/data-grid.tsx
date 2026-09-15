import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useGetRowsQuery } from '@/entities/database';
import { errorMessage } from '@/shared/lib';
import { Button, ErrorState, LoadingState } from '@/shared/ui';
function cell(value: unknown): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '—';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > 10000 ? text.slice(0, 10000) + '…' : text;
}
export function DataGrid({ id, objectId }: { id: string; objectId: string }) {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const {
    currentData: data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRowsQuery({ id, objectId, offset, limit });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="text-xs text-muted">Данные из подключённой базы · только чтение</p>
        <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Обновить
        </Button>
      </div>
      {isLoading || (!data && isFetching) ? (
        <LoadingState />
      ) : error ? (
        <ErrorState retry={() => void refetch()}>{errorMessage(error)}</ErrorState>
      ) : (
        data && (
          <>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-elevated text-muted">
                  <tr>
                    <th className="border-b border-line px-3 py-3 font-medium">#</th>
                    {data.columns.map((name) => (
                      <th
                        key={name}
                        className="border-b border-line px-4 py-3 font-mono font-medium whitespace-nowrap"
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={offset + i} className="border-b border-line hover:bg-elevated">
                      <td className="px-3 py-3 text-placeholder">{offset + i + 1}</td>
                      {data.columns.map((name) => (
                        <td
                          key={name}
                          className={`max-w-80 px-4 py-3 align-top ${row[name] === null ? 'text-placeholder italic' : 'text-secondary'}`}
                        >
                          <details className="group">
                            <summary className="line-clamp-2 cursor-pointer list-none break-words font-mono group-open:hidden">
                              {cell(row[name])}
                            </summary>
                            <pre
                              className="max-w-80 cursor-pointer text-xs whitespace-pre-wrap"
                              onClick={(e) =>
                                e.currentTarget.parentElement?.removeAttribute('open')
                              }
                            >
                              {cell(row[name])}
                            </pre>
                          </details>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.rows.length && (
                <p className="p-8 text-center text-sm text-muted">Нет данных на этой странице.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-muted">
              <span>
                {data.rows.length ? `${offset + 1}–${offset + data.rows.length}` : '0'} строк ·
                страница {offset / limit + 1}
                {!data.orderedBy.length && ' · порядок без ключа не гарантирован'}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={offset === 0 || isFetching}
                  onClick={() => setOffset((n) => Math.max(0, n - limit))}
                >
                  <ChevronLeft size={14} />
                  Назад
                </Button>
                <Button
                  variant="secondary"
                  disabled={!data.hasMore || isFetching || offset + limit > 100000}
                  onClick={() => setOffset((n) => n + limit)}
                >
                  Далее
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
