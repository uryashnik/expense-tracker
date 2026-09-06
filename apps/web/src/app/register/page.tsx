import type { Metadata } from 'next';

import { RegisterForm } from '@/features/auth-register';
import { Wordmark } from '@/shared/ui/wordmark';

export const metadata: Metadata = { title: 'Регистрация — Трекер расходов' };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-7 px-5 py-12">
      <Wordmark />

      <div className="rounded-[1.75rem] border bg-surface p-7 shadow-plate">
        <h1 className="text-2xl font-extrabold tracking-tight">Регистрация</h1>
        <p className="mt-2 text-sm text-ink-muted">Создайте аккаунт, чтобы начать учёт расходов.</p>

        <div className="mt-7">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
