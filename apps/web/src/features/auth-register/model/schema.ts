import { z } from 'zod';

/**
 * Зеркалит ограничения RegisterDto из apps/api (см. apps/api/src/auth/dto/register.dto.ts),
 * чтобы пользователь видел ошибку до запроса к API. confirmPassword — только для формы,
 * в API не отправляется (см. apps/web/src/features/auth-register/api/actions.ts).
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Имя должно быть от 2 до 100 символов')
      .max(100, 'Имя должно быть от 2 до 100 символов'),
    email: z.string().trim().min(1, 'Введите email').email('Введите корректный email'),
    password: z
      .string()
      .min(8, 'Пароль должен быть не короче 8 символов')
      .max(72, 'Пароль должен быть не длиннее 72 символов')
      .regex(
        /(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d)/,
        'Пароль должен содержать хотя бы одну букву и одну цифру',
      ),
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
