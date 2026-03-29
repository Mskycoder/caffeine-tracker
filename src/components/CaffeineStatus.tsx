import { format } from 'date-fns';
import { useCaffeineStore } from '../store/caffeine-store';
import { getCaffeineLevel, getSleepReadyTime, getCaffeineCurfew, parseNextBedtime, getDailyTotal } from '../engine/caffeine';
import { dailyTotalColor } from '../data/colors';
import { FDA_DAILY_LIMIT_MG } from '../engine/constants';
import { getEffectiveHalfLife } from '../engine/metabolism';
import { getPersonalizedThresholds, getThresholdZone, getEffectiveThreshold } from '../engine/thresholds';
import { DRINK_PRESETS } from '../data/presets';
import type { CustomPreset } from '../engine/types';
import { useCurrentTime } from '../hooks/useCurrentTime';

/**
 * Hero status display showing the six most important values:
 * 1. Current estimated caffeine level (mg) -- large bold number
 * 1b. Zone badge (when research thresholds enabled) -- colored dot + zone name
 *     indicating clear/autonomic/sleep_disruption based on personalized thresholds
 * 2. Sleep-ready time estimate -- single line with dot separator, contextualized against bedtime:
 *    - "Clear to sleep · {N}mg at bedtime" when already below threshold (green)
 *    - "On track for {time} · {N}mg" when will be clear before bedtime (green)
 *    - "Won't clear until {time} · {N}mg" when still above threshold at bedtime (amber)
 *    - When targetBedtime is null, status text only (no dot separator or mg portion)
 * 3. Caffeine curfew -- personalized with selected last-call drink name when
 *    `lastCallDrinkId` is set (e.g., "Last Drip Coffee: X:XX AM/PM"), or generic
 *    "Last call for caffeine: X:XX AM/PM" when null. Falls back to generic wording
 *    when selected preset is deleted or hidden. Contextual past-curfew messages
 *    pair coherently with the sleep estimate
 * 4. Daily caffeine total -- "Today: Xmg / 400mg" with green-to-red color gradient
 * 5. Half-life badge -- shows effective half-life, with threshold mg values when
 *    research thresholds enabled: "Half-life: 5hr | 41mg · 71mg"
 *
 * The sleep estimate and curfew messages are designed to tell a coherent story together.
 * When the user is on track for bedtime, both messages are reassuring. When not, both warn.
 *
 * Curfew is always visible since default bedtime is "00:00" (per D-04).
 * Refreshes automatically every 30 seconds via useCurrentTime hook.
 * Sleep-ready time and curfew use getEffectiveThreshold (D-10) which resolves to
 * manual threshold, autonomic, or deep-sleep research value based on thresholdSource.
 * All computation is derived from drink records + current time (no stored state).
 */
/**
 * Resolve lastCallDrinkId to a drink object at render time (per D-08).
 * Checks built-in presets first (by presetId), then custom presets (by id).
 * Returns null if not found (deleted/hidden preset silently falls back per D-11).
 */
function resolveLastCallDrink(
  lastCallDrinkId: string | null,
  customPresets: CustomPreset[],
): { name: string; caffeineMg: number; durationMinutes: number } | null {
  if (!lastCallDrinkId) return null;

  const builtIn = DRINK_PRESETS.find(p => p.presetId === lastCallDrinkId);
  if (builtIn) return { name: builtIn.name, caffeineMg: builtIn.caffeineMg, durationMinutes: builtIn.durationMinutes };

  const custom = customPresets.find(p => p.id === lastCallDrinkId);
  if (custom) return { name: custom.name, caffeineMg: custom.caffeineMg, durationMinutes: custom.durationMinutes };

  return null;
}

