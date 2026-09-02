import { z } from 'zod';

/** Зеркалит LoginDto из apps/api (см. apps/api/src/auth/dto/login.dto.ts): только непустые поля. */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Введите email').email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginInput = z.infer<typeof loginSchema>;
