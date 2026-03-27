import { useState, useEffect } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';

/**
 * Runs scheduled drink catch-up once on app mount (D-06).
 * Returns a toast message string when drinks were logged, null otherwise.
 * Toast auto-clears after 3 seconds (D-08).
 */
export function useScheduleCatchUp(): string | null {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const runCatchUp = useCaffeineStore((s) => s.runCatchUp);

  useEffect(() => {
    const count = runCatchUp(Date.now());
    if (count > 0) {
      setToastMessage(
        count === 1
          ? 'Logged 1 scheduled drink'
          : `Logged ${count} scheduled drinks`,
      );
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, []); // Runs once on mount -- runCatchUp is a stable Zustand action

  return toastMessage;
}
