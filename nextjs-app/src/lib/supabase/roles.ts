// User role types
export type UserRole = 'admin' | 'board' | 'staff' | 'checkin';

// Resource types
export type Resource = 'guests' | 'meals' | 'services' | 'donations' | 'settings';

// Action types
export type Action = 'create' | 'read' | 'update' | 'delete' | 'export';

// Permission matrix
const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  admin: {
    guests: ['create', 'read', 'update', 'delete', 'export'],
    meals: ['create', 'read', 'update', 'delete', 'export'],
    services: ['create', 'read', 'update', 'delete', 'export'],
    donations: ['create', 'read', 'update', 'delete', 'export'],
    settings: ['create', 'read', 'update', 'delete'],
  },
  board: {
    guests: ['create', 'read', 'update', 'delete', 'export'],
    meals: ['create', 'read', 'update', 'delete', 'export'],
    services: ['create', 'read', 'update', 'delete', 'export'],
    donations: ['create', 'read', 'update', 'delete', 'export'],
    settings: ['read'],
  },
  staff: {
    guests: ['create', 'read', 'update', 'delete'],
    meals: ['create', 'read', 'update', 'delete'],
    services: ['create', 'read', 'update', 'delete'],
    donations: ['create', 'read', 'update', 'delete'],
    settings: ['read'],
  },
  checkin: {
    guests: ['create', 'read'],
    meals: ['create', 'read'],
    services: ['create', 'read'],
    donations: ['read'],
    settings: ['read'],
  },
};

// Route access configuration
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['/check-in', '/services', '/admin', '/settings'],
  board: ['/check-in', '/services', '/admin'],
  staff: ['/check-in', '/services', '/admin'],
  checkin: ['/check-in', '/services'],
};

// Check if a role has permission for an action on a resource
export function hasPermission(
  role: UserRole | null,
  resource: Resource,
  action: Action
): boolean {
  if (!role) return false;
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  return resourcePermissions.includes(action);
}

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
