import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import MainLayout from '@/components/layouts/MainLayout';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    return <MainLayout>{children}</MainLayout>;
}
