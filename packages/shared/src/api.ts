/**
 * Транспортные контракты между web и api.
 * Доменные типы (расходы, категории) появятся здесь вместе со схемой БД.
 */

/** Единый формат ошибки, который отдаёт HttpExceptionFilter в apps/api. */
export interface ApiError {
  statusCode: number;
  message: string;
  /** Детали валидации от class-validator, если ошибка связана с телом запроса. */
  errors?: string[];
  path: string;
  timestamp: string;
}

/** Параметры постраничной выборки в query-строке. */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** Ответ со страницей элементов. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Ответ GET /api/health. */
export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

/** Пользователь в ответах API: без хеша пароля и служебных полей. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Ответ POST /api/auth/register и POST /api/auth/login. */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  tokenType: 'Bearer';
  /** Время жизни access-токена в секундах. */
  expiresIn: number;
}

/** Категория трат в ответах API. */
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Направление движения денег. */
export type TransactionType = 'INCOME' | 'EXPENSE';

/** Транзакция в ответах API. */
export interface Transaction {
  id: string;
  /** Сумма операции. Всегда положительная, знак определяется полем type. */
  amount: number;
  type: TransactionType;
  description: string | null;
  /** Дата операции (ISO), задаётся пользователем — не путать с createdAt. */
  date: string;
  categoryId: string;
  userId: string;
  createdAt: string;
}

/** Ответ GET /api/transactions/summary: итоги за календарный месяц. */
export interface TransactionSummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  /** totalIncome - totalExpense. */
  balance: number;
}
