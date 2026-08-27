import { UnauthorizedException } from '@nestjs/common';
import type { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import type { AuthUser } from '@expense-tracker/shared';
import type { UsersService } from '../../../users/users.service';
import { GetCurrentUserQuery } from './get-current-user.query';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery, AuthUser> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetCurrentUserQuery): Promise<AuthUser> {
    const user = await this.usersService.findActiveById(query.userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь больше не существует или заблокирован');
    }
    return this.usersService.toAuthUser(user);
  }
}
