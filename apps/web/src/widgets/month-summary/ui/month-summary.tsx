import type { ReactNode } from 'react';
import type { TransactionSummary } from '@expense-tracker/shared';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

import { formatMoney, formatMonth } from '@/entities/transaction';
import { cn } from '@/shared/lib/utils';

/**
 * Итоги текущего месяца: доходы, расходы и остаток.
 *
 * Плитки не одинаковые: остаток — главное число экрана, поэтому он один
 * набран на тёмном, а доходы и расходы остаются пастельными. Цвет здесь
 * различает типы данных, а не украшает — теней у плиток нет вовсе.
 */
export function MonthSummary({ summary }: { summary: TransactionSummary }) {
  const isPositive = summary.balance >= 0;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold tracking-tight">
        {formatMonth(summary.month, summary.year)}
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          label="Доходы"
          value={formatMoney(summary.totalIncome)}
          icon={<ArrowUpRight className="size-5" />}
          className="bg-mint"
          valueClassName="text-positive"
        />
        <SummaryTile
          label="Расходы"
          value={formatMoney(summary.totalExpense)}
          icon={<ArrowDownLeft className="size-5" />}
          className="bg-peach"
        />
        <SummaryTile
          // При отрицательном остатке меняется подпись, а не цвет: плитка
          // инвертирует тему целиком, и красный на ней читается плохо в обоих
          // случаях — слово говорит то же самое и точнее.
          label={isPositive ? 'Остаток' : 'Перерасход'}
          value={formatMoney(summary.balance)}
          icon={<Wallet className="size-5" />}
          className="bg-night text-night-ink"
          iconClassName="bg-night-icon text-night-ink"
          labelClassName="text-night-muted"
        />
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  className,
  iconClassName,
  valueClassName,
  labelClassName,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
  labelClassName?: string;
}) {
  return (
    <article className={cn('flex flex-col gap-4 rounded-3xl p-5 sm:gap-6 sm:p-6', className)}>
      <span
        aria-hidden
        className={cn(
          'flex size-10 items-center justify-center rounded-2xl bg-accent text-on-accent',
          iconClassName,
        )}
      >
        {icon}
      </span>

      <div className="flex flex-col gap-1">
        <span
          className={cn(
            'text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums',
            valueClassName,
          )}
        >
          {value}
        </span>
        <span className={cn('text-sm font-medium text-ink-muted', labelClassName)}>{label}</span>
      </div>
    </article>
  );
}
