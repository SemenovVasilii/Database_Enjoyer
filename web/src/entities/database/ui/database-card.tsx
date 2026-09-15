import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Database, Layers, Table2 } from 'lucide-react';
import type { DatabaseSummary } from '@/shared/api/contracts';
import { engineLabels, formatDate } from '@/shared/lib';

export function DatabaseCard({ database }: { database: DatabaseSummary }) {
  return (
    <Link
      to="/databases/$databaseId"
      params={{ databaseId: database.id }}
      className="panel group flex min-h-52 flex-col p-5 transition hover:border-accent/25 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-line bg-accent/5 p-2.5 text-accent">
          <Database size={22} />
        </div>
        <span
          className={`ml-auto mr-3 rounded-md px-2 py-1 text-[10px] ${database.status === 'error' ? 'bg-danger/10 text-danger' : database.source === 'connection' ? 'bg-success/10 text-success' : 'bg-elevated text-muted'}`}
        >
          {database.status === 'error'
            ? 'Ошибка'
            : database.source === 'connection'
              ? 'Подключение'
              : 'JSON-снимок'}
        </span>
        <ArrowUpRight size={18} className="text-muted transition group-hover:text-accent" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <h3 className="truncate text-base font-semibold">{database.name}</h3>
        <span className="rounded-md bg-elevated px-2 py-0.5 text-[10px] text-muted">
          {engineLabels[database.engine]}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted">
        {database.description ||
          (database.source === 'connection'
            ? `${database.host}:${database.port} / ${database.databaseName}`
            : 'Офлайн-снимок структуры')}
      </p>
      <div className="mt-4 flex items-center gap-4 border-t border-line pt-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Layers size={13} />
          {database.schemaCount} схем
        </span>
        <span className="flex items-center gap-1.5">
          <Table2 size={13} />
          {database.tableCount} таблиц
        </span>
        <span className="ml-auto text-[10px]">{formatDate(database.importedAt)}</span>
      </div>
    </Link>
  );
}
