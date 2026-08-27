# Трекер расходов

Монорепозиторий: веб-интерфейс на Next.js, REST API на NestJS, PostgreSQL через Prisma.

## Стек

| Слой          | Технология                                                                   |
| ------------- | ---------------------------------------------------------------------------- |
| Монорепо      | npm workspaces + Turborepo 2                                                 |
| Фронтенд      | Next.js 16 (App Router) + React 19 + Tailwind CSS 4                          |
| Бэкенд        | NestJS 11 + Express, валидация через class-validator                         |
| БД            | PostgreSQL 17 в Docker, ORM — Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Язык          | TypeScript 5.9                                                               |
| Качество кода | ESLint 9, Prettier, husky + lint-staged, commitlint                          |

## Структура

```
apps/
  web/      @expense-tracker/web    — Next.js, порт 3000
  api/      @expense-tracker/api    — NestJS,   порт 3001
packages/
  shared/   @expense-tracker/shared — общие типы контрактов API
```

Данные фронтенд получает в серверных компонентах через `apps/web/src/lib/api.ts`.

## Требования

- Node.js >= 22.12 (в репозитории `.nvmrc` с 22.18.0)
- npm 10+
- Docker (для Postgres)

## Первый запуск

```bash
npm install

cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:up                                  # Postgres в Docker
npm run prisma:generate -w @expense-tracker/api # генерация Prisma Client
npm run dev                                    # web :3000, api :3001
```

Проверка API: `curl http://localhost:3001/api/health`.

## Скрипты (корень)

| Команда                     | Описание                                            |
| --------------------------- | --------------------------------------------------- |
| `npm run dev`               | Параллельный запуск всех приложений через Turborepo |
| `npm run build`             | Сборка всех пакетов с учётом зависимостей           |
| `npm run lint`              | ESLint по всем workspace                            |
| `npm run typecheck`         | Проверка типов без эмита                            |
| `npm run format`            | Prettier по всему репозиторию                       |
| `npm run db:up` / `db:down` | Поднять / остановить Postgres                       |

## Состояние

Каркас проекта. Схема БД (модели Prisma и миграции), аутентификация, тесты и CI пока не реализованы — это следующие этапы.
