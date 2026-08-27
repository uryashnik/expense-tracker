/**
 * Внутренний ввод для UsersService/UsersRepository.
 * Не участвует в глобальном ValidationPipe — приходит уже готовым из auth-хендлеров,
 * которые сами валидируют исходный DTO запроса и хешируют пароль.
 */
export interface CreateUserDto {
  email: string;
  name: string;
  passwordHash: string;
}
