import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Download, FileJson, Plus, Upload, X } from 'lucide-react';
import type { ImportDatabaseInput } from '@/shared/api/contracts';
import { useImportDatabaseMutation } from '@/entities/database';
import { errorMessage } from '@/shared/lib';
import { Button } from '@/shared/ui';

export function ImportDatabaseButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        <Plus size={16} />
        Импортировать базу
      </Button>
      {open && <ImportDialog close={() => setOpen(false)} />}
    </>
  );
}

function ImportDialog({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [fileName, setFileName] = useState('');
  const [input, setInput] = useState<ImportDatabaseInput>();
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const readSequence = useRef(0);
  const [importDatabase, { isLoading, error }] = useImportDatabaseMutation();
  const navigate = useNavigate();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function readFile(file?: File) {
    if (!file) return;
    const sequence = ++readSequence.current;
    setInput(undefined);
    setFileError('');
    setFileName(file.name);
    setReading(false);
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Файл должен быть меньше 5 МБ.');
      return;
    }
    setReading(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('name' in parsed) ||
        typeof parsed.name !== 'string' ||
        !('engine' in parsed) ||
        typeof parsed.engine !== 'string' ||
        !('schemas' in parsed) ||
        !Array.isArray(parsed.schemas)
      )
        throw new Error('Invalid snapshot');
      if (sequence === readSequence.current) setInput(parsed as ImportDatabaseInput);
    } catch {
      if (sequence === readSequence.current)
        setFileError(
          'Не удалось прочитать снимок. Нужен JSON с полями name, engine и schemas. Скачайте пример ниже.',
        );
    } finally {
      if (sequence === readSequence.current) setReading(false);
    }
  }

  async function submit() {
    if (!input) return;
    try {
      const database = await importDatabase(input).unwrap();
      close();
      await navigate({ to: '/databases/$databaseId', params: { databaseId: database.id } });
    } catch {
      /* RTK Query exposes validation and network errors below. */
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="import-title"
      onCancel={(event) => {
        if (isLoading) event.preventDefault();
        else close();
      }}
      className="modal m-auto w-[calc(100%-32px)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <h2 id="import-title" className="text-lg font-semibold">
          Импорт метаданных
        </h2>
        <button
          aria-label="Закрыть"
          disabled={isLoading}
          onClick={close}
          className="rounded-md p-1 text-muted hover:bg-elevated hover:text-ink"
        >
          <X size={20} />
        </button>
      </div>
      <div className="space-y-5 p-6">
        <p className="text-sm leading-relaxed text-muted">
          Загрузите JSON-снимок структуры базы. Схемы, таблицы и колонки появятся в вашем рабочем
          пространстве.
        </p>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!isLoading) void readFile(event.dataTransfer.files[0]);
          }}
          className="relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-elevated px-6 py-9 text-center hover:border-accent/35 hover:bg-accent/5"
        >
          <input
            aria-label="JSON-файл метаданных"
            type="file"
            accept=".json,application/json"
            disabled={isLoading || reading}
            onChange={(event) => void readFile(event.target.files?.[0])}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {input ? (
            <CheckCircle2 size={28} className="text-success" />
          ) : (
            <Upload size={28} className="text-accent" />
          )}
          <span className="max-w-full break-all text-sm">
            {reading ? 'Читаем файл…' : fileName || 'Выберите файл или перетащите сюда'}
          </span>
          <span className="text-xs text-muted">JSON · до 5 МБ</span>
        </label>
        {input && (
          <div className="flex items-center gap-3 rounded-lg border border-line p-3">
            <FileJson size={20} className="shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm">{input.name}</p>
              <p className="text-xs text-muted">
                {input.engine} · {input.schemas.length} схем
              </p>
            </div>
          </div>
        )}
        {(fileError || error) && (
          <p role="alert" className="break-words text-xs leading-relaxed text-danger">
            {fileError || errorMessage(error)}
          </p>
        )}
        <a
          href="/sample-metadata.json"
          download
          className="inline-flex items-center gap-2 text-xs text-accent hover:underline"
        >
          <Download size={14} />
          Скачать пример снимка
        </a>
      </div>
      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <Button variant="secondary" disabled={isLoading} onClick={close}>
          Отмена
        </Button>
        <Button disabled={!input || isLoading || reading} onClick={() => void submit()}>
          {isLoading ? 'Импортируем…' : 'Импортировать'}
        </Button>
      </div>
    </dialog>
  );
}
