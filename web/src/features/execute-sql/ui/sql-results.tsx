import { useState } from 'react';
import { CheckCircle2, Rows3 } from 'lucide-react';
import type { SqlExecutionResult } from '@/shared/api/contracts';

function cellText(value: unknown) {
  if (value === null) return 'NULL';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function SqlResults({ execution }: { execution: SqlExecutionResult }) {
  const [active, setActive] = useState(0);
  const visibleIndex = Math.min(active, Math.max(0, execution.results.length - 1));
  const result = execution.results[visibleIndex];

  if (!result)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Запрос выполнен без результата.
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-11 shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-3">
        {execution.results.length > 1 &&
          execution.results.map((set, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActive(index)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs ${visibleIndex === index ? 'bg-accent/10 font-semibold text-accent' : 'text-muted hover:bg-elevated'}`}
            >
              Результат {index + 1} · {set.command}
            </button>
          ))}
        <div className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap text-[11px] text-muted">
          <span className="flex items-center gap-1.5 text-success">
            <CheckCircle2 size={13} /> Выполнено
          </span>
          <span>{execution.durationMs.toLocaleString('ru-RU')} мс</span>
          <span className="flex items-center gap-1.5">
            <Rows3 size={13} /> {result.rowCount.toLocaleString('ru-RU')} строк
          </span>
          {result.truncated && (
            <span className="rounded bg-accent/10 px-2 py-1 text-accent">
              показана часть результата
            </span>
          )}
        </div>
      </div>

      {result.columns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <CheckCircle2 size={28} className="mx-auto text-success" />
            <p className="mt-3 text-sm font-medium">Команда {result.command} выполнена</p>
            <p className="mt-1 text-xs text-muted">
              Затронуто строк: {result.rowCount.toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 z-[1] bg-elevated">
              <tr>
                <th className="w-12 border-r border-b border-line px-3 py-2 text-right font-normal text-muted">
                  #
                </th>
                {result.columns.map((column, index) => (
                  <th
                    key={`${column.name}-${index}`}
                    className="min-w-36 border-r border-b border-line px-3 py-2 font-semibold text-secondary"
                  >
                    <span className="block">{column.name}</span>
                    <span className="mt-0.5 block text-[9px] font-normal text-muted">
                      type {column.dataType}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-elevated/60">
                  <td className="border-r border-b border-line px-3 py-2 text-right text-muted">
                    {rowIndex + 1}
                  </td>
                  {result.columns.map((_column, columnIndex) => {
                    const value = row[columnIndex];
                    return (
                      <td
                        key={columnIndex}
                        className={`max-w-[32rem] border-r border-b border-line px-3 py-2 align-top ${value === null ? 'italic text-muted' : 'text-secondary'}`}
                      >
                        <div className="max-h-32 overflow-auto whitespace-pre-wrap break-words">
                          {cellText(value)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {result.rows.length === 0 && (
            <p className="p-8 text-center text-sm text-muted">Запрос не вернул строк.</p>
          )}
        </div>
      )}
    </div>
  );
}
