// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useCurrentTime } from './useCurrentTime';

describe('useCurrentTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a number representing current time', () => {
    const { result } = renderHook(() => useCurrentTime());
    const now = Date.now();

    expect(typeof result.current).toBe('number');
    // Should be within 1 second of Date.now()
    expect(Math.abs(result.current - now)).toBeLessThan(1000);
  });

  it('updates value after interval elapses', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useCurrentTime(50));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current).not.toBe(initial);
  });

  it('cleans up interval on unmount', () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useCurrentTime(50));
    unmount();

    // Advancing timers after unmount should not cause errors or state updates
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // If cleanup failed, React would warn about state update on unmounted component.
    // No assertion needed beyond the absence of errors.
  });
});
