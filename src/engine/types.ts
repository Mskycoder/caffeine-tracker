/** Metabolism calculation mode: simple (manual preset) or advanced (covariate-based). */
export type MetabolismMode = 'simple' | 'advanced';

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

/** A single logged caffeine drink. Per D-01. */
export interface DrinkEntry {
  id: string;                  // crypto.randomUUID()
  name: string;                // "Espresso", "Drip Coffee", "Custom"
  caffeineMg: number;          // caffeine amount in milligrams
  timestamp: number;           // Date.now() epoch milliseconds
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
}

/** A user-created custom drink preset (Phase 10). Per D-06. */
export interface CustomPreset {
  id: string;           // `custom-${crypto.randomUUID()}` — serves as both CRUD key and presetId for color derivation
  name: string;         // user-entered drink name (1-40 chars)
  caffeineMg: number;   // caffeine content in mg (1-1000)
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
