import type { Category } from '@expense-tracker/shared';
import { cn } from '@/shared/lib/utils';

/**
 * Категория в списках: иконка на фоне её цвета плюс название.
 * color приходит из API как hex-строка, поэтому задаётся инлайн-стилем —
 * классом Tailwind произвольный пользовательский цвет не выразить.
 */
export function CategoryBadge({
  category,
  className,
}: {
  category: Category | undefined;
  className?: string;
}) {
  if (!category) {
    return <span className={cn('text-sm text-ink-muted', className)}>Без категории</span>;
  }

  return (
    <span className={cn('flex items-center gap-2 text-sm', className)}>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: `${category.color}22`, color: category.color }}
      >
        {category.icon}
      </span>
      <span className="truncate font-medium">{category.name}</span>
    </span>
  );
}
