import type { AuthUser, Category } from '@expense-tracker/shared';
import { Wallet } from 'lucide-react';

import { LogoutMenuItem } from '@/features/auth-logout';
import { CategoryDialog } from '@/features/category-create';
import { TransactionDialog } from '@/features/transaction-create';
import { UserMenu } from './user-menu';

/**
 * Шапка главного экрана: название, меню действий (новая транзакция и категория)
 * и профиль пользователя.
 */
export function DashboardHeader({ user, categories }: { user: AuthUser; categories: Category[] }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b pb-4">
      <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Wallet className="size-5 text-primary" />
        Трекер расходов
      </span>

      <div className="ml-auto flex items-center gap-2">
        <CategoryDialog />
        <TransactionDialog categories={categories} />
        <UserMenu user={user} logout={<LogoutMenuItem />} />
      </div>
    </header>
  );
}
