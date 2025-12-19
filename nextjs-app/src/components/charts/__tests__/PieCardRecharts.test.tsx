import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PieCardRecharts } from '../PieCardRecharts';
import { Utensils, ShowerHead } from 'lucide-react';

// Mock Recharts components since they don't render well in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="pie" data-length={data?.length}>
      {children}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PieCardRecharts', () => {
  const mockData = [
    { name: 'Breakfast', value: 120 },
    { name: 'Lunch', value: 280 },
    { name: 'Dinner', value: 180 },
  ];

  describe('rendering', () => {
    it('renders with title', () => {
      render(<PieCardRecharts title="Meal Distribution" data={mockData} />);

      expect(screen.getByText('Meal Distribution')).toBeInTheDocument();
    });

    it('renders with subtitle', () => {
      render(
        <PieCardRecharts
          title="Meal Distribution"
          subtitle="Last 30 days"
          data={mockData}
        />
      );

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      render(
        <PieCardRecharts
          title="Meal Distribution"
          data={mockData}
          icon={Utensils}
        />
      );

      expect(screen.getByText('Meal Distribution')).toBeInTheDocument();
    });

    it('renders pie chart with data', () => {
      render(<PieCardRecharts title="Meal Distribution" data={mockData} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '3');
    });

    it('renders tooltip', () => {
      render(<PieCardRecharts title="Meal Distribution" data={mockData} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('renders download button', () => {
      render(<PieCardRecharts title="Meal Distribution" data={mockData} />);

      expect(screen.getByTitle('Download as PNG')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders with empty data array', () => {
      render(<PieCardRecharts title="Meal Distribution" data={[]} />);

      expect(screen.getByText('Meal Distribution')).toBeInTheDocument();
    });
  });

  describe('data handling', () => {
    it('handles single data point', () => {
      render(
        <PieCardRecharts
          title="Single Item"
          data={[{ name: 'Only Item', value: 100 }]}
        />
      );

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '1');
    });

    it('handles many data points', () => {
      const manyData = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        value: (i + 1) * 10,
      }));

      render(<PieCardRecharts title="Many Items" data={manyData} />);

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '12');
    });

    it('handles data with custom colors', () => {
      const coloredData = [
        { name: 'Red Item', value: 100, fill: '#ff0000' },
        { name: 'Blue Item', value: 200, fill: '#0000ff' },
      ];

      render(<PieCardRecharts title="Colored" data={coloredData} />);

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '2');
    });

    it('handles zero values', () => {
      const zeroData = [
        { name: 'Has Value', value: 100 },
        { name: 'Zero Value', value: 0 },
      ];

      render(<PieCardRecharts title="With Zero" data={zeroData} />);

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '2');
    });
  });

  describe('icon customization', () => {
    it('applies custom icon color', () => {
      render(
        <PieCardRecharts
          title="Test"
          data={mockData}
          icon={ShowerHead}
          iconColor="text-emerald-600"
        />
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('renders download button', () => {
      render(<PieCardRecharts title="Meal Distribution" data={mockData} />);

      expect(screen.getByTitle('Download as PNG')).toBeInTheDocument();
    });
  });
});
