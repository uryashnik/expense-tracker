import type { Metadata } from 'next';

import { RegisterForm } from '@/features/auth-register';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export const metadata: Metadata = { title: 'Регистрация — Трекер расходов' };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт, чтобы начать учёт расходов.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </main>
  );
}
