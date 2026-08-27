# Категории трат: модель, сервис, контроллер

## Контекст

В проекте уже есть аутентификация (JWT, глобальный `JwtAuthGuard`, `@Public()`/`@CurrentUser()`), но модель `Category` в Prisma-схеме ещё не существует (`schema.prisma` содержит только `User`, с явным комментарием "Category проектируется на следующем этапе"). Нужно добавить сущность категории (`id`, `name`, `color`, `icon`, `userId`) и полноценный CRUD-модуль: создание, получение всех категорий пользователя, обновление, удаление — защищённый авторизацией и с валидацией входных данных через `class-validator`.

По результатам обсуждения:

- Архитектура — плоский `Service + Repository`, как в `apps/api/src/users` (не CQRS, как в `auth`), потому что у категорий нет доменных событий, оправдывающих `CommandBus`/`QueryBus`.
- Дубликаты имён категорий у одного пользователя разрешены — уникальность по `(userId, name)` не вводится.

## Изменения

### 1. Prisma-схема — `apps/api/prisma/schema.prisma`

Добавить модель `Category` и обратную связь у `User`, выдержав текущие конвенции (`uuid(7)`, `@db.Uuid`, `createdAt`/`updatedAt`, `@@map`):

```prisma
model User {
  // ...существующие поля без изменений...

  categories Category[]

  @@map("users")
}

model Category {
  id        String   @id @default(uuid(7)) @db.Uuid
  name      String
  color     String
  icon      String
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("categories")
}
```

`onDelete: Cascade` — при удалении пользователя его категории удаляются автоматически. `@@index([userId])` — под основной запрос "все категории пользователя".

После правки схемы — новая миграция и регенерация клиента:

```bash
npm run prisma:migrate -w @expense-tracker/api   # запросит имя, например add_category
```

(`prisma migrate dev` сам вызывает `generate`, отдельный `prisma:generate` не обязателен, но не помешает перед сборкой.)

### 2. Общий тип ответа — `packages/shared/src/api.ts`

Добавить транспортный тип категории рядом с `AuthUser` (без DTO-типов запроса — они покрываются DTO-классами в `apps/api`):

