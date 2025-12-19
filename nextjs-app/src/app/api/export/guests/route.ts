import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/supabase/server';
import { hasPermission, type UserRole } from '@/lib/supabase/roles';
import type { Guest } from '@/lib/types';

// CSV escape helper
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Build CSV row from guest
function guestToCSVRow(guest: Guest): string {
  return [
    escapeCSV(guest.guestId),
    escapeCSV(guest.firstName),
    escapeCSV(guest.lastName),
    escapeCSV(guest.name),
    escapeCSV(guest.preferredName),
    escapeCSV(guest.housingStatus),
    escapeCSV(guest.age),
    escapeCSV(guest.gender),
    escapeCSV(guest.location),
    escapeCSV(guest.notes),
    escapeCSV(guest.bicycleDescription),
    guest.isBanned ? 'Yes' : 'No',
    escapeCSV(guest.banReason),
    escapeCSV(guest.bannedUntil),
    escapeCSV(guest.createdAt),
  ].join(',');
}

// Map database row to Guest
function mapGuestRow(row: Record<string, unknown>): Guest {
  const bannedUntil = row.banned_until as string | null;
  const isBanned = bannedUntil ? new Date(bannedUntil) > new Date() : false;

  return {
    id: row.id as string,
    guestId: row.external_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    name: row.full_name as string,
    preferredName: (row.preferred_name as string) || '',
    housingStatus: row.housing_status as Guest['housingStatus'],
    age: row.age_group as Guest['age'],
    gender: row.gender as Guest['gender'],
    location: (row.location as string) || 'Mountain View',
    notes: (row.notes as string) || '',
    bicycleDescription: (row.bicycle_description as string) || '',
    bannedAt: row.banned_at as string | null,
    bannedUntil,
    banReason: (row.ban_reason as string) || '',
    isBanned,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET() {
  try {
    // Check authentication and authorization
    const role = await getUserRole();
    const userRole = role as UserRole | null;
    if (!userRole || !hasPermission(userRole, 'guests', 'read')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and board can export data
    if (userRole !== 'admin' && userRole !== 'board') {
      return NextResponse.json(
        { error: 'Insufficient permissions for data export' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Fetch all guests
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch guests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch guests' },
        { status: 500 }
      );
    }

    const guests = (data || []).map(mapGuestRow);

    // Build CSV
    const headers = [
      'Guest ID',
      'First Name',
      'Last Name',
      'Full Name',
      'Preferred Name',
      'Housing Status',
      'Age Group',
      'Gender',
      'Location',
      'Notes',
      'Bicycle Description',
      'Is Banned',
      'Ban Reason',
      'Banned Until',
      'Created At',
    ].join(',');

    const rows = guests.map(guestToCSVRow);
    const csv = [headers, ...rows].join('\n');

    // Return CSV file
    const filename = `guests_export_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
