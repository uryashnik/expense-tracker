import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import baseConfig from '../../eslint.config.mjs';

// eslint-config-next@16 отдаёт готовый flat config, FlatCompat не нужен.
export default [...baseConfig, ...nextCoreWebVitals, ...nextTypescript, prettier];
