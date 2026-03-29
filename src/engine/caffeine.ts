import { startOfDay } from 'date-fns';
import {
  DEFAULT_KA,
  BIOAVAILABILITY,
  MAX_PROJECTION_HOURS,
  PROJECTION_STEP_MS,
  NEGLIGIBLE_MG,
} from './constants';
import type { DrinkEntry, DrinkCurvePoint, CurfewResult } from './types';
import { expandAllDrinks } from './subdose';

/**
 * Parse "HH:mm" bedtime string into the next occurrence as epoch ms.
 * If the time has already passed today, returns tomorrow's occurrence.
 *
 * Pure function: no Date.now() calls -- `now` is passed as argument (per D-05).
 */
export function parseNextBedtime(bedtimeStr: string, now: number): number {
  const [hours, minutes] = bedtimeStr.split(':').map(Number);
  const today = new Date(now);
  today.setHours(hours, minutes, 0, 0);

  let bedtimeMs = today.getTime();
  if (bedtimeMs <= now) {
    bedtimeMs += 24 * 60 * 60 * 1000; // roll to tomorrow
  }
  return bedtimeMs;
}

/**
 * Calculate the latest time a standard dose could be consumed such that
 * total caffeine at bedtime stays below threshold.
 *
 * Scans backwards from `targetBedtimeMs` to find the curfew time -- the latest
 * point where a standard dose's contribution at bedtime stays within budget.
 * This scan is independent of `now`, so the curfew time is always computed even
 * if it has already passed.
 *
 * Then compares the curfew time to `now` to determine status:
 *   - { status: 'ok', time } — curfew is in the future
 *   - { status: 'curfew_passed', time } — curfew exists but has already passed
 *   - { status: 'budget_exceeded' } — existing drinks push bedtime caffeine above threshold
 *   - { status: 'too_soon' } — no valid curfew exists even scanning back 24 hours
 *
 * When `durationMinutes` > 0, the hypothetical drink is modeled with sub-dose
 * expansion over the given duration, producing earlier curfew times for drinks
 * consumed over time.
 *
 * Pure function: no Date.now() calls -- all times passed as arguments (per D-05).
 */
export function getCaffeineCurfew(
  drinks: DrinkEntry[],
  targetBedtimeMs: number,
  now: number,
  halfLifeHours: number,
  thresholdMg: number,
  standardDoseMg: number = 95,
  durationMinutes: number = 0,
  ka: number = DEFAULT_KA,
): CurfewResult {
  // Current caffeine contribution at bedtime from existing drinks
  const existingAtBedtime = getCaffeineLevel(drinks, targetBedtimeMs, halfLifeHours, ka);

  // Budget remaining before exceeding threshold
  const budget = thresholdMg - existingAtBedtime;

  if (budget <= 0) return { status: 'budget_exceeded' };

  // Scan from 24 hours before bedtime to bedtime in 5-minute steps.
  // This finds the absolute curfew time regardless of when the user checks.
  const scanStart = targetBedtimeMs - 24 * 60 * 60 * 1000;
  let curfew: number | null = null;
  for (let t = scanStart; t <= targetBedtimeMs; t += PROJECTION_STEP_MS) {
    const endedAt = durationMinutes > 0 ? t + durationMinutes * 60_000 : t;
    const fakeDrink: DrinkEntry = {
      id: 'curfew-calc',
      name: 'Curfew',
      caffeineMg: standardDoseMg,
      startedAt: t,
      endedAt: endedAt,
      presetId: null,
    };
    // For duration drinks, use getCaffeineLevel (handles sub-dose expansion)
    // then subtract existing contribution. For instant drinks, singleDrinkLevel is correct.
    const contribution = durationMinutes > 0
      ? getCaffeineLevel([...drinks, fakeDrink], targetBedtimeMs, halfLifeHours, ka) - existingAtBedtime
      : singleDrinkLevel(fakeDrink, targetBedtimeMs, halfLifeHours, ka);
    if (contribution <= budget) {
      curfew = t; // This time works; keep scanning for a later one
    } else {
      break; // Past this point, later drinks contribute more at bedtime
    }
  }

  if (curfew === null) return { status: 'too_soon' };

  if (curfew < now) return { status: 'curfew_passed', time: curfew };

  return { status: 'ok', time: curfew };
}

/**
 * One-compartment oral dosing model for a single drink.
 *
 * C(t) = D * F * (ka / (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
 *
 * Where:
 *   D  = dose in mg
 *   F  = bioavailability fraction
 *   ka = absorption rate constant (h^-1)
 *   ke = elimination rate constant (h^-1) = ln2 / halfLifeHours
 *   t  = elapsed time in hours
 *
 * Returns caffeine in mg at time `atTime` from a single drink.
 * Returns 0 for drinks logged in the future relative to atTime.
 * All parameters are explicit -- no Date.now() calls (per D-05).
 */
