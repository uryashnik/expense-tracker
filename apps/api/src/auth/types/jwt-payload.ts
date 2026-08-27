/** Полезная нагрузка access-токена. */
export interface JwtPayload {
  /** id пользователя (subject). */
  sub: string;
  email: string;
}

/**
 * Пользователь, прикреплённый к запросу JwtStrategy.
 * Специально компактный — не вся запись User, чтобы не тащить лишние поля
 * в request.user на каждый защищённый запрос.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
