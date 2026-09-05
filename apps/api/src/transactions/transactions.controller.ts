import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Paginated, Transaction, TransactionSummary } from '@expense-tracker/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions.query.dto';
import { SummaryQueryDto } from './dto/summary.query.dto';

// Явного @UseGuards не нужно: JwtAuthGuard подключён глобально через APP_GUARD
// в auth.module.ts, эндпоинт открыт только если явно помечен @Public().
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.transactionsService.create(user.id, dto);
    return this.transactionsService.toTransaction(transaction);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindTransactionsQueryDto,
  ): Promise<Paginated<Transaction>> {
    return this.transactionsService.findPageForUser(user.id, query);
  }

  // Объявлен до @Get(':id'): иначе Nest сматчит "summary" на параметр id
  // и ParseUUIDPipe вернёт 400.
  @Get('summary')
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SummaryQueryDto,
  ): Promise<TransactionSummary> {
    return this.transactionsService.summary(user.id, query.month, query.year);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionsService.findOneForUser(user.id, id);
    return this.transactionsService.toTransaction(transaction);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.transactionsService.update(user.id, id, dto);
    return this.transactionsService.toTransaction(transaction);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transactionsService.remove(user.id, id);
  }
}