export function singleDrinkLevel(
  drink: DrinkEntry,
  atTime: number,
  halfLifeHours: number,
  ka: number = DEFAULT_KA,
): number {
  const elapsedMs = atTime - drink.startedAt;
  if (elapsedMs <= 0) return 0;

  const elapsedHours = elapsedMs / 3_600_000;
  const ke = Math.LN2 / halfLifeHours;
  const F = BIOAVAILABILITY;

  // Guard against ka === ke (mathematically degenerate case -- division by zero)
  // Use L'Hopital's limit: C(t) = D * F * ka * t * e^(-ke*t)
  if (Math.abs(ka - ke) < 1e-10) {
    return Math.max(0, drink.caffeineMg * F * ka * elapsedHours * Math.exp(-ke * elapsedHours));
  }

  const level =
    drink.caffeineMg * F * (ka / (ka - ke)) *
    (Math.exp(-ke * elapsedHours) - Math.exp(-ka * elapsedHours));

  return Math.max(0, level);
}

/**
 * Total caffeine from all drinks via superposition (ENG-02).
 * Each drink's curve is independent; total is their sum.
 * Duration drinks are transparently expanded into sub-doses before summation.
 */
export function getCaffeineLevel(
  drinks: DrinkEntry[],
  atTime: number,
  halfLifeHours: number,
  ka: number = DEFAULT_KA,
): number {
  const expanded = expandAllDrinks(drinks, atTime);
  return expanded.reduce(
    (total, drink) => total + singleDrinkLevel(drink, atTime, halfLifeHours, ka),
    0,
  );
}

/**
 * Find the earliest time after `fromTime` when total caffeine drops
 * below `thresholdMg`. Returns epoch ms, or null if already below.
 *
 * Uses 5-minute step forward scan (PROJECTION_STEP_MS) up to
 * MAX_PROJECTION_HOURS. Returns maxTime as fallback for extreme doses.
 */
export function getSleepReadyTime(
  drinks: DrinkEntry[],
  fromTime: number,
  halfLifeHours: number,
  thresholdMg: number,
  ka: number = DEFAULT_KA,
): number | null {
  const currentLevel = getCaffeineLevel(drinks, fromTime, halfLifeHours, ka);
  if (currentLevel <= thresholdMg) return null;

  const maxTime = fromTime + MAX_PROJECTION_HOURS * 3_600_000;

  for (let t = fromTime + PROJECTION_STEP_MS; t <= maxTime; t += PROJECTION_STEP_MS) {
    if (getCaffeineLevel(drinks, t, halfLifeHours, ka) <= thresholdMg) {
      return t;
    }
  }

  return maxTime; // fallback: more than 48 hours away
}

/**
 * Generate stacked curve data for per-drink chart layers.
 * Returns DrinkCurvePoint[] where each point has a `total` and per-drink
 * keys (keyed by drink.id) with individual caffeine contributions.
 *
 * Duration drinks are expanded into sub-doses that share the parent drink's ID,
 * so multiple sub-doses accumulate into a single chart layer per drink.
 *
 * Active drinks (endedAt=undefined) are correctly expanded via the `currentTime`
 * parameter, which is passed to `expandAllDrinks` as the provisional end time.
 * Defaults to `endTime` for backward compatibility.
 *
 * Drink keys are omitted when:
 * - The point time is before the drink's startedAt (not yet consumed)
 * - The contribution is below NEGLIGIBLE_MG threshold
 *
 * Suitable for Recharts stacked AreaChart visualization.
 */
export function generateStackedCurveData(
  drinks: DrinkEntry[],
  startTime: number,
  endTime: number,
  stepMs: number,
  halfLifeHours: number,
  ka: number = DEFAULT_KA,
  currentTime: number = endTime,
): DrinkCurvePoint[] {
  const expanded = expandAllDrinks(drinks, currentTime);
  const points: DrinkCurvePoint[] = [];

  for (let t = startTime; t <= endTime; t += stepMs) {
    const point: DrinkCurvePoint = { time: t, total: 0 };
    for (const drink of expanded) {
      const level = singleDrinkLevel(drink, t, halfLifeHours, ka);
      if (level > NEGLIGIBLE_MG) {
        point[drink.id] = (point[drink.id] as number ?? 0) + level;
        point.total += level;
      }
    }
    points.push(point);
  }

  return points;
}

/**
 * Sum of caffeineMg for drinks logged today (calendar day).
 * Uses date-fns startOfDay for consistent "today" boundary,
 * matching the same pattern used by DrinkHistory.
 *
 * Pure function: `now` is passed as argument, no Date.now() calls.
 */
export function getDailyTotal(drinks: DrinkEntry[], now: number): number {
  const todayStart = startOfDay(new Date(now)).getTime();
  return drinks
    .filter((d) => d.startedAt >= todayStart)
    .reduce((sum, d) => sum + d.caffeineMg, 0);
}
