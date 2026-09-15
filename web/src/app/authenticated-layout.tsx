import { Navigate, Outlet, useRouterState } from '@tanstack/react-router';
import { useSelector } from 'react-redux';
import { WorkspaceShell } from '@/widgets/workspace-shell';
import type { RootState } from './store';

export function AuthenticatedLayout() {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === '/sign-in') return <Outlet />;
  if (!accessToken) return <Navigate to="/sign-in" replace />;
  return (
    <WorkspaceShell>
      <Outlet />
    </WorkspaceShell>
  );
}
