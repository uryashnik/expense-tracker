# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Трекер личных расходов. Монорепозиторий на npm workspaces + Turborepo: `apps/web` (Next.js 16, App Router), `apps/api` (NestJS 11), `packages/shared` (общие типы контрактов API). БД — PostgreSQL 17 в Docker, ORM — Prisma 7.

Сейчас в репозитории только каркас: моделей Prisma, миграций, аутентификации, тестов и CI ещё нет.

## Команды

```bash
npm install                                     # зависимости всего монорепо
cp .env.example .env                            # параметры Postgres для compose
cp apps/api/.env.example apps/api/.env          # DATABASE_URL, PORT, CORS_ORIGIN
cp apps/web/.env.example apps/web/.env.local    # API_URL

npm run db:up                                   # docker compose up -d
npm run prisma:generate -w @expense-tracker/api # обязателен до сборки api
npm run dev                                     # turbo: web :3000, api :3001

npm run build / lint / typecheck / format       # по всем workspace через turbo
```

Для одного пакета — флаг `-w`: `npm run lint -w @expense-tracker/api`. Скрипты Prisma (`prisma:generate`, `prisma:migrate`, `prisma:studio`) живут только в `apps/api`.

Тестов пока нет. Когда появятся — добавить задачу `test` в `turbo.json` и скрипты в пакеты.

Проверка живости API: `curl http://localhost:3001/api/health`.

## Архитектура

**Поток данных.** Фронтенд ходит в API только из серверных компонентов и Server Actions через `apps/web/src/shared/api/client.ts` — тонкую обёртку над `fetch` с базовым URL из `process.env.API_URL` и дефолтным `cache: 'no-store'`. Клиентского слоя данных (TanStack Query и т.п.) в проекте намеренно нет: интерактивные формы (вход/регистрация) — клиентские компоненты, но саму сеть дёргают через `'use server'`-экшены, а не `fetch` из браузера.

**Контракт ошибок.** `apps/api/src/common/filters/http-exception.filter.ts` приводит любое исключение к типу `ApiError` из `@expense-tracker/shared`; `apps/web/src/shared/api/client.ts` разбирает ответ обратно в этот же тип и бросает `ApiRequestError`. Меняя формат ошибки, правь обе стороны и тип в `packages/shared/src/api.ts`. `apps/web/src/shared/api/action-error.ts` (`toActionErrorState`) переводит `ApiRequestError` в состояние, удобное для формы: общее сообщение + `fieldErrors` по имени поля DTO (class-validator отдаёт ошибки строками вида `"email must be an email"` — первое слово в них и есть имя поля).

**Frontend-архитектура (Feature-Sliced Design).** `apps/web/src` организован по слоям FSD; App Router (`app/`) заменяет собой слой `pages` и остаётся тонким — только роутинг и сборка виджетов/фич, без бизнес-логики:

```
app/            # роуты Next.js (тонкие: страница = вёрстка + импорт фичи/виджета)
widgets/        # композиция сущностей+фич для конкретного места в UI (auth-status)
features/       # самостоятельное действие пользователя (auth-login, auth-register, auth-logout):
                #   model/ — zod-схема, api/ — 'use server' экшен, ui/ — форма
entities/       # бизнес-сущности: session (httpOnly-cookie с access-токеном), user
shared/         # переиспользуемое без знания о домене: api/ (клиент+ошибки), ui/ (shadcn), lib/ (cn)
```

Слой может импортировать только из слоёв ниже себя (`app → widgets → features → entities → shared`), не наоборот и не соседей одного уровня напрямую — исключение оговорено явно, если появится. Публичный API каждого среза — его `index.ts`; импортируй `@/features/auth-login`, а не `@/features/auth-login/ui/login-form`.

**Аутентификация.** `POST /auth/login` и `/auth/register` отдают JWT в теле ответа (`AuthResponse.accessToken`), который `entities/session` (`apps/web/src/entities/session/lib/session.ts`) кладёт в httpOnly-cookie на срок `expiresIn`; `entities/user` читает её и ходит в `GET /auth/me` с заголовком `Authorization: Bearer`. Экшены в `features/auth-*/api/actions.ts` — единственное место, где создаётся/удаляется сессия и куда вызывается `redirect()`.

