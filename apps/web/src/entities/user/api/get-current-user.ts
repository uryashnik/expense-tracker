import 'server-only';
import type { AuthUser } from '@expense-tracker/shared';
import { api } from '@/shared/api';
import { getAccessToken } from '@/entities/session';

/** Текущий пользователь по access-токену из cookie; null — если не авторизован или токен недействителен. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  try {
    return await api.get<AuthUser>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }
}
