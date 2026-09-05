import type { Category, Paginated, Transaction } from '@expense-tracker/shared';
import { Receipt } from 'lucide-react';

import { CategoryBadge, toCategoryMap } from '@/entities/category';
import { TransactionRow, type TransactionListQuery } from '@/entities/transaction';
import { DeleteTransactionButton } from '@/features/transaction-delete';
import { TransactionsFilter } from '@/features/transactions-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Pagination } from '@/shared/ui/pagination';
import { Separator } from '@/shared/ui/separator';
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
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-baseline gap-2">
          Транзакции
          <span className="text-sm font-normal text-ink-muted">{page.total}</span>
        </CardTitle>
        <TransactionsFilter
          categories={categories}
          value={{ type: query.type, categoryId: query.categoryId }}
        />
      </CardHeader>

      <Separator />

      <CardContent className="px-0">
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
      </CardContent>

      {totalPages > 1 ? (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-ink-muted">
              Страница {page.page} из {totalPages}
            </span>
            <Pagination
              page={page.page}
              totalPages={totalPages}
              hrefFor={(target) => buildListHref(query, target)}
            />
          </div>
        </>
      ) : null}
    </Card>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Receipt className="size-8 text-ink-muted" />
      <p className="font-medium">
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
