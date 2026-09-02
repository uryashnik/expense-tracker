import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Слияние classnames с корректным разрешением конфликтующих Tailwind-утилит. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
