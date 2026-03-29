/** Metabolism calculation mode: simple (manual preset) or advanced (covariate-based). */
export type MetabolismMode = 'simple' | 'advanced';

/** Caffeine sensitivity level: affects personalized threshold multiplier (Phase 17). */
export type CaffeineSensitivity = 'low' | 'normal' | 'high';

/** Source for the effective sleep-ready threshold (Phase 17). */
export type ThresholdSource = 'manual' | 'autonomic' | 'deep_sleep';

/** Threshold zone for current caffeine level relative to personalized thresholds (Phase 17). */
export type ThresholdZone = 'clear' | 'autonomic' | 'sleep_disruption';

/** User health/lifestyle covariates for population PK half-life computation. */
export interface CovariateSettings {
  weight: number;           // in current unit (kg or lbs)
  weightUnit: 'kg' | 'lbs';
  sex: 'male' | 'female';
  smoking: boolean;
  oralContraceptives: boolean;
  pregnancyTrimester: 'none' | 'first' | 'second' | 'third';
  liverDisease: 'none' | 'mild' | 'moderate';
  cyp1a2Genotype: 'unknown' | 'fast' | 'normal' | 'slow';
  cyp1a2Inhibitor: 'none' | 'fluvoxamine' | 'ciprofloxacin' | 'other_moderate';
}

/** Default covariate values: 70kg male with no conditions. */
export const DEFAULT_COVARIATES: CovariateSettings = {
  weight: 70,
  weightUnit: 'kg',
  sex: 'male',
  smoking: false,
  oralContraceptives: false,
  pregnancyTrimester: 'none',
  liverDisease: 'none',
  cyp1a2Genotype: 'unknown',
  cyp1a2Inhibitor: 'none',
};

/** A single logged caffeine drink. Per D-14. */
export interface DrinkEntry {
  id: string;                  // crypto.randomUUID()
  name: string;                // "Espresso", "Drip Coffee", "Custom"
  caffeineMg: number;          // caffeine amount in milligrams
  startedAt: number;           // epoch ms when consumption began
  endedAt: number | undefined; // epoch ms when consumption ended; undefined = actively being consumed
  presetId: string | null;     // links to preset for color derivation (D-02), null for custom
}

/** User-configurable settings. Per D-03. */
export interface Settings {
  halfLifeHours: number;         // default 5.0
  thresholdMg: number;           // default 50
  targetBedtime: string | null;  // HH:mm format or null
  metabolismMode: MetabolismMode;  // 'simple' (default) or 'advanced'
  covariates: CovariateSettings;   // health factors for advanced mode
  hiddenPresetIds: string[];           // Phase 15: preset IDs hidden from quick-add
  showResearchThresholds: boolean;     // Phase 17 groundwork: research threshold toggle
  caffeineSensitivity: CaffeineSensitivity;  // Phase 17: sensitivity multiplier for thresholds
  thresholdSource: ThresholdSource;          // Phase 17: source for effective sleep threshold
}

/** Brew method identifiers for coffee calculator (Phase 16). */
export type BrewMethod =
  | 'espresso' | 'pour-over' | 'french-press' | 'cold-brew'
  | 'moka-pot' | 'aeropress' | 'turkish' | 'siphon'
  | 'chemex' | 'percolator';

/** Bean type identifiers (Phase 16). */
export type BeanType = 'arabica' | 'robusta' | 'blend' | 'custom';

/** Grind size stops from finest to coarsest (Phase 16). */
export type GrindSize = 'extra-fine' | 'fine' | 'medium-fine' | 'medium' | 'coarse';

/** Configuration for a single brew method (Phase 16). */
export interface BrewMethodConfig {
  name: string;
  baseExtractionRate: number;
  defaultDoseG: number;
  defaultGrind: GrindSize;
  defaultTempC: number;
  disableTemp: boolean;
}

/** Input parameters for coffee calculator computation (Phase 16). */
export interface CalculatorInput {
  brewMethod: BrewMethod;
  beanType: BeanType;
  beanCaffeinePercent: number;
  doseG: number;
  grindSize: GrindSize;
  waterTempC: number;
}

/** Result from coffee calculator computation (Phase 16). */
export interface CalculatorResult {
  caffeineMg: number;
  effectiveExtractionRate: number;
}

/** Saved calculator parameters for re-editing a calculator preset (Phase 16, D-08). */
export interface CalculatorParams {
  brewMethod: BrewMethod;
  beanType: BeanType;
  beanCaffeinePercent: number;
  doseG: number;
  grindSize: GrindSize;
  waterTempC: number;
}

/** A user-created custom drink preset (Phase 10). Per D-06. */
export interface CustomPreset {
  id: string;           // `custom-${crypto.randomUUID()}` — serves as both CRUD key and presetId for color derivation
  name: string;         // user-entered drink name (1-40 chars)
  caffeineMg: number;   // caffeine content in mg (1-1000)
  durationMinutes: number;  // default consumption duration in minutes. 0 = instant.
  calculatorParams?: CalculatorParams;  // Phase 16: undefined for simple presets
}

/** A recurring drink schedule for auto-logging (Phase 13). */
export interface DrinkSchedule {
  id: string;                  // crypto.randomUUID()
  presetId: string;            // Links to DrinkPreset.presetId or CustomPreset.id
  name: string;                // Drink name (denormalized -- survives preset deletion)
  caffeineMg: number;          // Caffeine amount (denormalized -- survives preset deletion)
  timeOfDay: string;           // HH:mm format (e.g., '09:30')
  repeatDays: number[];        // JS getDay() indices: 0=Sun, 1=Mon, ..., 6=Sat
  paused: boolean;             // When true, catch-up skips this schedule
  lastRunDate: string | null;  // ISO date 'YYYY-MM-DD' of last successful catch-up
}

/**
 * Discriminated result from getCaffeineCurfew.
 *
 * - "ok": A valid curfew time was found in the future (epoch ms).
 * - "curfew_passed": A valid curfew time exists but has already passed (epoch ms).
 *   Common for after-midnight bedtimes during the late evening -- e.g., bedtime 3 AM,
 *   curfew was at 10:10 PM, and it's now 10:30 PM.
 * - "budget_exceeded": Existing drinks already push bedtime caffeine above threshold.
 * - "too_soon": Bedtime is so close that even with zero existing caffeine and scanning
 *   back 24 hours, no valid curfew window exists. Extremely rare in practice.
 */
export type CurfewResult =
  | { status: 'ok'; time: number }
  | { status: 'curfew_passed'; time: number }
  | { status: 'budget_exceeded' }
  | { status: 'too_soon' };

/** Per-drink contribution point for stacked visualization (Phase 6). */
export interface DrinkCurvePoint {
  time: number;
  total: number;
  [drinkId: string]: number;  // per-drink caffeine contribution
}
