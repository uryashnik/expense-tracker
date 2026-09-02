import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma, Transaction, TransactionType } from '../generated/prisma/client';

/** Фильтры списка транзакций, уже приведённые к типам Prisma. */
export interface TransactionFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: TransactionType;
  categoryId?: string;
}

/** Суммы по направлениям за период, как их отдаёт groupBy. */
export interface TransactionTypeSum {
  type: TransactionType;
  _sum: { amount: Prisma.Decimal | null };
}

/**
 * Единственное место в transactions, которое обращается к Prisma.
 */
@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data: { ...data, userId } });
  }

  findAllByUser(userId: string, filters: TransactionFilters): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        type: filters.type,
        categoryId: filters.categoryId,
        // Ключ date добавляем только при заданных границах: пустой объект
        // в фильтре Prisma допустим, но зашумляет запрос.
        ...(filters.dateFrom || filters.dateTo
          ? { date: { gte: filters.dateFrom, lte: filters.dateTo } }
          : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.TransactionUncheckedUpdateInput): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Суммы доходов и расходов за период [from, to).
   * Результат groupBy присваиваем через await: Prisma выводит тип аргумента
   * из ожидаемого возвращаемого значения, и явная аннотация на методе ломает вывод.
   */
  async sumByTypeInRange(userId: string, from: Date, to: Date): Promise<TransactionTypeSum[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: from, lt: to } },
      _sum: { amount: true },
    });
    return rows;
  }
}
