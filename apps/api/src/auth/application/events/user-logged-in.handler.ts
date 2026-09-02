import { Logger } from '@nestjs/common';
import type { IEventHandler } from '@nestjs/cqrs';
import { EventsHandler } from '@nestjs/cqrs';
import { UsersService } from '../../../users/users.service';
import { UserLoggedInEvent } from './user-logged-in.event';

/**
 * Некритичный побочный эффект логина — обновление lastLoginAt.
 * Ошибку ловим сами: EventBus fire-and-forget, она не должна всплыть в ответе.
 */
@EventsHandler(UserLoggedInEvent)
export class UserLoggedInHandler implements IEventHandler<UserLoggedInEvent> {
  private readonly logger = new Logger(UserLoggedInHandler.name);

  constructor(private readonly usersService: UsersService) {}

  async handle(event: UserLoggedInEvent): Promise<void> {
    try {
      await this.usersService.touchLastLogin(event.userId);
    } catch (error) {
      this.logger.error(
        `Не удалось обновить lastLoginAt для пользователя ${event.userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
