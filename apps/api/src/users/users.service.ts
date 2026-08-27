import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@expense-tracker/shared';
import type { User } from '../generated/prisma/client';
import type { UsersRepository } from './users.repository';
import type { CreateUserDto } from './dto/create-user.dto';

/**
 * Доменная логика поверх UsersRepository.
 * Наружу из auth должен уходить только результат toAuthUser — passwordHash никогда
 * не должен попасть в ответ API.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  create(data: CreateUserDto): Promise<User> {
    return this.usersRepository.create(data);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  /** Возвращает пользователя только если он существует и не заблокирован. */
  async findActiveById(id: string): Promise<User | null> {
    const user = await this.usersRepository.findById(id);
    return user && user.isActive ? user : null;
  }

  touchLastLogin(id: string): Promise<void> {
    return this.usersRepository.touchLastLogin(id);
  }

  /** Маппер для ответов API: отсекает passwordHash и служебные поля. */
  toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
