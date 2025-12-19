import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { hasAccess, type UserRole } from '@/lib/supabase/roles';
import { MainNav } from '@/components/layout/MainNav';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.user_metadata?.role as UserRole | undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav user={user} role={role || null} />
      <main className="pb-20 md:pb-6">{children}</main>
    </div>
  );
}
