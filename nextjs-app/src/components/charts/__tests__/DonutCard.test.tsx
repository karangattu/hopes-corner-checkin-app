import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DonutCard } from '../DonutCard';

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
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('DonutCard', () => {
  const mockData = {
    'First Visit': 120,
    'Returning': 450,
    'Regular': 230,
  };

  describe('rendering', () => {
    it('renders with title', () => {
      render(<DonutCard title="Guest Distribution" dataMap={mockData} />);

      expect(screen.getByText('Guest Distribution')).toBeInTheDocument();
    });

    it('renders with subtitle', () => {
      render(
        <DonutCard
          title="Guest Distribution"
          subtitle="Last 30 days"
          dataMap={mockData}
        />
      );

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('renders pie chart with data', () => {
      render(<DonutCard title="Guest Distribution" dataMap={mockData} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '3');
    });

    it('renders legend', () => {
      render(<DonutCard title="Guest Distribution" dataMap={mockData} />);

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders tooltip', () => {
      render(<DonutCard title="Guest Distribution" dataMap={mockData} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when dataMap is empty', () => {
      render(<DonutCard title="Guest Distribution" dataMap={{}} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders empty state when dataMap is undefined', () => {
      render(<DonutCard title="Guest Distribution" dataMap={undefined as unknown as Record<string, number>} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders title in empty state', () => {
      render(<DonutCard title="Guest Distribution" dataMap={{}} />);

      expect(screen.getByText('Guest Distribution')).toBeInTheDocument();
    });

    it('renders subtitle in empty state', () => {
      render(
        <DonutCard
          title="Guest Distribution"
          subtitle="Last 30 days"
          dataMap={{}}
        />
      );

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('renders export button when onExport is provided', () => {
      const mockExport = vi.fn();
      render(
        <DonutCard
          title="Guest Distribution"
          dataMap={mockData}
          onExport={mockExport}
        />
      );

      expect(screen.getByTitle('Download as PNG')).toBeInTheDocument();
    });

    it('does not render export button when onExport is not provided', () => {
      render(<DonutCard title="Guest Distribution" dataMap={mockData} />);

      expect(screen.queryByTitle('Download as PNG')).not.toBeInTheDocument();
    });

    it('calls onExport when button is clicked', () => {
      const mockExport = vi.fn();
      render(
        <DonutCard
          title="Guest Distribution"
          dataMap={mockData}
          onExport={mockExport}
        />
      );

      fireEvent.click(screen.getByTitle('Download as PNG'));

      expect(mockExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('data handling', () => {
    it('handles single data point', () => {
      render(
        <DonutCard
          title="Single Item"
          dataMap={{ 'Only Item': 100 }}
        />
      );

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '1');
    });

    it('handles many data points', () => {
      const manyData = {
        'Category A': 100,
        'Category B': 200,
        'Category C': 150,
        'Category D': 75,
        'Category E': 225,
        'Category F': 125,
      };

      render(<DonutCard title="Many Items" dataMap={manyData} />);

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '6');
    });

    it('handles zero values', () => {
      const zeroData = {
        'Has Value': 100,
        'Zero Value': 0,
      };

      render(<DonutCard title="With Zero" dataMap={zeroData} />);

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '2');
    });
  });
});
