import { IsInt, Max, Min } from 'class-validator';

/**
 * Месяц и год агрегации — оба обязательные.
 * @Type(() => Number) не нужен: в ValidationPipe включён enableImplicitConversion,
 * поэтому строки из query приводятся к числу по типу поля.
 */
export class SummaryQueryDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(1970)
  @Max(2100)
  year: number;
}
