import { useState, useEffect } from 'react';

/** Refresh interval for live caffeine updates (30 seconds). */
const REFRESH_INTERVAL_MS = 30_000;

/**
 * Hook that returns the current epoch ms timestamp, auto-refreshing
 * at the given interval. Drives live updates for caffeine calculations.
 *
 * Default 30-second interval matches caffeine's slow decay rate --
 * sub-second precision is unnecessary.
 */
export function useCurrentTime(intervalMs = REFRESH_INTERVAL_MS): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
