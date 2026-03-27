import { describe, it, expect } from 'vitest';
import { computeHalfLife, getEffectiveHalfLife } from './metabolism';
import { DEFAULT_COVARIATES } from './types';
import type { CovariateSettings, Settings } from './types';

/** Helper to create covariates with overrides from defaults. */
const cov = (overrides: Partial<CovariateSettings>): CovariateSettings => ({
  ...DEFAULT_COVARIATES,
  ...overrides,
});

/** Helper to create a full Settings object for getEffectiveHalfLife tests. */
const makeSettings = (overrides: Partial<Settings> = {}): Settings => ({
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: '00:00',
  metabolismMode: 'simple',
  covariates: { ...DEFAULT_COVARIATES },
  ...overrides,
});

describe('computeHalfLife', () => {
  describe('baseline calibration', () => {
    it('returns 5.0h for default 70kg male with no covariates', () => {
      const result = computeHalfLife(DEFAULT_COVARIATES);
      expect(result).toBeCloseTo(5.0, 1);
    });
  });

  describe('weight scaling', () => {
    it('heavier person (100kg) has different half-life than 70kg', () => {
      const baseline = computeHalfLife(DEFAULT_COVARIATES);
      const heavier = computeHalfLife(cov({ weight: 100 }));
      expect(heavier).not.toBeCloseTo(baseline, 1);
    });

    it('weight in lbs (154) matches weight in kg (70)', () => {
      const kg70 = computeHalfLife(DEFAULT_COVARIATES);
      const lbs154 = computeHalfLife(cov({ weight: 154, weightUnit: 'lbs' }));
      expect(lbs154).toBeCloseTo(kg70, 1);
    });

    it('weight of 0 falls back to 70kg default', () => {
      const baseline = computeHalfLife(DEFAULT_COVARIATES);
      const zeroWeight = computeHalfLife(cov({ weight: 0 }));
      expect(zeroWeight).toBeCloseTo(baseline, 1);
    });

    it('NaN weight falls back to 70kg default', () => {
      const baseline = computeHalfLife(DEFAULT_COVARIATES);
      const nanWeight = computeHalfLife(cov({ weight: NaN }));
      expect(nanWeight).toBeCloseTo(baseline, 1);
    });
  });

  describe('sex', () => {
    it('female has longer half-life than male (0.90 CL multiplier)', () => {
      const male = computeHalfLife(DEFAULT_COVARIATES);
      const female = computeHalfLife(cov({ sex: 'female' }));
      expect(female).toBeGreaterThan(male);
    });
  });

  describe('smoking', () => {
    it('smoker has shorter half-life than non-smoker (1.65 CL multiplier per META-03)', () => {
      const nonSmoker = computeHalfLife(DEFAULT_COVARIATES);
      const smoker = computeHalfLife(cov({ smoking: true }));
      expect(smoker).toBeLessThan(nonSmoker);
    });
  });

  describe('oral contraceptives', () => {
    it('OC user has longer half-life (0.60 CL multiplier)', () => {
      const noOC = computeHalfLife(DEFAULT_COVARIATES);
      const withOC = computeHalfLife(cov({ oralContraceptives: true }));
      expect(withOC).toBeGreaterThan(noOC);
    });
  });

  describe('pregnancy', () => {
    it('trimester 1 has longer half-life than non-pregnant (0.65)', () => {
      const baseline = computeHalfLife(DEFAULT_COVARIATES);
      const t1 = computeHalfLife(cov({ pregnancyTrimester: 'first' }));
      expect(t1).toBeGreaterThan(baseline);
    });

    it('trimester 3 has longest half-life (0.48)', () => {
      const t1 = computeHalfLife(cov({ pregnancyTrimester: 'first' }));
      const t3 = computeHalfLife(cov({ pregnancyTrimester: 'third' }));
      expect(t3).toBeGreaterThan(t1);
    });

    it('pregnant + OC same as pregnant alone (OC forced to 1.0)', () => {
      const pregnantOnly = computeHalfLife(
        cov({ pregnancyTrimester: 'second' }),
      );
      const pregnantWithOC = computeHalfLife(
        cov({ pregnancyTrimester: 'second', oralContraceptives: true }),
      );
      expect(pregnantWithOC).toBeCloseTo(pregnantOnly, 1);
    });
  });

  describe('liver disease', () => {
    it('mild liver disease increases half-life (0.80)', () => {
      const healthy = computeHalfLife(DEFAULT_COVARIATES);
      const mild = computeHalfLife(cov({ liverDisease: 'mild' }));
      expect(mild).toBeGreaterThan(healthy);
    });

    it('moderate liver disease increases more (0.50)', () => {
      const mild = computeHalfLife(cov({ liverDisease: 'mild' }));
      const moderate = computeHalfLife(cov({ liverDisease: 'moderate' }));
      expect(moderate).toBeGreaterThan(mild);
    });
  });

  describe('CYP1A2 genotype', () => {
    it('fast metabolizer has shorter half-life (1.40)', () => {
      const normal = computeHalfLife(cov({ cyp1a2Genotype: 'normal' }));
      const fast = computeHalfLife(cov({ cyp1a2Genotype: 'fast' }));
      expect(fast).toBeLessThan(normal);
    });

    it('slow metabolizer has longer half-life (0.55)', () => {
      const normal = computeHalfLife(cov({ cyp1a2Genotype: 'normal' }));
      const slow = computeHalfLife(cov({ cyp1a2Genotype: 'slow' }));
      expect(slow).toBeGreaterThan(normal);
    });

    it('unknown defaults to normal (1.00)', () => {
      const unknown = computeHalfLife(cov({ cyp1a2Genotype: 'unknown' }));
      const normal = computeHalfLife(cov({ cyp1a2Genotype: 'normal' }));
      expect(unknown).toBeCloseTo(normal, 1);
    });
  });

  describe('CYP1A2 inhibitors', () => {
    it('fluvoxamine dramatically increases half-life (0.15)', () => {
      const baseline = computeHalfLife(DEFAULT_COVARIATES);
      const fluv = computeHalfLife(cov({ cyp1a2Inhibitor: 'fluvoxamine' }));
      expect(fluv).toBeGreaterThan(baseline);
      // 0.15 multiplier means ~6.7x longer half-life
      expect(fluv).toBeGreaterThan(baseline * 3);
    });

    it('ciprofloxacin moderately increases half-life (0.55)', () => {
      const baseline = computeHalfLife(DEFAULT_COVARIATES);
      const cipro = computeHalfLife(cov({ cyp1a2Inhibitor: 'ciprofloxacin' }));
      expect(cipro).toBeGreaterThan(baseline);
    });
  });

  describe('covariate interactions (META-07)', () => {
    it('smoking + CYP1A2 fast genotype produces shorter half-life than either alone', () => {
      const smokingOnly = computeHalfLife(cov({ smoking: true }));
      const fastOnly = computeHalfLife(cov({ cyp1a2Genotype: 'fast' }));
      const combined = computeHalfLife(
        cov({ smoking: true, cyp1a2Genotype: 'fast' }),
      );
      // Combined must be shorter than both individual covariates
      // (multiplicative: 1.65 * 1.40 = 2.31 total CL multiplier)
      expect(combined).toBeLessThan(smokingOnly);
      expect(combined).toBeLessThan(fastOnly);
    });
  });

  describe('clamping', () => {
    it('extreme high covariates clamp to 20h', () => {
      // Stack: slow CYP1A2 + fluvoxamine + pregnancy T3 + liver disease moderate
      const extreme = computeHalfLife(
        cov({
          cyp1a2Genotype: 'slow',
          cyp1a2Inhibitor: 'fluvoxamine',
          pregnancyTrimester: 'third',
          liverDisease: 'moderate',
        }),
      );
      expect(extreme).toBe(20);
    });

    it('extreme low covariates produce short half-life near lower bound', () => {
      // Stack: smoking (1.65) + fast CYP1A2 (1.40) + light weight
      // Combined CL multiplier 2.31x -- pushes half-life well below default
      const extreme = computeHalfLife(
        cov({
          smoking: true,
          cyp1a2Genotype: 'fast',
          weight: 40,
        }),
      );
      expect(extreme).toBeLessThan(3.0);
      expect(extreme).toBeGreaterThanOrEqual(1.5);
    });
  });
});

describe('getEffectiveHalfLife', () => {
  it('returns halfLifeHours in simple mode', () => {
    const settings = makeSettings({ halfLifeHours: 7, metabolismMode: 'simple' });
    expect(getEffectiveHalfLife(settings)).toBe(7);
  });

  it('returns computed half-life in advanced mode', () => {
    const settings = makeSettings({
      metabolismMode: 'advanced',
      covariates: { ...DEFAULT_COVARIATES },
    });
    const computed = computeHalfLife(DEFAULT_COVARIATES);
    expect(getEffectiveHalfLife(settings)).toBeCloseTo(computed, 1);
  });
});
