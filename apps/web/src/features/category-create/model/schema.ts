import { z } from 'zod';

/** Зеркалит CreateCategoryDto (apps/api/src/categories/dto/create-category.dto.ts). */
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(50, 'Не длиннее 50 символов'),
  // @IsHexColor в DTO; <input type="color"> и так отдаёт значение в этом формате.
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Выберите цвет'),
  icon: z.string().trim().min(1, 'Выберите иконку').max(50, 'Не длиннее 50 символов'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** Готовый набор иконок: Category.icon — свободная строка, эмодзи не требует словаря имён. */
export const CATEGORY_ICONS = [
  '🛒',
  '🍽️',
  '🚕',
  '🏠',
  '💊',
  '🎓',
  '🎬',
  '👕',
  '✈️',
  '🎁',
  '📱',
  '💰',
] as const;

/** Палитра по умолчанию — чтобы не подбирать цвет вручную в каждой категории. */
export const CATEGORY_COLORS = [
  '#2f6feb',
  '#16a34a',
  '#dc2626',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#ca8a04',
  '#db2777',
] as const;
