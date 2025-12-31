import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import MealServiceTimer from "../MealServiceTimer";

// Mock the meal service time utility
vi.mock("../../utils/mealServiceTime", () => ({
  getMealServiceStatus: vi.fn(),
}));

import { getMealServiceStatus } from "../../utils/mealServiceTime";

describe("MealServiceTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("no-service days", () => {
    it("renders nothing on Sunday", () => {
      getMealServiceStatus.mockReturnValue({
        type: "no-service",
        message: null,
        timeRemaining: null,
      });

      const { container } = render(<MealServiceTimer />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing on Tuesday", () => {
      getMealServiceStatus.mockReturnValue({
        type: "no-service",
        message: null,
        timeRemaining: null,
      });

      const { container } = render(<MealServiceTimer />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing on Thursday", () => {
      getMealServiceStatus.mockReturnValue({
        type: "no-service",
        message: null,
        timeRemaining: null,
      });

      const { container } = render(<MealServiceTimer />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("before-service", () => {
    it("displays time until service starts", () => {
      getMealServiceStatus.mockReturnValue({
        type: "before-service",
        message: "Meal service starts in 30 min",
        timeRemaining: 30,
        startsAt: "8:00 AM",
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      expect(screen.getByText("Meal service starts in 30 min")).toBeInTheDocument();
    });

    it("has amber styling for before-service state", () => {
      getMealServiceStatus.mockReturnValue({
        type: "before-service",
        message: "Meal service starts in 30 min",
        timeRemaining: 30,
        startsAt: "8:00 AM",
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      expect(container).toHaveClass("text-amber-600");
      expect(container).toHaveClass("bg-amber-50");
    });

    it("does not show progress bar before service", () => {
      getMealServiceStatus.mockReturnValue({
        type: "before-service",
        message: "Meal service starts in 30 min",
        timeRemaining: 30,
        startsAt: "8:00 AM",
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("during-service", () => {
    it("displays time remaining", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "45 min remaining",
        timeRemaining: 45,
        totalDuration: 60,
        elapsed: 15,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      expect(screen.getByText("45 min remaining")).toBeInTheDocument();
    });

    it("shows progress bar during service", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "45 min remaining",
        timeRemaining: 45,
        totalDuration: 60,
        elapsed: 15,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("has emerald styling when plenty of time remaining", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "45 min remaining",
        timeRemaining: 45,
        totalDuration: 60,
        elapsed: 15,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      expect(container).toHaveClass("text-emerald-600");
      expect(container).toHaveClass("bg-emerald-50");
    });

    it("has orange styling when less than 20 minutes remaining", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "15 min remaining",
        timeRemaining: 15,
        totalDuration: 60,
        elapsed: 45,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      expect(container).toHaveClass("text-orange-600");
      expect(container).toHaveClass("bg-orange-50");
    });

    it("has red styling when less than 10 minutes remaining", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "8 min remaining",
        timeRemaining: 8,
        totalDuration: 60,
        elapsed: 52,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      expect(container).toHaveClass("text-red-600");
      expect(container).toHaveClass("bg-red-50");
    });

    it("calculates progress bar width correctly", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "30 min remaining",
        timeRemaining: 30,
        totalDuration: 60,
        elapsed: 30,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    });
  });

  describe("ended", () => {
    it("displays ended message", () => {
      getMealServiceStatus.mockReturnValue({
        type: "ended",
        message: "Meal service ended for today",
        timeRemaining: 0,
      });

      render(<MealServiceTimer />);
      expect(screen.getByText("Meal service ended for today")).toBeInTheDocument();
    });

    it("has gray styling when ended", () => {
      getMealServiceStatus.mockReturnValue({
        type: "ended",
        message: "Meal service ended for today",
        timeRemaining: 0,
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      expect(container).toHaveClass("text-gray-500");
      expect(container).toHaveClass("bg-gray-50");
    });

    it("does not show progress bar after service ended", () => {
      getMealServiceStatus.mockReturnValue({
        type: "ended",
        message: "Meal service ended for today",
        timeRemaining: 0,
      });

      render(<MealServiceTimer />);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper aria attributes", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "30 min remaining",
        timeRemaining: 30,
        totalDuration: 60,
        elapsed: 30,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      expect(container).toHaveAttribute("aria-live", "polite");
      expect(container).toHaveAttribute("aria-label", "Meal service status: 30 min remaining");
    });

    it("has clock icon with aria-hidden", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "30 min remaining",
        timeRemaining: 30,
        totalDuration: 60,
        elapsed: 30,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      // The Clock icon from lucide-react renders as an SVG
      const icons = document.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it("progress bar has proper aria attributes", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "30 min remaining",
        timeRemaining: 30,
        totalDuration: 60,
        elapsed: 30,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
      expect(progressBar).toHaveAttribute("aria-valuenow");
    });
  });

  describe("auto-update", () => {
    it("updates status every 30 seconds", () => {
      getMealServiceStatus
        .mockReturnValueOnce({
          type: "during-service",
          message: "30 min remaining",
          timeRemaining: 30,
          totalDuration: 60,
          elapsed: 30,
          endsAt: "9:00 AM",
        })
        .mockReturnValueOnce({
          type: "during-service",
          message: "30 min remaining",
          timeRemaining: 30,
          totalDuration: 60,
          elapsed: 30,
          endsAt: "9:00 AM",
        })
        .mockReturnValue({
          type: "during-service",
          message: "29 min remaining",
          timeRemaining: 29,
          totalDuration: 60,
          elapsed: 31,
          endsAt: "9:00 AM",
        });

      render(<MealServiceTimer />);
      expect(screen.getByText("30 min remaining")).toBeInTheDocument();

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(screen.getByText("29 min remaining")).toBeInTheDocument();
    });

    it("cleans up interval on unmount", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "30 min remaining",
        timeRemaining: 30,
        totalDuration: 60,
        elapsed: 30,
        endsAt: "9:00 AM",
      });

      const { unmount } = render(<MealServiceTimer />);
      
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("Saturday extended hours", () => {
    it("handles 2-hour service duration on Saturday", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "90 min remaining",
        timeRemaining: 90,
        totalDuration: 120,
        elapsed: 30,
        endsAt: "10:00 AM",
      });

      render(<MealServiceTimer />);
      expect(screen.getByText("90 min remaining")).toBeInTheDocument();
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "25"); // 30/120 = 25%
    });
  });

  describe("edge cases", () => {
    it("handles exactly 10 minutes remaining (boundary)", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "10 min remaining",
        timeRemaining: 10,
        totalDuration: 60,
        elapsed: 50,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      // At exactly 10 minutes, should still be red (<=10)
      expect(container).toHaveClass("text-red-600");
    });

    it("handles exactly 20 minutes remaining (boundary)", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "20 min remaining",
        timeRemaining: 20,
        totalDuration: 60,
        elapsed: 40,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const container = screen.getByRole("status");
      // At exactly 20 minutes, should still be orange (<=20)
      expect(container).toHaveClass("text-orange-600");
    });

    it("handles 0 elapsed time at service start", () => {
      getMealServiceStatus.mockReturnValue({
        type: "during-service",
        message: "60 min remaining",
        timeRemaining: 60,
        totalDuration: 60,
        elapsed: 0,
        endsAt: "9:00 AM",
      });

      render(<MealServiceTimer />);
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });
  });
});