/**
 * Форматирование сумм и дат для интерфейса.
 * Валюта пока одна и зашита здесь: в модели Transaction её нет.
 */

const CURRENCY = 'RUB';
const LOCALE = 'ru-RU';

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount);
}

/**
 * Сумма со знаком направления. В модели amount всегда положительный,
 * знак несёт поле type — здесь он и появляется.
 */
export function formatSignedMoney(amount: number, type: 'INCOME' | 'EXPENSE'): string {
  return `${type === 'INCOME' ? '+' : '−'}${moneyFormatter.format(amount)}`;
}

/** Дата операции (ISO из API) в виде «5 сентября 2026 г.». */
export function formatTransactionDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

/** Название месяца по номеру (1–12) и году — для заголовка сводки. */
export function formatMonth(month: number, year: number): string {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Значение для <input type="date"> из ISO-строки API. */
export function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}
