import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrendLine } from '../TrendLine';

// Mock date utility
vi.mock('@/utils/date', () => ({
  formatDateForDisplay: vi.fn((date: string, options?: object) => {
    if (options && typeof options === 'object') {
      // Short format for x-axis labels
      const d = new Date(date);
      return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
    }
    return date;
  }),
}));

// Mock Recharts components since they don't render well in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('TrendLine', () => {
  const mockDays = [
    { date: '2025-01-01', meals: 100, showers: 25, laundry: 15 },
    { date: '2025-01-02', meals: 120, showers: 30, laundry: 18 },
    { date: '2025-01-03', meals: 110, showers: 28, laundry: 20 },
  ];

  describe('rendering', () => {
    it('renders with default title', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.getByText('30-Day Activity Trend')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(<TrendLine days={mockDays} title="Custom Trend Title" />);

      expect(screen.getByText('Custom Trend Title')).toBeInTheDocument();
    });

    it('renders line chart with data', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '3');
    });

    it('renders default metric lines', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.getByTestId('line-meals')).toBeInTheDocument();
      expect(screen.getByTestId('line-showers')).toBeInTheDocument();
      expect(screen.getByTestId('line-laundry')).toBeInTheDocument();
    });

    it('renders custom metric lines', () => {
      render(
        <TrendLine
          days={mockDays}
          metrics={['meals', 'haircuts']}
        />
      );

      expect(screen.getByTestId('line-meals')).toBeInTheDocument();
      expect(screen.getByTestId('line-haircuts')).toBeInTheDocument();
      expect(screen.queryByTestId('line-showers')).not.toBeInTheDocument();
    });

    it('renders chart axes', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('renders grid and legend', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders tooltip', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state with empty days array', () => {
      render(<TrendLine days={[]} />);

      expect(screen.getByText('No trend data available')).toBeInTheDocument();
    });

    it('renders empty state with undefined days', () => {
      render(<TrendLine days={undefined as unknown as typeof mockDays} />);

      expect(screen.getByText('No trend data available')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('renders export button when onExport is provided', () => {
      const mockExport = vi.fn();
      render(<TrendLine days={mockDays} onExport={mockExport} />);

      expect(screen.getByTitle('Download as PNG')).toBeInTheDocument();
    });

    it('does not render export button when onExport is not provided', () => {
      render(<TrendLine days={mockDays} />);

      expect(screen.queryByTitle('Download as PNG')).not.toBeInTheDocument();
    });

    it('calls onExport when button is clicked', () => {
      const mockExport = vi.fn();
      render(<TrendLine days={mockDays} onExport={mockExport} />);

      fireEvent.click(screen.getByTitle('Download as PNG'));

      expect(mockExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('data handling', () => {
    it('sorts data by date', () => {
      const unsortedDays = [
        { date: '2025-01-03', meals: 110 },
        { date: '2025-01-01', meals: 100 },
        { date: '2025-01-02', meals: 120 },
      ];

      render(<TrendLine days={unsortedDays} metrics={['meals']} />);

      // Should render without crashing, data is sorted internally
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '3');
    });

    it('handles single day', () => {
      render(
        <TrendLine
          days={[{ date: '2025-01-01', meals: 100 }]}
          metrics={['meals']}
        />
      );

      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '1');
    });

    it('handles many days', () => {
      const manyDays = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-01-${(i + 1).toString().padStart(2, '0')}`,
        meals: 100 + i * 5,
      }));

      render(<TrendLine days={manyDays} metrics={['meals']} />);

      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '30');
    });

    it('handles missing metric values', () => {
      const sparseData = [
        { date: '2025-01-01', meals: 100 },
        { date: '2025-01-02', showers: 25 },
        { date: '2025-01-03', laundry: 15 },
      ];

      render(<TrendLine days={sparseData} />);

      // Should render without crashing
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles zero values', () => {
      const zeroData = [
        { date: '2025-01-01', meals: 0, showers: 0, laundry: 0 },
        { date: '2025-01-02', meals: 100, showers: 25, laundry: 15 },
      ];

      render(<TrendLine days={zeroData} />);

      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '2');
    });
  });

  describe('metrics configuration', () => {
    it('renders all available metric types', () => {
      const allMetricsData = {
        date: '2025-01-01',
        meals: 100,
        showers: 25,
        laundry: 15,
        haircuts: 10,
        holidays: 5,
        bicycles: 8,
      };

      render(
        <TrendLine
          days={[allMetricsData]}
          metrics={['meals', 'showers', 'laundry', 'haircuts', 'holidays', 'bicycles']}
        />
      );

      expect(screen.getByTestId('line-meals')).toBeInTheDocument();
      expect(screen.getByTestId('line-showers')).toBeInTheDocument();
      expect(screen.getByTestId('line-laundry')).toBeInTheDocument();
      expect(screen.getByTestId('line-haircuts')).toBeInTheDocument();
      expect(screen.getByTestId('line-holidays')).toBeInTheDocument();
      expect(screen.getByTestId('line-bicycles')).toBeInTheDocument();
    });
  });
});
