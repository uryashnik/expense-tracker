'use server';

import { revalidatePath } from 'next/cache';
import type { Transaction } from '@expense-tracker/shared';
import { api, type ActionErrorState, toActionErrorState } from '@/shared/api';
import { getAuthHeaders } from '@/entities/session';
import { createTransactionSchema, type CreateTransactionInput } from '../model/schema';

export type CreateTransactionResult = ActionErrorState | { status: 'success' };

export async function createTransactionAction(
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Проверьте правильность заполнения формы' };
  }

  // Вне try: при истёкшей сессии getAuthHeaders делает redirect через
  // NEXT_REDIRECT-исключение, и catch ниже проглотил бы переход.
  const headers = await getAuthHeaders();

  try {
    await api.post<Transaction>('/transactions', parsed.data, { headers });
  } catch (error) {
    return toActionErrorState(error);
  }

  revalidatePath('/');
  return { status: 'success' };
}
