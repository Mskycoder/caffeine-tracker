import { format } from 'date-fns';
import { useCaffeineStore } from '../store/caffeine-store';
import { getCaffeineLevel, getSleepReadyTime, getCaffeineCurfew, parseNextBedtime, getDailyTotal } from '../engine/caffeine';
import { dailyTotalColor } from '../data/colors';
import { FDA_DAILY_LIMIT_MG } from '../engine/constants';
import { useCurrentTime } from '../hooks/useCurrentTime';

/**
 * Hero status display showing the four most important values:
 * 1. Current estimated caffeine level (mg) -- large bold number
 * 2. Sleep-ready time estimate -- "Safe to sleep by X:XX AM/PM" or "You're clear to sleep"
 * 3. Caffeine curfew -- "Last call for caffeine: X:XX AM/PM" or warning if budget exceeded
 * 4. Daily caffeine total -- "Today: Xmg / 400mg" with green-to-red color gradient
 *
 * Curfew is always visible since default bedtime is "00:00" (per D-04).
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

  // Compute curfew (per D-03, D-04: always show, default bedtime is '00:00')
  const bedtimeStr = settings.targetBedtime ?? '00:00';
  const targetBedtimeMs = parseNextBedtime(bedtimeStr, now);
  const curfewTime = getCaffeineCurfew(
    drinks, targetBedtimeMs, now, settings.halfLifeHours, settings.thresholdMg
  );

  const dailyTotal = getDailyTotal(drinks, now);

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
      <div className="mt-2 text-sm text-gray-500">
        {curfewTime === null ? (
          <p className="text-amber-600">Caffeine already above bedtime target</p>
        ) : (
          <p>
            Last call for caffeine:{' '}
            <span className="font-semibold text-gray-700">
              {format(new Date(curfewTime), 'h:mm a')}
            </span>
          </p>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
        <p style={{ color: dailyTotalColor(dailyTotal, FDA_DAILY_LIMIT_MG) }} className="font-semibold">
          Today: {Math.round(dailyTotal)}mg{' '}
          <span className="font-normal text-gray-400">/ {FDA_DAILY_LIMIT_MG}mg</span>
        </p>
      </div>
    </section>
  );
}