```ts
/** Категория трат в ответах API. */
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

После правки — пересобрать пакет (`apps/api` потребляет `dist`, не исходники): `npm run build -w @expense-tracker/shared`.

### 3. Новый модуль — `apps/api/src/categories/`

Структура и стиль — по образцу `apps/api/src/users` (`UsersService`/`UsersRepository`) и DTO из `apps/api/src/auth/dto/register.dto.ts`.

**`dto/create-category.dto.ts`**

```ts
import { IsHexColor, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsHexColor()
  color: string;

  @IsString()
  @Length(1, 50)
  icon: string;
}
```

**`dto/update-category.dto.ts`** — те же поля, но опциональные (без зависимости от `@nestjs/mapped-types`, которого нет в `package.json`, — руками через `@IsOptional()`, консистентно с версиями, зафиксированными в проекте):

```ts
import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;
}
```

**`categories.repository.ts`** — единственное место, обращающееся к Prisma (по аналогии с `users.repository.ts`):

```ts
@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, data: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({ data: { ...data, userId } });
  }

  findAllByUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }
}
```

(`Category` здесь — тип из `../generated/prisma/client`, как `User` в `users.repository.ts`.)

**`categories.service.ts`** — доменная логика + проверка владения категорией + маппер в `@expense-tracker/shared`-тип (аналог `toAuthUser`):

```ts
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

  toCategory(category: CategoryEntity): Category {
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
```

**`categories.controller.ts`** — эндпоинты закрыты автоматически: `JwtAuthGuard` подключён глобально через `APP_GUARD` в `auth.module.ts`, поэтому явного `@UseGuards(...)` не нужно (как в `auth.controller.ts` для `me`) — достаточно не ставить `@Public()`. Пользователь достаётся через `@CurrentUser()`:

```ts
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
    return categories.map((c) => this.categoriesService.toCategory(c));
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
```

`ParseUUIDPipe` на `:id` — быстрый 400 на заведомо некорректный id вместо похода в БД.

**`categories.module.ts`**

```ts
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

### 4. Регистрация модуля — `apps/api/src/app.module.ts`

Добавить `CategoriesModule` в `imports`, рядом с `UsersModule`:

```ts
import { CategoriesModule } from './categories/categories.module';
// ...
imports: [ConfigModule.forRoot(...), PrismaModule, HealthModule, UsersModule, AuthModule, CategoriesModule],
```

## Затронутые/новые файлы

- `apps/api/prisma/schema.prisma` — модель `Category` + связь у `User`
- `apps/api/prisma/migrations/<timestamp>_add_category/` — новая миграция (генерируется командой)
- `packages/shared/src/api.ts` — тип `Category`
- `apps/api/src/categories/dto/create-category.dto.ts` — новый
- `apps/api/src/categories/dto/update-category.dto.ts` — новый
- `apps/api/src/categories/categories.repository.ts` — новый
- `apps/api/src/categories/categories.service.ts` — новый
- `apps/api/src/categories/categories.controller.ts` — новый
- `apps/api/src/categories/categories.module.ts` — новый
- `apps/api/src/app.module.ts` — регистрация `CategoriesModule`

## Проверка

1. `npm run prisma:migrate -w @expense-tracker/api` — применить миграцию, сгенерировать клиент.
2. `npm run build -w @expense-tracker/shared` — пересобрать `packages/shared` (новый тип `Category` в `dist`).
3. `npm run typecheck` и `npm run lint` (по всему монорепо через turbo) — убедиться, что новый код и связи между пакетами не ломают сборку.
4. `npm run db:up`, затем `npm run dev` — поднять api на `:3001`.
5. Ручная проверка через `curl`:
   - `POST /api/auth/register` (или `/login`) → получить `accessToken`.
   - Без токена: `GET /api/categories` → `401`.
   - С токеном: `POST /api/categories` с `{ "name": "Еда", "color": "#FF5733", "icon": "cart" }` → `201` с телом `Category`.
   - `GET /api/categories` → массив с созданной категорией.
   - `PATCH /api/categories/:id` с `{ "name": "Продукты" }` → обновлённая категория.
   - `DELETE /api/categories/:id` → `204`.
   - Невалидные данные (например, `color: "not-a-color"`) → `400` с `errors` в формате `ApiError`.
   - Чужой/несуществующий `id` в `PATCH`/`DELETE` → `404`.

## Чеклист реализации

- [x] `apps/api/prisma/schema.prisma`: модель `Category` + связь `categories Category[]` у `User`
- [x] Миграция: `npm run prisma:migrate -w @expense-tracker/api` (создана `20260827173939_add_category`, клиент сгенерирован)
- [x] `packages/shared/src/api.ts`: добавить тип `Category`
- [x] `npm run build -w @expense-tracker/shared`
- [x] `apps/api/src/categories/dto/create-category.dto.ts`
- [x] `apps/api/src/categories/dto/update-category.dto.ts`
- [x] `apps/api/src/categories/categories.repository.ts`
- [x] `apps/api/src/categories/categories.service.ts` (включая `assertOwnership` и `toCategory`)
- [x] `apps/api/src/categories/categories.controller.ts` (`POST /`, `GET /`, `PATCH /:id`, `DELETE /:id`)
- [x] `apps/api/src/categories/categories.module.ts`
- [x] `apps/api/src/app.module.ts`: зарегистрировать `CategoriesModule`
- [x] `npm run typecheck` и `npm run lint` по монорепо — зелёные
- [x] Ручная проверка через `curl`: 401 без токена, 201/200 CRUD-сценарии, 400 на невалидный `color`, 404 на чужой/несуществующий `id` — все сценарии прошли

## Дополнительно найдено и исправлено (вне исходного скоупа, по согласованию)

При первом запуске API падал с `UnknownDependenciesException` для `PrismaService`. Причина оказалась системной: во всём `apps/api` конструкторные DI-зависимости и DTO под `@Body()` были импортированы как `import type`, что стирает метаданные `emitDecoratorMetadata` — Nest резолвит `Object`/`Function` вместо класса, из-за чего DI падает, а `ValidationPipe` молча пропускает валидацию (именно то предупреждение, которое уже есть в CLAUDE.md про `consistent-type-imports`, но нарушенное вручную).

Заменил `import type` → `import` (без изменения логики) для DI-классов и DTO в:

- `prisma/prisma.service.ts`, `auth/strategies/jwt.strategy.ts`, `auth/guards/jwt-auth.guard.ts`, `auth/services/token.service.ts`
- `auth/auth.controller.ts` (`CommandBus`, `QueryBus`, `RegisterDto`, `LoginDto`)
- `auth/application/commands/register-user.handler.ts`, `login-user.handler.ts` (`EventBus`, `UsersService`, `PasswordService`, `TokenService`)
- `auth/application/queries/get-current-user.handler.ts`, `auth/application/events/user-logged-in.handler.ts` (`UsersService`)
- `users/users.repository.ts` (`PrismaService`), `users/users.service.ts` (`UsersRepository`)
- `categories/categories.repository.ts`, `categories/categories.service.ts`, `categories/categories.controller.ts` (мои новые файлы — тот же паттерн)

После фикса `npm run typecheck`/`npm run lint` прошли, API поднялся, `curl`-сценарии подтвердили и работающий DI, и работающую валидацию class-validator.
