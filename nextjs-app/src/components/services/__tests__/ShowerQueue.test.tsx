import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShowerQueue } from '../ShowerQueue';

const hapticsMock = vi.hoisted(() => ({
  delete: vi.fn(),
  complete: vi.fn(),
  actionSuccess: vi.fn(),
  selection: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('@/utils/haptics', () => ({
  __esModule: true,
  default: hapticsMock,
}));

vi.mock('@/utils/toast', () => ({
  __esModule: true,
  default: toastMock,
}));

describe('ShowerQueue', () => {
  let mockSetQueue: ReturnType<typeof vi.fn>;
  let initialQueue: { id: string; name: string }[];

  beforeEach(() => {
    mockSetQueue = vi.fn();
    initialQueue = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];

    // Mock Date to have consistent slot times
    const mockDate = new Date('2025-10-09T10:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty queue message when no guests', () => {
      render(<ShowerQueue queue={[]} setQueue={mockSetQueue} />);
      expect(screen.getByText('Shower queue is empty.')).toBeInTheDocument();
    });

    it('renders list of guests with slot times', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();

      // Check for time strings - 10:00 AM base with 15min slots
      expect(screen.getAllByText('10:00 AM')).toHaveLength(2);
      expect(screen.getByText('10:15 AM')).toBeInTheDocument();
    });

    it('marks first two guests as active (In Use)', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      expect(screen.getAllByText('In Use')).toHaveLength(2);
    });

    it('has correct data-testid attributes for queue items', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      expect(screen.getByTestId('shower-queue-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('shower-queue-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('shower-queue-item-3')).toBeInTheDocument();
    });
  });

  describe('guest removal', () => {
    it('allows removing a guest via button', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      const removeButton = screen.getByLabelText('Remove Alice from shower queue');
      fireEvent.click(removeButton);

      expect(mockSetQueue).toHaveBeenCalledTimes(1);
      expect(hapticsMock.delete).toHaveBeenCalled();
      expect(toastMock.warning).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        expect.any(Object)
      );
    });

    it('removes the correct guest from queue', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      const removeButton = screen.getByLabelText('Remove Bob from shower queue');
      fireEvent.click(removeButton);

      // Check that setQueue was called with a function
      expect(mockSetQueue).toHaveBeenCalledWith(expect.any(Function));
      
      // Execute the updater function to verify it filters correctly
      const updater = mockSetQueue.mock.calls[0][0] as (prev: typeof initialQueue) => typeof initialQueue;
      const result = updater(initialQueue);
      expect(result).toHaveLength(2);
      expect(result.find((g) => g.id === '2')).toBeUndefined();
    });
  });

  describe('completion actions', () => {
    it('has complete button for desktop view', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      const completeButton = screen.getByLabelText("Mark Alice's shower as complete");
      expect(completeButton).toBeInTheDocument();
    });

    it('calls haptics and toast on completion', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      const completeButton = screen.getByLabelText("Mark Alice's shower as complete");
      fireEvent.click(completeButton);

      expect(mockSetQueue).toHaveBeenCalled();
      expect(hapticsMock.complete).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        expect.any(Object)
      );
    });
  });

  describe('slot time calculation', () => {
    it('calculates slot times correctly', () => {
      // With fake time at 10:00, rounded to 10:00
      // index 0: 10:00 (floor(0/2)=0, +0)
      // index 1: 10:00 (floor(1/2)=0, +0)
      // index 2: 10:15 (floor(2/2)=1, +15)
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      expect(screen.getAllByText('10:00 AM')).toHaveLength(2);
      expect(screen.getByText('10:15 AM')).toBeInTheDocument();
    });

    it('handles queue with less than 2 guests', () => {
      const shortQueue = [{ id: '1', name: 'Alice' }];
      render(<ShowerQueue queue={shortQueue} setQueue={mockSetQueue} />);

      expect(screen.getByText('In Use')).toBeInTheDocument();
    });

    it('handles queue with exactly 2 guests', () => {
      const twoQueue = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      render(<ShowerQueue queue={twoQueue} setQueue={mockSetQueue} />);

      expect(screen.getAllByText('In Use')).toHaveLength(2);
    });
  });

  describe('pull to refresh', () => {
    it('invokes refresh when pulling the queue', async () => {
      vi.useRealTimers();
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      render(
        <ShowerQueue
          queue={initialQueue}
          setQueue={mockSetQueue}
          onRefresh={onRefresh}
        />
      );

      const container = screen.getByTestId('shower-queue-container');
      fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(container, {
        touches: [{ clientY: 150 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(container);

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
      expect(toastMock.success).toHaveBeenCalledWith(
        'Shower queue refreshed',
        expect.any(Object)
      );
    });
  });

  describe('swipe to complete', () => {
    it('marks a shower entry complete on swipe', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      const item = screen.getByTestId('shower-queue-item-1');
      fireEvent.touchStart(item, { touches: [{ clientX: 160 }] });
      fireEvent.touchMove(item, {
        touches: [{ clientX: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(item);

      expect(mockSetQueue).toHaveBeenCalledTimes(1);
      expect(hapticsMock.complete).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        expect.any(Object)
      );
    });
  });

  describe('accessibility', () => {
    it('has accessible remove buttons', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      expect(
        screen.getByRole('button', { name: /Remove Alice from shower queue/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Remove Bob from shower queue/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Remove Charlie from shower queue/i })
      ).toBeInTheDocument();
    });

    it('has accessible complete buttons', () => {
      render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

      expect(
        screen.getByRole('button', { name: /Mark Alice's shower as complete/i })
      ).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty queue gracefully', () => {
      render(<ShowerQueue queue={[]} setQueue={mockSetQueue} />);
      expect(screen.getByText('Shower queue is empty.')).toBeInTheDocument();
    });

    it('handles large queue', () => {
      const largeQueue = Array.from({ length: 20 }, (_, i) => ({
        id: String(i + 1),
        name: `Guest ${i + 1}`,
      }));
      render(<ShowerQueue queue={largeQueue} setQueue={mockSetQueue} />);

      expect(screen.getByText('Guest 1')).toBeInTheDocument();
      expect(screen.getByText('Guest 20')).toBeInTheDocument();
      // Only first 2 should be "In Use"
      expect(screen.getAllByText('In Use')).toHaveLength(2);
    });

    it('handles guest with special characters in name', () => {
      const specialQueue = [{ id: '1', name: "O'Brien & Söderström" }];
      render(<ShowerQueue queue={specialQueue} setQueue={mockSetQueue} />);

      expect(screen.getByText("O'Brien & Söderström")).toBeInTheDocument();
    });
  });
});
