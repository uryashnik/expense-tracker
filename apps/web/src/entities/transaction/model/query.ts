import type { TransactionType } from '@expense-tracker/shared';

/** Сколько транзакций показывает одна страница списка. Совпадает с limit по умолчанию в API. */
export const TRANSACTIONS_PAGE_SIZE = 10;

/** Фильтры и страница списка транзакций — то, что уходит в query-строку GET /transactions. */
export interface TransactionListQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
}
