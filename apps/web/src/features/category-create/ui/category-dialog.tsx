'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { createCategoryAction } from '../api/actions';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  createCategorySchema,
  type CreateCategoryInput,
} from '../model/schema';

const DEFAULTS: CreateCategoryInput = {
  name: '',
  color: CATEGORY_COLORS[0],
  icon: CATEGORY_ICONS[0],
};

/**
 * Диалог создания категории. trigger позволяет открыть его как из меню
 * действий, так и из пустого состояния списка — вёрстка кнопки задаётся снаружи.
 */
export function CategoryDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: DEFAULTS,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createCategoryAction(values);
      if (result.status === 'success') {
        form.reset(DEFAULTS);
        setOpen(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof CreateCategoryInput, { message });
      }
      setFormError(result.message);
    });
  });

  // useWatch, а не form.watch(): watch() возвращает функцию, которую React
  // Compiler не может мемоизировать, и отключает оптимизацию всего компонента.
  const icon = useWatch({ control: form.control, name: 'icon' });
  const color = useWatch({ control: form.control, name: 'color' });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Plus className="size-4" />
            Категория
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая категория</DialogTitle>
          <DialogDescription>
            Категории группируют траты — без них транзакцию не создать.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>Не удалось сохранить</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Продукты" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Иконка</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_ICONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={field.value === option}
                          onClick={() => field.onChange(option)}
                          className={cn(
                            'flex size-11 items-center justify-center rounded-2xl border text-xl transition-colors',
                            field.value === option
                              ? 'border-accent bg-secondary'
                              : 'hover:bg-secondary',
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цвет</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CATEGORY_COLORS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-label={`Цвет ${option}`}
                          aria-pressed={field.value === option}
                          onClick={() => field.onChange(option)}
                          style={{ backgroundColor: option }}
                          className={cn(
                            'size-8 rounded-full border-2 transition-transform',
                            field.value === option
                              ? 'border-ink scale-110'
                              : 'border-transparent hover:scale-105',
                          )}
                        />
                      ))}
                      {/* Запасной вариант, если ни один пресет не подошёл. */}
                      <Input
                        type="color"
                        aria-label="Свой цвет"
                        className="h-11 w-14 cursor-pointer rounded-xl p-1"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-sm">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-2xl text-lg"
                style={{ backgroundColor: `${color}1f`, color }}
              >
                {icon}
              </span>
              <span className="text-ink-muted">Так категория выглядит в списке</span>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Создать
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
