import { DEFAULT_KA } from './constants';
import {
  singleDrinkLevel,
  getCaffeineLevel,
  getSleepReadyTime,
  generateCurveData,
  getDrinkContributions,
} from './caffeine';
import type { DrinkEntry } from './types';

const BASE_TIME = 1_700_000_000_000;

function makeDrink(overrides: Partial<DrinkEntry> = {}): DrinkEntry {
  return {
    id: 'test-1',
    name: 'Test Coffee',
    caffeineMg: 95,
    timestamp: BASE_TIME,
    presetId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// singleDrinkLevel
// ---------------------------------------------------------------------------
describe('singleDrinkLevel', () => {
  it('returns 0 for future drinks (elapsed time <= 0)', () => {
    const drink = makeDrink({ timestamp: BASE_TIME + 3_600_000 });
    expect(singleDrinkLevel(drink, BASE_TIME, 5)).toBe(0);
  });

  it('returns 0 at exact time of consumption (t=0)', () => {
    const drink = makeDrink();
    // At t=0 both exponentials equal 1, so e^(-ke*0) - e^(-ka*0) = 0
    expect(singleDrinkLevel(drink, BASE_TIME, 5)).toBe(0);
  });

  it('peaks around 47 minutes with default ka=4.6 and halfLife=5', () => {
    const drink = makeDrink({ caffeineMg: 95 });
    const at30min = singleDrinkLevel(drink, BASE_TIME + 30 * 60_000, 5);
    const at47min = singleDrinkLevel(drink, BASE_TIME + 47 * 60_000, 5);
    const at90min = singleDrinkLevel(drink, BASE_TIME + 90 * 60_000, 5);

    expect(at47min).toBeGreaterThan(at30min);
    expect(at47min).toBeGreaterThan(at90min);
  });

  it('for 95mg dose: peak level is approximately 84mg', () => {
    const drink = makeDrink({ caffeineMg: 95 });
    // Peak is near 47 minutes (0.785 hours)
    const atPeak = singleDrinkLevel(drink, BASE_TIME + 47 * 60_000, 5);
    // Research says ~84.4 mg; allow reasonable tolerance
    expect(atPeak).toBeGreaterThan(80);
    expect(atPeak).toBeLessThan(90);
  });

  it('decays to roughly half of 2hr-level at 7hrs (half-life validation)', () => {
    const drink = makeDrink({ caffeineMg: 100 });
    // Use 2hr as baseline -- absorption is fully complete by then
    const at2hr = singleDrinkLevel(drink, BASE_TIME + 2 * 3_600_000, 5);
    const at7hr = singleDrinkLevel(drink, BASE_TIME + 7 * 3_600_000, 5);
    // 5 hours elapsed from 2hr to 7hr = one half-life
    // Ratio should be very close to 0.5
    const ratio = at7hr / at2hr;
    expect(ratio).toBeCloseTo(0.5, 1);
  });

  it('handles ka=ke degenerate case without NaN', () => {
    const drink = makeDrink({ caffeineMg: 100 });
    // Set ka equal to ke: ke = ln2 / halfLifeHours
    const halfLife = 5;
    const ke = Math.LN2 / halfLife;
    const result = singleDrinkLevel(drink, BASE_TIME + 3_600_000, halfLife, ke);

    expect(result).not.toBeNaN();
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for zero-dose drinks', () => {
    const drink = makeDrink({ caffeineMg: 0 });
    expect(singleDrinkLevel(drink, BASE_TIME + 3_600_000, 5)).toBe(0);
  });

  it('always returns >= 0 (never negative)', () => {
    const drink = makeDrink({ caffeineMg: 1 });
    // Check at many time points
    for (let hours = 0; hours <= 48; hours += 0.5) {
      const level = singleDrinkLevel(drink, BASE_TIME + hours * 3_600_000, 5);
      expect(level).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getCaffeineLevel (superposition)
// ---------------------------------------------------------------------------
describe('getCaffeineLevel', () => {
  it('returns 0 for empty drinks array', () => {
    expect(getCaffeineLevel([], BASE_TIME, 5)).toBe(0);
  });

  it('sum of individual drink levels equals total (additivity)', () => {
    const drink1 = makeDrink({ id: 'd1', timestamp: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', timestamp: BASE_TIME + 3_600_000 });
    const atTime = BASE_TIME + 2 * 3_600_000;

    const level1 = singleDrinkLevel(drink1, atTime, 5);
    const level2 = singleDrinkLevel(drink2, atTime, 5);
    const total = getCaffeineLevel([drink1, drink2], atTime, 5);

    expect(total).toBeCloseTo(level1 + level2, 10);
  });

  it('two drinks at different times produce correct stacked total', () => {
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 95, timestamp: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 150, timestamp: BASE_TIME + 2 * 3_600_000 });
    const queryTime = BASE_TIME + 3 * 3_600_000;

    const total = getCaffeineLevel([drink1, drink2], queryTime, 5);
    // Both drinks contribute, total should be > either alone
    const single1 = singleDrinkLevel(drink1, queryTime, 5);
    const single2 = singleDrinkLevel(drink2, queryTime, 5);

    expect(total).toBeGreaterThan(single1);
    expect(total).toBeGreaterThan(single2);
    expect(total).toBeCloseTo(single1 + single2, 10);
  });

  it('each drink decays independently from its own timestamp', () => {
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 100, timestamp: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 100, timestamp: BASE_TIME + 3_600_000 });

    // At 30 min after drink1: drink1 is absorbing, drink2 hasn't happened yet
    const atTime = BASE_TIME + 30 * 60_000;
    const total = getCaffeineLevel([drink1, drink2], atTime, 5);
    const single1 = singleDrinkLevel(drink1, atTime, 5);
    const single2 = singleDrinkLevel(drink2, atTime, 5);

    expect(single2).toBe(0); // drink2 is in the future
    expect(total).toBeCloseTo(single1, 10);
  });
});

// ---------------------------------------------------------------------------
// getSleepReadyTime
// ---------------------------------------------------------------------------
describe('getSleepReadyTime', () => {
  it('returns null when current level is already below threshold (empty drinks)', () => {
    const result = getSleepReadyTime([], BASE_TIME, 5, 50);
    expect(result).toBeNull();
  });

  it('returns null when current level is below threshold (old drink)', () => {
    // A small drink many hours ago should be well below 50mg
    const drink = makeDrink({ caffeineMg: 50, timestamp: BASE_TIME - 24 * 3_600_000 });
    const result = getSleepReadyTime([drink], BASE_TIME, 5, 50);
    expect(result).toBeNull();
  });

  it('returns a future epoch ms timestamp when caffeine is above threshold', () => {
    const drink = makeDrink({ caffeineMg: 200 });
    // Query at 1 hour after drinking -- well past peak, level is high
    const fromTime = BASE_TIME + 3_600_000;
    const result = getSleepReadyTime([drink], fromTime, 5, 50);

    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(fromTime);
  });

  it('at the returned time, getCaffeineLevel should be <= thresholdMg', () => {
    const drink = makeDrink({ caffeineMg: 200 });
    const fromTime = BASE_TIME + 3_600_000;
    const result = getSleepReadyTime([drink], fromTime, 5, 50);

    expect(result).not.toBeNull();
    const levelAtSleepTime = getCaffeineLevel([drink], result!, 5);
    expect(levelAtSleepTime).toBeLessThanOrEqual(50);
  });

  it('returns maxTime fallback for extremely high doses (>48 hours)', () => {
    // Unrealistically high dose that won't decay below threshold in 48h
    const drink = makeDrink({ caffeineMg: 100_000 });
    const fromTime = BASE_TIME + 60_000;
    const result = getSleepReadyTime([drink], fromTime, 5, 50);

    expect(result).not.toBeNull();
    // Should hit the 48-hour fallback
    const maxTime = fromTime + 48 * 3_600_000;
    expect(result).toBe(maxTime);
  });
});

// ---------------------------------------------------------------------------
// generateCurveData
// ---------------------------------------------------------------------------
describe('generateCurveData', () => {
  it('returns array of CurvePoint objects from startTime to endTime', () => {
    const drink = makeDrink();
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const stepMs = 30 * 60_000; // 30 min steps

    const data = generateCurveData([drink], startTime, endTime, stepMs, 5);

    expect(data.length).toBeGreaterThan(0);
    expect(data[0].time).toBe(startTime);
    expect(data[data.length - 1].time).toBeLessThanOrEqual(endTime);
  });

  it('first point time equals startTime, last point time <= endTime', () => {
    const drink = makeDrink();
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 3_600_000;
    const stepMs = 10 * 60_000;

    const data = generateCurveData([drink], startTime, endTime, stepMs, 5);

    expect(data[0].time).toBe(startTime);
    expect(data[data.length - 1].time).toBeLessThanOrEqual(endTime);
  });

  it('each point mg value matches getCaffeineLevel at that time', () => {
    const drink = makeDrink();
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const stepMs = 30 * 60_000;

    const data = generateCurveData([drink], startTime, endTime, stepMs, 5);

    for (const point of data) {
      const expected = getCaffeineLevel([drink], point.time, 5);
      expect(point.mg).toBeCloseTo(expected, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// getDrinkContributions
// ---------------------------------------------------------------------------
describe('getDrinkContributions', () => {
  it('returns empty object for empty drinks array', () => {
    const result = getDrinkContributions([], BASE_TIME, 5);
    expect(result).toEqual({});
  });

  it('returns object with drink IDs as keys and caffeine contribution as values', () => {
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 95 });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 150, timestamp: BASE_TIME + 3_600_000 });
    const atTime = BASE_TIME + 2 * 3_600_000;

    const contributions = getDrinkContributions([drink1, drink2], atTime, 5);

    expect(contributions).toHaveProperty('d1');
    expect(contributions).toHaveProperty('d2');
    expect(contributions.d1).toBeGreaterThan(0);
    expect(contributions.d2).toBeGreaterThan(0);
  });

  it('sum of all contributions equals getCaffeineLevel total', () => {
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 95 });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 150, timestamp: BASE_TIME + 3_600_000 });
    const atTime = BASE_TIME + 2 * 3_600_000;

    const contributions = getDrinkContributions([drink1, drink2], atTime, 5);
    const total = getCaffeineLevel([drink1, drink2], atTime, 5);
    const sumContribs = Object.values(contributions).reduce((sum, v) => sum + v, 0);

    expect(sumContribs).toBeCloseTo(total, 10);
  });
});
