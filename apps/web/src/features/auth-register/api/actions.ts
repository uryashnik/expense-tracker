'use server';

import { redirect } from 'next/navigation';
import type { AuthResponse } from '@expense-tracker/shared';
import { api, type ActionErrorState, toActionErrorState } from '@/shared/api';
import { createSession } from '@/entities/session';
import { registerSchema, type RegisterInput } from '../model/schema';

export async function registerAction(input: RegisterInput): Promise<ActionErrorState> {
  // Схема уже проверена на клиенте react-hook-form'ом, но серверный экшен —
  // единственная граница к API, поэтому перепроверяем данные и здесь.
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Проверьте правильность заполнения формы' };
  }

  // RegisterDto собран с forbidNonWhitelisted: true — confirmPassword в API не отправляем.
  const { confirmPassword: _confirmPassword, ...dto } = parsed.data;

  let auth: AuthResponse;
  try {
    auth = await api.post<AuthResponse>('/auth/register', dto);
  } catch (error) {
    return toActionErrorState(error);
  }

  await createSession(auth);
  redirect('/');
}
