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
} from '@nestjs/common';
import type { Category } from '@expense-tracker/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Явного @UseGuards не нужно: JwtAuthGuard подключён глобально через APP_GUARD
// в auth.module.ts, эндпоинт открыт только если явно помечен @Public().
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoriesService.create(user.id, dto);
    return this.categoriesService.toCategory(category);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<Category[]> {
    const categories = await this.categoriesService.findAllForUser(user.id);
    return categories.map((category) => this.categoriesService.toCategory(category));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoriesService.update(user.id, id, dto);
    return this.categoriesService.toCategory(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.categoriesService.remove(user.id, id);
  }
}
