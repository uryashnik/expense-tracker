'use client';

import { useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { deleteTransactionAction } from '../api/actions';

/**
 * Удаление транзакции с подтверждением: операция необратима, а строки списка
 * стоят вплотную друг к другу — по одному клику удалять слишком легко.
 */
export function DeleteTransactionButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (result.status === 'success') {
        setOpen(false);
        return;
      }
      setError(result.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Удалить: ${label}`}>
          <Trash2 className="size-4 text-ink-muted" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Удалить транзакцию?</DialogTitle>
          <DialogDescription>{label}. Действие нельзя отменить.</DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Не удалось удалить</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
