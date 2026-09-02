import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Базовый конфиг для всего монорепозитория.
 * Приложения расширяют его своими правилами в собственных eslint.config.mjs.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/src/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Не для apps/api: type-only импорты стирают метаданные, нужные Nest для DI
    // и ValidationPipe. Правило выключено и в apps/api/eslint.config.mjs, но
    // lint-staged в pre-commit запускает eslint из корня, где берётся этот конфиг.
    ignores: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  prettier,
);
