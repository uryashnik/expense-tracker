import type { Metadata } from 'next';

import { LoginForm } from '@/features/auth-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export const metadata: Metadata = { title: 'Вход — Трекер расходов' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Введите email и пароль от своего аккаунта.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
