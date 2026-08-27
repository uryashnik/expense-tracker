import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Через `?? ''`, а не через env(): иначе `prisma generate` падает без поднятой БД.
    url: process.env.DATABASE_URL ?? '',
  },
});
