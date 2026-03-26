import { format } from 'date-fns';
import { useCaffeineStore } from '../store/caffeine-store';
import { getCaffeineLevel, getSleepReadyTime } from '../engine/caffeine';
import { useCurrentTime } from '../hooks/useCurrentTime';

/**
 * Hero status display showing the two most important values:
 * 1. Current estimated caffeine level (mg) -- large bold number
 * 2. Sleep-ready time estimate -- "Safe to sleep by X:XX AM/PM" or "You're clear to sleep"
 *
 * Refreshes automatically every 30 seconds via useCurrentTime hook.
 * All computation is derived from drink records + current time (no stored state).
 */
export function CaffeineStatus() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const settings = useCaffeineStore((s) => s.settings);

  const currentMg = getCaffeineLevel(drinks, now, settings.halfLifeHours);
  const sleepTime = getSleepReadyTime(
    drinks, now, settings.halfLifeHours, settings.thresholdMg
  );

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm text-center">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Current Caffeine
      </p>
      <p className="mt-1 text-5xl font-bold text-gray-900">
        {Math.round(currentMg)}<span className="text-2xl font-normal text-gray-400 ml-1">mg</span>
      </p>
      <div className="mt-3 text-base text-gray-600">
        {sleepTime === null ? (
          <p className="text-green-600 font-medium">You're clear to sleep</p>
        ) : (
          <p>Safe to sleep by <span className="font-semibold text-gray-900">{format(new Date(sleepTime), 'h:mm a')}</span></p>
        )}
      </div>
    </section>
  );
}
