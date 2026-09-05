import { z } from 'zod';

/**
 * Зеркалит CreateTransactionDto (apps/api/src/transactions/dto/create-transaction.dto.ts).
 *
 * amount описан строкой с преобразованием в число: <input> отдаёт строку,
 * а DTO ждёт положительное число максимум с двумя знаками после запятой
 * (@db.Decimal(12, 2)). Запятая как разделитель тоже принимается — её вводят
 * чаще точки. Поэтому у схемы разные вход и выход, см. типы ниже.
 */
export const createTransactionSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Введите сумму')
    .refine(
      (value) => /^\d+([.,]\d{1,2})?$/.test(value),
      'Сумма — число не более чем с двумя знаками после запятой',
    )
    .transform((value) => Number(value.replace(',', '.')))
    .refine((value) => value > 0, 'Сумма должна быть больше нуля'),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid('Выберите категорию'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
  // Пустое поле выкидываем, а не шлём '': в API description необязателен.
  description: z
    .string()
    .trim()
    .max(500, 'Не длиннее 500 символов')
    .optional()
    .transform((value) => value || undefined),
});

/** Значения формы: всё, что вводит пользователь, — строки. */
export type CreateTransactionInput = z.input<typeof createTransactionSchema>;

/** Тело запроса POST /transactions после разбора схемы. */
export type CreateTransactionPayload = z.output<typeof createTransactionSchema>;
