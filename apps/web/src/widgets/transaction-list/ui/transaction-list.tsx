import type { Category, Paginated, Transaction } from '@expense-tracker/shared';
import { Receipt } from 'lucide-react';

import { CategoryBadge, toCategoryMap } from '@/entities/category';
import { TransactionRow, type TransactionListQuery } from '@/entities/transaction';
import { DeleteTransactionButton } from '@/features/transaction-delete';
import { TransactionsFilter } from '@/features/transactions-filter';
import { Pagination } from '@/shared/ui/pagination';
import { buildListHref } from '../lib/href';

/**
 * Список транзакций с фильтрами и постраничной навигацией.
 *
 * Данные приходят пропсами: страница грузит их вместе со сводкой одним
 * Promise.all, а запрос изнутри виджета выстроил бы их в водопад.
 */
export function TransactionList({
  page,
  categories,
  query,
}: {
  page: Paginated<Transaction>;
  categories: Category[];
  query: TransactionListQuery;
}) {
  const categoryById = toCategoryMap(categories);
  const totalPages = Math.max(1, Math.ceil(page.total / page.limit));
  const isFiltered = Boolean(query.type || query.categoryId);

  return (
    <section className="rounded-[1.75rem] border bg-surface shadow-plate">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
          Транзакции
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-ink-muted tabular-nums">
            {page.total}
          </span>
        </h2>
        <TransactionsFilter
          categories={categories}
          value={{ type: query.type, categoryId: query.categoryId }}
        />
      </div>

      <div className="border-t">
        {page.items.length === 0 ? (
          <EmptyState isFiltered={isFiltered} />
        ) : (
          <ul className="divide-y">
            {page.items.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={<CategoryBadge category={categoryById.get(transaction.categoryId)} />}
                actions={
                  <DeleteTransactionButton
                    id={transaction.id}
                    label={transaction.description ?? 'Транзакция без описания'}
                  />
                }
              />
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4 border-t px-5 py-4 sm:px-7">
          <span className="text-sm font-medium text-ink-muted">
            Страница {page.page} из {totalPages}
          </span>
          <Pagination
            page={page.page}
            totalPages={totalPages}
            hrefFor={(target) => buildListHref(query, target)}
          />
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-ink-muted"
      >
        <Receipt className="size-6" />
      </span>
      <p className="text-base font-extrabold tracking-tight">
        {isFiltered ? 'Под фильтр ничего не подошло' : 'Транзакций пока нет'}
      </p>
      <p className="max-w-sm text-sm text-ink-muted">
        {isFiltered
          ? 'Смените тип или категорию — либо сбросьте фильтры.'
          : 'Добавьте первую операцию кнопкой «Транзакция» наверху страницы.'}
      </p>
    </div>
  );
}
