import type { ReactNode } from 'react';
import type { Transaction } from '@expense-tracker/shared';
import { cn } from '@/shared/lib/utils';
import { formatSignedMoney, formatTransactionDate } from '../lib/format';

/**
 * Строка списка транзакций.
 *
 * category и actions — слоты, а не готовая вёрстка: транзакция знает только
 * categoryId, а сущности одного слоя не импортируют друг друга напрямую
 * (см. правила слоёв в CLAUDE.md), поэтому и категорию, и действия над строкой
 * (слой features) собирает вызывающий виджет.
 */
export function TransactionRow({
  transaction,
  category,
  actions,
}: {
  transaction: Transaction;
  category?: ReactNode;
  actions?: ReactNode;
}) {
  const isIncome = transaction.type === 'INCOME';

  return (
    <li className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/60 sm:gap-4 sm:px-7">
      <div className="min-w-0 flex-1">{category}</div>

      <div className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
        {transaction.description ? (
          <span className="truncate text-sm">{transaction.description}</span>
        ) : null}
        <span className="text-xs text-ink-muted">{formatTransactionDate(transaction.date)}</span>
      </div>

      <span
        className={cn(
          // min-w фиксирует колонку суммы: без него её ширина зависит от числа,
          // и соседняя колонка с описанием дёргается от строки к строке.
          'w-32 shrink-0 text-right text-[0.9375rem] font-extrabold tracking-tight tabular-nums',
          isIncome ? 'text-positive' : 'text-ink',
        )}
      >
        {formatSignedMoney(transaction.amount, transaction.type)}
      </span>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </li>
  );
}
