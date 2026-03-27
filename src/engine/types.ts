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
