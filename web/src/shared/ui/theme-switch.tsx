import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
type Mode = 'light' | 'dark' | 'system';
export function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem('database-enjoyer-theme');
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#1d1d20' : '#f2f4f7');
    };
    apply();
    media.addEventListener('change', apply);
    try {
      localStorage.setItem('database-enjoyer-theme', mode);
    } catch {
      /* Storage may be disabled by browser settings. */
    }
    return () => media.removeEventListener('change', apply);
  }, [mode]);
  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;
  return (
    <label className="flex items-center gap-1.5 rounded-md bg-elevated px-2 py-1.5 text-xs text-muted">
      <Icon size={14} />
      <select
        aria-label="Тема интерфейса"
        className="min-w-0 bg-transparent text-xs outline-none"
        value={mode}
        onChange={(e) => setMode(e.target.value as Mode)}
      >
        <option value="light">Светлая</option>
        <option value="dark">Тёмная</option>
        <option value="system">Системная</option>
      </select>
    </label>
  );
}