**shadcn/ui.** `apps/web/components.json` настраивает алиасы shadcn на FSD-раскладку (`ui`/`components` → `shared/ui`, `utils` → `shared/lib/utils`), так что `npx shadcn add <name>` кладёт компонент туда же, где уже лежат остальные (`button`, `input`, `label`, `card`, `form`, `alert`). Токены компонентов (`--color-background`, `--color-primary`, `--color-border` и т.д.) в `globals.css` — не отдельная палитра, а алиасы через `var()` поверх уже существующих `--color-surface`/`--color-ink`/`--color-accent`: так тёмная тема остаётся общей и переопределяется в одном месте. Не заводи новый `--color-accent`-подобный токен под нейтральный hover-фон — там, где стандартный shadcn использует `accent`/`accent-foreground` (hover у `outline`/`ghost`), в этом проекте переиспользован `secondary`, потому что `--color-accent` уже занят под фирменный синий (= shadcn `primary`).

**Валидация форм.** Zod-схемы в `features/*/model/schema.ts` зеркалят ограничения DTO из `apps/api` (длина имени, формат email, `password` ≥ 8 символов с буквой и цифрой) и требуют непустые поля — это первый рубеж проверки. Второй — сам API: серверный экшен обязательно валидирует данные ещё раз через `schema.safeParse` перед вызовом `api.post`, а `RegisterDto` в API собран с `forbidNonWhitelisted: true`, поэтому поле `confirmPassword` (только для формы) явно вырезается перед отправкой.

**`packages/shared` компилируется в `dist`** (`tsc -b`, `composite: true`), а не потребляется как исходники: Nest собирается в CommonJS и не умеет импортировать сырой TS из workspace. Поэтому в `turbo.json` у задач `dev`, `lint`, `typecheck` стоит `dependsOn: ["^build"]` — не убирать. Для Next пакет дополнительно указан в `transpilePackages`.

**Prisma 7 отличается от 6:** `new PrismaClient()` без driver adapter бросает ошибку, поэтому `PrismaService` (`apps/api/src/prisma/prisma.service.ts`) передаёт `new PrismaPg({ connectionString })` из `ConfigService`. Клиент генерируется в `apps/api/src/generated/prisma` (папка в `.gitignore`) как TypeScript-исходники, генератор — `prisma-client` с `moduleFormat = "cjs"` под CommonJS-сборку Nest; импорт — из `generated/prisma/client`. Блок `datasource` в схеме **не содержит `url`** — в Prisma 7 это ошибка валидации P1012: URL для CLI задаётся в `apps/api/prisma.config.ts` через `process.env.DATABASE_URL ?? ''` (не через `env()`, иначе `prisma generate` падает без поднятой БД), а рантайм получает подключение из адаптера.

**Валидация** — class-validator: глобальный `ValidationPipe` в `main.ts` с `whitelist`, `forbidNonWhitelisted`, `transform`. DTO-классы живут в `apps/api`, во `shared` идут только транспортные типы ответов.

## Ограничения по версиям

Версии в `package.json` зафиксированы точно (`save-exact=true` в `.npmrc`). Обновляя, учитывай:

- **TypeScript держим на 5.9.x**, хотя вышла 7.x: `typescript-eslint@8` объявляет peer `<6.1.0`, а NestJS зависит от `emitDecoratorMetadata`.
- **ESLint на 9.x**, не 10.x — ради совместимости плагинов.
- **Tailwind v4 без `tailwind.config.js`**: подключён через `@tailwindcss/postcss`, токены задаются блоком `@theme` в `apps/web/src/app/globals.css`. `@theme` допустим только на верхнем уровне — тёмная тема переопределяет те же переменные в `:root` внутри media-запроса.
- `eslint-config-next@16` отдаёт готовый flat config, `FlatCompat` не нужен.
- **lint-staged держим на 16.x**: 17.x требует Node `>=22.22.1`, а с `engine-strict=true` в `.npmrc` установка на текущем Node 22.18 падает с `EBADENGINE`.
- `npm audit` показывает 3 high-уязвимости в `deepmerge-ts` — транзитивная зависимость `@prisma/config`. Единственный «фикс» от npm — откат на Prisma 6, поэтому оставлено как есть.

## Соглашения

- Скоуп пакетов — `@expense-tracker/*` (через `s`), несмотря на опечатку в имени каталога `expence-tracker`. По той же причине в `docker-compose.yml` явно задан `name: expense-tracker`.
- Коммиты проверяются commitlint (conventional). Разрешённые scope: `web`, `api`, `shared`, `repo`, `db`, `deps`.
- Pre-commit прогоняет lint-staged (ESLint --fix + Prettier).
- В `apps/api/eslint.config.mjs` правило `consistent-type-imports` отключено: type-only импорты стирают метаданные, нужные Nest для DI.
