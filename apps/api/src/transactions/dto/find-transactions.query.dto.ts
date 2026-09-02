import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { TransactionType } from '../../generated/prisma/client';

/**
 * Фильтры списка транзакций. Все поля необязательные, но незадекларированный
 * query-параметр даст 400: в main.ts включён forbidNonWhitelisted.
 */
export class FindTransactionsQueryDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
