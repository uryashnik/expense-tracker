'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';

import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { logoutAction } from '../api/actions';

/**
 * Выход как пункт выпадающего меню. Отдельный компонент, а не LogoutButton
 * внутри меню: DropdownMenuItem должен остаться прямым потомком меню, иначе
 * теряются клавиатурная навигация и закрытие по выбору.
 */
export function LogoutMenuItem() {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={isPending}
      // Меню закроет себя само; preventDefault не нужен — logoutAction уводит на /login.
      onSelect={() => startTransition(() => void logoutAction())}
    >
      <LogOut />
      Выйти
    </DropdownMenuItem>
  );
}
