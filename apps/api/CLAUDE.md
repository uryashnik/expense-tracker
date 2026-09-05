## Архитектура

**Слои модуля.** Стандартный срез — `<resource>.controller.ts` → `<resource>.service.ts` → `<resource>.repository.ts` (+ `dto/`, `<resource>.module.ts`). Роли жёсткие:

- **Репозиторий** — единственное место в модуле, которое трогает `PrismaService`. Ни контроллер, ни сервис не импортируют Prisma-клиент ради запроса; наружу репозиторий отдаёт сущности Prisma, а не типы ответов.
- **Сервис** — доменная логика: проверка владения, агрегации, склейка с другими модулями. Здесь же живёт маппер `toCategory` / `toTransaction` / `toAuthUser` в публичный тип из `@expense-tracker/shared`.
- **Контроллер** — разбор запроса, DTO и вызов маппера. Бизнес-правил в нём нет.

Prisma-сущность **никогда не уходит в ответ напрямую**: `User` содержит `passwordHash`, `Transaction.amount` — `Decimal`, который `JSON.stringify` превратил бы в строку. Тип ответа всегда собирается маппером.

**Два стиля модулей — это осознанно.** `auth` построен на CQRS (`@nestjs/cqrs`): контроллер только кладёт команду/запрос в шину, работа лежит в `auth/application/{commands,queries,events}`, набор хендлеров экспортируется массивами `COMMAND_HANDLERS` / `QUERY_HANDLERS` / `EVENT_HANDLERS` из `index.ts` каждой папки — их подключает `auth.module.ts`. `categories`, `transactions`, `users` — обычные service+repository. Новый ресурс делай в простом стиле; CQRS в `auth` оправдан побочными эффектами (`UserRegisteredEvent`, `UserLoggedInEvent`), которые не должны влиять на ответ.

`EventBus` в `@nestjs/cqrs` работает fire-and-forget: исключение в обработчике не откатит команду и не сломает ответ, но и не всплывёт наверх. Поэтому обработчики событий ловят ошибки сами (`UserLoggedInHandler` оборачивает `touchLastLogin` в try/catch). Не переноси в события ничего, без чего ответ считается неверным.

**Закрыто по умолчанию.** `JwtAuthGuard` подключён глобально через `APP_GUARD` в `auth.module.ts`, поэтому новый контроллер автоматически требует `Authorization: Bearer` — `@UseGuards` писать не нужно. Открывается роут только явным `@Public()` (`auth/decorators/public.decorator.ts`); сейчас так помечены `POST /auth/register`, `POST /auth/login` и `GET /health`. Пользователя из запроса берут декоратором `@CurrentUser()`, отдающим компактный `AuthenticatedUser` (`{ id, email }`), а не всю запись `User`.

**Мультиарендность — на каждом запросе.** Все данные принадлежат пользователю, и проверка владения делается в сервисе, а не в `where` наугад: `assertOwnership` в `CategoriesService` и `TransactionsService`. Чужой и несуществующий id дают **одинаковый 404** — 403 подтвердил бы, что запись существует. `TransactionsService.create/update` дополнительно проверяет `categoryId` через `CategoriesService.findOwnedById`: иначе транзакцию можно было бы привязать к чужой категории.

**Валидация.** Глобальный `ValidationPipe` в `main.ts`: `whitelist`, `forbidNonWhitelisted`, `transform`, `transformOptions.enableImplicitConversion`. Следствия, о которых легко забыть:

- Незадекларированное поле в теле или query — **400**, а не «молча отброшено». Поэтому фронт вырезает `confirmPassword` перед `POST /auth/register`.
- `enableImplicitConversion` уже приводит query-строки к типу поля — `@Type(() => Number)` в DTO не нужен.
- Инициализатор поля работает как значение по умолчанию (`page: number = 1`, `limit: number = DEFAULT_PAGE_SIZE` в `FindTransactionsQueryDto`): `class-transformer` создаёт DTO через `new`, отсутствующий параметр остаётся дефолтным.
- DTO-классы живут только здесь; в `packages/shared` уходят транспортные типы **ответов**. Ограничения DTO продублированы zod-схемами в `apps/web` — меняя одно, правь второе.
- Внутренний ввод сервисов (`users/dto/create-user.dto.ts`) — обычный `interface`, он не проходит через pipe и приходит уже проверенным из хендлера.

