# Модуль транзакций (доходы/расходы)

## Контекст

В API уже есть `User`, JWT-аутентификация (глобальный `JwtAuthGuard` + `@Public()`/`@CurrentUser()`) и CRUD категорий. Не хватает центральной сущности приложения — транзакции: без неё категории не на что вешать, а фронтенду нечего показывать. Задача (`.claude/prompts/transactions.md`) — добавить модель `Transaction` в Prisma, миграцию и `TransactionsModule` с полным CRUD, фильтрацией списка и месячной агрегацией.

**Решения, принятые с пользователем:**

- `amount` в JSON-ответах — `number` (`Decimal.toNumber()`), не строка.
- `GET /transactions/summary` возвращает только итоги (`totalIncome`, `totalExpense`, `balance`), без разбивки по категориям. Для единообразия суммы там тоже `number`.
- Архитектура — `controller + service + repository`, как в `apps/api/src/categories` (не CQRS, как в `auth`).
- Попутно чиним найденный баг с `import type` (раздел 7) — без этого `class-validator` в новом модуле просто не заработает.

**Принятое допущение (не обсуждалось):** `Category → Transaction` удаляется каскадом (`onDelete: Cascade`), как `User → Category`. То есть удаление категории удаляет её транзакции. Альтернатива — `Restrict` — потребовала бы отдельной обработки ошибки Prisma `P2003` в `CategoriesService` и ответа 409; это выходит за рамки задачи.

## Изменения

### 1. Prisma-схема — `apps/api/prisma/schema.prisma`

Добавить enum и модель, выдержав текущие конвенции (`uuid(7)`, `@db.Uuid`, `@@map` в snake_case, `@@index` под основной запрос):

```prisma
enum TransactionType {
  INCOME
  EXPENSE

  @@map("transaction_type")
}

model Transaction {
  id          String          @id @default(uuid(7)) @db.Uuid
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?
  date        DateTime
  categoryId  String          @db.Uuid
  category    Category        @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  userId      String          @db.Uuid
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())

  @@index([userId, date])
  @@index([categoryId])
  @@map("transactions")
}
```

`@db.Decimal(12, 2)` — деньги хранятся точно, без float. `updatedAt` не добавляем: в спецификации задачи его нет.

Обратные связи: `transactions Transaction[]` в `User` (рядом с `categories`) и в `Category`.

Миграция (существующие миграции названы в snake_case, поэтому `add_transactions`, а не `add-transactions`):

```bash
npm run db:up                                             # контейнер Postgres сейчас не поднят
npm run prisma:migrate -w @expense-tracker/api -- --name add_transactions
```

`prisma migrate dev` сам вызывает `generate`, отдельный `prisma:generate` не нужен.

### 2. Транспортные типы — `packages/shared/src/api.ts`

Рядом с `Category`. `shared` не может импортировать из `apps/api/src/generated` (папка gitignored и принадлежит api), поэтому тип — обычный union:

```ts
/** Направление движения денег. */
export type TransactionType = 'INCOME' | 'EXPENSE';

/** Транзакция в ответах API. */
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string;
  userId: string;
  createdAt: string;
}

/** Ответ GET /api/transactions/summary. */
export interface TransactionSummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
```

### 3. DTO — `apps/api/src/transactions/dto/`

Только `class-validator`, без `PartialType` (`@nestjs/mapped-types` в проекте нет) и без новых зависимостей. Enum `TransactionType` берём как **значение** из `../generated/prisma/client` (клиент реэкспортирует `./enums`) — после миграции он там появится.

Сообщения — дефолтные английские от class-validator: `apps/web/src/shared/api/action-error.ts` вытаскивает имя поля как первое слово сообщения, кастомные русские тексты это ломают.

- `create-transaction.dto.ts` — `amount` (`@IsNumber({ maxDecimalPlaces: 2 })` + `@IsPositive()`), `type` (`@IsEnum(TransactionType)`), `description` (`@IsOptional() @IsString() @MaxLength(500)`), `date` (`@IsISO8601()`), `categoryId` (`@IsUUID()`).
- `update-transaction.dto.ts` — те же поля, каждое с `@IsOptional()` и `?:` (как в `update-category.dto.ts`).
- `find-transactions.query.dto.ts` — `dateFrom?`, `dateTo?` (`@IsISO8601()`), `type?` (`@IsEnum`), `categoryId?` (`@IsUUID`). В `main.ts` включён `forbidNonWhitelisted: true`, поэтому любой незадекларированный query-параметр даст 400 — это ожидаемо.
- `summary.query.dto.ts` — `month` (`@IsInt() @Min(1) @Max(12)`), `year` (`@IsInt() @Min(1970) @Max(2100)`), оба обязательные. `@Type(() => Number)` не нужен: в `ValidationPipe` включён `transformOptions.enableImplicitConversion`.

### 4. `transactions.repository.ts`

