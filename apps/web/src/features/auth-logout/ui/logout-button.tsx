import { Button } from '@/shared/ui/button';
import { logoutAction } from '../api/actions';

/** Серверный компонент: форма с server action работает и без клиентского JS. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Выйти
      </Button>
    </form>
  );
}
