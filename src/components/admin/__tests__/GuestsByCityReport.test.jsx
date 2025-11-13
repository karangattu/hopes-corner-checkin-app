import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GuestsByCityReport from '../GuestsByCityReport.jsx';

const useAppContextMock = vi.fn();

vi.mock('../../../context/useAppContext', () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock('../../../pages/guest/services/utils', () => ({
  toCsvValue: (val) => `"${val}"`,
}));

vi.mock('lucide-react', () => ({
  Download: () => <div>Download Icon</div>,
  MapPin: () => <div>MapPin Icon</div>,
  TrendingUp: () => <div>TrendingUp Icon</div>,
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const buildContext = (overrides = {}) => ({
  guests: [],
  mealRecords: [],
  rvMealRecords: [],
  shelterMealRecords: [],
  unitedEffortMealRecords: [],
  extraMealRecords: [],
  dayWorkerMealRecords: [],
  lunchBagRecords: [],
  showerRecords: [],
  laundryRecords: [],
  bicycleRecords: [],
  holidayRecords: [],
  haircutRecords: [],
  ...overrides,
});

const renderGuestsByCityReport = (overrides = {}) => {
  useAppContextMock.mockReturnValue(buildContext(overrides));
  return render(<GuestsByCityReport />);
};

describe('GuestsByCityReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate guest data by city and year from attendance records', () => {
    const mockGuests = [
      { id: '1', location: 'New York', createdAt: '2025-01-01' },
      { id: '2', location: 'Los Angeles', createdAt: '2025-01-01' },
      { id: '3', location: 'New York', createdAt: '2025-01-01' },
    ];

    const mockMealRecords = [
      { guest_id: '1', date: '2024-06-15T00:00:00Z' },
      { guest_id: '1', date: '2025-03-20T00:00:00Z' },
      { guest_id: '2', date: '2024-08-10T00:00:00Z' },
      { guest_id: '3', date: '2025-02-14T00:00:00Z' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
      mealRecords: mockMealRecords,
    });

    const text = container.textContent;
    expect(text).toContain('2024');
    expect(text).toContain('2025');
    expect(text).toContain('New York');
    expect(text).toContain('Los Angeles');
  });

  it('should count unique guests per city per year (no double counting)', () => {
    const mockGuests = [
      { id: '1', location: 'Chicago', createdAt: '2025-01-01' },
    ];

    const mockMealRecords = [
      { guest_id: '1', date: '2024-01-15T00:00:00Z' },
      { guest_id: '1', date: '2024-02-20T00:00:00Z' },
      { guest_id: '1', date: '2024-03-10T00:00:00Z' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
      mealRecords: mockMealRecords,
    });

    const text = container.textContent;
    expect(text).toContain('Chicago');
    expect(text).toContain('2024');
  });

  it('should fall back to guest creation dates when no attendance records exist', () => {
    const mockGuests = [
      { id: '1', location: 'Denver', createdAt: '2024-05-15' },
      { id: '2', location: 'Denver', createdAt: '2025-03-10' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
    });

    const text = container.textContent;
    expect(text).toContain('2024');
    expect(text).toContain('2025');
    expect(text).toContain('Denver');
  });

  it('should handle guests from multiple years with mixed attendance types', () => {
    const mockGuests = [
      { id: '1', location: 'Boston', createdAt: '2025-01-01' },
      { id: '2', location: 'Boston', createdAt: '2025-01-01' },
    ];

    const mockMealRecords = [
      { guest_id: '1', date: '2024-09-15T00:00:00Z' },
      { guest_id: '2', date: '2024-10-20T00:00:00Z' },
    ];

    const mockShowerRecords = [
      { guest_id: '1', date: '2025-01-15T00:00:00Z' },
      { guest_id: '2', date: '2025-02-10T00:00:00Z' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
      mealRecords: mockMealRecords,
      showerRecords: mockShowerRecords,
    });

    const text = container.textContent;
    expect(text).toContain('2024');
    expect(text).toContain('2025');
    expect(text).toContain('Boston');
  });

  it('should skip records with missing guest IDs', () => {
    const mockGuests = [
      { id: '1', location: 'Seattle', createdAt: '2025-01-01' },
    ];

    const mockMealRecords = [
      { guest_id: '1', date: '2024-06-15T00:00:00Z' },
      { guest_id: null, date: '2024-07-15T00:00:00Z' },
      { guestId: undefined, date: '2024-08-15T00:00:00Z' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
      mealRecords: mockMealRecords,
    });

    const text = container.textContent;
    expect(text).toContain('Seattle');
    expect(text).toContain('2024');
  });

  it('should skip attendance records with missing date', () => {
    const mockGuests = [
      { id: '1', location: 'Portland', createdAt: '2025-01-01' },
    ];

    const mockMealRecords = [
      { guest_id: '1', date: '2024-06-15T00:00:00Z' },
      { guest_id: '1', date: null },
      { guest_id: '1' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
      mealRecords: mockMealRecords,
    });

    const text = container.textContent;
    expect(text).toContain('Portland');
    expect(text).toContain('2024');
  });

  it('should skip guests without a location', () => {
    const mockGuests = [
      { id: '1', location: 'Miami', createdAt: '2025-01-01' },
      { id: '2', location: null, createdAt: '2025-01-01' },
      { id: '3', createdAt: '2025-01-01' },
    ];

    const mockMealRecords = [
      { guest_id: '1', date: '2024-06-15T00:00:00Z' },
      { guest_id: '2', date: '2024-07-15T00:00:00Z' },
      { guest_id: '3', date: '2024-08-15T00:00:00Z' },
    ];

    const { container } = renderGuestsByCityReport({
      guests: mockGuests,
      mealRecords: mockMealRecords,
    });

    const text = container.textContent;
    expect(text).toContain('Miami');
    expect(text).toContain('2024');
  });
});
