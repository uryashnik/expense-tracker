import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthResponse } from '@expense-tracker/shared';

const SESSION_COOKIE = 'accessToken';

/** Сохраняет access-токен в httpOnly cookie на срок его жизни (expiresIn, сек). */
export async function createSession({
  accessToken,
  expiresIn,
}: Pick<AuthResponse, 'accessToken' | 'expiresIn'>): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn,
  });
}

/** Токен текущей сессии или undefined, если пользователь не авторизован. */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

/**
 * Заголовки для запроса к API от имени текущего пользователя.
 * Без токена (не вошёл или кука истекла) уводит на /login — так истёкшая
 * сессия одинаково обрабатывается и на страницах, и в серверных экшенах.
 *
 * redirect() бросает NEXT_REDIRECT, поэтому вызывать его нужно вне try/catch,
 * иначе catch проглотит переход и превратит его в «ошибку запроса».
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    redirect('/login');
  }
  return { Authorization: `Bearer ${token}` };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
