# Expense Tracker

Трекер личных расходов: пользователь регистрируется, заводит категории и записывает доходы/расходы, а на главном экране видит список операций с фильтрами и сводку за текущий месяц (доходы, расходы, баланс).

Монорепозиторий из трёх пакетов: веб-интерфейс на Next.js, REST API на NestJS и общий пакет транспортных типов. Данные лежат в PostgreSQL, доступ к ним — только через API; фронтенд в базу не ходит.

## Стек

| Слой           | Технология                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| Монорепо       | npm workspaces + Turborepo 2                                                     |
| Фронтенд       | Next.js 16 (App Router, Turbopack) + React 19, Tailwind CSS 4, shadcn/ui (Radix) |
| Формы          | react-hook-form + zod 4                                                          |
| Бэкенд         | NestJS 11 (Express), class-validator, `@nestjs/cqrs` в модуле `auth`             |
| Аутентификация | JWT (`@nestjs/jwt` + passport-jwt), пароли — bcrypt                              |
| БД             | PostgreSQL 17 в Docker, ORM — Prisma 7 (driver adapter `@prisma/adapter-pg`)     |
| Язык           | TypeScript 5.9                                                                   |
| Качество кода  | ESLint 9, Prettier, husky + lint-staged, commitlint                              |

## Требования

- **Node.js >= 22.12** (в репозитории `.nvmrc` с `22.18.0`; в `.npmrc` включён `engine-strict`, поэтому на более старой версии установка упадёт)
- **npm 10+** (проект зафиксирован на `npm@10.9.3`, версии зависимостей — точные: `save-exact=true`)
- **Docker** с `docker compose` — для PostgreSQL

## Быстрый старт

```bash
npm install

# переменные окружения — значения по умолчанию согласованы между файлами
cp .env.example .env                            # параметры Postgres для docker compose
cp apps/api/.env.example apps/api/.env          # DATABASE_URL, PORT, CORS_ORIGIN, JWT_*
cp apps/web/.env.example apps/web/.env.local    # API_URL

npm run db:up                                   # поднять Postgres в Docker

npm run prisma:generate -w @expense-tracker/api # сгенерировать Prisma Client (обязательно)
npm run prisma:migrate -w @expense-tracker/api  # накатить миграции на пустую базу

npm run dev                                     # web :3000, api :3001
```

Проверка, что API живой:

```bash
curl http://localhost:3001/api/health
# {"status":"ok","uptime":3,"timestamp":"..."}
```

Дальше — открыть http://localhost:3000, зарегистрироваться на `/register`, создать категорию и первую транзакцию.

> **`prisma:generate` — не опциональный шаг.** Клиент генерируется в `apps/api/src/generated/prisma` и в git не коммитится, поэтому без него не соберётся и не запустится `apps/api`. Повторять после `npm install` и после переключения на ветку с изменённой схемой.

## Переменные окружения

### `/.env` — читает `docker-compose.yml`

| Переменная          | Обязательна | По умолчанию      | Назначение                                |
| ------------------- | ----------- | ----------------- | ----------------------------------------- |
| `POSTGRES_USER`     | да          | `expense`         | Пользователь БД в контейнере              |
| `POSTGRES_PASSWORD` | да          | `expense`         | Пароль пользователя БД                    |
| `POSTGRES_DB`       | да          | `expense_tracker` | Имя базы                                  |
| `POSTGRES_PORT`     | нет         | `5432`            | Порт, который контейнер публикует на хост |

Значения должны совпадать с тем, что записано в `DATABASE_URL` для API.

### `/apps/api/.env` — читает NestJS (`ConfigModule`) и Prisma CLI (`prisma.config.ts`)

| Переменная       | Обязательна | По умолчанию            | Назначение                                                                                        |
| ---------------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | **да**      | —                       | Строка подключения к Postgres. Без неё приложение не стартует (`getOrThrow`)                      |
| `JWT_SECRET`     | **да**      | —                       | Секрет подписи access-токенов. Без неё приложение не стартует. В проде — длинная случайная строка |
| `JWT_EXPIRES_IN` | нет         | `7d`                    | Время жизни токена (формат `ms`: `15m`, `7d`)                                                     |
| `PORT`           | нет         | `3001`                  | Порт HTTP-сервера API                                                                             |
| `CORS_ORIGIN`    | нет         | `http://localhost:3000` | Origin фронтенда, которому разрешён CORS с credentials                                            |

Пример `DATABASE_URL` для локального compose:
`postgresql://expense:expense@localhost:5432/expense_tracker?schema=public`

### `/apps/web/.env.local` — читает Next.js

