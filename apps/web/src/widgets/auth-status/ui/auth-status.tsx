import Link from 'next/link';

import { getCurrentUser } from '@/entities/user';
import { LogoutButton } from '@/features/auth-logout';

/** Серверный компонент: сам решает, вошёл пользователь или нет, и что показать. */
export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/login"
          className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
        >
          Войти
        </Link>
        <Link
          href="/register"
          className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
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
