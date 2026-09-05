@AGENTS.md

## Команды и окружение

```bash
npm run dev -w @expense-tracker/web        # next dev --turbopack, :3000
npm run build -w @expense-tracker/web      # next build
npm run lint -w @expense-tracker/web       # eslint src
npm run typecheck -w @expense-tracker/web  # tsc --noEmit
```

Единственная переменная — `API_URL` в `apps/web/.env.local` (по умолчанию `http://localhost:3001/api`). Она **серверная**: без префикса `NEXT_PUBLIC_` в браузер не попадает, и это осознанно — в API ходит только сервер. Появится потребность в клиентском запросе — не «просто добавь `NEXT_PUBLIC_`», а сначала подумай, почему запрос не идёт через экшен.

API должен быть поднят: без него страницы падают на первом же `fetch`. Проверка — `curl http://localhost:3001/api/health`.

`next.config.ts`: `reactStrictMode`, `typedRoutes: true` и `transpilePackages: ['@expense-tracker/shared']` (пакет собирается вместе с приложением, но `packages/shared` всё равно должен быть собран — `turbo` делает это через `dependsOn: ["^build"]`).

## Роуты

| Путь        | Что                                                      | Доступ                                          |
| ----------- | -------------------------------------------------------- | ----------------------------------------------- |
| `/`         | главный экран: шапка, сводка за месяц, список транзакций | только для вошедших, иначе `redirect('/login')` |
| `/login`    | форма входа                                              | публичный                                       |
| `/register` | форма регистрации                                        | публичный                                       |

Middleware нет: проверку делает сама страница через `getCurrentUser()`, а защищённые запросы — `getAuthHeaders()`, который сам уводит на `/login`.

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

## Формы и серверные экшены

Единый рисунок для любой формы (`features/*/ui/*.tsx` + `features/*/api/actions.ts`):

1. Клиентский компонент, `useForm` + `zodResolver` со схемой из `../model/schema`.
2. Отправка — внутри `startTransition` из `useTransition`; `isPending` гасит кнопку. `useActionState` не используется: формы вызывают экшен как обычную async-функцию, а не через `action={...}`.
3. Экшену передаются **сырые значения формы** (`form.getValues()`), а не результат резолвера: экшен обязан валидировать их сам — проверке, прошедшей только в браузере, сервер не доверяет.
4. Экшен возвращает `ActionErrorState | { status: 'success' }`, а не бросает. Ошибки полей раскладываются обратно в форму через `form.setError`, общее сообщение — в `Alert`.
5. После успешной мутации экшен зовёт `revalidatePath('/')` — серверный список перерисуется сам, вручную состояние не обновляем.

Экшены аутентификации — исключение из п. 4: после `createSession` они делают `redirect('/')` (или `/login` при выходе). `redirect()` бросает `NEXT_REDIRECT`, поэтому его и `getAuthHeaders()` вызывают **вне** `try/catch`.

Схема с `transform` (у `transaction-create` сумма — строка на входе и число на выходе) требует трёх параметров: `useForm<Input, unknown, Payload>` и `FormField` с третьим generic-параметром (см. правку `shared/ui/form.tsx` выше).

## Загрузка данных

Функции чтения живут в `entities/*/api/*.ts` (`getCategories`, `getTransactions`, `getMonthlySummary`, `getCurrentUser`) — это обычные серверные функции, не экшены: они зовут `api.*` из `shared/api` с заголовками от `getAuthHeaders()`.

Исключение — `getCurrentUser`: он берёт токен через `getAccessToken()`, а недействительный или отсутствующий отдаёт как `null`, без редиректа. Так `/` сама решает, куда вести неавторизованного, а шапка может показать гостя вместо падения.

Пустые фильтры в query-строку не подставляются (`getTransactions`): в API включён `forbidNonWhitelisted`, и `type=` с пустым значением вернёт 400, а не «все типы».

`shared/api/client.ts` по умолчанию ставит `cache: 'no-store'`: данные трекера всегда свежие, кэш включается точечно. Клиент возвращает `undefined` на 204 и приводит любой не-`ok` ответ к `ApiRequestError` — даже если тело не JSON.

`entities/session/lib/session.ts` помечен `import 'server-only'`: попытка утащить работу с кукой в клиентский компонент упадёт на сборке, а не отдаст токен в браузер.

## Мелочи Next 16, о которые спотыкаются

- `cookies()` и `searchParams` — **асинхронные**: `await cookies()`, `searchParams: Promise<SearchParams>`.
- При `typedRoutes: true` адрес, собранный из частей, для TypeScript остаётся строкой — нужен явный `as Route` (см. `widgets/transaction-list/lib/href.ts`). Литеральные пути (`'/login'`) проверяются статически, опечатка в них — ошибка сборки.
- Query-строку страница разбирает снисходительно (`parseQuery` в `app/page.tsx`): мусор вроде `?page=abc` молча даёт первую страницу, а не ошибку — адрес правит пользователь, настоящая валидация всё равно на стороне API.
- Текущие фильтры уходят в клиентские компоненты **пропсами**: страница их уже разобрала, а `useSearchParams` потребовал бы Suspense-границы ради тех же данных.
- `Select` из Radix не принимает пустую строку как значение — «все» кодируется отдельным ключом (`ANY = 'all'` в `transactions-filter`).
- Смена фильтра сбрасывает `page`: после сужения выборки третьей страницы может уже не быть.
