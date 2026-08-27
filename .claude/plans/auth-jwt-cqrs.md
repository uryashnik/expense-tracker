# Авторизация в `apps/api`: модуль пользователей + JWT + CQRS

## Context

Сейчас в `apps/api` есть только каркас: `health`, `PrismaService` (глобальный модуль), глобальный `ValidationPipe` и `HttpExceptionFilter`. Схема Prisma пуста — ни одной модели и ни одной миграции. Пользователей и аутентификации нет вообще.

Нужно заложить фундамент для всей дальнейшей работы трекера: пользователь должен уметь зарегистрироваться и войти, а все будущие ресурсы (расходы, категории) — принадлежать конкретному пользователю. Для этого добавляем модель `User`, модуль `users` с репозиторием и сервисом, и отдельный модуль `auth` с JWT, построенный на CQRS.

**Решения, согласованные с пользователем:**

- только access-токен (без refresh), TTL 7 дней;
- токен отдаётся JSON-ом в теле ответа, cookie не используются (`cookie-parser` не нужен);
- хеширование — `bcrypt`;
- стратегия — `@nestjs/passport` + `passport-jwt`;
- CQRS — официальный `@nestjs/cqrs` (CommandBus / QueryBus / EventBus);
- CQRS применяем **только в `auth`**; `users` остаётся обычным сервисом с репозиторием;
- доменные события — базовые (`UserRegisteredEvent`, `UserLoggedInEvent`).

Изменения только в `apps/api` и `packages/shared` (транспортные типы). `apps/web` не трогаем — экраны логина отдельная задача.

---

## 1. Зависимости

В `apps/api/package.json` (версии фиксируем точно — `save-exact=true`):

```
dependencies:    @nestjs/cqrs 11.0.3, @nestjs/jwt 11.0.2, @nestjs/passport 11.0.5,
                 passport 0.7.0, passport-jwt 4.0.1, bcrypt 6.0.0
devDependencies: @types/passport-jwt 4.0.1, @types/bcrypt 6.0.0
```

Совместимость проверена: `@nestjs/cqrs@11` и `@nestjs/passport@11` требуют `@nestjs/common/core ^10||^11` (у нас 11.2.1), `rxjs ^7.2` (7.8.2) и `reflect-metadata ^0.2` (0.2.2); `bcrypt@6` требует Node `>=18` (у нас 22.18) — с `engine-strict=true` конфликта нет.

Установка: `npm install -w @expense-tracker/api @nestjs/cqrs@11.0.3 ...` (нативный `bcrypt` собирается при install).

## 2. Схема БД

`apps/api/prisma/schema.prisma` — первая модель проекта:

```prisma
model User {
  id           String    @id @default(uuid(7)) @db.Uuid
  email        String    @unique
  name         String
  passwordHash String
  isActive     Boolean   @default(true)   // мягкая блокировка без удаления
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@map("users")
}
```

`datasource` остаётся без `url` (требование Prisma 7). Далее:

```bash
npm run db:up
npm run prisma:migrate -w @expense-tracker/api -- --name add_user   # создаст prisma/migrations
npm run prisma:generate -w @expense-tracker/api
```

Email в БД храним уже нормализованным (lowercase) — нормализация делается в DTO, см. п.6.

## 3. Контракты в `packages/shared/src/api.ts`

Добавить рядом с существующими (`ApiError`, `HealthStatus`) — только типы **ответов**, DTO и команды остаются в api:

```ts
/** Пользователь в ответах API: без хеша пароля и служебных полей. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Ответ POST /api/auth/register и POST /api/auth/login. */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  tokenType: 'Bearer';
  /** Время жизни access-токена в секундах. */
  expiresIn: number;
}
```

`packages/shared` собирается в `dist`, поэтому после правки нужен `npm run build -w @expense-tracker/shared` (или просто `npm run dev` — у задач стоит `dependsOn: ["^build"]`).

## 4. Переменные окружения

В `apps/api/.env.example` и `apps/api/.env`:

```
JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=7d
```

