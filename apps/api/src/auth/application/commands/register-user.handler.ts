import { ConflictException } from '@nestjs/common';
import type { ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CommandHandler } from '@nestjs/cqrs';
import type { AuthResponse } from '@expense-tracker/shared';
import type { UsersService } from '../../../users/users.service';
import type { PasswordService } from '../../services/password.service';
import type { TokenService } from '../../services/token.service';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { RegisterUserCommand } from './register-user.command';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, AuthResponse> {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResponse> {
    const { name, email, password } = command;

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await this.passwordService.hash(password);
    const user = await this.usersService.create({ name, email, passwordHash });

    const { accessToken, expiresIn } = await this.tokenService.issue(user);

    this.eventBus.publish(new UserRegisteredEvent(user.id, user.email));

    return {
      user: this.usersService.toAuthUser(user),
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }
}