export function CaffeineStatus() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const settings = useCaffeineStore((s) => s.settings);
  const customPresets = useCaffeineStore((s) => s.customPresets);
  const effectiveHalfLife = getEffectiveHalfLife(settings);
  const lastCallDrink = resolveLastCallDrink(settings.lastCallDrinkId, customPresets);

  const currentMg = getCaffeineLevel(drinks, now, effectiveHalfLife);
  const effectiveThreshold = getEffectiveThreshold(settings);
  const sleepTime = getSleepReadyTime(
    drinks, now, effectiveHalfLife, effectiveThreshold
  );

  // Compute curfew (per D-03, D-04: always show, default bedtime is '00:00')
  const bedtimeStr = settings.targetBedtime ?? '00:00';
  const targetBedtimeMs = parseNextBedtime(bedtimeStr, now);
  const curfewResult = getCaffeineCurfew(
    drinks, targetBedtimeMs, now, effectiveHalfLife, effectiveThreshold,
    lastCallDrink?.caffeineMg ?? 95,
    lastCallDrink?.durationMinutes ?? 0,
  );

  // BED-01: Projected caffeine at bedtime
  const bedtimeMg = getCaffeineLevel(drinks, targetBedtimeMs, effectiveHalfLife);

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
      {settings.showResearchThresholds && (() => {
        const thresholds = getPersonalizedThresholds(settings);
        const zone = getThresholdZone(currentMg, thresholds);
        const zoneConfig = {
          clear: { bg: 'bg-green-600', text: 'text-green-600', label: 'Clear zone' },
          autonomic: { bg: 'bg-amber-600', text: 'text-amber-600', label: 'Autonomic effects' },
          sleep_disruption: { bg: 'bg-red-500', text: 'text-red-500', label: 'Sleep disruption' },
        }[zone];
        return (
          <div className="inline-flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${zoneConfig.bg}`} />
            <span className={`text-sm font-semibold ${zoneConfig.text}`}>{zoneConfig.label}</span>
          </div>
        );
      })()}
      <div className="mt-3 text-base text-gray-600">
        {sleepTime === null ? (
          <p className="text-green-600 font-medium">
            Clear to sleep{settings.targetBedtime !== null ? ` \u00b7 ${Math.round(bedtimeMg)}mg at bedtime` : ''}
          </p>
        ) : sleepTime <= targetBedtimeMs ? (
          <p className="text-green-600 font-medium">
            On track for {format(new Date(targetBedtimeMs), 'h:mm a')} {'\u00b7'} {Math.round(bedtimeMg)}mg
          </p>
        ) : (
          <p className="text-amber-600">
            Won't clear until {format(new Date(sleepTime), 'h:mm a')} {'\u00b7'} {Math.round(bedtimeMg)}mg
          </p>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {curfewResult.status === 'budget_exceeded' ? (
          <p className="text-amber-600">Already above bedtime target</p>
        ) : curfewResult.status === 'too_soon' ? (
          <p className="text-gray-400">Curfew has passed for tonight</p>
        ) : curfewResult.status === 'curfew_passed' ? (
          onTrackForBedtime ? (
            <p className="text-gray-400">
              {lastCallDrink
                ? `Past last ${lastCallDrink.name}`
                : 'Past curfew for standard coffee'}
            </p>
          ) : (
            <p className="text-gray-400">
              {lastCallDrink
                ? <>Last {lastCallDrink.name} was{' '}<span className="font-semibold text-gray-500">{format(new Date(curfewResult.time), 'h:mm a')}</span></>
                : <>Caffeine curfew was{' '}<span className="font-semibold text-gray-500">{format(new Date(curfewResult.time), 'h:mm a')}</span></>}
            </p>
          )
        ) : (
          <p>
            {lastCallDrink
              ? <>Last {lastCallDrink.name}:{' '}<span className="font-semibold text-gray-700">{format(new Date(curfewResult.time), 'h:mm a')}</span></>
              : <>Last call for caffeine:{' '}<span className="font-semibold text-gray-700">{format(new Date(curfewResult.time), 'h:mm a')}</span></>}
          </p>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-500">
        Half-life: {settings.metabolismMode === 'advanced'
          ? `${effectiveHalfLife.toFixed(1)}hr`
          : `${effectiveHalfLife}hr`}
        {settings.showResearchThresholds && (() => {
          const thresholds = getPersonalizedThresholds(settings);
          return (
            <>
              {' | '}
              <span style={{ color: '#16a34a' }}>{Math.round(thresholds.autonomicMg)}mg</span>
              {' \u00b7 '}
              <span style={{ color: '#ef4444' }}>{Math.round(thresholds.deepSleepMg)}mg</span>
            </>
          );
        })()}
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
