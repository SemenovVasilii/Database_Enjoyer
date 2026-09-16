import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, LoaderCircle, Plug, X } from 'lucide-react';
import {
  useCreateConnectionMutation,
  useTestConnectionMutation,
  useUpdateConnectionMutation,
} from '@/entities/database';
import type { ConnectionEngine, ConnectionInput, DatabaseDetails } from '@/shared/api/contracts';
import { engineLabels, errorMessage } from '@/shared/lib';
import { Button } from '@/shared/ui';

type LocalRuntime = 'docker' | 'host';

type TestPreset = { port: number; databaseName: string; password: string };

const testPresets: Record<ConnectionEngine, TestPreset> = {
  postgresql: { port: 5433, databaseName: 'pagila', password: 'enjoyer_postgres' },
  mysql: { port: 3307, databaseName: 'sakila', password: 'enjoyer_mysql' },
  mongodb: { port: 27018, databaseName: 'restaurants', password: 'enjoyer_mongo' },
};

function testHost(runtime: LocalRuntime) {
  return runtime === 'docker' ? 'host.docker.internal' : '127.0.0.1';
}
export function ConnectDatabaseButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        <Plug size={16} />
        Подключить базу
      </Button>
      {open && <ConnectionDialog close={() => setOpen(false)} />}
    </>
  );
}
export function ConnectionDialog({
  close,
  connection,
}: {
  close: () => void;
  connection?: DatabaseDetails;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [input, setInput] = useState<ConnectionInput>(() =>
    connection
      ? {
          name: connection.name,
          engine: connection.engine as ConnectionEngine,
          host: connection.host ?? '',
          port: connection.port ?? testPresets[connection.engine as ConnectionEngine].port,
          databaseName: connection.databaseName ?? '',
          username: connection.username ?? '',
          password: '',
          authDatabase: connection.authDatabase,
          tls: connection.tls ?? false,
          description: connection.description,
        }
      : {
          name: '',
          engine: 'postgresql',
          host: 'localhost',
          port: 5432,
          databaseName: '',
          username: '',
          password: '',
          tls: false,
        },
  );
  const [runtime, setRuntime] = useState<LocalRuntime>('docker');
  const [test, { isLoading: testing }] = useTestConnectionMutation();
  const [create, { isLoading: saving }] = useCreateConnectionMutation();
  const [saveChanges, { isLoading: updating }] = useUpdateConnectionMutation();
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const busy = testing || saving || updating;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function update<K extends keyof ConnectionInput>(key: K, value: ConnectionInput[K]) {
    setInput((s) => ({ ...s, [key]: value }));
    setFeedback({});
  }
  async function submit(save: boolean) {
    setFeedback({});
    try {
      if (save) {
        const result = connection
          ? await saveChanges({ id: connection.id, input }).unwrap()
          : await create(input).unwrap();
        close();
        await navigate({ to: '/databases/$databaseId', params: { databaseId: result.id } });
      } else {
        const result = await test(input).unwrap();
        setFeedback({ success: `Соединение установлено · ${result.latencyMs} мс` });
      }
    } catch (error) {
      setFeedback({ error: errorMessage(error) });
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="connection-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
      className="modal m-auto max-h-[90vh] w-[calc(100%-32px)] max-w-xl overflow-auto rounded-2xl border border-line bg-surface p-0 text-ink"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(true);
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="connection-title" className="text-lg font-semibold">
            {connection ? 'Изменить подключение' : 'Новое подключение'}
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            disabled={busy}
            onClick={close}
            className="rounded-md p-1 text-muted hover:bg-elevated"
          >
            <X size={20} />
          </button>
        </div>
        <fieldset disabled={busy} className="space-y-4 p-6">
          <p className="text-sm text-muted">
            {connection
              ? 'Измените адрес, пользователя или параметры TLS. Пароль оставьте пустым, чтобы сохранить текущий.'
              : 'Сохраните подключение, чтобы исследовать структуру и читать данные базы.'}
          </p>
          <label className="block text-xs font-medium text-secondary">
            Тип базы
            <select
              className="field mt-1.5"
              value={input.engine}
              onChange={(e) => {
                const engine = e.target.value as ConnectionEngine;
                setInput((s) => ({
                  ...s,
                  engine,
                  port: testPresets[engine].port,
                  authDatabase: engine === 'mongodb' ? s.databaseName : undefined,
                }));
                setFeedback({});
              }}
            >
              {Object.keys(testPresets).map((key) => (
                <option key={key} value={key}>
                  {engineLabels[key as ConnectionEngine]}
                </option>
              ))}
            </select>
          </label>
          {!connection && (
            <div className="rounded-lg border border-line bg-elevated p-4">
              <p className="text-xs font-semibold text-secondary">
                Учебные базы на этом компьютере
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Запускаются отдельным Compose в <code>../database-enjoyer-test-databases</code>.
                Кнопка ниже заполнит реальный адрес, базу, пользователя <code>enjoyer</code> и
                тестовый пароль.
              </p>
              <label className="mt-3 block text-[11px] font-semibold text-muted">
                ГДЕ РАБОТАЕТ SERVER
                <select
                  className="field mt-1.5 text-xs"
                  value={runtime}
                  onChange={(event) => setRuntime(event.target.value as LocalRuntime)}
                >
                  <option value="docker">В Docker Compose — host.docker.internal</option>
                  <option value="host">Через npm на Mac — 127.0.0.1</option>
                </select>
              </label>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-accent hover:text-accent-hover"
                onClick={() => {
                  const preset = testPresets[input.engine];
                  setInput((state) => ({
                    ...state,
                    host: testHost(runtime),
                    port: preset.port,
                    databaseName: preset.databaseName,
                    name: `${engineLabels[state.engine]} · ${preset.databaseName}`,
                    username: 'enjoyer',
                    password: preset.password,
                    authDatabase: state.engine === 'mongodb' ? 'restaurants' : undefined,
                    tls: false,
                  }));
                  setFeedback({});
                }}
              >
                Подставить тестовые реквизиты
              </button>
              <p className="mt-2 text-[11px] text-muted">
                PostgreSQL: 5433 · MySQL: 3307 · MongoDB: 27018. Для MongoDB применяется
                <code> authSource=restaurants</code>.
              </p>
            </div>
          )}
          <label className="block text-xs font-medium text-secondary">
            Название подключения
            <input
              required
              maxLength={120}
              className="field mt-1.5"
              placeholder="Например, PostgreSQL · Development"
              value={input.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
            <label className="text-xs font-medium text-secondary">
              Хост
              <input
                required
                className="field mt-1.5"
                placeholder="localhost или имя сервера"
                value={input.host}
                onChange={(e) => update('host', e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-secondary">
              Порт
              <input
                required
                type="number"
                min={1}
                max={65535}
                className="field mt-1.5"
                value={input.port}
                onChange={(e) => update('port', Number(e.target.value))}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-secondary">
            База данных
            <input
              required
              maxLength={120}
              className="field mt-1.5"
              value={input.databaseName}
              onChange={(e) => update('databaseName', e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-secondary">
              Пользователь
              <input
                required
                autoComplete="off"
                className="field mt-1.5"
                value={input.username}
                onChange={(e) => update('username', e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-secondary">
              Пароль
              <input
                type="password"
                autoComplete="new-password"
                className="field mt-1.5"
                value={input.password}
                onChange={(e) => update('password', e.target.value)}
              />
            </label>
          </div>
          {input.engine === 'mongodb' && (
            <label className="block text-xs font-medium text-secondary">
              База аутентификации (authSource)
              <input
                className="field mt-1.5"
                placeholder={input.databaseName || 'admin'}
                value={input.authDatabase ?? ''}
                onChange={(e) => update('authDatabase', e.target.value)}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              className="accent-accent"
              checked={input.tls}
              onChange={(e) => update('tls', e.target.checked)}
            />
            TLS с проверкой сертификата
          </label>
          <p className="text-[11px] leading-relaxed text-muted">
            Соединение создаёт server, а не браузер. Для Docker используйте
            <code> host.docker.internal</code>; для server, запущенного через npm на Mac, —
            <code> 127.0.0.1</code>. Внешняя БД должна быть доступна именно с машины server.
          </p>
          {feedback.error && (
            <p role="alert" className="text-xs text-danger">
              {feedback.error}
            </p>
          )}
          {feedback.success && (
            <p role="status" className="flex items-center gap-2 text-xs text-success">
              <CheckCircle2 size={15} />
              {feedback.success}
            </p>
          )}
        </fieldset>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4">
          <Button type="button" variant="secondary" disabled={busy} onClick={close}>
            Отмена
          </Button>
          {!connection && (
            <Button
              type="button"
              variant="secondary"
              disabled={
                busy || !input.host || !input.databaseName || !input.username || !input.name
              }
              onClick={() => void submit(false)}
            >
              {testing && <LoaderCircle size={15} className="animate-spin" />}Проверить
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {saving && <LoaderCircle size={15} className="animate-spin" />}
            {saving || updating
              ? 'Проверяем и обновляем…'
              : connection
                ? 'Сохранить изменения'
                : 'Подключить'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
