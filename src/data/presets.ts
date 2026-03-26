/** A drink preset with a stable presetId for downstream color derivation (Phase 6). */
export interface DrinkPreset {
  presetId: string;
  name: string;
  caffeineMg: number;
}

/**
 * 12 common caffeinated drink presets (D-02).
 *
 * Values sourced from standard caffeine content references.
 * presetId is kebab-case, used for color derivation at render time (D-03).
 */
export const DRINK_PRESETS: readonly DrinkPreset[] = [
  { presetId: 'espresso',        name: 'Espresso',        caffeineMg: 63 },
  { presetId: 'double-espresso', name: 'Double Espresso', caffeineMg: 126 },
  { presetId: 'drip-coffee',     name: 'Drip Coffee',     caffeineMg: 95 },
  { presetId: 'pour-over',       name: 'Pour-Over',       caffeineMg: 150 },
  { presetId: 'cold-brew',       name: 'Cold Brew',       caffeineMg: 200 },
  { presetId: 'latte',           name: 'Latte',           caffeineMg: 63 },
  { presetId: 'black-tea',       name: 'Black Tea',       caffeineMg: 47 },
  { presetId: 'green-tea',       name: 'Green Tea',       caffeineMg: 28 },
  { presetId: 'matcha',          name: 'Matcha',          caffeineMg: 70 },
  { presetId: 'energy-drink',    name: 'Energy Drink',    caffeineMg: 80 },
  { presetId: 'cola',            name: 'Cola',            caffeineMg: 34 },
  { presetId: 'caffeine-pill',   name: 'Caffeine Pill',   caffeineMg: 200 },
] as const;
