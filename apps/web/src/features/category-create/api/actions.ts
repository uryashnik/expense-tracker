'use server';

import { revalidatePath } from 'next/cache';
import type { Category } from '@expense-tracker/shared';
import { api, type ActionErrorState, toActionErrorState } from '@/shared/api';
import { getAuthHeaders } from '@/entities/session';
import { createCategorySchema, type CreateCategoryInput } from '../model/schema';

export type CreateCategoryResult = ActionErrorState | { status: 'success'; category: Category };

export async function createCategoryAction(
  input: CreateCategoryInput,
): Promise<CreateCategoryResult> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Проверьте правильность заполнения формы' };
  }

  // Вне try: при истёкшей сессии getAuthHeaders делает redirect через
  // NEXT_REDIRECT-исключение, и catch ниже проглотил бы переход.
  const headers = await getAuthHeaders();

  let category: Category;
  try {
    category = await api.post<Category>('/categories', parsed.data, { headers });
  } catch (error) {
    return toActionErrorState(error);
  }

  revalidatePath('/');
  return { status: 'success', category };
}
