/**
 * Mass-balance coffee calculator engine.
 *
 * Pure function: computes caffeine content from brew parameters using
 * research-calibrated extraction rates per brew method.
 *
 * Formula: caffeineMg = doseG * (beanCaffeinePercent / 100) * (effectiveExtractionRate / 100)
 * Where effectiveExtractionRate = baseRate * grindMultiplier * tempMultiplier
 *
 * All functions are pure — no side effects, no Date.now().
 */

import type {
  BrewMethod,
  BeanType,
  GrindSize,
  BrewMethodConfig,
  CalculatorInput,
  CalculatorResult,
} from './types';

// ---------------------------------------------------------------------------
// Brew method data table (research-calibrated extraction rates)
// ---------------------------------------------------------------------------

/**
 * Caffeine-specific extraction rates: the fraction of total bean caffeine that
 * ends up in the cup. These are NOT TDS extraction yields — caffeine is highly
 * water-soluble (~2g/100mL at 80C) and extracts at much higher rates than total
 * dissolved solids.
 *
 * Espresso (46%) reflects high-pressure extraction efficiency at 9 bar
 * despite short contact time.
 *
 * Calibrated against empirical per-serving caffeine measurements from literature.
 * See: .planning/phases/16-coffee-calculator-presets/16-RESEARCH.md
 */
export const BREW_METHODS: Record<BrewMethod, BrewMethodConfig> = {
  'espresso':     { name: 'Espresso',     baseExtractionRate: 46, defaultDoseG: 18, defaultGrind: 'fine',        defaultTempC: 93,  disableTemp: false },
  'pour-over':    { name: 'Pour-Over',    baseExtractionRate: 85, defaultDoseG: 22, defaultGrind: 'medium-fine', defaultTempC: 94,  disableTemp: false },
  'french-press': { name: 'French Press', baseExtractionRate: 80, defaultDoseG: 25, defaultGrind: 'coarse',      defaultTempC: 95,  disableTemp: false },
  'cold-brew':    { name: 'Cold Brew',    baseExtractionRate: 67, defaultDoseG: 60, defaultGrind: 'coarse',      defaultTempC: 0,   disableTemp: true  },
  'moka-pot':     { name: 'Moka Pot',     baseExtractionRate: 80, defaultDoseG: 20, defaultGrind: 'fine',        defaultTempC: 100, disableTemp: false },
  'aeropress':    { name: 'AeroPress',    baseExtractionRate: 80, defaultDoseG: 17, defaultGrind: 'medium-fine', defaultTempC: 85,  disableTemp: false },
  'turkish':      { name: 'Turkish',      baseExtractionRate: 90, defaultDoseG: 10, defaultGrind: 'extra-fine',  defaultTempC: 95,  disableTemp: false },
  'siphon':       { name: 'Siphon',       baseExtractionRate: 85, defaultDoseG: 22, defaultGrind: 'medium',      defaultTempC: 92,  disableTemp: false },
  'chemex':       { name: 'Chemex',       baseExtractionRate: 82, defaultDoseG: 25, defaultGrind: 'medium',      defaultTempC: 94,  disableTemp: false },
  'percolator':   { name: 'Percolator',   baseExtractionRate: 90, defaultDoseG: 20, defaultGrind: 'coarse',      defaultTempC: 100, disableTemp: false },
};

// ---------------------------------------------------------------------------
// Grind size multipliers
// ---------------------------------------------------------------------------

/**
 * Finer grinds increase surface area, increasing extraction.
 * Each method's default grind is its "neutral" position; adjusting away
 * shifts extraction by the multiplier ratio relative to medium-fine (1.00).
 */
export const GRIND_MULTIPLIERS: Record<GrindSize, number> = {
  'extra-fine':  1.10,
  'fine':        1.05,
  'medium-fine': 1.00,
  'medium':      0.95,
  'coarse':      0.90,
};

// ---------------------------------------------------------------------------
// Bean caffeine content
// ---------------------------------------------------------------------------

/** Average caffeine content by bean type (percentage of dry weight, roasted beans). */
export const BEAN_CAFFEINE_PERCENT: Record<Exclude<BeanType, 'custom'>, number> = {
  'arabica': 1.4,
  'robusta': 2.6,
  'blend':   2.0,
};

// ---------------------------------------------------------------------------
// Temperature multiplier
// ---------------------------------------------------------------------------

/**
 * Compute temperature multiplier relative to a brew method's default temperature.
 *
 * +/- 0.5% extraction per degree C difference from method default.
 * Clamped to [0.90, 1.10] to prevent extreme values.
 *
 * @param tempC - Actual brewing temperature in Celsius
 * @param defaultTempC - The brew method's default temperature
 * @returns Multiplier in range [0.90, 1.10]
 */
export function getTempMultiplier(tempC: number, defaultTempC: number): number {
  const multiplier = 1.0 + (tempC - defaultTempC) * 0.005;
  return Math.max(0.90, Math.min(1.10, multiplier));
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * Compute caffeine content from brew parameters using mass-balance model.
 *
 * Formula: caffeineMg = doseG * (beanCaffeinePercent / 100) * (effectiveRate / 100)
 * Where: effectiveRate = baseExtractionRate * grindMultiplier * tempMultiplier
 *
 * @param input - Calculator input parameters
 * @returns Caffeine in mg (rounded to integer) and effective extraction rate
 */
export function computeCaffeineMg(input: CalculatorInput): CalculatorResult {
  const method = BREW_METHODS[input.brewMethod];
  const grindMult = GRIND_MULTIPLIERS[input.grindSize];
  const tempMult = method.disableTemp ? 1.0 : getTempMultiplier(input.waterTempC, method.defaultTempC);

  const effectiveRate = method.baseExtractionRate * grindMult * tempMult;
  // doseG * (beanCaffeinePercent / 100) gives grams of caffeine in beans.
  // Multiply by 1000 to convert grams to milligrams.
  // Then multiply by (effectiveRate / 100) for the fraction extracted into the cup.
  // Example: 18g * (1.4/100) * 1000 * (46/100) = 18 * 14 * 0.46 = 115.9mg
  const caffeineMg = input.doseG * (input.beanCaffeinePercent / 100) * 1000 * (effectiveRate / 100);

  return {
    caffeineMg: Math.round(caffeineMg),
    effectiveExtractionRate: Math.round(effectiveRate * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Preset name generation
// ---------------------------------------------------------------------------

/**
 * Generate an auto-name for a calculator preset.
 *
 * Format: "Espresso (Arabica, 18g)"
 *
 * @param brewMethod - The brew method identifier
 * @param beanType - The bean type identifier
 * @param doseG - Coffee dose in grams
 * @returns Formatted preset name
 */
export function generatePresetName(brewMethod: BrewMethod, beanType: BeanType, doseG: number): string {
  const methodName = BREW_METHODS[brewMethod].name;
  const beanLabel = beanType.charAt(0).toUpperCase() + beanType.slice(1);
  return `${methodName} (${beanLabel}, ${doseG}g)`;
}
