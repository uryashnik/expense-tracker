import { Injectable, NotFoundException } from '@nestjs/common';
import type { Category as CategoryResponse } from '@expense-tracker/shared';
import type { Category as CategoryEntity } from '../generated/prisma/client';
import type { CategoriesRepository } from './categories.repository';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Доменная логика поверх CategoriesRepository: проверка владения категорией
 * и маппинг в публичный тип ответа API.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  create(userId: string, dto: CreateCategoryDto): Promise<CategoryEntity> {
    return this.categoriesRepository.create(userId, dto);
  }

  findAllForUser(userId: string): Promise<CategoryEntity[]> {
    return this.categoriesRepository.findAllByUser(userId);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    await this.assertOwnership(userId, id);
    return this.categoriesRepository.update(id, dto);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);
    await this.categoriesRepository.delete(id);
  }

  /** Маппер для ответов API. */
  toCategory(category: CategoryEntity): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      userId: category.userId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  /** Категория чужая или не существует — в обоих случаях 404, чтобы не палить чужие id. */
  private async assertOwnership(userId: string, id: string): Promise<void> {
    const category = await this.categoriesRepository.findById(id);
    if (!category || category.userId !== userId) {
      throw new NotFoundException('Категория не найдена');
    }
  }
}
