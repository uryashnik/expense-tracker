import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Пакет из монорепозитория собирается вместе с приложением.
  transpilePackages: ['@expense-tracker/shared'],
};

export default nextConfig;
