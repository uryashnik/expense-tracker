'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Category, TransactionType } from '@expense-tracker/shared';

import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

/** Radix Select не принимает пустую строку как значение — «все» кодируем отдельным ключом. */
const ANY = 'all';

export interface TransactionsFilterValue {
  type?: TransactionType;
  categoryId?: string;
}

/**
 * Фильтры списка транзакций. Состояние живёт в query-строке, а не в useState:
 * список рисует серверный компонент, поэтому смена фильтра — это навигация,
 * которую он и перезапрашивает. Заодно фильтр переживает перезагрузку и шарится ссылкой.
 *
 * Текущие значения приходят пропсами: страница их уже разобрала, а useSearchParams
 * потребовал бы Suspense-границы ради тех же данных.
 */
export function TransactionsFilter({
  categories,
  value,
}: {
  categories: Category[];
  value: TransactionsFilterValue;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const apply = (next: TransactionsFilterValue) => {
    const search = new URLSearchParams();
    if (next.type) {
      search.set('type', next.type);
    }
    if (next.categoryId) {
      search.set('categoryId', next.categoryId);
    }
    // page намеренно не переносим: после смены фильтра страница 3 может уже не существовать.
    const query = search.toString();
    startTransition(() => router.push(query ? `/?${query}` : '/'));
  };

  const isFiltered = Boolean(value.type || value.categoryId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.type ?? ANY}
        onValueChange={(next) =>
          apply({ ...value, type: next === ANY ? undefined : (next as TransactionType) })
        }
      >
        <SelectTrigger className="w-36" aria-label="Тип операции">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Все типы</SelectItem>
          <SelectItem value="EXPENSE">Расходы</SelectItem>
          <SelectItem value="INCOME">Доходы</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.categoryId ?? ANY}
        onValueChange={(next) => apply({ ...value, categoryId: next === ANY ? undefined : next })}
        disabled={categories.length === 0}
      >
        <SelectTrigger className="w-48" aria-label="Категория">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Все категории</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span aria-hidden>{category.icon}</span>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltered ? (
        <Button variant="ghost" size="sm" onClick={() => apply({})} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          Сбросить
        </Button>
      ) : null}
    </div>
  );
}
