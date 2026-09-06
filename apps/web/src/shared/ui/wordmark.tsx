import { Wallet } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/**
 * Марка приложения: чернильный квадрат с иконкой и название.
 * Один компонент на шапку и экраны входа — иначе марка расходится
 * в размерах от страницы к странице.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-2xl bg-accent text-on-accent"
      >
        <Wallet className="size-5" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">Трекер расходов</span>
    </span>
  );
}
