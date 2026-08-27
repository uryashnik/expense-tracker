import { UnauthorizedException } from '@nestjs/common';
import type { EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler } from '@nestjs/cqrs';
import type { AuthResponse } from '@expense-tracker/shared';
import type { UsersService } from '../../../users/users.service';
import type { PasswordService } from '../../services/password.service';
import type { TokenService } from '../../services/token.service';
import { UserLoggedInEvent } from '../events/user-logged-in.event';
import { LoginUserCommand } from './login-user.command';

/** Одинаковое сообщение и для неверного пароля, и для несуществующего email. */
const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';

@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<LoginUserCommand, AuthResponse> {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthResponse> {
    const { email, password } = command;

    const user = await this.usersService.findByEmail(email);

    const passwordMatches = user
      ? await this.passwordService.compare(password, user.passwordHash)
      : await this.passwordService.compareWithDummy(password);

    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const { accessToken, expiresIn } = await this.tokenService.issue(user);

    this.eventBus.publish(new UserLoggedInEvent(user.id));

    return {
      user: this.usersService.toAuthUser(user),
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }
}
