# Новая функциональность - Создать модуль транзакций

## Контекст

Проект: Nest.js + Next + PostgreSQL + Prisma
Что уже есть: User, authorization jwt, category module + frontend authorization

## Задача

Создай TarnsactionsModule - центральный модуль приложения
для учета ходов и расходов

## Модель данных

Добавь модель Transaction в schema.prisma:

- id (String, uuid, @default(uuid()))
- amount (Decimal)
- type (Enum: INCOME, EXPENSE)
- description (String, nullable)
- date (DateTime)
- categoryId (String, связь с Category)
- userId (String, связь с User)
- createdAt (DateTime, @default(now()))

Обнови модели User и Category — добавь
обратные связи transactions Transaction[]

После изменения схемы создай и примени миграцию:
npx prisma migrate dev --name add-transactions

## Контроллер

Эндпоинты:

- POST /transactions: создать транзакцию
- GET /transactions: список с query параметрами
  dateFrom, dateTo, type, categoryId
- GET /transactions/summary: агрегация,
  query параметры month и year (оба обязательные)
- GET /transactions/:id: одна транзакция
- PATCH /transactions/:id: обновить
- DELETE /transactions/:id: удалить

## Ограничения

- Не добавлять зависимости если не указано в задаче
- ичпользуй class-validator для валидации dto
- после реализации собирай проект
