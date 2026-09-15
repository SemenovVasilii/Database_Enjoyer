import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useDeleteDatabaseMutation } from '@/entities/database';
import { errorMessage } from '@/shared/lib';
import { Button } from '@/shared/ui';

export function DeleteDatabaseButton({
  id,
  name,
  connection = false,
}: {
  id: string;
  name: string;
  connection?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-label={connection ? 'Удалить подключение' : 'Удалить снимок'}
      >
        <Trash2 size={15} />
        <span className="hidden sm:inline">Удалить</span>
      </Button>
      {open && (
        <DeleteDialog id={id} name={name} connection={connection} close={() => setOpen(false)} />
      )}
    </>
  );
}

function DeleteDialog({
  id,
  name,
  close,
  connection,
}: {
  id: string;
  name: string;
  close: () => void;
  connection: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [deleteDatabase, { isLoading, error }] = useDeleteDatabaseMutation();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function remove() {
    try {
      await deleteDatabase(id).unwrap();
      close();
      await navigate({ to: '/' });
    } catch {
      /* Mutation error is shown in the dialog. */
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-title"
      onCancel={(event) => {
        if (isLoading) event.preventDefault();
        else close();
      }}
      className="modal m-auto w-[calc(100%-32px)] max-w-md rounded-2xl border border-line bg-surface p-6 text-ink"
    >
      <h2 id="delete-title" className="text-lg font-semibold">
        {connection ? 'Удалить подключение?' : 'Удалить снимок?'}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {connection ? 'Подключение' : 'Снимок'} «{name}» и его метаданные будут удалены из каталога.
        Исходная база данных останется без изменений.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-xs text-danger">
          {errorMessage(error)}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" disabled={isLoading} onClick={close}>
          Отмена
        </Button>
        <Button variant="danger" disabled={isLoading} onClick={() => void remove()}>
          {isLoading ? 'Удаляем…' : connection ? 'Удалить подключение' : 'Удалить снимок'}
        </Button>
      </div>
    </dialog>
  );
}
