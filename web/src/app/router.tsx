import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
} from '@tanstack/react-router';
import { WorkspacePage } from '@/pages/workspace';
import { DatabasePage } from '@/pages/database';
import { SignInPage } from '@/pages/sign-in';
import { AuthenticatedLayout } from './authenticated-layout';

const sqlPageComponent = lazyRouteComponent(() => import('@/pages/sql'), 'SqlPage');
const erPageComponent = lazyRouteComponent(() => import('@/pages/er'), 'ErPage');

const rootRoute = createRootRoute({
  component: AuthenticatedLayout,
  notFoundComponent: () => (
    <div className="p-10">
      <h1 className="text-2xl">Страница не найдена</h1>
      <Link className="mt-4 inline-block text-accent" to="/">
        Вернуться к базам
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="p-10">
      <h1 className="text-2xl">Не удалось открыть страницу</h1>
      <p className="mt-3 text-muted">
        {error instanceof Error ? error.message : 'Неизвестная ошибка'}
      </p>
      <button className="mt-4 text-accent" onClick={reset}>
        Попробовать ещё раз
      </button>
    </div>
  ),
});
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WorkspacePage,
});
const databaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/databases/$databaseId',
  component: DatabasePage,
});
const erRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/er',
  validateSearch: (search: Record<string, unknown>) => ({
    connection: typeof search.connection === 'string' ? search.connection : undefined,
  }),
  component: erPageComponent,
});
const sqlRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sql',
  validateSearch: (search: Record<string, unknown>) => ({
    connection: typeof search.connection === 'string' ? search.connection : undefined,
  }),
  component: sqlPageComponent,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([signInRoute, indexRoute, databaseRoute, sqlRoute, erRoute]),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
