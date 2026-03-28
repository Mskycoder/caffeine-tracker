/**
 * Personalized caffeine threshold engine.
 *
 * Converts research-backed plasma caffeine concentrations (Baur et al. 2024)
 * to personalized mg thresholds based on body weight and sensitivity.
 *
 * Formula: thresholdMg = plasmaConcentration * sensitivityMultiplier * Vd_L_per_kg * weightKg
 *
 * All functions are pure — no side effects, no Date.now().
 */

import type { CaffeineSensitivity, Settings } from './types';

// --- Constants ---

/** Plasma caffeine level (ug/mL) that triggers autonomic arousal during sleep (Baur et al. 2024). */
export const AUTONOMIC_PLASMA_UG_ML = 0.84;

/** Plasma caffeine level (ug/mL) that reduces deep/slow-wave sleep (Baur et al. 2024). */
export const DEEP_SLEEP_PLASMA_UG_ML = 1.44;

/** Volume of distribution per kg (L/kg). Matches metabolism.ts VD_PER_KG. */
const VD_L_PER_KG = 0.7;

/** Sensitivity multipliers: how much caffeine a person tolerates before effects. */
const SENSITIVITY_MULTIPLIERS: Record<CaffeineSensitivity, number> = {
  low: 1.25,
  normal: 1.0,
  high: 0.75,
};

// --- Types ---

/** Personalized threshold values in mg. */
export interface PersonalizedThresholds {
  autonomicMg: number;
  deepSleepMg: number;
}

// --- Internal helpers ---

/**
 * Get weight in kg from user settings, with conversion and clamping.
 * Same guard pattern as metabolism.ts: fallback to 70kg for invalid, clamp [30, 300] kg.
 */
function getWeightKg(weight: number, weightUnit: 'kg' | 'lbs'): number {
  const rawKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;
  return Math.max(30, Math.min(300, rawKg || 70));
}

// --- Engine functions ---

/**
 * Compute personalized caffeine thresholds from user settings.
 *
 * Uses body weight (from covariates) and caffeine sensitivity to convert
 * research plasma concentrations to whole-body mg thresholds.
 *
 * @param settings - Full user settings (extracts weight from covariates, sensitivity)
 * @returns Personalized threshold values in mg
 */
export function getPersonalizedThresholds(settings: Settings): PersonalizedThresholds {
  const weightKg = getWeightKg(
    settings.covariates.weight,
    settings.covariates.weightUnit,
  );
  const sensitivity = settings.caffeineSensitivity ?? 'normal';
  const multiplier = SENSITIVITY_MULTIPLIERS[sensitivity];

  const autonomicMg = AUTONOMIC_PLASMA_UG_ML * multiplier * VD_L_PER_KG * weightKg;
  const deepSleepMg = DEEP_SLEEP_PLASMA_UG_ML * multiplier * VD_L_PER_KG * weightKg;

  return { autonomicMg, deepSleepMg };
}

/**
 * Determine which threshold zone a caffeine level falls in.
 *
 * Zones (per D-01):
 * - 'clear': below autonomic threshold — no measurable sleep effect
 * - 'autonomic': between autonomic and deep sleep — increased heart rate during sleep
 * - 'sleep_disruption': at or above deep sleep threshold — reduced deep/slow-wave sleep
 *
 * @param currentMg - Current caffeine level in mg
 * @param thresholds - Personalized threshold values
 * @returns The threshold zone
 */
export function getThresholdZone(
  currentMg: number,
  thresholds: PersonalizedThresholds,
): 'clear' | 'autonomic' | 'sleep_disruption' {
  if (currentMg >= thresholds.deepSleepMg) return 'sleep_disruption';
  if (currentMg >= thresholds.autonomicMg) return 'autonomic';
  return 'clear';
}

/**
 * Get the effective sleep-ready threshold in mg.
 *
 * This is the SINGLE source of truth for the sleep threshold used by
 * curfew calculation, sleep estimate, and chart threshold line.
 *
 * Sources:
 * - 'manual': user's hand-picked thresholdMg (legacy behavior)
 * - 'autonomic': research-backed autonomic arousal threshold
 * - 'deep_sleep': research-backed deep sleep disruption threshold
 *
 * @param settings - Full user settings
 * @returns Effective threshold in mg
 */
export function getEffectiveThreshold(settings: Settings): number {
  const source = settings.thresholdSource ?? 'manual';

  if (source === 'manual') {
    return settings.thresholdMg;
  }

  const thresholds = getPersonalizedThresholds(settings);
  if (source === 'autonomic') return thresholds.autonomicMg;
  return thresholds.deepSleepMg;
}
