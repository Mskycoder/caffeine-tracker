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

/** A single point on the total caffeine curve (for charting). */
export interface CurvePoint {
  time: number;   // epoch ms
  mg: number;     // total caffeine at this time
}

/** Per-drink contribution point for stacked visualization (Phase 6). */
export interface DrinkCurvePoint {
  time: number;
  total: number;
  [drinkId: string]: number;  // per-drink caffeine contribution
}
