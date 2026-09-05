import { redirect } from 'next/navigation';
import type { TransactionType } from '@expense-tracker/shared';

import { getCategories } from '@/entities/category';
import {
  getMonthlySummary,
  getTransactions,
  type TransactionListQuery,
} from '@/entities/transaction';
import { getCurrentUser } from '@/entities/user';
import { DashboardHeader } from '@/widgets/dashboard-header';
import { MonthSummary } from '@/widgets/month-summary';
import { buildListHref, TransactionList } from '@/widgets/transaction-list';

type SearchParams = Record<string, string | string[] | undefined>;

/** Один параметр query-строки: повторы (?type=a&type=b) сводим к первому значению. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Разбор query-строки в фильтры списка. Мусор игнорируем молча: адрес правит
 * пользователь, и на «?page=abc» экран должен показать первую страницу,
 * а не ошибку. Настоящая валидация всё равно на стороне API.
 */
function parseQuery(searchParams: SearchParams): TransactionListQuery {
  const page = Number(first(searchParams.page));
  const type = first(searchParams.type);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    type: type === 'INCOME' || type === 'EXPENSE' ? (type as TransactionType) : undefined,
    categoryId: first(searchParams.categoryId),
  };
}

/** Главный экран: сводка за месяц и список транзакций. Только для вошедших. */
export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const query = parseQuery(await searchParams);
  const now = new Date();

  // Один Promise.all вместо запросов внутри виджетов: вложенные серверные
  // компоненты выстроили бы три обращения к API в водопад.
  const [categories, transactions, summary] = await Promise.all([
    getCategories(),
    getTransactions(query),
    getMonthlySummary(now.getMonth() + 1, now.getFullYear()),
  ]);

  // Страница за пределами списка (сохранённая ссылка, удалили записи, сменили
  // фильтр) даёт пустой ответ при ненулевом total — вместо пустоты уводим
  // на последнюю существующую страницу.
  const totalPages = Math.ceil(transactions.total / transactions.limit);
  if (totalPages > 0 && transactions.page > totalPages) {
    redirect(buildListHref(query, totalPages));
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <DashboardHeader user={user} categories={categories} />
      <MonthSummary summary={summary} />
      <TransactionList page={transactions} categories={categories} query={query} />
    </main>
  );
}
