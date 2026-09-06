import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope } from 'next/font/google';
import './globals.css';

/*
 * Manrope: геометричный гротеск с очень плотным ExtraBold и табличными цифрами —
 * заголовки и суммы держатся на одном семействе, второй шрифт не нужен.
 * Кириллица подключена явно: без неё Next отдал бы латинский сабсет,
 * и весь русский текст рисовался бы системным фолбэком.
 */
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Трекер расходов',
  description: 'Учёт личных расходов',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
