import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Декораторы Nest требуют пустых конструкторов и параметров-свойств.
      '@typescript-eslint/no-extraneous-class': 'off',
      // Тип-импорты ломают emitDecoratorMetadata: Nest должен видеть класс в рантайме.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