Единственное место в модуле, которое трогает Prisma (как `categories.repository.ts`). `PrismaModule` глобальный — импортировать его в модуле не нужно.

- `create(userId, data)` — `data` уже с `date: Date` и `categoryId`.
- `findAllByUser(userId, filters)` — `where: { userId, type?, categoryId?, date: { gte: dateFrom?, lte: dateTo? } }`, `orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]`. Ключ `date` в `where` добавляется только если задана хотя бы одна граница.
- `findById(id)`, `update(id, data)`, `delete(id)` — как в категориях.
- `sumByTypeInRange(userId, from, to)` — `prisma.transaction.groupBy({ by: ['type'], where: { userId, date: { gte: from, lt: to } }, _sum: { amount: true } })`.

### 5. `transactions.service.ts`

Доменная логика и маппинг, повторяет `CategoriesService`:

- `assertOwnership(userId, id)` → `NotFoundException('Транзакция не найдена')` и для чужой, и для несуществующей — чтобы не палить чужие id.
- `assertCategoryBelongsToUser(userId, categoryId)` — вызывается в `create` и в `update`, если `categoryId` меняется; иначе можно привязать транзакцию к чужой категории. Для этого в `CategoriesService` добавить метод `findOwnedById(userId, id): Promise<CategoryEntity | null>` (репозиторий наружу не экспортируется, а `CategoriesService` уже в `exports` своего модуля).
- `summary(userId, month, year)` — диапазон строится в UTC: `from = new Date(Date.UTC(year, month - 1, 1))`, `to = new Date(Date.UTC(year, month, 1))`, верхняя граница строгая (`lt`). Суммы из `groupBy` — `Prisma.Decimal | null`, приводим через `?.toNumber() ?? 0`; `balance = totalIncome - totalExpense`.
- `toTransaction(entity)` — маппер в shared-тип: `amount: entity.amount.toNumber()`, `date`/`createdAt` через `.toISOString()`, `description: entity.description` (уже `string | null`).

### 6. `transactions.controller.ts` и `transactions.module.ts`

`@Controller('transactions')`, без `@UseGuards` — guard глобальный. Первый параметр каждого метода — `@CurrentUser() user: AuthenticatedUser`.

**Важно: `@Get('summary')` объявить строго до `@Get(':id')`** — иначе Nest сматчит `summary` на `:id` и `ParseUUIDPipe` вернёт 400.

| Метод  | Путь                    | Ответ                                   |
| ------ | ----------------------- | --------------------------------------- |
| POST   | `/transactions`         | `Transaction` (201)                     |
| GET    | `/transactions`         | `Transaction[]`                         |
| GET    | `/transactions/summary` | `TransactionSummary`                    |
| GET    | `/transactions/:id`     | `Transaction` (`ParseUUIDPipe`)         |
| PATCH  | `/transactions/:id`     | `Transaction`                           |
| DELETE | `/transactions/:id`     | 204, `@HttpCode(HttpStatus.NO_CONTENT)` |

`transactions.module.ts`: `controllers: [TransactionsController]`, `providers: [TransactionsService, TransactionsRepository]`, `imports: [CategoriesModule]` (нужен `CategoriesService`). Подключить `TransactionsModule` последним в `imports` у `apps/api/src/app.module.ts`.

### 7. Починка `import type` в DI (блокирует валидацию в новом модуле)

В `apps/api` инжектируемые классы и DTO импортируются через `import type`, из-за чего TypeScript стирает импорт и `emitDecoratorMetadata` пишет заглушки. Видно в текущем `apps/api/dist/categories/categories.controller.js`:

```js
(__metadata('design:paramtypes', [Object, Function]), // @Body() dto — вместо CreateCategoryDto
  __metadata('design:paramtypes', [Function])); // конструктор — вместо CategoriesService
```

Последствия: Nest не может разрешить DI (`UnknownDependenciesException` на старте), а `ValidationPipe` не видит тип DTO и молча пропускает валидацию. Это ровно то, от чего в `apps/api/eslint.config.mjs` отключено правило `consistent-type-imports`.

Первопричина регрессии: pre-commit гоняет `lint-staged` → `eslint --fix` из **корня** репозитория, а flat-config берётся по CWD, поэтому применяется корневой `eslint.config.mjs`, где `consistent-type-imports` включён — хук переписывает обычные импорты обратно в `import type`.

Что делать:

1. В корневом `eslint.config.mjs` вынести `@typescript-eslint/consistent-type-imports` в блок с `ignores: ['apps/api/**/*.ts']` (или выключить его отдельным блоком для этих файлов), чтобы запуск из корня совпадал с запуском из пакета.
2. Заменить `import type` на обычный `import` **только там, где символ нужен в рантайме**: зависимости в конструкторах и классы DTO в `@Body()`/`@Query()`. Затронуты `categories/*.ts`, `users/users.service.ts`, `users/users.repository.ts`, `prisma/prisma.service.ts` (`ConfigService`), `auth/auth.controller.ts` (`CommandBus`, `QueryBus`, `LoginDto`, `RegisterDto`), `auth/guards/jwt-auth.guard.ts` (`Reflector`), `auth/strategies/jwt.strategy.ts`, `auth/services/*`, `auth/application/**/*.handler.ts`.
3. Чисто типовые импорты (`AuthenticatedUser`, `ApiError`, `Category` из shared, `ArgumentsHost`, `Request`, Prisma-модели) оставить как `import type`.
4. Новый модуль писать сразу с обычными импортами для инжектируемых классов и DTO.

## Затронутые файлы

Новые: `apps/api/src/transactions/{transactions.controller,transactions.service,transactions.repository,transactions.module}.ts`, `apps/api/src/transactions/dto/{create-transaction,update-transaction,find-transactions.query,summary.query}.dto.ts`, `apps/api/prisma/migrations/<ts>_add_transactions/migration.sql`.

Изменяются: `apps/api/prisma/schema.prisma`, `packages/shared/src/api.ts`, `apps/api/src/app.module.ts`, `apps/api/src/categories/categories.service.ts` (+`findOwnedById`), `eslint.config.mjs`, плюс точечная замена импортов по списку из пункта 7.

## Проверка

```bash
npm run db:up
npm run prisma:migrate -w @expense-tracker/api -- --name add_transactions
npm run build && npm run lint && npm run typecheck
grep -n 'design:paramtypes' apps/api/dist/transactions/transactions.controller.js
# ожидаем реальные классы (CreateTransactionDto, TransactionsService), а не Object/Function
```

Затем поднять API (`npm run dev:api`) и пройти сценарий curl'ом:

1. `POST /api/auth/register` → взять `accessToken`; дальше все запросы с `Authorization: Bearer <token>`.
2. `POST /api/categories` → `categoryId`.
3. `POST /api/transactions` с валидным телом → 201, в ответе `amount` — число.
4. Негативные проверки валидации (должны быть 400, а не 201): `amount: -5`, `type: "FOO"`, `date: "не дата"`, `categoryId` чужого пользователя → 404, лишнее поле в теле → 400 (`forbidNonWhitelisted`).
5. `GET /api/transactions?type=EXPENSE&dateFrom=…&dateTo=…&categoryId=…` — фильтры сужают выдачу; неизвестный query-параметр → 400.
6. `GET /api/transactions/summary?month=9&year=2026` → корректные `totalIncome`/`totalExpense`/`balance`; без `month` → 400; путь не перехватывается роутом `:id`.
7. `GET/PATCH/DELETE /api/transactions/:id` — своя транзакция работает, чужая/несуществующая → 404, DELETE → 204.
8. Регресс после пункта 7 плана: `POST /api/auth/login` и CRUD категорий по-прежнему работают, а невалидное тело категории теперь действительно даёт 400.

## Чеклист реализации

- [x] Схема: enum `TransactionType`, модель `Transaction`, обратные связи в `User` и `Category`
- [x] Миграция `add_transactions` создана и применена, клиент перегенерирован
- [x] Типы `TransactionType`, `Transaction`, `TransactionSummary` в `packages/shared`
- [x] `create-transaction.dto.ts`
- [x] `update-transaction.dto.ts`
- [x] `find-transactions.query.dto.ts`
- [x] `summary.query.dto.ts`
- [x] `transactions.repository.ts` (включая `sumByTypeInRange`)
- [x] `transactions.service.ts`: `assertOwnership`, `assertCategoryBelongsToUser`, `summary`, `toTransaction`
- [x] `CategoriesService.findOwnedById` добавлен
- [x] `transactions.controller.ts`: 6 эндпоинтов, `summary` объявлен до `:id`
- [x] `transactions.module.ts` создан и подключён в `AppModule`
- [x] Корневой `eslint.config.mjs` больше не переписывает импорты в `apps/api`
- [x] `import type` убран из DI-позиций в `categories`, `users`, `prisma`, `auth`
- [x] `npm run build` / `lint` / `typecheck` зелёные
- [x] Сценарий curl из раздела «Проверка» пройден, включая негативные кейсы

## Отметки по факту реализации

- `prisma migrate dev` в Prisma 7.9.1 **не** вызывает `generate` сам — после миграции нужен отдельный `npm run prisma:generate -w @expense-tracker/api`.
- `prisma.transaction.groupBy` выводит тип аргумента из ожидаемого возвращаемого значения, поэтому аннотация `Promise<TransactionTypeSum[]>` прямо на `return` ломает вывод (TS2345). Результат присваивается через `await` в переменную и возвращается отдельной строкой.
- Смоук-прогон выполнен на dev-БД; тестовые пользователи и их данные удалены (`DELETE FROM users …`, каскад).