| Переменная | Обязательна | По умолчанию                | Назначение                                                                                                                                                          |
| ---------- | ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_URL`  | нет         | `http://localhost:3001/api` | Базовый URL API. Переменная **серверная**, без префикса `NEXT_PUBLIC_` — в браузер не попадает: все запросы к API идут из серверных компонентов и серверных экшенов |

Токен доступа хранится в httpOnly-куке `accessToken` (`sameSite=lax`, `secure` в production) и живёт столько же, сколько сам JWT.

## Команды

Все команды из корня; за одним пакетом — флаг `-w`, например `npm run lint -w @expense-tracker/api`.

| Команда                                           | Что делает                                           |
| ------------------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                                     | Turborepo: web `:3000` и api `:3001` параллельно     |
| `npm run dev:web` / `npm run dev:api`             | Только одно приложение                               |
| `npm run build`                                   | Сборка всех пакетов с учётом зависимостей            |
| `npm run lint` / `typecheck` / `format`           | ESLint / `tsc --noEmit` / Prettier по всем workspace |
| `npm run db:up` / `db:down` / `db:logs`           | Поднять / остановить / смотреть логи Postgres        |
| `npm run prisma:generate -w @expense-tracker/api` | Сгенерировать Prisma Client                          |
| `npm run prisma:migrate -w @expense-tracker/api`  | `prisma migrate dev` — накатить/создать миграцию     |
| `npm run prisma:studio -w @expense-tracker/api`   | Prisma Studio для просмотра данных                   |

Автотестов и CI-прогонов сборки пока нет: перед PR прогоняются локально `npm run lint`, `npm run typecheck`, `npm run build`.

## Структура

```
apps/
  api/                      @expense-tracker/api — NestJS, порт 3001, префикс /api
    prisma/                 schema.prisma и миграции
    src/
      auth/                 регистрация, логин, JWT-стратегия, глобальный guard (CQRS)
      users/                пользователи: service + repository
      categories/           CRUD категорий
      transactions/         CRUD транзакций, фильтры, сводка за месяц
      prisma/               PrismaService (подключение через driver adapter)
      common/filters/       HttpExceptionFilter — единый формат ошибки
      health/               GET /api/health
  web/                      @expense-tracker/web — Next.js, порт 3000
    src/
      app/                  роуты App Router: /, /login, /register
      widgets/              dashboard-header, month-summary, transaction-list, auth-status
      features/             auth-login/register/logout, transaction-create/delete, transactions-filter, category-create
      entities/             transaction, category, user, session (доступ к API и типы)
      shared/               api-клиент, ui-компоненты (shadcn/ui), утилиты
packages/
  shared/                   @expense-tracker/shared — типы ответов API, общие для web и api
```

Архитектура фронтенда — Feature-Sliced Design; бэкенда — слои `controller → service → repository` (в `auth` — CQRS-команды и запросы). Подробности в `apps/web/CLAUDE.md` и `apps/api/CLAUDE.md`.

`packages/shared` компилируется в `dist` (`tsc -b`), поэтому у задач `dev`, `lint`, `typecheck` в `turbo.json` стоит `dependsOn: ["^build"]` — при ручном запуске `apps/api` пакет должен быть собран.

## API

Базовый URL — `http://localhost:3001/api`. Формат — JSON.

Все эндпоинты требуют заголовка `Authorization: Bearer <accessToken>`, кроме помеченных «публичный»: guard подключён глобально, публичность задаётся декоратором `@Public()`. Пользователь видит и меняет только свои категории и транзакции — чужой `id` даёт `404`.

### Аутентификация

| Метод  | Путь             | Описание                                                                                                                                                  |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/auth/register` | Публичный. Тело: `name` (2–100), `email`, `password` (8–72 символа, минимум одна буква и одна цифра). Ответ `201` + `AuthResponse`. Занятый email — `409` |
| `POST` | `/auth/login`    | Публичный. Тело: `email`, `password`. Ответ `200` + `AuthResponse`                                                                                        |
| `GET`  | `/auth/me`       | Текущий пользователь (`AuthUser`)                                                                                                                         |

`AuthResponse`: `{ user, accessToken, tokenType: "Bearer", expiresIn }`, где `expiresIn` — секунды.

### Категории

| Метод    | Путь              | Описание                                                              |
| -------- | ----------------- | --------------------------------------------------------------------- |
| `GET`    | `/categories`     | Список категорий пользователя                                         |
| `POST`   | `/categories`     | Тело: `name` (1–50), `color` (hex, например `#FF5722`), `icon` (1–50) |
| `PATCH`  | `/categories/:id` | Частичное обновление тех же полей                                     |
| `DELETE` | `/categories/:id` | `204`. Транзакции категории удаляются каскадно                        |

### Транзакции