Секрет читаем через `config.getOrThrow('JWT_SECRET')` — приложение упадёт на старте, если переменной нет. Отдельную схему валидации env не заводим.

## 5. Модуль `users` (без CQRS)

```
apps/api/src/users/
├── users.module.ts
├── users.service.ts
├── users.repository.ts
└── dto/create-user.dto.ts   (внутренний ввод сервиса: email, name, passwordHash)
```

**`users.repository.ts`** — единственное место, где модуль касается Prisma. `PrismaModule` объявлен `@Global()`, импортировать его не нужно, достаточно инжектить `PrismaService`.

- `create(data: CreateUserDto): Promise<User>` — ловит `PrismaClientKnownRequestError` с кодом `P2002` (гонка на уникальном индексе email) и пробрасывает `ConflictException`. Импорт `Prisma` — из `../generated/prisma/client`, как в `prisma.service.ts:4`.
- `findByEmail(email: string): Promise<User | null>`
- `findById(id: string): Promise<User | null>`
- `touchLastLogin(id: string): Promise<void>`

**`users.service.ts`** — доменная логика поверх репозитория: те же методы плюс `findActiveById(id)` (возвращает `null`, если пользователя нет или `isActive === false`) и `toAuthUser(user): AuthUser` — маппер, который отсекает `passwordHash` и приводит `createdAt` к ISO-строке. Именно этот маппер должен использоваться везде, где `User` уходит наружу, чтобы хеш физически не мог попасть в ответ.

`UsersModule` экспортирует `UsersService` (репозиторий наружу не экспортируем).

## 6. Модуль `auth` (CQRS)

```
apps/api/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── application/
│   ├── commands/
│   │   ├── register-user.command.ts
│   │   ├── register-user.handler.ts
│   │   ├── login-user.command.ts
│   │   ├── login-user.handler.ts
│   │   └── index.ts                     // export const COMMAND_HANDLERS = [...]
│   ├── queries/
│   │   ├── get-current-user.query.ts
│   │   ├── get-current-user.handler.ts
│   │   └── index.ts                     // QUERY_HANDLERS
│   └── events/
│       ├── user-registered.event.ts
│       ├── user-logged-in.event.ts
│       ├── user-registered.handler.ts
│       ├── user-logged-in.handler.ts
│       └── index.ts                     // EVENT_HANDLERS
├── services/
│   ├── password.service.ts
│   └── token.service.ts
├── dto/
│   ├── register.dto.ts
│   └── login.dto.ts
├── strategies/jwt.strategy.ts
├── guards/jwt-auth.guard.ts
├── decorators/public.decorator.ts
├── decorators/current-user.decorator.ts
└── types/jwt-payload.ts                 // JwtPayload { sub, email }, AuthenticatedUser { id, email }
```

Разделение ответственности: контроллер только валидирует вход и диспатчит в шину; вся логика — в хендлерах; `PasswordService`/`TokenService` — переиспользуемые технические сервисы без бизнес-правил. Отдельного `AuthService` нет — иначе он дублировал бы хендлеры.

### DTO

class-validator; `strictPropertyInitialization: false`, поэтому без `!`. Учесть глобальный `whitelist + forbidNonWhitelisted` — лишние поля дадут 400 автоматически.

- `RegisterDto`: `name` — `@IsString() @Length(2, 100)`; `email` — `@IsEmail()` + `@Transform(({ value }) => value?.trim().toLowerCase())`; `password` — `@IsString() @MinLength(8) @MaxLength(72)` (bcrypt режет всё после 72 байт — ограничиваем явно) и `@Matches` на наличие буквы и цифры.
- `LoginDto`: `email` (та же нормализация) + `password` (`@IsString() @IsNotEmpty()`), без правил сложности.

### Технические сервисы

