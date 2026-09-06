# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Трекер личных расходов. Монорепозиторий на npm workspaces + Turborepo: `apps/web` (Next.js 16, App Router), `apps/api` (NestJS 11), `packages/shared` (общие типы контрактов API). БД — PostgreSQL 17 в Docker, ORM — Prisma 7.

Готовы: схема Prisma с миграциями (`User`, `Category`, `Transaction`), аутентификация по JWT, CRUD категорий и транзакций, главный экран. Тестов нет; в `.github/workflows` лежат только два workflow с Claude (ревью PR и ответ на `@claude`) — сборку, линт и типы CI не прогоняет, это делается локально.

**Этот файл — про монорепозиторий целиком.** Специфика приложений вынесена и подхватывается при работе в соответствующей папке:

- `apps/api/CLAUDE.md` — слои модуля Nest, CQRS в `auth`, глобальный guard и проверка владения, валидация, Prisma 7, схема БД.
- `apps/web/CLAUDE.md` — Feature-Sliced Design, серверные экшены, сессия в httpOnly-куке, shadcn/ui и токены Tailwind.
- `apps/web/AGENTS.md` — предупреждение Next.js о ломающих изменениях версии (генерируется самим `next dev`).

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

**`packages/shared` компилируется в `dist`** (`tsc -b`, `composite: true`), а не потребляется как исходники: Nest собирается в CommonJS и не умеет импортировать сырой TS из workspace. Поэтому в `turbo.json` у задач `dev`, `lint`, `typecheck` стоит `dependsOn: ["^build"]` — не убирать. Для Next пакет дополнительно указан в `transpilePackages`.

**Разделение ответственности между приложениями.** `apps/api` владеет схемой БД, DTO и бизнес-правилами; `apps/web` не ходит в БД и не держит своих правил доступа. Общее — только транспортные типы ответов в `packages/shared/src/api.ts`: DTO запросов остаются в `apps/api`, а ограничения полей продублированы zod-схемами в `apps/web` вручную — меняя контракт, правь все три места и коммить их раздельно (`shared`, `api`, `web`).

**Prisma 7 отличается от 6:** `new PrismaClient()` без driver adapter бросает ошибку, схема запрещает `url` в `datasource`, клиент генерируется в `apps/api/src/generated/prisma` и в гит не попадает — поэтому `npm run prisma:generate -w @expense-tracker/api` обязателен после `npm install` и после смены ветки со схемой. Подробности — в `apps/api/CLAUDE.md`.

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
- Pre-commit прогоняет lint-staged (ESLint --fix + Prettier).
- Правило `consistent-type-imports` отключено для `apps/api` **в двух местах**: в `apps/api/eslint.config.mjs` и отдельным блоком с `ignores: ['apps/api/**/*.ts']` в корневом `eslint.config.mjs`. Второй нужен потому, что lint-staged в pre-commit запускает `eslint --fix` из корня, а flat config берётся по CWD — иначе хук переписывает обычные импорты обратно в `import type`, а те стирают метаданные, нужные Nest для DI и `ValidationPipe`.

### Коммиты

Проверяются commitlint (`commitlint.config.mjs`, extends `@commitlint/config-conventional`) в хуке `commit-msg`, поэтому формат обязателен: `type(scope): описание`.

- **Разрешённые scope** (`scope-enum`, ошибка при другом значении): `web`, `api`, `shared`, `repo`, `db`, `deps`. `repo` — для корневых конфигов, тулинга и документации; `db` — для Prisma-схемы и миграций.
- **Тип** — из conventional-набора: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, `revert`.
- Описание в нижнем регистре, без точки в конце, в повелительном наклонении: `feat(api): add transactions module`.
- Один коммит — одно изменение по смыслу. Работу, которая задевает несколько слоёв, разбивай по scope: схема и миграция → `db`, транспортные типы → `shared`, модуль Nest → `api`, корневые конфиги → `repo`.
- Правки, не относящиеся к задаче (починка чужого бага, конфиг тулинга), выносятся в отдельный коммит, а не примешиваются к `feat`.

Проверить сообщение до коммита: `echo 'feat(api): …' | npx commitlint`.

### Ветки и Pull Request (GitHub Flow)

Работаем по GitHub Flow: `main` всегда в рабочем состоянии и защищена от прямых коммитов — любое изменение приходит в неё только через Pull Request.

1. Ветку заводим от свежей `main`: `git switch main && git pull && git switch -c feat/web-home-screen`.
2. Имя ветки — `<тип>/<scope>-<краткое-описание>` в нижнем регистре через дефисы: тип и scope берём из того же набора, что и у коммитов (`feat`, `fix`, `docs`, `refactor`, `chore`, … × `web`, `api`, `shared`, `repo`, `db`, `deps`). Примеры: `feat/web-home-screen`, `fix/api-auth-cookie-expiry`, `db/add-category-model`.
3. Одна ветка — одна фича. Внутри ветки коммиты по-прежнему дробим по scope (см. «Коммиты»), а не сваливаем всё в один.
4. Пушим рано и часто: `git push -u origin <branch>`. PR можно открыть черновиком (draft) сразу, чтобы обсуждение шло по ходу работы.
5. Перед PR прогоняем локально `npm run lint`, `npm run typecheck`, `npm run build` — CI пока нет, поэтому это единственная проверка.
6. PR-заголовок пишем в формате коммита (`feat(web): rebuild home screen`), в теле — что и зачем менялось. Ветка в PR обязана быть актуальной относительно `main`; расхождение решаем `git rebase main`, а не merge-коммитом внутрь ветки.
7. Мержим squash-мержем — история `main` остаётся линейной, а сообщение squash-коммита должно проходить commitlint. После мержа ветку удаляем (и локально: `git branch -d`).
8. `main` не откатываем и не переписываем (`push --force` в `main` запрещён). Ошибку чиним новым PR (`fix(...)` или `revert`).

Пока `origin` не настроен, шаги 4 и 7 не выполнить — но ветки заводим по этим же правилам, чтобы после подключения GitHub ничего не переименовывать.
