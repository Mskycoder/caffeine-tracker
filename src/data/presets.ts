/** A drink preset with a stable presetId for downstream color derivation (Phase 6). */
export interface DrinkPreset {
  presetId: string;
  name: string;
  caffeineMg: number;
  durationMinutes: number;  // default consumption duration in minutes. 0 = instant.
}

/**
 * 12 common caffeinated drink presets (D-02).
 *
 * Values sourced from standard caffeine content references.
 * presetId is kebab-case, used for color derivation at render time (D-03).
 */
export const DRINK_PRESETS: readonly DrinkPreset[] = [
  { presetId: 'espresso',        name: 'Espresso',        caffeineMg: 63,  durationMinutes: 0 },
  { presetId: 'double-espresso', name: 'Double Espresso', caffeineMg: 126, durationMinutes: 0 },
  { presetId: 'drip-coffee',     name: 'Drip Coffee',     caffeineMg: 95,  durationMinutes: 0 },
  { presetId: 'pour-over',       name: 'Pour-Over',       caffeineMg: 150, durationMinutes: 0 },
  { presetId: 'cold-brew',       name: 'Cold Brew',       caffeineMg: 200, durationMinutes: 0 },
  { presetId: 'latte',           name: 'Latte',           caffeineMg: 63,  durationMinutes: 0 },
  { presetId: 'black-tea',       name: 'Black Tea',       caffeineMg: 47,  durationMinutes: 0 },
  { presetId: 'green-tea',       name: 'Green Tea',       caffeineMg: 28,  durationMinutes: 0 },
  { presetId: 'matcha',          name: 'Matcha',          caffeineMg: 70,  durationMinutes: 0 },
  { presetId: 'energy-drink',    name: 'Energy Drink',    caffeineMg: 80,  durationMinutes: 0 },
  { presetId: 'cola',            name: 'Cola',            caffeineMg: 34,  durationMinutes: 0 },
  { presetId: 'caffeine-pill',   name: 'Caffeine Pill',   caffeineMg: 200, durationMinutes: 0 },
] as const;
