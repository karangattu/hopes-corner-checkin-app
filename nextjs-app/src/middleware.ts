import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { hasAccess, getDefaultPath, type UserRole } from '@/lib/supabase/roles';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/offline.html'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Update session and get user
  const { user, supabaseResponse } = await updateSession(request);

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login page, redirect to default
  if (user && pathname === '/login') {
    const role = user.user_metadata?.role as UserRole | undefined;
    const redirectPath = getDefaultPath(role || null);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Check role-based access for protected routes
  if (user && !isPublicRoute) {
    const role = user.user_metadata?.role as UserRole | undefined;
    const hasRouteAccess = hasAccess(role || null, pathname);

    // Root path redirects to check-in
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/check-in', request.url));
    }

    // If user doesn't have access, redirect to their default page
    if (!hasRouteAccess) {
      const defaultPath = getDefaultPath(role || null);
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest.json, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
};
