import { api } from '@/lib/api';
import type { HealthStatus } from '@expense-tracker/shared';

/** Серверный компонент: данные тянем прямо на сервере, без клиентского слоя данных. */
export default async function HomePage() {
  const health = await api.get<HealthStatus>('/health').catch(() => null);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Трекер расходов</h1>
        <p className="text-ink-muted">
          Каркас проекта готов. Дальше — схема базы данных и первые экраны.
        </p>
      </div>

      <div className="rounded-lg border border-ink-muted/20 bg-surface-muted p-4">
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-muted">
          Состояние API
        </h2>
        {health ? (
          <p>
            Доступен, аптайм {health.uptime} с (проверено {health.timestamp}).
          </p>
        ) : (
          <p>
            Недоступен. Запустите его: <code>npm run dev</code> в корне монорепозитория.
          </p>
        )}
      </div>
    </main>
  );
}
