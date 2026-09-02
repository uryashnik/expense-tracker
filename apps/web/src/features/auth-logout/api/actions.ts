'use server';

import { redirect } from 'next/navigation';
import { destroySession } from '@/entities/session';

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
