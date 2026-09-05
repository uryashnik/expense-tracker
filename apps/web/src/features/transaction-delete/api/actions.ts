'use server';

import { revalidatePath } from 'next/cache';
import { api, type ActionErrorState, toActionErrorState } from '@/shared/api';
import { getAuthHeaders } from '@/entities/session';

export type DeleteTransactionResult = ActionErrorState | { status: 'success' };

export async function deleteTransactionAction(id: string): Promise<DeleteTransactionResult> {
  // Вне try: при истёкшей сессии getAuthHeaders делает redirect через
  // NEXT_REDIRECT-исключение, и catch ниже проглотил бы переход.
  const headers = await getAuthHeaders();

  try {
    await api.delete(`/transactions/${id}`, { headers });
  } catch (error) {
    return toActionErrorState(error);
  }

  revalidatePath('/');
  return { status: 'success' };
}
