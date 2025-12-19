import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/supabase/server';
import { hasPermission, type UserRole } from '@/lib/supabase/roles';

// CSV escape helper
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface MealAttendanceRow {
  id: string;
  guest_id: string | null;
  quantity: number;
  served_on: string;
  meal_type: string;
  created_at: string;
  guests: { full_name: string }[] | null;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const role = await getUserRole();
    const userRole = role as UserRole | null;
    if (!userRole || !hasPermission(userRole, 'meals', 'read')) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const mealType = searchParams.get('mealType');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('meal_attendance')
      .select(`
        id,
        guest_id,
        quantity,
        served_on,
        meal_type,
        created_at,
        guests (
          full_name
        )
      `)
      .order('served_on', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('served_on', startDate);
    }
    if (endDate) {
      query = query.lte('served_on', endDate);
    }
    if (mealType) {
      query = query.eq('meal_type', mealType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch attendance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attendance records' },
        { status: 500 }
      );
    }

    const records = (data || []) as MealAttendanceRow[];

    // Build CSV
    const headers = [
      'Date',
      'Guest ID',
      'Guest Name',
      'Meal Type',
      'Quantity',
      'Created At',
    ].join(',');

    const rows = records.map((record) => {
      const guestName = record.guests?.[0]?.full_name || 'Anonymous';
      return [
        escapeCSV(record.served_on),
        escapeCSV(record.guest_id),
        escapeCSV(guestName),
        escapeCSV(record.meal_type),
        escapeCSV(record.quantity),
        escapeCSV(record.created_at),
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Return CSV file
    const dateRange = startDate && endDate 
      ? `_${startDate}_to_${endDate}` 
      : `_${new Date().toISOString().split('T')[0]}`;
    const filename = `attendance_export${dateRange}.csv`;

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
