# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Трекер личных расходов. Монорепозиторий на npm workspaces + Turborepo: `apps/web` (Next.js 16, App Router), `apps/api` (NestJS 11), `packages/shared` (общие типы контрактов API). БД — PostgreSQL 17 в Docker, ORM — Prisma 7.

Готовы: схема Prisma с миграциями (`User`, `Category`, `Transaction`), аутентификация по JWT, CRUD категорий и транзакций, главный экран. Тестов и CI ещё нет.

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
widgets/        # композиция сущностей+фич для конкретного места в UI
                #   (auth-status, dashboard-header, month-summary, transaction-list)
features/       # самостоятельное действие пользователя (auth-login, auth-register, auth-logout,
                #   transaction-create, transaction-delete, transactions-filter, category-create):
                #   model/ — zod-схема, api/ — 'use server' экшен, ui/ — форма
entities/       # бизнес-сущности: session (httpOnly-cookie с access-токеном), user,
                #   category, transaction
shared/         # переиспользуемое без знания о домене: api/ (клиент+ошибки), ui/ (shadcn), lib/ (cn)
```

Слой может импортировать только из слоёв ниже себя (`app → widgets → features → entities → shared`), не наоборот и не соседей одного уровня напрямую — исключение оговорено явно, если появится. Соседей связывают слотами: `TransactionRow` (entities/transaction) принимает категорию и действия готовыми `ReactNode`, а собирает их виджет, которому доступны оба слоя. Публичный API каждого среза — его `index.ts`; импортируй `@/features/auth-login`, а не `@/features/auth-login/ui/login-form`.

**Главный экран** (`app/page.tsx`). Неавторизованных уводит на `/login`. Все три запроса (категории, страница транзакций, сводка за месяц) идут одним `Promise.all` в самой странице, а не внутри виджетов: вложенные серверные компоненты выстроили бы их в водопад. Фильтры и номер страницы живут в query-строке, а не в `useState`, — список рисует серверный компонент, поэтому смена фильтра это навигация; заодно состояние переживает перезагрузку и передаётся ссылкой. Страница за пределами списка (сохранённая ссылка, удалённые записи, смена фильтра) редиректится на последнюю существующую — иначе экран показывал бы пустоту при ненулевом `total`.

**Пагинация.** `GET /transactions` принимает `page` и `limit` (по умолчанию 1 и 10) и возвращает `Paginated<Transaction>`. В репозитории `findMany` и `count` идут одной транзакцией Prisma: иначе `total` может разойтись со страницей из-за параллельной вставки. Сортировка — по `date`, вторым ключом `createdAt`: у записей одной даты порядок иначе не определён, и они «прыгали» бы между страницами. Размер страницы продублирован во фронтенде как `TRANSACTIONS_PAGE_SIZE` (`entities/transaction`).

**Аутентификация.** `POST /auth/login` и `/auth/register` отдают JWT в теле ответа (`AuthResponse.accessToken`), который `entities/session` (`apps/web/src/entities/session/lib/session.ts`) кладёт в httpOnly-cookie на срок `expiresIn`; `entities/user` читает её и ходит в `GET /auth/me` с заголовком `Authorization: Bearer`. Экшены в `features/auth-*/api/actions.ts` — единственное место, где создаётся/удаляется сессия.

Все остальные запросы к API берут заголовок у `getAuthHeaders()` из `entities/session`: без токена он сам делает `redirect('/login')`, поэтому истёкшая кука одинаково обрабатывается и на страницах, и в экшенах. **Вызывать его нужно вне `try/catch`** — `redirect()` бросает `NEXT_REDIRECT`, и `catch` превратил бы переход в «ошибку запроса».

**shadcn/ui.** `apps/web/components.json` настраивает алиасы shadcn на FSD-раскладку (`ui`/`components` → `shared/ui`, `utils` → `shared/lib/utils`), так что `npx shadcn add <name>` кладёт компонент туда же, где уже лежат остальные. После `shadcn add` проверь три вещи — CLI ошибается на каждой:

1. **Импорт `cn`.** CLI пишет `import { cn } from "cn"`, подтягивая посторонний npm-пакет вместо алиаса. Меняй на `@/shared/lib/utils` и не давай `cn` попасть в зависимости.
2. **Токены `accent`.** Заменяй `accent`/`accent-foreground` на `secondary`/`secondary-foreground` (см. ниже).
3. **Примитивы Radix.** В проекте они берутся из единого пакета `radix-ui` (`import { Dialog as DialogPrimitive } from 'radix-ui'`), а не из точечных `@radix-ui/react-*` — так их подключает актуальный реестр shadcn, и второй способ в репозитории не заводим.

Отдельно: `FormField` в `shared/ui/form.tsx` дополнен третьим параметром `TTransformedValues` относительно исходника shadcn. Он нужен схемам с `transform` (у `transaction-create` сумма — строка на входе и число на выходе): без него `Control` от такого `useForm` не подходит по типу. При перегенерации `form` этот параметр придётся вернуть.

Токены компонентов (`--color-background`, `--color-primary`, `--color-border` и т.д.) в `globals.css` — не отдельная палитра, а алиасы через `var()` поверх уже существующих `--color-surface`/`--color-ink`/`--color-accent`: так тёмная тема остаётся общей и переопределяется в одном месте. Не заводи новый `--color-accent`-подобный токен под нейтральный hover-фон — там, где стандартный shadcn использует `accent`/`accent-foreground` (hover у `outline`/`ghost`), в этом проекте переиспользован `secondary`, потому что `--color-accent` уже занят под фирменный синий (= shadcn `primary`).

Обратная сторона: если компонент красится токеном, которого в `globals.css` нет, Tailwind v4 просто не сгенерирует класс — без ошибки. Так `dropdown-menu` и `select` какое-то время открывались вообще без фона из-за отсутствующего `--color-popover`. Добавляя компонент, сверяй его токены со списком в `@theme`.

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
