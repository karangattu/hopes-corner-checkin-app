import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 200);

    debouncedFn('a');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('resets delay on subsequent calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 200);

    debouncedFn('first');
    vi.advanceTimersByTime(150);
    debouncedFn('second');
    vi.advanceTimersByTime(150);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('cancel stops pending execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 200);

    debouncedFn('test');
    vi.advanceTimersByTime(100);
    debouncedFn.cancel();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });

  it('flush executes immediately', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 200);

    debouncedFn('queued');
    debouncedFn.flush('flushed');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('flushed');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes immediately on first call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 200);

    throttledFn('first');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('blocks calls within limit', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 200);

    throttledFn('first');
    throttledFn('second');
    throttledFn('third');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('schedules trailing call after limit', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 200);

    throttledFn('first');
    throttledFn('second');

    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });
});