**Ошибки.** `common/filters/http-exception.filter.ts` (`@Catch()` без аргументов — ловит вообще всё) приводит любое исключение к `ApiError` из `@expense-tracker/shared`: `statusCode`, `message`, `errors`, `path`, `timestamp`. Массив строк от `ValidationPipe` попадает в `errors`, 5xx логируется со стеком, а неизвестное исключение отдаёт нейтральное «Внутренняя ошибка сервера» — внутренности наружу не текут. Формат разбирает `apps/web/src/shared/api/client.ts`; меняя его, правь обе стороны и тип в `packages/shared/src/api.ts`.

**Аутентификация.** `POST /auth/register` и `/auth/login` возвращают `AuthResponse` (`user`, `accessToken`, `tokenType: 'Bearer'`, `expiresIn` в секундах). Токен — только в теле; куки ставит фронт. Тонкости, которые ломаются при «упрощении»:

- `TokenService` считает `expiresIn` из `iat`/`exp` уже подписанного токена, а не парсит строку `"7d"` второй раз — источник истины один, `signOptions` из `JwtModule.registerAsync`.
- `JwtStrategy.validate` ходит в БД на каждый запрос (`findActiveById`), а не доверяет одной подписи: заблокированный (`isActive = false`) или удалённый пользователь теряет доступ немедленно, не дожидаясь истечения токена.
- `PasswordService.compareWithDummy` сравнивает пароль с фиктивным хешем, когда email не найден. Без этого ответ на несуществующий email приходил бы заметно быстрее и позволял перебором собирать зарегистрированные адреса. По той же причине `LoginUserHandler` отдаёт одно сообщение «Неверный email или пароль» и для неизвестного email, и для неверного пароля, и для заблокированного аккаунта.
- Email нормализуется (`trim().toLowerCase()`) `@Transform` прямо в `LoginDto`/`RegisterDto` — до попадания в БД и до `findByEmail`.
- `MaxLength(72)` у пароля — не вкусовщина: bcrypt учитывает только первые 72 байта.

Есть гонка-предохранитель: `RegisterUserHandler` сначала проверяет `findByEmail`, но между проверкой и вставкой email могут занять, поэтому `UsersRepository.create` ловит `P2002` и тоже бросает `ConflictException`.

**Деньги и даты.** `amount` — `Decimal(12, 2)` в БД, в ответе — `number` через `.toNumber()` в маппере; в DTO ограничение `@IsNumber({ maxDecimalPlaces: 2 })` совпадает со схемой. Сумма всегда положительная, направление задаёт `type` (`INCOME` / `EXPENSE`). `date` — дата операции, задаётся пользователем и не равна `createdAt`.

Границы месяца в `TransactionsService.summary` считаются в **UTC** полуинтервалом `[from, to)` — так последний день месяца не теряется и не задваивается. Учти асимметрию: фильтр списка (`TransactionsRepository.buildWhere`) использует `lte` для `dateTo`, то есть верхняя граница включительная. Если начнёшь передавать в `dateTo` дату без времени, она обрежется на полуночи — сейчас UI фильтрами по датам не пользуется, и это не проявляется.

**Порядок роутов.** `@Get('summary')` объявлен **до** `@Get(':id')` в `transactions.controller.ts`. Nest матчит сверху вниз, поэтому при обратном порядке `summary` уедет в параметр `id` и `ParseUUIDPipe` вернёт 400. Любой новый литеральный подпуть добавляй выше параметрических.

**Prisma 7 отличается от 6.** `new PrismaClient()` без driver adapter бросает ошибку, поэтому `PrismaService` (`src/prisma/prisma.service.ts`) передаёт `new PrismaPg({ connectionString })`, беря URL из `ConfigService.getOrThrow('DATABASE_URL')`. Клиент генерируется в `src/generated/prisma` (папка в `.gitignore`) как TypeScript-исходники: генератор — `prisma-client` с `moduleFormat = "cjs"` под CommonJS-сборку Nest, импорт — из `../generated/prisma/client`. Блок `datasource` в схеме **не содержит `url`** — в Prisma 7 это ошибка валидации P1012: URL для CLI задаётся в `prisma.config.ts` через `process.env.DATABASE_URL ?? ''` (не через `env()`, иначе `prisma generate` падает без поднятой БД), а рантайм получает подключение из адаптера.

