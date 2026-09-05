import type { Route } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

/** Сколько номеров показывать вокруг текущей страницы. */
const SIBLINGS = 1;

type PageItem = number | 'gap';

/**
 * Номера страниц с многоточиями: всегда первая и последняя, вокруг текущей —
 * по SIBLINGS соседей. Разрывы схлопываются в 'gap', чтобы полоса не росла
 * бесконечно на длинной истории.
 */
export function getPageItems(page: number, totalPages: number): PageItem[] {
  const pages = new Set<number>([1, totalPages]);
  for (let i = page - SIBLINGS; i <= page + SIBLINGS; i += 1) {
    if (i >= 1 && i <= totalPages) {
      pages.add(i);
    }
  }

  const items: PageItem[] = [];
  let previous = 0;
  for (const current of [...pages].sort((a, b) => a - b)) {
    if (previous && current - previous > 1) {
      items.push('gap');
    }
    items.push(current);
    previous = current;
  }
  return items;
}

/**
 * Постраничная навигация ссылками: страница — это адрес, поэтому кнопки браузера
 * и «открыть в новой вкладке» работают сами собой, а серверный компонент списка
 * перезапрашивается штатной навигацией Next.
 *
 * hrefFor задаёт вызывающий код — он один знает, какие ещё параметры нужно
 * сохранить в query-строке. Возвращает Route: в next.config включён typedRoutes.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => Route;
  className?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const linkClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'icon' }),
      active && 'font-semibold',
    );

  return (
    <nav aria-label="Страницы списка" className={cn('flex items-center gap-1', className)}>
      <PageLink
        href={hrefFor(page - 1)}
        disabled={page <= 1}
        className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        aria-label="Предыдущая страница"
      >
        <ChevronLeft className="size-4" />
      </PageLink>

      {getPageItems(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? 'page' : undefined}
            className={linkClass(item === page)}
          >
            {item}
          </Link>
        ),
      )}

      <PageLink
        href={hrefFor(page + 1)}
        disabled={page >= totalPages}
        className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        aria-label="Следующая страница"
      >
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

/** Стрелка «назад/вперёд»: на краю списка это не ссылка, а неактивная заглушка. */
function PageLink({
  href,
  disabled,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { disabled: boolean }) {
  if (disabled) {
    return (
      <span aria-disabled className={cn(className, 'pointer-events-none opacity-40')} {...props}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}
