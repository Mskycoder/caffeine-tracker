import {
  DEFAULT_KA,
  BIOAVAILABILITY,
  MAX_PROJECTION_HOURS,
  PROJECTION_STEP_MS,
} from './constants';
import type { DrinkEntry, CurvePoint } from './types';

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
  const elapsedMs = atTime - drink.timestamp;
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
 */
export function getCaffeineLevel(
  drinks: DrinkEntry[],
  atTime: number,
  halfLifeHours: number,
  ka: number = DEFAULT_KA,
): number {
  return drinks.reduce(
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
 * Generate time-series data for charting the caffeine decay curve.
 * Returns an array of CurvePoint objects from startTime to endTime
 * at the given step interval.
 */
export function generateCurveData(
  drinks: DrinkEntry[],
  startTime: number,
  endTime: number,
  stepMs: number,
  halfLifeHours: number,
  ka: number = DEFAULT_KA,
): CurvePoint[] {
  const points: CurvePoint[] = [];

  for (let t = startTime; t <= endTime; t += stepMs) {
    points.push({
      time: t,
      mg: getCaffeineLevel(drinks, t, halfLifeHours, ka),
    });
  }

  return points;
}

/**
 * Per-drink caffeine contribution breakdown at a given time.
 * Returns an object mapping each drink.id to its individual
 * caffeine level (mg). Sum of all values equals getCaffeineLevel total.
 */
export function getDrinkContributions(
  drinks: DrinkEntry[],
  atTime: number,
  halfLifeHours: number,
  ka: number = DEFAULT_KA,
): Record<string, number> {
  const contributions: Record<string, number> = {};

  for (const drink of drinks) {
    contributions[drink.id] = singleDrinkLevel(drink, atTime, halfLifeHours, ka);
  }

  return contributions;
}
