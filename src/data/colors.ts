/**
 * Color module for drink visualization.
 *
 * Provides:
 * - PRESET_COLORS: Hand-picked hex colors for each of the 12 drink presets
 * - hashColor: Deterministic DJB2 hash to HSL for custom drinks
 * - getDrinkColor: Preset color with hash fallback
 * - dailyTotalColor: Continuous green-to-red HSL gradient for daily intake indicator
 */

/** Hand-picked hex colors for each preset drink, keyed by presetId. */
export const PRESET_COLORS: Record<string, string> = {
  'espresso': '#8B4513',
  'double-espresso': '#6B3410',
  'drip-coffee': '#3E2723',
  'pour-over': '#5D4037',
  'cold-brew': '#1565C0',
  'latte': '#BCAAA4',
  'black-tea': '#F59E0B',
  'green-tea': '#16A34A',
  'matcha': '#65A30D',
  'energy-drink': '#EA580C',
  'cola': '#DC2626',
  'caffeine-pill': '#7C3AED',
};

/**
 * DJB2-style hash to HSL color for custom drinks.
 * Deterministic: same name always produces the same color.
 */
export function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

/**
 * Get the display color for a drink.
 * Returns the preset color if presetId is non-null and exists in PRESET_COLORS;
 * otherwise falls back to a deterministic hash-derived color from the drink name.
 */
export function getDrinkColor(presetId: string | null, name: string): string {
  if (presetId !== null && presetId in PRESET_COLORS) {
    return PRESET_COLORS[presetId];
  }
  return hashColor(name);
}

/**
 * Continuous HSL gradient for daily caffeine total indicator.
 * Maps 0mg to pure green (hue 120), limitMg to red (hue 0).
 * Values at or above limitMg clamp to red with increased saturation.
 *
 * @param totalMg - Current daily caffeine total in mg
 * @param limitMg - Daily limit (e.g., FDA_DAILY_LIMIT_MG = 400)
 * @returns HSL color string
 */
export function dailyTotalColor(totalMg: number, limitMg: number): string {
  const ratio = Math.max(0, totalMg / limitMg);
  if (ratio >= 1) return 'hsl(0, 70%, 50%)';
  const hue = Math.round(120 * (1 - ratio));
  return `hsl(${hue}, 65%, 45%)`;
}
