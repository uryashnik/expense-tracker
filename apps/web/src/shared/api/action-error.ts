import { ApiRequestError } from './client';

/**
 * Итог серверного экшена аутентификации: ошибка запроса к API, приведённая
 * к виду, удобному для формы — общее сообщение и (опционально) ошибки по полям.
 */
export interface ActionErrorState {
  status: 'error';
  message: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_MESSAGE = 'Не удалось выполнить запрос. Попробуйте ещё раз.';
const VALIDATION_MESSAGE = 'Проверьте правильность заполнения формы';

/**
 * class-validator отдаёт ошибки строками вида "email must be an email" —
 * первое слово в них это имя поля DTO, группируем сообщения по нему.
 */
function groupFieldErrors(errors: string[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const item of errors) {
    const field = item.split(' ')[0] ?? item;
    fieldErrors[field] = fieldErrors[field] ? `${fieldErrors[field]}; ${item}` : item;
  }
  return fieldErrors;
}

/** Приводит ошибку из api.* (см. apps/web/src/shared/api/client.ts) к ActionErrorState. */
export function toActionErrorState(error: unknown): ActionErrorState {
  if (!(error instanceof ApiRequestError)) {
    return { status: 'error', message: GENERIC_MESSAGE };
  }

  const { message, errors, statusCode } = error.payload;

  if (errors && errors.length > 0) {
    return { status: 'error', message: VALIDATION_MESSAGE, fieldErrors: groupFieldErrors(errors) };
  }

  // 409 (email уже занят) — это не список ошибок валидации, а один message;
  // привязываем его и к полю email, чтобы пользователь не искал причину в алерте.
  if (statusCode === 409) {
    return { status: 'error', message, fieldErrors: { email: message } };
  }

  return { status: 'error', message };
}
