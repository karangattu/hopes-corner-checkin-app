import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StackedBarCard } from '../StackedBarCard';

// Mock Recharts components since they don't render well in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LabelList: () => null,
}));

describe('StackedBarCard', () => {
  const mockCrossTabData = {
    Monday: {
      Breakfast: 50,
      Lunch: 120,
      Dinner: 80,
    },
    Tuesday: {
      Breakfast: 45,
      Lunch: 110,
      Dinner: 85,
    },
    Wednesday: {
      Breakfast: 55,
      Lunch: 130,
      Dinner: 75,
    },
  };

  describe('rendering', () => {
    it('renders with title', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={mockCrossTabData} />);

      expect(screen.getByText('Meals by Day')).toBeInTheDocument();
    });

    it('renders with subtitle', () => {
      render(
        <StackedBarCard
          title="Meals by Day"
          subtitle="Weekly breakdown"
          crossTabData={mockCrossTabData}
        />
      );

      expect(screen.getByText('Weekly breakdown')).toBeInTheDocument();
    });

    it('renders bar chart with correct data points', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={mockCrossTabData} />);

      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-length', '3');
    });

    it('renders bars for each subcategory', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={mockCrossTabData} />);

      expect(screen.getByTestId('bar-Breakfast')).toBeInTheDocument();
      expect(screen.getByTestId('bar-Lunch')).toBeInTheDocument();
      expect(screen.getByTestId('bar-Dinner')).toBeInTheDocument();
    });

    it('renders chart axes', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={mockCrossTabData} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('renders grid and legend', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={mockCrossTabData} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when crossTabData is empty', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={{}} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders empty state when crossTabData is undefined', () => {
      render(
        <StackedBarCard
          title="Meals by Day"
          crossTabData={undefined as unknown as Record<string, Record<string, number>>}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders title in empty state', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={{}} />);

      expect(screen.getByText('Meals by Day')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('renders export button when onExport is provided', () => {
      const mockExport = vi.fn();
      render(
        <StackedBarCard
          title="Meals by Day"
          crossTabData={mockCrossTabData}
          onExport={mockExport}
        />
      );

      expect(screen.getByTitle('Download as PNG')).toBeInTheDocument();
    });

    it('does not render export button when onExport is not provided', () => {
      render(<StackedBarCard title="Meals by Day" crossTabData={mockCrossTabData} />);

      expect(screen.queryByTitle('Download as PNG')).not.toBeInTheDocument();
    });

    it('calls onExport when button is clicked', () => {
      const mockExport = vi.fn();
      render(
        <StackedBarCard
          title="Meals by Day"
          crossTabData={mockCrossTabData}
          onExport={mockExport}
        />
      );

      fireEvent.click(screen.getByTitle('Download as PNG'));

      expect(mockExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('data handling', () => {
    it('handles single category', () => {
      const singleCategoryData = {
        Monday: { Breakfast: 50, Lunch: 120 },
      };

      render(<StackedBarCard title="Single Day" crossTabData={singleCategoryData} />);

      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-length', '1');
    });

    it('handles categories with different subcategories', () => {
      const mixedData = {
        Monday: { Breakfast: 50 },
        Tuesday: { Lunch: 100, Dinner: 80 },
      };

      render(<StackedBarCard title="Mixed Data" crossTabData={mixedData} />);

      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-length', '2');
      expect(screen.getByTestId('bar-Breakfast')).toBeInTheDocument();
      expect(screen.getByTestId('bar-Lunch')).toBeInTheDocument();
      expect(screen.getByTestId('bar-Dinner')).toBeInTheDocument();
    });

    it('handles zero values', () => {
      const zeroData = {
        Monday: { Breakfast: 0, Lunch: 100 },
        Tuesday: { Breakfast: 50, Lunch: 0 },
      };

      render(<StackedBarCard title="With Zeros" crossTabData={zeroData} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('handles empty subcategories', () => {
      const emptySubcatData = {
        Monday: {},
        Tuesday: { Lunch: 100 },
      };

      render(<StackedBarCard title="Empty Subcat" crossTabData={emptySubcatData} />);

      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-length', '2');
    });
  });
});
