import type { TransactionSummary } from '@expense-tracker/shared';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

import { formatMoney, formatMonth } from '@/entities/transaction';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';

/** Итоги текущего месяца: доходы, расходы и остаток. */
export function MonthSummary({ summary }: { summary: TransactionSummary }) {
  const isPositive = summary.balance >= 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-muted">
        Итоги за {formatMonth(summary.month, summary.year)}
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Доходы"
          value={formatMoney(summary.totalIncome)}
          icon={<ArrowUpRight className="size-4" />}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCard
          label="Расходы"
          value={formatMoney(summary.totalExpense)}
          icon={<ArrowDownLeft className="size-4" />}
          valueClassName="text-ink"
        />
        <SummaryCard
          label="Баланс"
          value={formatMoney(summary.balance)}
          icon={<Wallet className="size-4" />}
          valueClassName={
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          }
        />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1 px-4">
        <span className="flex items-center gap-1.5 text-sm text-ink-muted">
          {icon}
          {label}
        </span>
        <span className={cn('text-xl font-semibold tabular-nums', valueClassName)}>{value}</span>
      </CardContent>
    </Card>
  );
}
