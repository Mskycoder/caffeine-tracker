import { useState, useEffect } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { useCurrentTime } from './useCurrentTime';
import { AUTO_FINISH_TIMEOUT_MS } from '../engine/constants';

/**
 * Auto-finishes forgotten active drinks (endedAt === undefined) after 2 hours.
 * Checks on mount and every 30 seconds (via useCurrentTime).
 * Returns a toast message string when drinks were auto-finished, null otherwise.
 * Toast auto-clears after 3 seconds.
 */
export function useAutoFinish(): string | null {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const drinks = useCaffeineStore((s) => s.drinks);
  const autoFinishDrinks = useCaffeineStore((s) => s.autoFinishDrinks);
  const now = useCurrentTime();

  useEffect(() => {
    // Find drinks about to be auto-finished (for toast message)
    const aboutToFinish = drinks.filter(
      (d) => d.endedAt === undefined && (now - d.startedAt) > AUTO_FINISH_TIMEOUT_MS,
    );
    const count = autoFinishDrinks(now);
    if (count > 0) {
      const message = count === 1 && aboutToFinish.length === 1
        ? `Auto-finished ${aboutToFinish[0].name} after 2 hours`
        : `Auto-finished ${count} drinks after 2 hours`;
      setToastMessage(message);
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [now]); // eslint-disable-line -- autoFinishDrinks is stable Zustand action

  return toastMessage;
}
