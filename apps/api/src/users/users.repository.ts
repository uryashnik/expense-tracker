import { ConflictException, Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import { Prisma } from '../generated/prisma/client';
import type { CreateUserDto } from './dto/create-user.dto';

/** Код ошибки Prisma при нарушении уникального индекса. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Единственное место в users, которое обращается к Prisma.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        // Гонка: между проверкой findByEmail и вставкой email успели занять.
        throw new ConflictException('Пользователь с таким email уже существует');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
