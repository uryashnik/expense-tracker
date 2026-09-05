import 'server-only';
import type { Category } from '@expense-tracker/shared';
import { api } from '@/shared/api';
import { getAuthHeaders } from '@/entities/session';

/** Все категории текущего пользователя, в порядке создания. */
export async function getCategories(): Promise<Category[]> {
  return api.get<Category[]>('/categories', { headers: await getAuthHeaders() });
}
