import { describe, it, expect } from 'vitest';
import {
  computeCaffeineMg,
  getTempMultiplier,
  generatePresetName,
  BREW_METHODS,
  GRIND_MULTIPLIERS,
  BEAN_CAFFEINE_PERCENT,
} from './calculator';
import type { CalculatorInput } from './types';

// ---------------------------------------------------------------------------
// BREW_METHODS data table
// ---------------------------------------------------------------------------
describe('BREW_METHODS', () => {
  it('has entries for all 10 brew methods', () => {
    const methods = Object.keys(BREW_METHODS);
    expect(methods).toHaveLength(10);
    expect(methods).toContain('espresso');
    expect(methods).toContain('pour-over');
    expect(methods).toContain('french-press');
    expect(methods).toContain('cold-brew');
    expect(methods).toContain('moka-pot');
    expect(methods).toContain('aeropress');
    expect(methods).toContain('turkish');
    expect(methods).toContain('siphon');
    expect(methods).toContain('chemex');
    expect(methods).toContain('percolator');
  });

  it('each method has required fields', () => {
    for (const [key, config] of Object.entries(BREW_METHODS)) {
      expect(config.name, `${key} missing name`).toBeDefined();
      expect(config.baseExtractionRate, `${key} missing baseExtractionRate`).toBeGreaterThan(0);
      expect(config.defaultDoseG, `${key} missing defaultDoseG`).toBeGreaterThan(0);
      expect(config.defaultGrind, `${key} missing defaultGrind`).toBeDefined();
      expect(typeof config.defaultTempC, `${key} defaultTempC not number`).toBe('number');
      expect(typeof config.disableTemp, `${key} disableTemp not boolean`).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// BEAN_CAFFEINE_PERCENT
// ---------------------------------------------------------------------------
describe('BEAN_CAFFEINE_PERCENT', () => {
  it('has arabica=1.4, robusta=2.6, blend=2.0', () => {
    expect(BEAN_CAFFEINE_PERCENT.arabica).toBe(1.4);
    expect(BEAN_CAFFEINE_PERCENT.robusta).toBe(2.6);
    expect(BEAN_CAFFEINE_PERCENT.blend).toBe(2.0);
  });
});

// ---------------------------------------------------------------------------
// getTempMultiplier
// ---------------------------------------------------------------------------
describe('getTempMultiplier', () => {
  it('returns 1.0 when tempC equals defaultTempC', () => {
    expect(getTempMultiplier(93, 93)).toBe(1.0);
  });

  it('increases for higher temperature', () => {
    expect(getTempMultiplier(100, 93)).toBeGreaterThan(1.0);
  });

  it('decreases for lower temperature', () => {
    expect(getTempMultiplier(85, 93)).toBeLessThan(1.0);
  });

  it('clamps to max 1.10', () => {
    // 93 + 30 = 123, delta=30, multiplier=1.15, should clamp to 1.10
    expect(getTempMultiplier(123, 93)).toBe(1.10);
  });

  it('clamps to min 0.90', () => {
    // 93 - 30 = 63, delta=-30, multiplier=0.85, should clamp to 0.90
    expect(getTempMultiplier(63, 93)).toBe(0.90);
  });
});

// ---------------------------------------------------------------------------
// computeCaffeineMg
// ---------------------------------------------------------------------------
describe('computeCaffeineMg', () => {
  it('produces caffeineMg in range [100, 140] for 18g arabica espresso at default grind/temp', () => {
    const result = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'fine',
      waterTempC: 93,
    });
    expect(result.caffeineMg).toBeGreaterThanOrEqual(100);
    expect(result.caffeineMg).toBeLessThanOrEqual(140);
  });

  it('returns effectiveExtractionRate close to 48 for default espresso', () => {
    const result = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'fine',
      waterTempC: 93,
    });
    // fine grind has 1.05 multiplier, temp at default = 1.0
    // effective = 46 * 1.05 * 1.0 = 48.3
    expect(result.effectiveExtractionRate).toBeGreaterThanOrEqual(46);
    expect(result.effectiveExtractionRate).toBeLessThanOrEqual(52);
  });

  it('robusta (2.6%) produces roughly 1.86x the arabica result for same brew params', () => {
    const arabica = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'fine',
      waterTempC: 93,
    });
    const robusta = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'robusta',
      beanCaffeinePercent: 2.6,
      doseG: 18,
      grindSize: 'fine',
      waterTempC: 93,
    });
    const ratio = robusta.caffeineMg / arabica.caffeineMg;
    // 2.6 / 1.4 = 1.857... but rounding may shift slightly
    expect(ratio).toBeGreaterThanOrEqual(1.7);
    expect(ratio).toBeLessThanOrEqual(2.0);
  });

  it('grind size extra-fine (1.10) produces higher mg than coarse (0.90)', () => {
    const extraFine = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'extra-fine',
      waterTempC: 93,
    });
    const coarse = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'coarse',
      waterTempC: 93,
    });
    expect(extraFine.caffeineMg).toBeGreaterThan(coarse.caffeineMg);
  });

  it('temperature 100C produces higher mg than 85C for espresso', () => {
    const hot = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'fine',
      waterTempC: 100,
    });
    const cool = computeCaffeineMg({
      brewMethod: 'espresso',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 18,
      grindSize: 'fine',
      waterTempC: 85,
    });
    expect(hot.caffeineMg).toBeGreaterThan(cool.caffeineMg);
  });

  it('cold brew ignores temperature multiplier', () => {
    const coldBrewHot = computeCaffeineMg({
      brewMethod: 'cold-brew',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 60,
      grindSize: 'coarse',
      waterTempC: 100,
    });
    const coldBrewCold = computeCaffeineMg({
      brewMethod: 'cold-brew',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 60,
      grindSize: 'coarse',
      waterTempC: 0,
    });
    expect(coldBrewHot.caffeineMg).toBe(coldBrewCold.caffeineMg);
  });

  it('produces approximately 178mg for 15g arabica pour-over at default grind/temp', () => {
    const result = computeCaffeineMg({
      brewMethod: 'pour-over',
      beanType: 'arabica',
      beanCaffeinePercent: 1.4,
      doseG: 15,
      grindSize: 'medium-fine',
      waterTempC: 94,
    });
    // Caffeine-specific extraction: 15g * 14mg/g * 0.85 = 178.5mg
    expect(result.caffeineMg).toBeGreaterThanOrEqual(160);
    expect(result.caffeineMg).toBeLessThanOrEqual(200);
  });

  it('all brew methods produce empirically reasonable caffeine estimates at default doses', () => {
    const expectedRanges: Record<string, [number, number]> = {
      'espresso':     [100, 140],
      'pour-over':    [230, 300],
      'french-press': [220, 290],
      'cold-brew':    [430, 580],
      'moka-pot':     [200, 270],
      'aeropress':    [160, 220],
      'turkish':      [120, 160],
      'siphon':       [220, 290],
      'chemex':       [240, 310],
      'percolator':   [195, 260],
    };

    for (const [method, [min, max]] of Object.entries(expectedRanges)) {
      const config = BREW_METHODS[method as keyof typeof BREW_METHODS];
      const result = computeCaffeineMg({
        brewMethod: method as keyof typeof BREW_METHODS,
        beanType: 'arabica',
        beanCaffeinePercent: 1.4,
        doseG: config.defaultDoseG,
        grindSize: config.defaultGrind,
        waterTempC: config.defaultTempC,
      });
      expect(
        result.caffeineMg,
        `${method}: expected ${min}-${max}mg, got ${result.caffeineMg}mg`
      ).toBeGreaterThanOrEqual(min);
      expect(
        result.caffeineMg,
        `${method}: expected ${min}-${max}mg, got ${result.caffeineMg}mg`
      ).toBeLessThanOrEqual(max);
    }
  });
});

// ---------------------------------------------------------------------------
// generatePresetName
// ---------------------------------------------------------------------------
describe('generatePresetName', () => {
  it('produces "Espresso (Arabica, 18g)" for espresso/arabica/18g', () => {
    expect(generatePresetName('espresso', 'arabica', 18)).toBe('Espresso (Arabica, 18g)');
  });

  it('produces "Cold Brew (Custom, 60g)" for cold-brew/custom/60g', () => {
    expect(generatePresetName('cold-brew', 'custom', 60)).toBe('Cold Brew (Custom, 60g)');
  });
});
