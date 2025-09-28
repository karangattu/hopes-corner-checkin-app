import { describe, expect, it, afterEach, vi } from "vitest";
import { pacificDateStringFrom, todayPacificDateString } from "./date";

describe("date utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats ISO strings into Pacific date strings", () => {
    const iso = "2024-07-04T05:00:00.000Z";
    expect(pacificDateStringFrom(iso)).toBe("2024-07-03");
  });

  it("formats Date instances into Pacific date strings", () => {
    const date = new Date("2024-12-25T23:30:00Z");
    expect(pacificDateStringFrom(date)).toBe("2024-12-25");
  });

  it("returns today in Pacific time when using todayPacificDateString", () => {
    vi.useFakeTimers({
      toFake: ["Date"],
    });
    vi.setSystemTime(new Date("2025-01-15T08:00:00-05:00"));

    expect(todayPacificDateString()).toBe("2025-01-15");
  });
});
