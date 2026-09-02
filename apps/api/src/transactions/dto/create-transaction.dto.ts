import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TransactionType } from '../../generated/prisma/client';

export class CreateTransactionDto {
  // Сумма всегда положительная: направление задаётся полем type.
  // maxDecimalPlaces: 2 совпадает с @db.Decimal(12, 2) в схеме.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsISO8601()
  date: string;

  @IsUUID()
  categoryId: string;
}
