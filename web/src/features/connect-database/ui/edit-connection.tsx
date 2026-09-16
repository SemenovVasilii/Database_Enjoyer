import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { DatabaseDetails } from '@/shared/api/contracts';
import { Button } from '@/shared/ui';
import { ConnectionDialog } from './connect-database';

export function EditConnectionButton({ connection }: { connection: DatabaseDetails }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={15} />
        <span className="hidden sm:inline">Изменить</span>
      </Button>
      {open && <ConnectionDialog connection={connection} close={() => setOpen(false)} />}
    </>
  );
}
