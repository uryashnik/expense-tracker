import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/utils';

/*
 * Кнопки — пилюли: в этом интерфейсе скруглением кодируется роль элемента.
 * Полное скругление у действий, крупный радиус у карточек, средний у полей ввода.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-pill hover:bg-primary/85',
        destructive:
          'bg-destructive text-white shadow-pill hover:bg-destructive/90 focus-visible:outline-destructive',
        outline: 'border bg-surface hover:bg-secondary hover:text-secondary-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        link: 'text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink',
      },
      size: {
        default: 'h-10 px-5 has-[>svg]:pl-4',
        sm: 'h-9 gap-1.5 px-4 has-[>svg]:pl-3',
        lg: 'h-12 px-7 text-base has-[>svg]:pl-6',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
