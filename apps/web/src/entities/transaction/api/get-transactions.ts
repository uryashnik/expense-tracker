import 'server-only';
import type { Paginated, Transaction, TransactionSummary } from '@expense-tracker/shared';
import { api } from '@/shared/api';
import { getAuthHeaders } from '@/entities/session';
import { TRANSACTIONS_PAGE_SIZE, type TransactionListQuery } from '../model/query';

/** Страница транзакций текущего пользователя, отсортированная по дате (свежие сверху). */
export async function getTransactions(
  query: TransactionListQuery = {},
): Promise<Paginated<Transaction>> {
  const search = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? TRANSACTIONS_PAGE_SIZE),
  });
  // Пустые фильтры не отправляем: в API включён forbidNonWhitelisted,
  // и `type=` с пустым значением не пройдёт @IsEnum.
  if (query.type) {
    search.set('type', query.type);
  }
  if (query.categoryId) {
    search.set('categoryId', query.categoryId);
  }

  return api.get<Paginated<Transaction>>(`/transactions?${search}`, {
    headers: await getAuthHeaders(),
  });
}

/** Итоги за календарный месяц: доходы, расходы и баланс. */
export async function getMonthlySummary(month: number, year: number): Promise<TransactionSummary> {
  return api.get<TransactionSummary>(`/transactions/summary?month=${month}&year=${year}`, {
    headers: await getAuthHeaders(),
  });
}
