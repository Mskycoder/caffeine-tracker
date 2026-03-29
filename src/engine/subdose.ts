import type { DrinkEntry } from './types';
import { SUB_DOSE_INTERVAL_MS } from './constants';

/**
 * Expand a drink into sub-doses for PK computation.
 *
 * - Instant drinks (startedAt === endedAt): returns [drink] unchanged
 * - Duration drinks: splits into N evenly-spaced sub-doses across [startedAt, effectiveEnd]
 * - Active drinks (endedAt undefined): uses currentTime as provisional endedAt
 *
 * Each sub-dose has:
 *   - caffeineMg = totalMg / N
 *   - startedAt = original startedAt + (i * interval)
 *   - endedAt = startedAt (each sub-dose is itself instant)
 *   - Same id, name, presetId as parent (for chart stacking)
 *
 * Pure function: no side effects, currentTime passed as argument.
 */
export function expandDrinkToSubDoses(
  drink: DrinkEntry,
  currentTime: number,
): DrinkEntry[] {
  const effectiveEnd = drink.endedAt ?? currentTime;
  const durationMs = effectiveEnd - drink.startedAt;

  if (durationMs <= 0) return [drink]; // instant or edge case

  const n = Math.max(2, Math.ceil(durationMs / SUB_DOSE_INTERVAL_MS));
  const interval = durationMs / (n - 1);
  const subDoseMg = drink.caffeineMg / n;

  return Array.from({ length: n }, (_, i) => ({
    ...drink,
    caffeineMg: subDoseMg,
    startedAt: drink.startedAt + i * interval,
    endedAt: drink.startedAt + i * interval, // each sub-dose is instant
  }));
}

/**
 * Expand an array of drinks, flattening all sub-doses into a single array.
 * Pure function: no side effects.
 */
export function expandAllDrinks(
  drinks: DrinkEntry[],
  currentTime: number,
): DrinkEntry[] {
  return drinks.flatMap((d) => expandDrinkToSubDoses(d, currentTime));
}
