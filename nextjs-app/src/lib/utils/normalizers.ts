import type { Guest, HousingStatus } from '../types';

// Title case helper
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Normalize preferred name
export function normalizePreferredName(name: string | undefined | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  return trimmed ? toTitleCase(trimmed) : '';
}

// Normalize bicycle description
export function normalizeBicycleDescription(desc: string | undefined | null): string {
  if (!desc) return '';
  return desc.trim();
}

// Normalize housing status
export function normalizeHousingStatus(status: string | undefined | null): HousingStatus {
  if (!status) return 'Unhoused';
  
  const normalized = status.trim();
  const validStatuses: HousingStatus[] = [
    'Unhoused',
    'Housed',
    'Temp. shelter',
    'RV or vehicle',
  ];
  
  // Case-insensitive match
  const match = validStatuses.find(
    (s) => s.toLowerCase() === normalized.toLowerCase()
  );
  
  return match || 'Unhoused';
}

// Check if guest is currently banned
export function computeIsGuestBanned(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  return new Date(bannedUntil) > new Date();
}

// Map database row to Guest type
export function mapGuestRow(row: Record<string, unknown>): Guest {
  const bannedUntil = row.banned_until as string | null;
  
  return {
    id: row.id as string,
    guestId: row.external_id as string,
    firstName: toTitleCase((row.first_name as string) || ''),
    lastName: toTitleCase((row.last_name as string) || ''),
    name: toTitleCase(
      (row.full_name as string) || 
      `${(row.first_name as string) || ''} ${(row.last_name as string) || ''}`
    ),
    preferredName: normalizePreferredName(row.preferred_name as string),
    housingStatus: normalizeHousingStatus(row.housing_status as string),
    age: row.age_group as Guest['age'],
    gender: row.gender as Guest['gender'],
    location: (row.location as string) || 'Mountain View',
    notes: (row.notes as string) || '',
    bicycleDescription: normalizeBicycleDescription(row.bicycle_description as string),
    bannedAt: row.banned_at as string | null,
    bannedUntil,
    banReason: (row.ban_reason as string) || '',
    isBanned: computeIsGuestBanned(bannedUntil),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
