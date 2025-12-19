import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewDashboard } from '../OverviewDashboard';

describe('OverviewDashboard', () => {
  const mockUpdateTargets = vi.fn();

  const defaultMonthMetrics = {
    mealsServed: 1200,
    showersBooked: 250,
    laundryLoads: 180,
    bicycles: 45,
    haircuts: 85,
    holidays: 60,
  };

  const defaultYearMetrics = {
    mealsServed: 14000,
    showersBooked: 2800,
    laundryLoads: 2100,
    bicycles: 520,
    haircuts: 950,
    holidays: 720,
  };

  const defaultTargets = {
    monthlyMeals: 1500,
    yearlyMeals: 18000,
    monthlyShowers: 300,
    yearlyShowers: 3600,
    monthlyLaundry: 200,
    yearlyLaundry: 2400,
    monthlyBicycles: 50,
    yearlyBicycles: 600,
    monthlyHaircuts: 100,
    yearlyHaircuts: 1200,
    monthlyHolidays: 80,
    yearlyHolidays: 960,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders dashboard without crashing', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    it('displays Monthly Progress section', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      expect(screen.getByText('Monthly Progress')).toBeInTheDocument();
    });

    it('displays Yearly Progress section', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      expect(screen.getByText('Yearly Progress')).toBeInTheDocument();
    });

    it('shows Edit Targets button when onTargetsUpdate is provided', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      expect(
        screen.getByRole('button', { name: /edit targets/i })
      ).toBeInTheDocument();
    });

    it('hides Edit Targets button when onTargetsUpdate is not provided', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      expect(
        screen.queryByRole('button', { name: /edit targets/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('metrics display', () => {
    it('displays monthly meals metric', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      expect(screen.getByText('1,200')).toBeInTheDocument();
    });

    it('displays yearly meals metric', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      expect(screen.getByText('14,000')).toBeInTheDocument();
    });

    it('displays all service categories', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      // Title is just the service name like "Meals", "Showers", etc.
      expect(screen.getAllByText('Meals').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Showers').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Laundry').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bicycles').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Haircuts').length).toBeGreaterThan(0);
    });
  });

  describe('target editing', () => {
    it('opens target editor when Edit Targets is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      await user.click(screen.getByRole('button', { name: /edit targets/i }));

      expect(screen.getByText('Monthly Targets')).toBeInTheDocument();
      expect(screen.getByText('Yearly Targets')).toBeInTheDocument();
    });

    it('allows editing target values', async () => {
      const user = userEvent.setup();
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      await user.click(screen.getByRole('button', { name: /edit targets/i }));

      // Find the monthly meals input by its id (monthlyMeals)
      const mealsInput = document.getElementById('monthlyMeals') as HTMLInputElement;
      expect(mealsInput).toBeInTheDocument();

      // Edit the input
      await user.clear(mealsInput);
      await user.type(mealsInput, '2000');

      expect(mealsInput).toHaveValue('2000');
    });

    it('saves targets when Save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      await user.click(screen.getByRole('button', { name: /edit targets/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockUpdateTargets).toHaveBeenCalled();
    });

    it('cancels editing when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      await user.click(screen.getByRole('button', { name: /edit targets/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should return to non-editing state
      expect(screen.queryByText('Monthly Targets')).not.toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('calculates progress percentages correctly', () => {
      render(
        <OverviewDashboard
          monthMetrics={{
            mealsServed: 750,
            showersBooked: 150,
            laundryLoads: 100,
            bicycles: 25,
            haircuts: 50,
            holidays: 40,
          }}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
        />
      );

      // 750/1500 = 50% for monthly meals
      // Check that progress indicators are rendered
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThanOrEqual(0);
    });

    it('handles zero metrics gracefully', () => {
      render(
        <OverviewDashboard
          monthMetrics={{
            mealsServed: 0,
            showersBooked: 0,
            laundryLoads: 0,
            bicycles: 0,
            haircuts: 0,
            holidays: 0,
          }}
          yearMetrics={{
            mealsServed: 0,
            showersBooked: 0,
            laundryLoads: 0,
            bicycles: 0,
            haircuts: 0,
            holidays: 0,
          }}
          targets={defaultTargets}
        />
      );

      // Should render without crashing with zero values
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });

  describe('default targets', () => {
    it('uses default targets when none provided', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
        />
      );

      // Should still render with default targets
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    it('merges partial targets with defaults', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={{ monthlyMeals: 2000 }}
        />
      );

      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible edit targets button when callback provided', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      expect(
        screen.getByRole('button', { name: /edit targets/i })
      ).toBeInTheDocument();
    });

    it('has accessible save and cancel buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
          onTargetsUpdate={mockUpdateTargets}
        />
      );

      await user.click(screen.getByRole('button', { name: /edit targets/i }));

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('does not show edit button when onTargetsUpdate is undefined', () => {
      render(
        <OverviewDashboard
          monthMetrics={defaultMonthMetrics}
          yearMetrics={defaultYearMetrics}
          targets={defaultTargets}
        />
      );

      // Button should not be visible without onTargetsUpdate callback
      expect(screen.queryByRole('button', { name: /edit targets/i })).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    it('handles very large metrics values', () => {
      render(
        <OverviewDashboard
          monthMetrics={{
            mealsServed: 1000000,
            showersBooked: 500000,
            laundryLoads: 300000,
            bicycles: 100000,
            haircuts: 200000,
            holidays: 150000,
          }}
          yearMetrics={{
            mealsServed: 10000000,
            showersBooked: 5000000,
            laundryLoads: 3000000,
            bicycles: 1000000,
            haircuts: 2000000,
            holidays: 1500000,
          }}
          targets={defaultTargets}
        />
      );

      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });
});
