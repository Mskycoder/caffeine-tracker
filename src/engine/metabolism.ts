/**
 * Population pharmacokinetic engine for covariate-based caffeine half-life computation.
 *
 * Model: one-compartment PK with allometric scaling.
 *   t1/2 = ln(2) * Vd / CL
 *
 * Baseline calibrated so a 70kg male with no covariates produces exactly 5.0h half-life,
 * matching the app's established "Average" default.
 *
 * All functions are pure — no side effects, no Date.now().
 */

import type { CovariateSettings, Settings } from './types';

// --- Constants ---

/** Calibrated baseline CL (L/h) so 70kg male = 5.0h half-life. */
const CL_BASE_70KG = Math.LN2 * 0.7 * 70 / 5.0;

/** Volume of distribution per kg (L/kg). */
const VD_PER_KG = 0.7;

/** Allometric exponent for clearance scaling. */
const CL_ALLOMETRIC_EXPONENT = 0.75;

/** Safe half-life bounds (hours). */
const MIN_HALF_LIFE = 1.5;
const MAX_HALF_LIFE = 20;

// --- Clearance multiplier lookup tables ---

const SEX_MULTIPLIERS: Record<CovariateSettings['sex'], number> = {
  male: 1.0,
  female: 0.90,
};

const PREGNANCY_MULTIPLIERS: Record<CovariateSettings['pregnancyTrimester'], number> = {
  none: 1.0,
  first: 0.65,
  second: 0.50,
  third: 0.48,
};

const LIVER_MULTIPLIERS: Record<CovariateSettings['liverDisease'], number> = {
  none: 1.0,
  mild: 0.80,
  moderate: 0.50,
};

const CYP1A2_GENOTYPE_MULTIPLIERS: Record<CovariateSettings['cyp1a2Genotype'], number> = {
  unknown: 1.0,
  fast: 1.40,
  normal: 1.0,
  slow: 0.55,
};

const CYP1A2_INHIBITOR_MULTIPLIERS: Record<CovariateSettings['cyp1a2Inhibitor'], number> = {
  none: 1.0,
  fluvoxamine: 0.15,
  ciprofloxacin: 0.55,
  other_moderate: 0.55,
};

// --- Engine functions ---

/**
 * Compute personalized caffeine half-life from user covariates.
 *
 * Uses the standard PK relationship t1/2 = ln(2) * Vd / CL with:
 * - Allometric CL scaling from 70kg reference weight
 * - Multiplicative covariate clearance adjustments
 * - Pregnancy overrides oral contraceptives (OC forced to 1.0)
 * - Output clamped to [1.5, 20] hours
 *
 * @param covariates - User health/lifestyle factors
 * @returns Half-life in hours, clamped to safe range
 */
export function computeHalfLife(covariates: CovariateSettings): number {
  // Convert weight to kg if needed
  const rawWeightKg =
    covariates.weightUnit === 'lbs'
      ? covariates.weight * 0.453592
      : covariates.weight;

  // Guard: fallback to 70kg for invalid values, clamp to [30, 300] kg
  const safeWeight = Math.max(30, Math.min(300, rawWeightKg || 70));

  // Allometric clearance scaling from 70kg reference
  const clAllometric =
    CL_BASE_70KG * Math.pow(safeWeight / 70, CL_ALLOMETRIC_EXPONENT);

  // Covariate clearance multipliers (all multiplicative)
  const sexMult = SEX_MULTIPLIERS[covariates.sex];
  const smokingMult = covariates.smoking ? 1.65 : 1.0; // META-03: clearance x1.65
  const pregnancyMult = PREGNANCY_MULTIPLIERS[covariates.pregnancyTrimester];

  // Pregnancy forces OC multiplier to 1.0 (mutual exclusion)
  const ocMult =
    covariates.pregnancyTrimester !== 'none'
      ? 1.0
      : covariates.oralContraceptives
        ? 0.60
        : 1.0;

  const liverMult = LIVER_MULTIPLIERS[covariates.liverDisease];
  const genotypeMult = CYP1A2_GENOTYPE_MULTIPLIERS[covariates.cyp1a2Genotype];
  const inhibitorMult = CYP1A2_INHIBITOR_MULTIPLIERS[covariates.cyp1a2Inhibitor];

  // Combined clearance (smoking + CYP1A2 genotype naturally interact multiplicatively per META-07)
  const clAdjusted =
    clAllometric *
    sexMult *
    smokingMult *
    ocMult *
    pregnancyMult *
    liverMult *
    genotypeMult *
    inhibitorMult;

  // Volume of distribution (linear scaling with weight)
  const vd = VD_PER_KG * safeWeight;

  // Half-life from PK relationship
  const halfLife = Math.LN2 * vd / clAdjusted;

  // Clamp to safe range
  return Math.max(MIN_HALF_LIFE, Math.min(MAX_HALF_LIFE, halfLife));
}

/**
 * Get the effective half-life based on metabolism mode.
 *
 * In simple mode, returns the user's manually selected halfLifeHours.
 * In advanced mode, computes half-life from covariates.
 *
 * @param settings - Full user settings
 * @returns Effective half-life in hours
 */
export function getEffectiveHalfLife(settings: Settings): number {
  if (settings.metabolismMode === 'advanced') {
    return computeHalfLife(settings.covariates);
  }
  return settings.halfLifeHours;
}
