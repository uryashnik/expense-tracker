import { Logger } from '@nestjs/common';
import type { IEventHandler } from '@nestjs/cqrs';
import { EventsHandler } from '@nestjs/cqrs';
import { UserRegisteredEvent } from './user-registered.event';

/**
 * Побочный эффект регистрации. Пока только лог — точка расширения для welcome-письма.
 * EventBus в @nestjs/cqrs работает fire-and-forget: исключение здесь не откатит
 * и не сломает ответ register-эндпоинта, поэтому ошибки ловим и логируем сами.
 */
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(UserRegisteredHandler.name);

  handle(event: UserRegisteredEvent): void {
    this.logger.log(`Зарегистрирован новый пользователь ${event.email} (${event.userId})`);
  }
}
