'use client';

import type { ReactNode } from 'react';
import type { AuthUser } from '@expense-tracker/shared';

import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

/** Инициалы для аватара: первые буквы двух первых слов имени. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Профиль в шапке: аватар с инициалами и меню с данными аккаунта.
 * logout — слот: сам выход живёт в features/auth-logout, а виджет только
 * отводит ему место в меню.
 */
export function UserMenu({ user, logout }: { user: AuthUser; logout: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 p-0" aria-label="Профиль">
          <Avatar className="size-11">
            <AvatarFallback className="border bg-surface text-sm font-extrabold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium">{user.name}</span>
          <span className="truncate text-xs font-normal text-ink-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {logout}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
