import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';

@Module({
  // CategoriesModule — ради CategoriesService: транзакция не должна ссылаться
  // на чужую категорию. PrismaModule глобальный, импортировать его не нужно.
  imports: [CategoriesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
  exports: [TransactionsService],
})
export class TransactionsModule {}
