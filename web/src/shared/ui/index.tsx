import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, LoaderCircle } from 'lucide-react';

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-sm leading-4 font-semibold shadow-[0_1px_2px_rgba(9,9,11,0.05)] transition disabled:opacity-50 disabled:shadow-none',
        variant === 'primary' &&
          'border-ink/4 bg-primary text-white hover:bg-accent-hover disabled:hover:bg-primary',
        variant === 'secondary' && 'border-ink/14 bg-surface text-secondary hover:bg-elevated',
        variant === 'danger' &&
          'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LoadingState() {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-24 text-muted">
      <LoaderCircle size={18} className="animate-spin" />
      Загружаем метаданные…
    </div>
  );
}

export function ErrorState({ children, retry }: { children: ReactNode; retry?: () => void }) {
  return (
    <div role="alert" className="panel flex flex-col items-center gap-4 px-8 py-12 text-center">
      <AlertCircle size={28} className="text-danger" />
      <p className="max-w-xl text-sm text-muted">{children}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

export { ThemeSwitch } from './theme-switch';
