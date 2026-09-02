'use server';

import { redirect } from 'next/navigation';
import type { AuthResponse } from '@expense-tracker/shared';
import { api, type ActionErrorState, toActionErrorState } from '@/shared/api';
import { createSession } from '@/entities/session';
import { loginSchema, type LoginInput } from '../model/schema';

export async function loginAction(input: LoginInput): Promise<ActionErrorState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Проверьте правильность заполнения формы' };
  }

  let auth: AuthResponse;
  try {
    auth = await api.post<AuthResponse>('/auth/login', parsed.data);
  } catch (error) {
    return toActionErrorState(error);
  }

  await createSession(auth);
  redirect('/');
}
