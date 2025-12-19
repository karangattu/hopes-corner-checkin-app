import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard, MetricGrid } from '../MetricCard';
import { Utensils, ShowerHead, WashingMachine } from 'lucide-react';

describe('MetricCard', () => {
  describe('rendering', () => {
    it('renders with title and value', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
        />
      );

      expect(screen.getByText('Meals Served')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('renders with string value', () => {
      render(
        <MetricCard
          title="Status"
          value="Active"
          icon={Utensils}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders with subtitle', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
          subtitle="This month"
        />
      );

      expect(screen.getByText('This month')).toBeInTheDocument();
    });

    it('renders with target and progress bar', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={750}
          target={1000}
          icon={Utensils}
        />
      );

      expect(screen.getByText('Target: 1,000')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('calculates progress correctly at 50%', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={500}
          target={1000}
          icon={Utensils}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('caps progress at 100%', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1500}
          target={1000}
          icon={Utensils}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles zero target gracefully', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={500}
          target={0}
          icon={Utensils}
        />
      );

      // Should not crash and should render title
      expect(screen.getByText('Meals Served')).toBeInTheDocument();
    });
  });

  describe('trend display', () => {
    it('renders positive trend', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
          trend={{ value: 15, isPositive: true }}
        />
      );

      expect(screen.getByText('↑')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('renders negative trend', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
          trend={{ value: 10, isPositive: false }}
        />
      );

      expect(screen.getByText('↓')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
    });
  });

  describe('color schemes', () => {
    it('renders with default blue color scheme', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
        />
      );

      expect(screen.getByText('Meals Served')).toBeInTheDocument();
    });

    it('renders with green color scheme', () => {
      render(
        <MetricCard
          title="Showers Booked"
          value={567}
          icon={ShowerHead}
          colorScheme="green"
        />
      );

      expect(screen.getByText('Showers Booked')).toBeInTheDocument();
    });

    it('renders with purple color scheme', () => {
      render(
        <MetricCard
          title="Laundry Loads"
          value={345}
          icon={WashingMachine}
          colorScheme="purple"
        />
      );

      expect(screen.getByText('Laundry Loads')).toBeInTheDocument();
    });
  });

  describe('number formatting', () => {
    it('formats large numbers with commas', () => {
      render(
        <MetricCard
          title="Total Meals"
          value={1234567}
          icon={Utensils}
        />
      );

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('handles zero value', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={0}
          icon={Utensils}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles undefined subtitle', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
          subtitle={undefined}
        />
      );

      expect(screen.getByText('Meals Served')).toBeInTheDocument();
    });

    it('handles undefined trend', () => {
      render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
          trend={undefined}
        />
      );

      expect(screen.getByText('Meals Served')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <MetricCard
          title="Meals Served"
          value={1234}
          icon={Utensils}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('MetricGrid', () => {
  it('renders children in a grid', () => {
    render(
      <MetricGrid>
        <MetricCard title="Meals" value={100} icon={Utensils} />
        <MetricCard title="Showers" value={50} icon={ShowerHead} />
      </MetricGrid>
    );

    expect(screen.getByText('Meals')).toBeInTheDocument();
    expect(screen.getByText('Showers')).toBeInTheDocument();
  });

  it('applies correct grid classes', () => {
    const { container } = render(
      <MetricGrid>
        <MetricCard title="Meals" value={100} icon={Utensils} />
      </MetricGrid>
    );

    expect(container.firstChild).toHaveClass('grid');
  });
});
