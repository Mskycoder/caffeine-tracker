import { format } from 'date-fns';
import { useCaffeineStore } from '../store/caffeine-store';
import { getCaffeineLevel, getSleepReadyTime, getCaffeineCurfew, parseNextBedtime, getDailyTotal } from '../engine/caffeine';
import { dailyTotalColor } from '../data/colors';
import { FDA_DAILY_LIMIT_MG } from '../engine/constants';
import { getEffectiveHalfLife } from '../engine/metabolism';
import { useCurrentTime } from '../hooks/useCurrentTime';

/**
 * Hero status display showing the four most important values:
 * 1. Current estimated caffeine level (mg) -- large bold number
 * 2. Sleep-ready time estimate -- contextualized against bedtime:
 *    - "You're clear to sleep" when already below threshold
 *    - "On track for your X:XX AM bedtime" when will be clear before bedtime
 *    - "Won't be clear until X:XX AM" when still above threshold at bedtime (amber warning)
 * 3. Caffeine curfew -- "Last call for caffeine: X:XX AM/PM", or contextual past-curfew
 *    messages that pair coherently with the sleep estimate
 * 4. Daily caffeine total -- "Today: Xmg / 400mg" with green-to-red color gradient
 *
 * The sleep estimate and curfew messages are designed to tell a coherent story together.
 * When the user is on track for bedtime, both messages are reassuring. When not, both warn.
 *
 * Curfew is always visible since default bedtime is "00:00" (per D-04).
 * Refreshes automatically every 30 seconds via useCurrentTime hook.
 * All computation is derived from drink records + current time (no stored state).
 */
export function CaffeineStatus() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const settings = useCaffeineStore((s) => s.settings);
  const effectiveHalfLife = getEffectiveHalfLife(settings);

  const currentMg = getCaffeineLevel(drinks, now, effectiveHalfLife);
  const sleepTime = getSleepReadyTime(
    drinks, now, effectiveHalfLife, settings.thresholdMg
  );

  // Compute curfew (per D-03, D-04: always show, default bedtime is '00:00')
  const bedtimeStr = settings.targetBedtime ?? '00:00';
  const targetBedtimeMs = parseNextBedtime(bedtimeStr, now);
  const curfewResult = getCaffeineCurfew(
    drinks, targetBedtimeMs, now, effectiveHalfLife, settings.thresholdMg
  );

  const dailyTotal = getDailyTotal(drinks, now);

  // Determine if user will be below threshold before bedtime.
  // This drives both the sleep estimate and curfew display for coherent messaging.
  const onTrackForBedtime = sleepTime === null || sleepTime <= targetBedtimeMs;

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
        ) : sleepTime <= targetBedtimeMs ? (
          <p className="text-green-600 font-medium">
            On track for your{' '}
            <span className="font-semibold">{format(new Date(targetBedtimeMs), 'h:mm a')}</span>
            {' '}bedtime
          </p>
        ) : (
          <p className="text-amber-600">
            Won't be clear until{' '}
            <span className="font-semibold">{format(new Date(sleepTime), 'h:mm a')}</span>
          </p>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {curfewResult.status === 'budget_exceeded' ? (
          <p className="text-amber-600">Caffeine already above bedtime target</p>
        ) : curfewResult.status === 'too_soon' ? (
          <p className="text-gray-400">Curfew has passed for tonight</p>
        ) : curfewResult.status === 'curfew_passed' ? (
          onTrackForBedtime ? (
            <p className="text-gray-400">Past curfew for standard coffee</p>
          ) : (
            <p className="text-gray-400">
              Caffeine curfew was{' '}
              <span className="font-semibold text-gray-500">
                {format(new Date(curfewResult.time), 'h:mm a')}
              </span>
            </p>
          )
        ) : (
          <p>
            Last call for caffeine:{' '}
            <span className="font-semibold text-gray-700">
              {format(new Date(curfewResult.time), 'h:mm a')}
            </span>
          </p>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-500">
        Half-life: {settings.metabolismMode === 'advanced'
          ? `${effectiveHalfLife.toFixed(1)}hr`
          : `${effectiveHalfLife}hr`}
      </p>
      <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
        <p style={{ color: dailyTotalColor(dailyTotal, FDA_DAILY_LIMIT_MG) }} className="font-semibold">
          Today: {Math.round(dailyTotal)}mg{' '}
          <span className="font-normal text-gray-400">/ {FDA_DAILY_LIMIT_MG}mg</span>
        </p>
      </div>
    </section>
  );
}
