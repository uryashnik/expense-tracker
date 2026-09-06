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

/**
 * Название месяца по номеру (1–12) и году — для заголовка сводки: «Сентябрь 2026».
 * Intl отдаёт «сентябрь 2026 г.» — сокращение года в заголовке лишнее,
 * а первая буква заглавная, потому что это начало строки, а не часть фразы.
 */
export function formatMonth(month: number, year: number): string {
  const formatted = monthFormatter
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(' г.', '');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Значение для <input type="date"> из ISO-строки API. */
export function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}
