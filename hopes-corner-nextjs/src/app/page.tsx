import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDefaultRoute, type UserRole } from '@/lib/auth/types';

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const role = (session.user?.role as UserRole) || 'checkin';
  redirect(getDefaultRoute(role));
}
