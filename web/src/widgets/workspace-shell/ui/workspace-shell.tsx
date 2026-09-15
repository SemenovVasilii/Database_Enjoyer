import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  ArrowUpRight,
  BookOpen,
  Code2,
  Database,
  FileJson,
  FolderOpen,
  PanelLeft,
} from 'lucide-react';
import { useGetDatabasesQuery } from '@/entities/database';
import { ThemeSwitch } from '@/shared/ui';
import { baseApi } from '@/shared/api';

const healthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    health: builder.query<{ status: string }, void>({ query: () => '/health' }),
  }),
});

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { data: databases } = useGetDatabasesQuery();
  const {
    data: health,
    isError,
    isLoading,
  } = healthApi.useHealthQuery(undefined, { pollingInterval: 30000 });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-line bg-sidebar lg:flex">
        <Link to="/" className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Database size={19} strokeWidth={1.8} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">DatabaseEnjoyer</span>
        </Link>
        <div className="mx-4 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent/8 text-xs font-semibold text-accent">
            W
          </span>
          <div>
            <p className="text-xs font-medium">Моё пространство</p>
            <p className="mt-0.5 text-[10px] text-muted">Локальный каталог</p>
          </div>
          <PanelLeft size={14} className="ml-auto text-muted" />
        </div>
        <nav aria-label="Основная навигация" className="mt-6 px-4">
          <p className="eyebrow mb-3 px-3">Пространство</p>
          <Link
            to="/"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${pathname === '/' ? 'bg-accent/8 font-semibold text-accent' : 'font-medium text-secondary hover:bg-line/60'}`}
          >
            <FolderOpen size={17} />
            Базы данных
            <span className="ml-auto rounded bg-accent/10 px-1.5 py-0.5 text-[10px]">
              {databases?.length ?? '—'}
            </span>
          </Link>
          <Link
            to="/sql"
            search={{ connection: undefined }}
            className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${pathname === '/sql' ? 'bg-accent/8 font-semibold text-accent' : 'font-medium text-secondary hover:bg-line/60'}`}
          >
            <Code2 size={17} />
            SQL-редактор
          </Link>
        </nav>
        <div className="mt-8 min-h-0 flex-1 overflow-auto px-4">
          <p className="eyebrow mb-3 px-3">Каталог</p>
          {databases?.length ? (
            databases.map((database) => (
              <Link
                key={database.id}
                to="/databases/$databaseId"
                params={{ databaseId: database.id }}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition hover:bg-elevated ${pathname.endsWith(database.id) ? 'bg-accent/8 font-medium text-accent' : 'text-secondary'}`}
              >
                <Database size={14} className="shrink-0" />
                <span className="truncate font-mono">{database.name}</span>
              </Link>
            ))
          ) : (
            <p className="px-3 text-xs leading-relaxed text-muted">
              Подключите базу данных, чтобы начать работу.
            </p>
          )}
        </div>
        <div className="m-4 rounded-xl border border-line bg-surface p-4">
          <BookOpen size={18} className="mb-3 text-muted" />
          <p className="text-xs font-medium">Ресурсы для работы</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Описание REST API и моделей метаданных.
          </p>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-between text-xs text-accent"
          >
            Документация API
            <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="flex items-center gap-3 border-t border-line p-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent/8 text-xs font-semibold text-accent">
            DE
          </div>
          <div>
            <p className="text-xs">Локальное пространство</p>
            <p className="text-[10px] text-muted">DatabaseEnjoyer · v0.1</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-5 md:px-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to="/" className="text-sm font-semibold text-ink lg:hidden">
              DatabaseEnjoyer
            </Link>
            <span className="hidden lg:inline">Рабочее пространство</span>
            <span className="hidden lg:inline">/</span>
            <span className="hidden text-secondary lg:inline">
              {pathname === '/'
                ? 'Базы данных'
                : pathname === '/sql'
                  ? 'SQL-редактор'
                  : 'Обозреватель структуры'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/sample-metadata.json"
              download
              className="hidden items-center gap-1.5 text-xs text-muted hover:text-accent sm:flex"
            >
              <FileJson size={14} />
              Пример JSON
            </a>
            <ThemeSwitch />
            <span
              role="status"
              className="hidden items-center gap-2 rounded-md bg-elevated px-2.5 py-1.5 text-[10px] text-muted md:flex"
            >
              <span
                className={`size-1.5 rounded-full ${isError ? 'bg-danger' : health ? 'bg-success' : 'bg-muted'}`}
              />
              {isLoading ? 'Подключаемся' : isError ? 'API недоступен' : 'API online'}
            </span>
          </div>
        </header>
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8 xl:px-10">{children}</main>
        <footer className="flex justify-between border-t border-line px-5 py-4 text-[11px] text-muted md:px-8">
          <span>DatabaseEnjoyer</span>
          <span>Каталог метаданных</span>
        </footer>
      </div>
    </div>
  );
}
