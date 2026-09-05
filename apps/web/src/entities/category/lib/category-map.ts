import type { Category } from '@expense-tracker/shared';

/**
 * Индекс категорий по id. Транзакция хранит только categoryId, а API отдаёт
 * категории отдельным списком — вместо запроса на каждую строку списка
 * подмешиваем их из этого индекса.
 */
export function toCategoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((category) => [category.id, category]));
}
