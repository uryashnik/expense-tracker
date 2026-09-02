import Link from 'next/link';

import { getCurrentUser } from '@/entities/user';
import { LogoutButton } from '@/features/auth-logout';

/** Серверный компонент: сам решает, вошёл пользователь или нет, и что показать. */
export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Войти
        </Link>
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Зарегистрироваться
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-ink-muted">
        Вы вошли как <span className="font-medium text-ink">{user.name}</span>
      </span>
      <LogoutButton />
    </div>
  );
}
