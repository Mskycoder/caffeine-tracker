/** Absorption rate constant (h^-1). Produces tmax ~47 min with 5hr half-life.
 *  Derived from clinical tmax consensus of 30-60 min. See 01-RESEARCH.md. */
export const DEFAULT_KA = 4.6;

/** Caffeine bioavailability (fraction). Essentially complete absorption. */
export const BIOAVAILABILITY = 0.99;

/** Maximum projection window in hours for sleep-ready calculation. */
export const MAX_PROJECTION_HOURS = 48;

/** Step size in ms for sleep-ready forward scan (5 minutes). */
export const PROJECTION_STEP_MS = 5 * 60_000;

/** Minimum caffeine contribution (mg) to consider from a single drink. */
export const NEGLIGIBLE_MG = 0.01;

/** FDA recommended daily caffeine limit (mg). */
export const FDA_DAILY_LIMIT_MG = 400;

/** Auto-finish active drinks after 2 hours of no interaction. */
export const AUTO_FINISH_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/** Sub-dose interval matching chart step (PROJECTION_STEP_MS). Nyquist rate for chart rendering -- finer granularity wastes computation. */
export const SUB_DOSE_INTERVAL_MS = 5 * 60_000;
