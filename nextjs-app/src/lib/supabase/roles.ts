// User role types
export type UserRole = 'admin' | 'board' | 'staff' | 'checkin';

// Route access configuration
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['/check-in', '/services', '/admin', '/settings'],
  board: ['/check-in', '/services', '/admin'],
  staff: ['/check-in', '/services', '/admin'],
  checkin: ['/check-in', '/services'],
};

// Check if a role has access to a path
export function hasAccess(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  const allowedPaths = ROLE_PERMISSIONS[role] || [];
  return allowedPaths.some((path) => pathname.startsWith(path));
}

// Get the default redirect path for a role
export function getDefaultPath(role: UserRole | null): string {
  if (!role) return '/login';
  return '/check-in';
}

// Check if user can delete records
export function canDelete(role: UserRole | null): boolean {
  return role === 'admin' || role === 'staff';
}

// Check if user can access admin features
export function isAdminRole(role: UserRole | null): boolean {
  return role === 'admin';
}

// Check if user can modify settings
export function canModifySettings(role: UserRole | null): boolean {
  return role === 'admin';
}
