import { describe, it, expect } from 'vitest';
import {
  getPersonalizedThresholds,
  getThresholdZone,
  getEffectiveThreshold,
  AUTONOMIC_PLASMA_UG_ML,
  DEEP_SLEEP_PLASMA_UG_ML,
} from './thresholds';
import { DEFAULT_COVARIATES } from './types';
import type { Settings } from './types';

/** Helper to create a minimal Settings object with overrides. */
const makeSettings = (overrides: Partial<Settings> = {}): Settings => ({
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: '00:00',
  metabolismMode: 'simple',
  covariates: { ...DEFAULT_COVARIATES },
  hiddenPresetIds: [],
  showResearchThresholds: false,
  caffeineSensitivity: 'normal',
  thresholdSource: 'manual',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('threshold constants', () => {
  it('exports AUTONOMIC_PLASMA_UG_ML as 0.84', () => {
    expect(AUTONOMIC_PLASMA_UG_ML).toBe(0.84);
  });

  it('exports DEEP_SLEEP_PLASMA_UG_ML as 1.44', () => {
    expect(DEEP_SLEEP_PLASMA_UG_ML).toBe(1.44);
  });
});

// ---------------------------------------------------------------------------
// getPersonalizedThresholds
// ---------------------------------------------------------------------------
describe('getPersonalizedThresholds', () => {
  it('returns correct thresholds for 70kg normal sensitivity', () => {
    const settings = makeSettings({ caffeineSensitivity: 'normal' });
    const result = getPersonalizedThresholds(settings);
    // 0.84 * 0.7 * 70 = 41.16
    expect(result.autonomicMg).toBeCloseTo(41.16, 2);
    // 1.44 * 0.7 * 70 = 70.56
    expect(result.deepSleepMg).toBeCloseTo(70.56, 2);
  });

  it('applies low sensitivity multiplier (1.25)', () => {
    const settings = makeSettings({ caffeineSensitivity: 'low' });
    const result = getPersonalizedThresholds(settings);
    // 41.16 * 1.25 = 51.45
    expect(result.autonomicMg).toBeCloseTo(51.45, 2);
    // 70.56 * 1.25 = 88.20
    expect(result.deepSleepMg).toBeCloseTo(88.20, 2);
  });

  it('applies high sensitivity multiplier (0.75)', () => {
    const settings = makeSettings({ caffeineSensitivity: 'high' });
    const result = getPersonalizedThresholds(settings);
    // 41.16 * 0.75 = 30.87
    expect(result.autonomicMg).toBeCloseTo(30.87, 2);
    // 70.56 * 0.75 = 52.92
    expect(result.deepSleepMg).toBeCloseTo(52.92, 2);
  });

  it('converts weight from lbs correctly (154 lbs ≈ 69.85 kg)', () => {
    const settings = makeSettings({
      covariates: { ...DEFAULT_COVARIATES, weight: 154, weightUnit: 'lbs' },
    });
    const result = getPersonalizedThresholds(settings);
    // 154 * 0.453592 = 69.853168 kg
    // 0.84 * 0.7 * 69.853168 = 41.07... (close to 41.16 for 70kg)
    const expectedAutonomic = 0.84 * 0.7 * 69.853168;
    expect(result.autonomicMg).toBeCloseTo(expectedAutonomic, 1);
  });

  it('falls back to 70kg for weight of 0', () => {
    const settings = makeSettings({
      covariates: { ...DEFAULT_COVARIATES, weight: 0 },
    });
    const result = getPersonalizedThresholds(settings);
    expect(result.autonomicMg).toBeCloseTo(41.16, 2);
  });

  it('falls back to 70kg for NaN weight', () => {
    const settings = makeSettings({
      covariates: { ...DEFAULT_COVARIATES, weight: NaN },
    });
    const result = getPersonalizedThresholds(settings);
    expect(result.autonomicMg).toBeCloseTo(41.16, 2);
  });

  it('clamps weight to minimum 30 kg', () => {
    const settings = makeSettings({
      covariates: { ...DEFAULT_COVARIATES, weight: 10 },
    });
    const result = getPersonalizedThresholds(settings);
    // Clamped to 30kg: 0.84 * 0.7 * 30 = 17.64
    expect(result.autonomicMg).toBeCloseTo(17.64, 2);
  });

  it('clamps weight to maximum 300 kg', () => {
    const settings = makeSettings({
      covariates: { ...DEFAULT_COVARIATES, weight: 500 },
    });
    const result = getPersonalizedThresholds(settings);
    // Clamped to 300kg: 0.84 * 0.7 * 300 = 176.4
    expect(result.autonomicMg).toBeCloseTo(176.4, 2);
  });

  it('defaults to normal sensitivity when caffeineSensitivity is undefined (migration safety)', () => {
    const settings = makeSettings();
    // Force undefined to simulate old persisted state
    (settings as unknown as Record<string, unknown>).caffeineSensitivity = undefined;
    const result = getPersonalizedThresholds(settings);
    expect(result.autonomicMg).toBeCloseTo(41.16, 2);
  });
});

// ---------------------------------------------------------------------------
// getThresholdZone
// ---------------------------------------------------------------------------
describe('getThresholdZone', () => {
  const thresholds = { autonomicMg: 41.16, deepSleepMg: 70.56 };

  it('returns clear when currentMg < autonomicMg', () => {
    expect(getThresholdZone(20, thresholds)).toBe('clear');
  });

  it('returns autonomic when currentMg is between thresholds', () => {
    expect(getThresholdZone(50, thresholds)).toBe('autonomic');
  });

  it('returns sleep_disruption when currentMg >= deepSleepMg', () => {
    expect(getThresholdZone(100, thresholds)).toBe('sleep_disruption');
  });

  it('returns autonomic at exactly autonomicMg (boundary)', () => {
    expect(getThresholdZone(41.16, thresholds)).toBe('autonomic');
  });

  it('returns sleep_disruption at exactly deepSleepMg (boundary)', () => {
    expect(getThresholdZone(70.56, thresholds)).toBe('sleep_disruption');
  });

  it('returns clear at 0 mg', () => {
    expect(getThresholdZone(0, thresholds)).toBe('clear');
  });
});

// ---------------------------------------------------------------------------
// getEffectiveThreshold
// ---------------------------------------------------------------------------
describe('getEffectiveThreshold', () => {
  it('returns settings.thresholdMg when thresholdSource is manual', () => {
    const settings = makeSettings({ thresholdSource: 'manual', thresholdMg: 75 });
    expect(getEffectiveThreshold(settings)).toBe(75);
  });

  it('returns autonomicMg when thresholdSource is autonomic', () => {
    const settings = makeSettings({ thresholdSource: 'autonomic' });
    const result = getEffectiveThreshold(settings);
    // 70kg, normal sensitivity: 0.84 * 0.7 * 70 = 41.16
    expect(result).toBeCloseTo(41.16, 2);
  });

  it('returns deepSleepMg when thresholdSource is deep_sleep', () => {
    const settings = makeSettings({ thresholdSource: 'deep_sleep' });
    const result = getEffectiveThreshold(settings);
    // 70kg, normal sensitivity: 1.44 * 0.7 * 70 = 70.56
    expect(result).toBeCloseTo(70.56, 2);
  });

  it('defaults to manual when thresholdSource is undefined (migration safety)', () => {
    const settings = makeSettings({ thresholdMg: 60 });
    (settings as unknown as Record<string, unknown>).thresholdSource = undefined;
    expect(getEffectiveThreshold(settings)).toBe(60);
  });

  it('defaults to normal sensitivity when caffeineSensitivity is undefined (migration safety)', () => {
    const settings = makeSettings({ thresholdSource: 'autonomic' });
    (settings as unknown as Record<string, unknown>).caffeineSensitivity = undefined;
    const result = getEffectiveThreshold(settings);
    // Should use normal (1.0) multiplier: 0.84 * 0.7 * 70 = 41.16
    expect(result).toBeCloseTo(41.16, 2);
  });
});
