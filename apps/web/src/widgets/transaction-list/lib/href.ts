import type { Route } from 'next';
import type { TransactionListQuery } from '@/entities/transaction';

/**
 * Ссылка на страницу списка с сохранением текущих фильтров.
 * Пагинация меняет только page, всё остальное должно доехать без потерь —
 * иначе переход на вторую страницу сбрасывал бы выбранную категорию.
 */
export function buildListHref(query: TransactionListQuery, page: number): Route {
  const search = new URLSearchParams();
  if (page > 1) {
    search.set('page', String(page));
  }
  if (query.type) {
    search.set('type', query.type);
  }
  if (query.categoryId) {
    search.set('categoryId', query.categoryId);
  }

  const serialized = search.toString();
  // Приведение к Route обязательно: при typedRoutes собранный из частей адрес
  // для TypeScript остаётся обычной строкой, проверить его статически нельзя.
  return (serialized ? `/?${serialized}` : '/') as Route;
}