| Метод    | Путь                    | Описание                                                                                                                                                                          |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/transactions`         | Страница списка: `{ items, total, page, limit }`. Query: `page` (≥1, по умолчанию `1`), `limit` (1–100, по умолчанию `10`), `type`, `categoryId`, `dateFrom`, `dateTo` (ISO-8601) |
| `GET`    | `/transactions/summary` | Итоги за месяц: query `month` (1–12) и `year` (1970–2100) — оба обязательны. Ответ: `{ month, year, totalIncome, totalExpense, balance }`                                         |
| `GET`    | `/transactions/:id`     | Одна транзакция                                                                                                                                                                   |
| `POST`   | `/transactions`         | Тело: `amount` (> 0, максимум 2 знака после запятой), `type` (`INCOME` \| `EXPENSE`), `date` (ISO-8601), `categoryId` (UUID), `description` (опционально, ≤ 500)                  |
| `PATCH`  | `/transactions/:id`     | Частичное обновление тех же полей                                                                                                                                                 |
| `DELETE` | `/transactions/:id`     | `204`                                                                                                                                                                             |

Сумма всегда положительная — направление задаёт `type`.

### Служебное

| Метод | Путь      | Описание                                         |
| ----- | --------- | ------------------------------------------------ |
| `GET` | `/health` | Публичный. `{ status: "ok", uptime, timestamp }` |

### Ошибки

Любая ошибка приходит в едином формате (`HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "message": "Bad Request Exception",
  "errors": ["amount must be a positive number"],
  "path": "/api/transactions",
  "timestamp": "2026-09-05T18:20:00.000Z"
}
```

Поле `errors` появляется только у ошибок валидации. Валидация строгая: незадекларированное поле в теле или в query даёт `400` (`whitelist` + `forbidNonWhitelisted`).

### Пример: от регистрации до транзакции

```bash
BASE=http://localhost:3001/api

TOKEN=$(curl -s -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Иван","email":"ivan@example.com","password":"password1"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

CATEGORY=$(curl -s -X POST $BASE/categories \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Продукты","color":"#FF5722","icon":"shopping-cart"}' \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

curl -s -X POST $BASE/transactions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"amount\":1250.50,\"type\":\"EXPENSE\",\"date\":\"2026-09-05T00:00:00.000Z\",\"categoryId\":\"$CATEGORY\",\"description\":\"Магазин у дома\"}"

curl -s "$BASE/transactions?page=1&limit=10" -H "Authorization: Bearer $TOKEN"
```

## Модель данных

- **User** — `email` (уникальный), `name`, `passwordHash`, `isActive`, `lastLoginAt`.
- **Category** — `name`, `color`, `icon`, принадлежит пользователю.
- **Transaction** — `amount` (`Decimal(12,2)`, деньги не во float), `type` (`INCOME`/`EXPENSE`), `date` (задаёт пользователь, не путать с `createdAt`), `description`, ссылки на категорию и пользователя.

Удаление пользователя каскадно удаляет его категории и транзакции, удаление категории — её транзакции.

## Разработка

- Коммиты проверяет commitlint: `type(scope): описание`, где scope — один из `web`, `api`, `shared`, `repo`, `db`, `deps`. Проверить сообщение заранее: `echo 'feat(api): add module' | npx commitlint`.
- Pre-commit прогоняет lint-staged (ESLint `--fix` + Prettier).
- Работаем по GitHub Flow: ветка от свежей `main`, PR со squash-мержем. Правила — в `CLAUDE.md`.
- Меняя контракт API, правьте все три места раздельными коммитами: `packages/shared` (типы ответов), `apps/api` (DTO и логика), `apps/web` (zod-схемы форм).

## Если что-то не работает

| Симптом                                          | Причина и что делать                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `Cannot find module './generated/prisma/client'` | Не сгенерирован клиент: `npm run prisma:generate -w @expense-tracker/api`                         |
| API падает на старте с ошибкой конфигурации      | Не заданы `DATABASE_URL` или `JWT_SECRET` в `apps/api/.env`                                       |
| `Cannot find module '@expense-tracker/shared'`   | Пакет не собран: `npm run build -w @expense-tracker/shared` (или просто `npm run dev` из корня)   |
| Ошибка подключения к Postgres                    | Контейнер не поднят (`npm run db:up`) или порт занят — поменяйте `POSTGRES_PORT` и `DATABASE_URL` |
| `EBADENGINE` при `npm install`                   | Node ниже 22.12 — переключитесь на версию из `.nvmrc`                                             |
| В браузере запросы к API падают на CORS          | `CORS_ORIGIN` в `apps/api/.env` не совпадает с адресом фронтенда                                  |

`npm audit` показывает 3 high-уязвимости в транзитивной зависимости `deepmerge-ts` (`@prisma/config`). Единственный предлагаемый фикс — откат на Prisma 6, поэтому оставлено как есть.
