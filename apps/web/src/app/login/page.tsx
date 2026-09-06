import type { Metadata } from 'next';

import { LoginForm } from '@/features/auth-login';
import { Wordmark } from '@/shared/ui/wordmark';

export const metadata: Metadata = { title: 'Вход — Трекер расходов' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-7 px-5 py-12">
      <Wordmark />

      <div className="rounded-[1.75rem] border bg-surface p-7 shadow-plate">
        <h1 className="text-2xl font-extrabold tracking-tight">Вход</h1>
        <p className="mt-2 text-sm text-ink-muted">Введите email и пароль от своего аккаунта.</p>

        <div className="mt-7">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