`PrismaModule` помечен `@Global()` — импортировать его в модуль ресурса не нужно, достаточно внедрить `PrismaService` в репозиторий.

**Конфигурация.** `ConfigModule.forRoot({ isGlobal: true, cache: true })`; переменные — в `apps/api/.env` (см. `.env.example`): `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN`. Обязательные читаются через `getOrThrow` — приложение падает на старте, а не отдаёт 500 на первом запросе. Глобальный префикс — `api` (`app.setGlobalPrefix('api')`), поэтому реальные пути `/api/auth/login`, `/api/transactions`. CORS открыт только на `CORS_ORIGIN` с `credentials: true`; включены `enableShutdownHooks()`, за счёт которых `PrismaService.onModuleDestroy` успевает закрыть пул.

## Схема БД

`prisma/schema.prisma`, три модели: `User` → `Category` → `Transaction`. Значимое:

- Идентификаторы — `uuid(7)` (`@db.Uuid`): монотонны по времени, поэтому вставка не фрагментирует индекс.
- Имена таблиц через `@@map` в snake_case множественном (`users`, `categories`, `transactions`), enum — `transaction_type`.
- Все связи с `onDelete: Cascade`: удаление пользователя уносит его категории и транзакции, удаление категории — её транзакции. **Удаление категории удаляет транзакции**, мягкого варианта сейчас нет.
- Индексы заведены под реальные запросы: `@@index([userId, date])` — основной список, `@@index([categoryId])` — каскад и фильтр, `@@index([userId])` у категорий.
- `User.isActive` — мягкая блокировка без удаления записи; её проверяют `findActiveById` и `LoginUserHandler`.

Миграции — `npm run prisma:migrate -w @expense-tracker/api` (нужна поднятая БД: `npm run db:up`). Файлы в `prisma/migrations` в репозитории; отредактированную вручную применённую миграцию не переписываем — добавляем новую. Коммит на схему и миграцию идёт со scope `db`, код Nest — отдельным коммитом со scope `api`.

## Как добавить ресурс

1. Модель в `prisma/schema.prisma` + `npm run prisma:migrate -w @expense-tracker/api` (scope коммита — `db`).
2. Тип ответа в `packages/shared/src/api.ts` (scope — `shared`); `packages/shared` собирается в `dist`, так что после правки нужен `npm run build -w @expense-tracker/shared` либо просто `npm run dev` — у turbo-задач стоит `dependsOn: ["^build"]`.
3. `src/<resource>/`: `*.repository.ts` (только Prisma), `*.service.ts` (владение + маппер), `*.controller.ts`, `dto/`, `*.module.ts`; модуль — в `imports` `AppModule`.
4. Guard не подключаешь — он глобальный. `@Public()` только если роут действительно открыт.
5. Каждый метод принимает `userId` из `@CurrentUser()` и проверяет владение; несуществующее и чужое — 404.

## Команды и тулинг

```bash
npm run prisma:generate -w @expense-tracker/api   # обязателен до сборки и после правки схемы
npm run dev -w @expense-tracker/api               # nest start --watch, :3001
npm run lint -w @expense-tracker/api
npm run typecheck -w @expense-tracker/api
curl http://localhost:3001/api/health
```

`src/generated/prisma` не в гите: после `npm install` или смены ветки со схемой сначала `prisma:generate`, иначе typecheck развалится сотнями ошибок об отсутствующем модуле.

**`consistent-type-imports` для `apps/api` выключено** — и это не стилевое послабление. `import type` стирает метаданные, по которым Nest собирает DI и `ValidationPipe`, поэтому классы (`PrismaService`, DTO, сервисы) импортируются обычным `import`. Правило отключено **в двух местах**: в `apps/api/eslint.config.mjs` и отдельным блоком с `ignores: ['apps/api/**/*.ts']` в корневом конфиге — второй нужен потому, что lint-staged в pre-commit запускает `eslint --fix` из корня. Не «наводи порядок», убирая любой из них. `no-extraneous-class` выключено там же — модули Nest пусты по определению.

Типы и интерфейсы (`AuthenticatedUser`, `ApiError`, `Prisma.TransactionWhereInput`) по-прежнему можно и стоит импортировать через `import type`.

Тестов пока нет. Когда появятся — задача `test` в `turbo.json` и скрипт в `apps/api/package.json`.
