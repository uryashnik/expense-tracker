import type { AuthUser, Category } from '@expense-tracker/shared';

import { LogoutMenuItem } from '@/features/auth-logout';
import { CategoryDialog } from '@/features/category-create';
import { TransactionDialog } from '@/features/transaction-create';
import { Wordmark } from '@/shared/ui/wordmark';
import { UserMenu } from './user-menu';

/**
 * Шапка главного экрана: марка, меню действий (новая транзакция и категория)
 * и профиль пользователя.
 *
 * Шапка живёт прямо на холсте, без своей плиты и разделителя: пустое поле
 * вокруг отделяет её от контента лучше, чем линия.
 */
export function DashboardHeader({ user, categories }: { user: AuthUser; categories: Category[] }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <Wordmark />

      <div className="ml-auto flex items-center gap-2">
        <CategoryDialog />
        <TransactionDialog categories={categories} />
        <UserMenu user={user} logout={<LogoutMenuItem />} />
      </div>
    </header>
  );
}
