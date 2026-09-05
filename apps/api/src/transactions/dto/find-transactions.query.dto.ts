import { IsEnum, IsISO8601, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TransactionType } from '../../generated/prisma/client';

/** Размер страницы по умолчанию: столько транзакций показывает главный экран. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Фильтры и постраничность списка транзакций. Все поля необязательные, но
 * незадекларированный query-параметр даст 400: в main.ts включён forbidNonWhitelisted.
 *
 * Инициализаторы page/limit работают как значения по умолчанию: class-transformer
 * создаёт DTO через `new`, поэтому отсутствующий в query параметр остаётся дефолтным.
 * @Type(() => Number) не нужен — в ValidationPipe включён enableImplicitConversion.
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

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  // Верхняя граница — защита от `limit=100000`, а не продуктовое ограничение.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = DEFAULT_PAGE_SIZE;
}
