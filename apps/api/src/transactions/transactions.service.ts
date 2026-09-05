import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Paginated,
  Transaction as TransactionResponse,
  TransactionSummary,
} from '@expense-tracker/shared';
import type { Prisma, Transaction as TransactionEntity } from '../generated/prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsRepository } from './transactions.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions.query.dto';

/**
 * Доменная логика поверх TransactionsRepository: проверка владения транзакцией
 * и категорией, агрегация за месяц и маппинг в публичный тип ответа API.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionEntity> {
    await this.assertCategoryBelongsToUser(userId, dto.categoryId);
    return this.transactionsRepository.create(userId, {
      amount: dto.amount,
      type: dto.type,
      description: dto.description ?? null,
      date: new Date(dto.date),
      categoryId: dto.categoryId,
      userId,
    });
  }

  /** Страница списка транзакций, уже приведённая к типу ответа API. */
  async findPageForUser(
    userId: string,
    query: FindTransactionsQueryDto,
  ): Promise<Paginated<TransactionResponse>> {
    const { page, limit } = query;
    const { items, total } = await this.transactionsRepository.findPageByUser(
      userId,
      {
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        type: query.type,
        categoryId: query.categoryId,
      },
      { skip: (page - 1) * limit, take: limit },
    );

    return { items: items.map((item) => this.toTransaction(item)), total, page, limit };
  }

  async findOneForUser(userId: string, id: string): Promise<TransactionEntity> {
    return this.assertOwnership(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<TransactionEntity> {
    await this.assertOwnership(userId, id);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryBelongsToUser(userId, dto.categoryId);
    }

    const data: Prisma.TransactionUncheckedUpdateInput = {
      amount: dto.amount,
      type: dto.type,
      description: dto.description,
      date: dto.date ? new Date(dto.date) : undefined,
      categoryId: dto.categoryId,
    };
    return this.transactionsRepository.update(id, data);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);
    await this.transactionsRepository.delete(id);
  }

  /** Итоги за календарный месяц. Границы месяца считаем в UTC, верхняя — строгая. */
  async summary(userId: string, month: number, year: number): Promise<TransactionSummary> {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));

    const sums = await this.transactionsRepository.sumByTypeInRange(userId, from, to);
    const totalIncome = this.pickSum(sums, 'INCOME');
    const totalExpense = this.pickSum(sums, 'EXPENSE');

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  /** Маппер для ответов API. */
  toTransaction(transaction: TransactionEntity): TransactionResponse {
    return {
      id: transaction.id,
      amount: transaction.amount.toNumber(),
      type: transaction.type,
      description: transaction.description,
      date: transaction.date.toISOString(),
      categoryId: transaction.categoryId,
      userId: transaction.userId,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  private pickSum(
    sums: { type: string; _sum: { amount: { toNumber(): number } | null } }[],
    type: string,
  ): number {
    return sums.find((row) => row.type === type)?._sum.amount?.toNumber() ?? 0;
  }

  /** Транзакция чужая или не существует — в обоих случаях 404, чтобы не палить чужие id. */
  private async assertOwnership(userId: string, id: string): Promise<TransactionEntity> {
    const transaction = await this.transactionsRepository.findById(id);
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Транзакция не найдена');
    }
    return transaction;
  }

  /** Категорию из запроса проверяем отдельно: чужую привязывать нельзя. */
  private async assertCategoryBelongsToUser(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoriesService.findOwnedById(userId, categoryId);
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }
  }
}
