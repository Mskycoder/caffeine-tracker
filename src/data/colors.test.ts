import { PRESET_COLORS, hashColor, getDrinkColor, dailyTotalColor } from './colors';
import { DRINK_PRESETS } from './presets';

// ---------------------------------------------------------------------------
// PRESET_COLORS
// ---------------------------------------------------------------------------
describe('PRESET_COLORS', () => {
  it('has exactly 12 entries (one per DRINK_PRESETS presetId)', () => {
    expect(Object.keys(PRESET_COLORS)).toHaveLength(12);
  });

  it('has a key for every presetId in DRINK_PRESETS', () => {
    for (const preset of DRINK_PRESETS) {
      expect(PRESET_COLORS).toHaveProperty(preset.presetId);
    }
  });

  it("'espresso' maps to '#8B4513' (warm brown)", () => {
    expect(PRESET_COLORS['espresso']).toBe('#8B4513');
  });

  it("'cold-brew' maps to '#1565C0' (deep blue)", () => {
    expect(PRESET_COLORS['cold-brew']).toBe('#1565C0');
  });

  it("'cola' maps to '#DC2626' (red)", () => {
    expect(PRESET_COLORS['cola']).toBe('#DC2626');
  });

  it("'latte' maps to '#BCAAA4' (saturated cream)", () => {
    expect(PRESET_COLORS['latte']).toBe('#BCAAA4');
  });
});

// ---------------------------------------------------------------------------
// hashColor
// ---------------------------------------------------------------------------
describe('hashColor', () => {
  it('returns a valid hsl() string', () => {
    const result = hashColor('My Custom Drink');
    expect(result).toMatch(/^hsl\(\d+, 45%, 55%\)$/);
  });

  it('is deterministic (same input produces same output)', () => {
    const a = hashColor('My Custom Drink');
    const b = hashColor('My Custom Drink');
    expect(a).toBe(b);
  });

  it('returns different values for different inputs', () => {
    const a = hashColor('Coffee A');
    const b = hashColor('Coffee B');
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// getDrinkColor
// ---------------------------------------------------------------------------
describe('getDrinkColor', () => {
  it('returns PRESET_COLORS value when presetId exists in map', () => {
    expect(getDrinkColor('espresso', 'Espresso')).toBe(PRESET_COLORS['espresso']);
  });

  it('falls back to hashColor when presetId is null (custom drink)', () => {
    const result = getDrinkColor(null, 'My Drink');
    expect(result).toBe(hashColor('My Drink'));
  });

  it('falls back to hashColor when presetId is unknown', () => {
    const result = getDrinkColor('unknown-preset', 'Thing');
    expect(result).toBe(hashColor('Thing'));
  });
});

// ---------------------------------------------------------------------------
// dailyTotalColor
// ---------------------------------------------------------------------------
describe('dailyTotalColor', () => {
  it('returns pure green at 0mg', () => {
    expect(dailyTotalColor(0, 400)).toBe('hsl(120, 65%, 45%)');
  });

  it('returns approximately amber (hue ~60) at 200mg / 400mg limit', () => {
    const result = dailyTotalColor(200, 400);
    // ratio = 0.5, hue = 120 * (1 - 0.5) = 60
    expect(result).toBe('hsl(60, 65%, 45%)');
  });

  it('returns red at the limit (400mg / 400mg)', () => {
    expect(dailyTotalColor(400, 400)).toBe('hsl(0, 70%, 50%)');
  });

  it('clamps to red when over limit (500mg / 400mg)', () => {
    expect(dailyTotalColor(500, 400)).toBe('hsl(0, 70%, 50%)');
  });
});
