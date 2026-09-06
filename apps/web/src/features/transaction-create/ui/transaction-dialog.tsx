'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import type { Category, TransactionType } from '@expense-tracker/shared';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { createTransactionAction } from '../api/actions';
import {
  createTransactionSchema,
  type CreateTransactionInput,
  type CreateTransactionPayload,
} from '../model/schema';

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Расход' },
  { value: 'INCOME', label: 'Доход' },
];

/** Сегодня в формате <input type="date">, в местном часовом поясе. */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * Диалог создания транзакции.
 *
 * categories приходят снаружи: их уже загрузила страница для списка и фильтров,
 * повторно ходить в API из клиентского компонента незачем. Пустой список
 * означает, что привязывать транзакцию не к чему — форма это учитывает.
 */
export function TransactionDialog({
  categories,
  trigger,
}: {
  categories: Category[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const defaults: CreateTransactionInput = {
    amount: '',
    type: 'EXPENSE',
    categoryId: categories[0]?.id ?? '',
    date: today(),
    description: '',
  };

  // Третий параметр — тип уже разобранного схемой значения: у
  // createTransactionSchema вход и выход отличаются (строка суммы → число).
  const form = useForm<CreateTransactionInput, unknown, CreateTransactionPayload>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: defaults,
  });

  const onSubmit = form.handleSubmit(() => {
    setFormError(null);
    // Экшену отдаём сырые значения формы, а не разобранные: он валидирует их
    // сам — серверу нельзя доверять проверке, прошедшей только в браузере.
    const values = form.getValues();
    startTransition(async () => {
      const result = await createTransactionAction(values);
      if (result.status === 'success') {
        form.reset({ ...defaults, date: values.date });
        setOpen(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof CreateTransactionInput, { message });
      }
      setFormError(result.message);
    });
  });

  const hasCategories = categories.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Транзакция
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая транзакция</DialogTitle>
          <DialogDescription>
            Сумма всегда положительная — направление задаёт тип.
          </DialogDescription>
        </DialogHeader>

        {!hasCategories ? (
          <Alert>
            <AlertTitle>Сначала нужна категория</AlertTitle>
            <AlertDescription>
              Создайте хотя бы одну категорию — транзакция обязательно к ней привязана.
            </AlertDescription>
          </Alert>
        ) : (
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        {TYPES.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={field.value === option.value}
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                              field.value === option.value
                                ? 'border-accent bg-accent text-on-accent'
                                : 'text-ink-muted hover:bg-secondary',
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          placeholder="0,00"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full rounded-xl">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span aria-hidden>{category.icon}</span>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Комментарий</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Необязательно"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Добавить
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