- **`password.service.ts`** — `hash(plain)` (`bcrypt.hash`, `saltRounds = 12`) и `compare(plain, hash)`. Плюс `compareWithDummy(plain)`: сравнение с заранее посчитанной хеш-константой, чтобы при несуществующем email время ответа не выдавало, зарегистрирован ли адрес.
- **`token.service.ts`** — `issue(user): Promise<{ accessToken, expiresIn }>` поверх `JwtService.signAsync({ sub: user.id, email: user.email })`; `expiresIn` в секундах вычисляется из `JWT_EXPIRES_IN`.

### Команды и запросы

- **`RegisterUserCommand { name, email, password }`** → `RegisterUserHandler implements ICommandHandler<RegisterUserCommand, AuthResponse>`:
  проверка `usersService.findByEmail` → `ConflictException('Пользователь с таким email уже существует')`; `passwordService.hash`; `usersService.create`; `tokenService.issue`; `eventBus.publish(new UserRegisteredEvent(user.id, user.email))`; возврат `AuthResponse`.
- **`LoginUserCommand { email, password }`** → `LoginUserHandler implements ICommandHandler<LoginUserCommand, AuthResponse>`:
  `findByEmail`; если пользователя нет — всё равно выполняем `passwordService.compareWithDummy`; при несовпадении пароля **или** `isActive === false` — `UnauthorizedException('Неверный email или пароль')` (одинаковый текст во всех случаях, чтобы не давать перебор по email); при успехе — `tokenService.issue` и `eventBus.publish(new UserLoggedInEvent(user.id))`.
- **`GetCurrentUserQuery { userId }`** → `GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery, AuthUser>`:
  `usersService.findActiveById` → `UnauthorizedException`, если пользователя больше нет; иначе `toAuthUser`.

События публикуем напрямую через `EventBus`, без `EventPublisher`/`AggregateRoot`: агрегатов с накоплением событий здесь нет, обёртка была бы лишней.

### Обработчики событий

- **`UserRegisteredHandler`** — пока только structured-лог через `Logger`. Точка расширения для welcome-письма.
- **`UserLoggedInHandler`** — `usersService.touchLastLogin(userId)`.

Важно: `EventBus` в `@nestjs/cqrs` работает fire-and-forget — исключение в обработчике не откатит и не сломает логин, но и не всплывёт в ответе. Поэтому в событиях держим только некритичные побочные эффекты (`lastLoginAt`, логи), а всё, без чего ответ неверен, остаётся в хендлере команды. Внутри обработчиков ошибки ловим и логируем сами.

### Passport и guard

**`jwt.strategy.ts`** — `PassportStrategy(Strategy)`, `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()`, `ignoreExpiration: false`, секрет через `ConfigService`. В `validate(payload: JwtPayload)` идём в `usersService.findActiveById` — так удалённый/заблокированный пользователь теряет доступ, не дожидаясь истечения токена; при `null` — `UnauthorizedException`. В `request.user` кладём компактный `AuthenticatedUser { id, email }`, а не всю запись.

Из-за этого `/auth/me` делает второй SELECT (через `GetCurrentUserQuery`). Это осознанный размен: контроллер остаётся единообразным (всё через шину), а стратегия не тащит в каждый запрос лишние поля. Эндпоинт вызывается редко, оптимизировать нечего.

**`jwt-auth.guard.ts`** — `AuthGuard('jwt')`, переопределяет `canActivate`: читает метаданные `IS_PUBLIC_KEY` через `Reflector` и пропускает публичные роуты.

**`public.decorator.ts`** — `SetMetadata(IS_PUBLIC_KEY, true)`; **`current-user.decorator.ts`** — `createParamDecorator`, достаёт `request.user` как `AuthenticatedUser`.

### `auth.module.ts`

Импортирует `CqrsModule`, `UsersModule`, `PassportModule`, `JwtModule.registerAsync` (секрет и `signOptions.expiresIn` из `ConfigService`). Провайдеры: `PasswordService`, `TokenService`, `JwtStrategy`, спреды `COMMAND_HANDLERS`, `QUERY_HANDLERS`, `EVENT_HANDLERS` и **глобальный guard**:

```ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

Защита по умолчанию для всего API — новые ресурсы (расходы) окажутся закрытыми автоматически, без риска забыть guard.

### `auth.controller.ts`

`@Controller('auth')`, в конструкторе `CommandBus` и `QueryBus`:

| Метод | Роут                 | Доступ                         | Диспатч               | Ответ               |
| ----- | -------------------- | ------------------------------ | --------------------- | ------------------- |
| POST  | `/api/auth/register` | `@Public()`                    | `RegisterUserCommand` | 201, `AuthResponse` |
| POST  | `/api/auth/login`    | `@Public()` + `@HttpCode(200)` | `LoginUserCommand`    | 200, `AuthResponse` |
| GET   | `/api/auth/me`       | защищён                        | `GetCurrentUserQuery` | 200, `AuthUser`     |

Вызовы типизируем как `commandBus.execute<RegisterUserCommand, AuthResponse>(...)`, возвращаемые типы указываем явно и берём из `@expense-tracker/shared` — как в `health.controller.ts:7`.

## 7. Правки существующих файлов

- `apps/api/src/app.module.ts` — добавить `UsersModule` и `AuthModule` (`CqrsModule` импортируется внутри `AuthModule`, глобально не регистрируем).
- `apps/api/src/health/health.controller.ts` — повесить `@Public()` на `check()`, иначе глобальный guard закроет health-check.
- `apps/api/src/main.ts` — **без изменений**: токены в теле ответа, cookie-parser не нужен.
- `apps/api/src/common/filters/http-exception.filter.ts` — **без изменений**: `UnauthorizedException`/`ConflictException`, брошенные внутри хендлеров, проходят через `CommandBus` наружу и уже корректно приводятся к `ApiError`.
- В DTO, командах и провайдерах не использовать `import type` для классов — `emitDecoratorMetadata` теряет метаданные, а `@CommandHandler(RegisterUserCommand)` требует класс как значение (правило `consistent-type-imports` в `apps/api/eslint.config.mjs` отключено именно поэтому). Для чистых интерфейсов из `shared` — `import type`, как в существующем коде.
- Импорты — относительные пути (алиас `@/*` в рантайме `nest start` не резолвится).

## Verification

```bash
npm install
npm run db:up
npm run prisma:migrate -w @expense-tracker/api -- --name add_user
npm run prisma:generate -w @expense-tracker/api
npm run build -w @expense-tracker/shared
npm run typecheck && npm run lint
npm run dev
```

При старте в логе Nest должны появиться зарегистрированные хендлеры (`RegisterUserHandler`, `LoginUserHandler`, `GetCurrentUserHandler`, обработчики событий) — если хендлер не попал в провайдеры, `execute` упадёт с `CommandHandlerNotFoundException` уже в рантайме, поэтому проверяем оба эндпоинта.

Затем вручную:

```bash
# health открыт
curl -i http://localhost:3001/api/health                      # 200

# регистрация
curl -i -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Виталий","email":"Test@Example.com","password":"secret123"}'   # 201 + accessToken

# повторная регистрация того же email
# (проверяет и нормализацию: TEST@example.com должен считаться тем же)      # 409 ConflictException

# логин
curl -i -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"secret123"}'                    # 200
curl -i ... -d '{"email":"test@example.com","password":"wrong"}'              # 401
curl -i ... -d '{"email":"нет@example.com","password":"secret123"}'           # 401, тот же текст

# защищённый роут
curl -i http://localhost:3001/api/auth/me                                     # 401
curl -i http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"   # 200 AuthUser

# валидация: слабый пароль и лишнее поле
curl -i -X POST .../register -d '{"name":"A","email":"bad","password":"123","role":"admin"}'
#                                        400 + массив errors в ApiError
```

Дополнительно: `npm run prisma:studio -w @expense-tracker/api` — убедиться, что в `users` лежит bcrypt-хеш (`$2b$12$…`), а не пароль, и что `lastLoginAt` обновился после логина (это и есть проверка, что `UserLoggedInEvent` дошёл до обработчика).

Коммит — conventional со scope `api` (например `feat(api): добавить регистрацию и вход по JWT`), схема — отдельным коммитом со scope `db`.
