import 'server-only';
import { cookies } from 'next/headers';
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

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
