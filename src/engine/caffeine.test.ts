import {
  singleDrinkLevel,
  getCaffeineLevel,
  getSleepReadyTime,
  parseNextBedtime,
  getCaffeineCurfew,
  generateStackedCurveData,
  getDailyTotal,
} from './caffeine';
import { startOfDay } from 'date-fns';
import { DEFAULT_KA } from './constants';
import type { DrinkEntry } from './types';

const BASE_TIME = 1_700_000_000_000;

function makeDrink(overrides: Partial<DrinkEntry> = {}): DrinkEntry {
  return {
    id: 'test-1',
    name: 'Test Coffee',
    caffeineMg: 95,
    startedAt: BASE_TIME,
    endedAt: BASE_TIME,
    presetId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// singleDrinkLevel
// ---------------------------------------------------------------------------
describe('singleDrinkLevel', () => {
  it('returns 0 for future drinks (elapsed time <= 0)', () => {
    const drink = makeDrink({ startedAt: BASE_TIME + 3_600_000, endedAt: BASE_TIME + 3_600_000 });
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
    const drink1 = makeDrink({ id: 'd1', startedAt: BASE_TIME, endedAt: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', startedAt: BASE_TIME + 3_600_000, endedAt: BASE_TIME + 3_600_000 });
    const atTime = BASE_TIME + 2 * 3_600_000;

    const level1 = singleDrinkLevel(drink1, atTime, 5);
    const level2 = singleDrinkLevel(drink2, atTime, 5);
    const total = getCaffeineLevel([drink1, drink2], atTime, 5);

    expect(total).toBeCloseTo(level1 + level2, 10);
  });

  it('two drinks at different times produce correct stacked total', () => {
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 150, startedAt: BASE_TIME + 2 * 3_600_000, endedAt: BASE_TIME + 2 * 3_600_000 });
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
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 100, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 100, startedAt: BASE_TIME + 3_600_000, endedAt: BASE_TIME + 3_600_000 });

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
    const drink = makeDrink({ caffeineMg: 50, startedAt: BASE_TIME - 24 * 3_600_000, endedAt: BASE_TIME - 24 * 3_600_000 });
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
// parseNextBedtime
// ---------------------------------------------------------------------------
describe('parseNextBedtime', () => {
  it('"22:00" when now is noon returns same-day 10pm', () => {
    // Set now to noon on a known date
    const noon = new Date(BASE_TIME);
    noon.setHours(12, 0, 0, 0);
    const nowMs = noon.getTime();

    const result = parseNextBedtime('22:00', nowMs);

    const expected = new Date(nowMs);
    expected.setHours(22, 0, 0, 0);
    expect(result).toBe(expected.getTime());
  });

  it('"22:00" when now is 11pm returns next-day 10pm', () => {
    const late = new Date(BASE_TIME);
    late.setHours(23, 0, 0, 0);
    const nowMs = late.getTime();

    const result = parseNextBedtime('22:00', nowMs);

    // Should be tomorrow at 10pm
    const expected = new Date(nowMs);
    expected.setHours(22, 0, 0, 0);
    const tomorrowExpected = expected.getTime() + 24 * 60 * 60 * 1000;
    expect(result).toBe(tomorrowExpected);
  });

  it('"00:00" when now is afternoon returns tonight midnight (next day 00:00)', () => {
    const afternoon = new Date(BASE_TIME);
    afternoon.setHours(14, 0, 0, 0);
    const nowMs = afternoon.getTime();

    const result = parseNextBedtime('00:00', nowMs);

    // Midnight "00:00" same day would be in the past (midnight was 14 hours ago)
    // So it should roll to tomorrow's midnight
    const midnight = new Date(nowMs);
    midnight.setHours(0, 0, 0, 0);
    const tomorrowMidnight = midnight.getTime() + 24 * 60 * 60 * 1000;
    expect(result).toBe(tomorrowMidnight);
  });

  it('always returns a time in the future', () => {
    const now = BASE_TIME;
    const result = parseNextBedtime('12:00', now);
    expect(result).toBeGreaterThan(now);
  });
});

// ---------------------------------------------------------------------------
// getCaffeineCurfew
// ---------------------------------------------------------------------------
describe('getCaffeineCurfew', () => {
  it('empty drinks array with bedtime 10 hours away returns ok with valid curfew time', () => {
    const now = BASE_TIME;
    const bedtime = now + 10 * 3_600_000; // 10 hours from now

    const result = getCaffeineCurfew([], bedtime, now, 5, 50);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.time).toBeGreaterThanOrEqual(now);
      expect(result.time).toBeLessThanOrEqual(bedtime);
    }
  });

  it('massive existing caffeine returns budget_exceeded', () => {
    const now = BASE_TIME + 3_600_000; // 1 hour after the drink
    const bedtime = now + 10 * 3_600_000;
    const hugeDrink = makeDrink({ caffeineMg: 10_000, startedAt: BASE_TIME, endedAt: BASE_TIME });

    const result = getCaffeineCurfew([hugeDrink], bedtime, now, 5, 50);

    expect(result.status).toBe('budget_exceeded');
  });

  it('at the returned curfew time, a 95mg drink contribution + existing at bedtime <= threshold', () => {
    const drink = makeDrink({ caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const now = BASE_TIME + 2 * 3_600_000; // 2 hours later
    const bedtime = now + 10 * 3_600_000;

    const result = getCaffeineCurfew([drink], bedtime, now, 5, 50);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    // Verify: existing + new drink at curfew time should be <= threshold at bedtime
    const existingAtBedtime = getCaffeineLevel([drink], bedtime, 5);
    const fakeDrink = makeDrink({
      id: 'verify',
      caffeineMg: 95,
      startedAt: result.time, endedAt: result.time,
    });
    const newContribution = singleDrinkLevel(fakeDrink, bedtime, 5);
    expect(existingAtBedtime + newContribution).toBeLessThanOrEqual(50 + 0.1); // small epsilon for step granularity
  });

  it('bedtime very soon (5 minutes from now) with moderate existing caffeine returns budget_exceeded', () => {
    const drink = makeDrink({ caffeineMg: 200, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const now = BASE_TIME + 3_600_000; // 1 hour later, caffeine is high
    const bedtime = now + 5 * 60_000; // 5 minutes from now

    const result = getCaffeineCurfew([drink], bedtime, now, 5, 50);

    // 200mg drink 1 hour ago: caffeine at bedtime (5 min later) is still very high
    // Existing caffeine at bedtime >> 50mg, so budget is exhausted
    expect(result.status).toBe('budget_exceeded');
  });

  it('standard scenario: 95mg drink 2 hours ago, bedtime in 10 hours, threshold 50mg', () => {
    const drink = makeDrink({ caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const now = BASE_TIME + 2 * 3_600_000;
    const bedtime = now + 10 * 3_600_000;

    const result = getCaffeineCurfew([drink], bedtime, now, 5, 50);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    // Should be several hours from now (the existing drink is small, lots of budget)
    expect(result.time).toBeGreaterThan(now + 3_600_000); // at least 1 hour from now
  });

  it('returns budget_exceeded when existing caffeine at bedtime exceeds threshold', () => {
    // If bedtime is close and existing caffeine is moderate, there may be no valid time from now
    const drink = makeDrink({ caffeineMg: 300, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const now = BASE_TIME + 3_600_000;
    // Bedtime just 2 hours away with 300mg drink absorbed
    const bedtime = now + 2 * 3_600_000;

    const result = getCaffeineCurfew([drink], bedtime, now, 5, 50);

    // With 300mg still highly active and bedtime in 2 hours,
    // existing caffeine at bedtime should already be above 50mg
    // So budget is 0 or negative -> budget_exceeded
    expect(result.status).toBe('budget_exceeded');
  });

  it('returns curfew_passed when bedtime is close but existing caffeine is zero', () => {
    // No drinks, but bedtime is only 1 hour away -- a 95mg drink now
    // can't decay below 50mg in 1 hour, even though current caffeine is 0.
    // The scan finds a valid curfew ~4h50m before bedtime, which is in the past.
    const now = BASE_TIME;
    const bedtime = now + 1 * 3_600_000; // 1 hour from now

    const result = getCaffeineCurfew([], bedtime, now, 5, 50);

    expect(result.status).toBe('curfew_passed');
    if (result.status === 'curfew_passed') {
      // The curfew time should be before now (already passed)
      expect(result.time).toBeLessThan(now);
      // And roughly 4h50m before bedtime
      const hoursBeforeBedtime = (bedtime - result.time) / 3_600_000;
      expect(hoursBeforeBedtime).toBeGreaterThan(4.5);
      expect(hoursBeforeBedtime).toBeLessThan(5.5);
    }
  });

  it('distinguishes budget_exceeded from curfew_passed correctly', () => {
    // budget_exceeded: high existing caffeine, long time to bedtime
    const hugeDrink = makeDrink({ caffeineMg: 5000, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const now = BASE_TIME + 3_600_000;
    const bedtime = now + 10 * 3_600_000;

    const budgetResult = getCaffeineCurfew([hugeDrink], bedtime, now, 5, 50);
    expect(budgetResult.status).toBe('budget_exceeded');

    // curfew_passed: zero caffeine, short time to bedtime
    const curfewPassedResult = getCaffeineCurfew([], bedtime - 9.5 * 3_600_000, now, 5, 50);
    // bedtime 0.5hr away with zero drinks -- curfew was hours ago
    expect(curfewPassedResult.status).toBe('curfew_passed');
    if (curfewPassedResult.status === 'curfew_passed') {
      expect(curfewPassedResult.time).toBeLessThan(now);
    }
  });

  it('returns curfew_passed with time for after-midnight bedtime in late evening', () => {
    // Key scenario: it's 10:30 PM and bedtime is 3 AM (4.5 hours away).
    // Curfew should have been ~10:10 PM -- 20 minutes ago.
    const now = new Date(2026, 2, 26, 22, 30, 0, 0).getTime();
    const bedtime = new Date(2026, 2, 27, 3, 0, 0, 0).getTime();

    const result = getCaffeineCurfew([], bedtime, now, 5, 50);

    expect(result.status).toBe('curfew_passed');
    if (result.status === 'curfew_passed') {
      // Curfew time should be around 10:10 PM (before now)
      expect(result.time).toBeLessThan(now);
      expect(result.time).toBeGreaterThan(now - 3_600_000); // within 1 hour ago
    }
  });

  it('returns ok for after-midnight bedtime when checked during the day', () => {
    // It's 2 PM and bedtime is 3 AM (13 hours away) -- plenty of time
    const now = new Date(2026, 2, 26, 14, 0, 0, 0).getTime();
    const bedtime = new Date(2026, 2, 27, 3, 0, 0, 0).getTime();

    const result = getCaffeineCurfew([], bedtime, now, 5, 50);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      // Curfew should be around 10:10 PM tonight
      const curfewHour = new Date(result.time).getHours();
      expect(curfewHour).toBeGreaterThanOrEqual(21);
      expect(curfewHour).toBeLessThanOrEqual(23);
    }
  });
});

// ---------------------------------------------------------------------------
// generateStackedCurveData
// ---------------------------------------------------------------------------
describe('generateStackedCurveData', () => {
  const stepMs = 5 * 60_000; // 5-minute steps

  it('with empty drinks returns points where total=0 and no drink keys', () => {
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 3_600_000;
    const data = generateStackedCurveData([], startTime, endTime, stepMs, 5);

    expect(data.length).toBeGreaterThan(0);
    for (const point of data) {
      expect(point.total).toBe(0);
      // Only 'time' and 'total' keys should exist
      expect(Object.keys(point)).toEqual(['time', 'total']);
    }
  });

  it('with one drink returns points with drink.id key matching singleDrinkLevel values', () => {
    const drink = makeDrink({ id: 'drink-a', caffeineMg: 95 });
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    // Check a point well past absorption (1 hour after drink)
    const oneHourPoint = data.find((p) => p.time === BASE_TIME + 3_600_000);
    expect(oneHourPoint).toBeDefined();
    const expectedLevel = singleDrinkLevel(drink, BASE_TIME + 3_600_000, 5);
    expect(oneHourPoint!['drink-a']).toBeCloseTo(expectedLevel, 10);
    expect(oneHourPoint!.total).toBeCloseTo(expectedLevel, 10);
  });

  it('with two drinks: each point drink keys sum to point.total', () => {
    const drink1 = makeDrink({ id: 'd1', caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const drink2 = makeDrink({ id: 'd2', caffeineMg: 150, startedAt: BASE_TIME + 30 * 60_000, endedAt: BASE_TIME + 30 * 60_000 });
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 3 * 3_600_000;
    const data = generateStackedCurveData([drink1, drink2], startTime, endTime, stepMs, 5);

    for (const point of data) {
      let drinkSum = 0;
      for (const key of Object.keys(point)) {
        if (key !== 'time' && key !== 'total') {
          drinkSum += point[key];
        }
      }
      expect(drinkSum).toBeCloseTo(point.total, 10);
    }
  });

  it('omits drink keys from points before drink.timestamp (drink not yet consumed)', () => {
    // Drink consumed 1 hour after start
    const drink = makeDrink({ id: 'late-drink', caffeineMg: 95, startedAt: BASE_TIME + 3_600_000, endedAt: BASE_TIME + 3_600_000 });
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 3 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    // Points before drink timestamp should not have the drink key
    const earlyPoints = data.filter((p) => p.time < BASE_TIME + 3_600_000);
    expect(earlyPoints.length).toBeGreaterThan(0);
    for (const point of earlyPoints) {
      expect(point).not.toHaveProperty('late-drink');
    }
  });

  it('omits drink keys below NEGLIGIBLE_MG threshold', () => {
    // Tiny dose many hours ago -- should be negligible
    const drink = makeDrink({ id: 'tiny', caffeineMg: 0.001, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const startTime = BASE_TIME + 48 * 3_600_000; // 48 hours later
    const endTime = startTime + 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    for (const point of data) {
      expect(point).not.toHaveProperty('tiny');
      expect(point.total).toBe(0);
    }
  });

  it('first point time equals startTime, last point time <= endTime', () => {
    const drink = makeDrink();
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    expect(data[0].time).toBe(startTime);
    expect(data[data.length - 1].time).toBeLessThanOrEqual(endTime);
  });
});

// ---------------------------------------------------------------------------
// getDailyTotal
// ---------------------------------------------------------------------------
describe('getDailyTotal', () => {
  it('with no drinks returns 0', () => {
    expect(getDailyTotal([], BASE_TIME)).toBe(0);
  });

  it('sums only drinks with timestamp >= startOfDay(now)', () => {
    const todayStart = startOfDay(new Date(BASE_TIME)).getTime();
    const todayDrink1 = makeDrink({ id: 'd1', caffeineMg: 95, startedAt: todayStart + 3_600_000, endedAt: todayStart + 3_600_000 });
    const todayDrink2 = makeDrink({ id: 'd2', caffeineMg: 150, startedAt: todayStart + 5 * 3_600_000, endedAt: todayStart + 5 * 3_600_000 });
    const yesterdayDrink = makeDrink({ id: 'old', caffeineMg: 200, startedAt: todayStart - 3_600_000, endedAt: todayStart - 3_600_000 });

    const total = getDailyTotal([todayDrink1, todayDrink2, yesterdayDrink], BASE_TIME);
    expect(total).toBe(95 + 150);
  });

  it('excludes drinks from yesterday', () => {
    const todayStart = startOfDay(new Date(BASE_TIME)).getTime();
    const yesterdayDrink = makeDrink({ caffeineMg: 200, startedAt: todayStart - 1, endedAt: todayStart - 1 }); // 1ms before today
    expect(getDailyTotal([yesterdayDrink], BASE_TIME)).toBe(0);
  });

  it('includes drinks from earlier today regardless of how many hours ago', () => {
    const todayStart = startOfDay(new Date(BASE_TIME)).getTime();
    // Drink at the very start of today
    const earlyDrink = makeDrink({ caffeineMg: 100, startedAt: todayStart, endedAt: todayStart });
    // Query at end of day (23:59)
    const lateNow = todayStart + 23 * 3_600_000 + 59 * 60_000;
    expect(getDailyTotal([earlyDrink], lateNow)).toBe(100);
  });

  it('includes a drink logged exactly at startOfDay boundary', () => {
    const todayStart = startOfDay(new Date(BASE_TIME)).getTime();
    const boundaryDrink = makeDrink({ caffeineMg: 50, startedAt: todayStart, endedAt: todayStart });
    expect(getDailyTotal([boundaryDrink], BASE_TIME)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// getCaffeineLevel with duration drinks (sub-dose integration)
// ---------------------------------------------------------------------------
describe('getCaffeineLevel with duration drinks', () => {
  it('30-min duration drink returns a lower peak than same drink as instant', () => {
    const instantDrink = makeDrink({ caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const durationDrink = makeDrink({
      caffeineMg: 95,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });

    // At 20 minutes after start: instant has single bolus absorbing, duration has partial sub-doses
    const atTime = BASE_TIME + 20 * 60_000;
    const instantLevel = getCaffeineLevel([instantDrink], atTime, 5);
    const durationLevel = getCaffeineLevel([durationDrink], atTime, 5);

    // Duration drink should produce LOWER level because absorption is spread out
    expect(durationLevel).toBeLessThan(instantLevel);
    expect(durationLevel).toBeGreaterThan(0);
  });

  it('instant drink returns same result as before integration (regression check)', () => {
    const drink = makeDrink({ caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const atTime = BASE_TIME + 3_600_000; // 1 hour after

    const level = getCaffeineLevel([drink], atTime, 5);
    const expected = singleDrinkLevel(drink, atTime, 5);

    expect(level).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// getSleepReadyTime with duration drinks
// ---------------------------------------------------------------------------
describe('getSleepReadyTime with duration drinks', () => {
  it('30-min duration drink returns a later sleep-ready time than same drink as instant', () => {
    const instantDrink = makeDrink({ caffeineMg: 200, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const durationDrink = makeDrink({
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });

    const fromTime = BASE_TIME + 3_600_000; // 1 hour after start
    const instantReady = getSleepReadyTime([instantDrink], fromTime, 5, 50);
    const durationReady = getSleepReadyTime([durationDrink], fromTime, 5, 50);

    expect(instantReady).not.toBeNull();
    expect(durationReady).not.toBeNull();
    // Duration drink's last sub-dose is absorbed later, so sleep-ready is later
    expect(durationReady!).toBeGreaterThan(instantReady!);
  });

  it('instant drinks return same result as before (regression)', () => {
    const drink = makeDrink({ caffeineMg: 200, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const fromTime = BASE_TIME + 3_600_000;
    const result = getSleepReadyTime([drink], fromTime, 5, 50);

    expect(result).not.toBeNull();
    // At the returned time, caffeine should be <= threshold
    const levelAtReady = getCaffeineLevel([drink], result!, 5);
    expect(levelAtReady).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// getCaffeineCurfew with duration drinks
// ---------------------------------------------------------------------------
describe('getCaffeineCurfew with duration drinks', () => {
  it('existing duration drinks affect the budget correctly', () => {
    // A duration drink vs instant drink should produce different existingAtBedtime levels
    const instantDrink = makeDrink({ caffeineMg: 95, startedAt: BASE_TIME, endedAt: BASE_TIME });
    const durationDrink = makeDrink({
      caffeineMg: 95,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });

    const now = BASE_TIME + 2 * 3_600_000; // 2 hours later
    const bedtime = now + 10 * 3_600_000;

    const instantResult = getCaffeineCurfew([instantDrink], bedtime, now, 5, 50);
    const durationResult = getCaffeineCurfew([durationDrink], bedtime, now, 5, 50);

    // Both should be ok (95mg with 10h to bedtime is plenty of time)
    expect(instantResult.status).toBe('ok');
    expect(durationResult.status).toBe('ok');

    // Duration drink absorbs later, so slightly more caffeine at bedtime
    // This means a slightly earlier curfew for duration
    if (instantResult.status === 'ok' && durationResult.status === 'ok') {
      expect(durationResult.time).toBeLessThanOrEqual(instantResult.time);
    }
  });
});

// ---------------------------------------------------------------------------
// generateStackedCurveData with duration drinks
// ---------------------------------------------------------------------------
describe('generateStackedCurveData with duration drinks', () => {
  const stepMs = 5 * 60_000;

  it('30-min duration drink shows gradual ramp: level at 15min < level at 35min', () => {
    const drink = makeDrink({
      id: 'duration-drink',
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });

    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    // At 15 min: only ~half the sub-doses have started absorbing
    const at15 = data.find((p) => p.time === BASE_TIME + 15 * 60_000);
    // At 35 min: all sub-doses have started, more have absorbed
    const at35 = data.find((p) => p.time === BASE_TIME + 35 * 60_000);

    expect(at15).toBeDefined();
    expect(at35).toBeDefined();

    // Contribution at 15min should be less than at 35min (gradual ramp)
    const level15 = at15!['duration-drink'] as number ?? 0;
    const level35 = at35!['duration-drink'] as number ?? 0;
    expect(level15).toBeGreaterThan(0);
    expect(level35).toBeGreaterThan(level15);
  });

  it('instant drink returns same curve as before (regression)', () => {
    const drink = makeDrink({ id: 'instant-drink', caffeineMg: 95 });
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    // 1 hour point should match singleDrinkLevel
    const oneHourPoint = data.find((p) => p.time === BASE_TIME + 3_600_000);
    expect(oneHourPoint).toBeDefined();
    const expected = singleDrinkLevel(drink, BASE_TIME + 3_600_000, 5);
    expect(oneHourPoint!['instant-drink']).toBeCloseTo(expected, 10);
  });

  it('sub-doses share parent ID so they render as one layer', () => {
    const drink = makeDrink({
      id: 'shared-id',
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });

    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    // At 1 hour: all sub-doses should be accumulated under 'shared-id'
    const oneHourPoint = data.find((p) => p.time === BASE_TIME + 3_600_000);
    expect(oneHourPoint).toBeDefined();
    expect(oneHourPoint!['shared-id']).toBeDefined();
    expect(oneHourPoint!['shared-id']).toBeCloseTo(oneHourPoint!.total, 10);

    // No other drink keys should exist
    const keys = Object.keys(oneHourPoint!).filter((k) => k !== 'time' && k !== 'total');
    expect(keys).toEqual(['shared-id']);
  });
});

// ---------------------------------------------------------------------------
// generateStackedCurveData with active drinks
// ---------------------------------------------------------------------------
describe('generateStackedCurveData with active drinks', () => {
  const stepMs = 5 * 60_000;

  it('active drink (endedAt=undefined) shows gradual ramp when currentTime is passed', () => {
    const drink = makeDrink({
      id: 'active-drink',
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: undefined,
    });

    const currentTime = BASE_TIME + 30 * 60_000; // 30 min into drinking
    const startTime = BASE_TIME - 12 * 3_600_000; // 12h before (chart window)
    const endTime = BASE_TIME + 24 * 3_600_000;
    const data = generateStackedCurveData(
      [drink], startTime, endTime, stepMs, 5, DEFAULT_KA, currentTime
    );

    // Compare against an instant drink to verify gradual ramp vs instant spike
    const instantDrink = makeDrink({
      id: 'active-drink',
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME, // instant
    });
    const instantData = generateStackedCurveData(
      [instantDrink], startTime, endTime, stepMs, 5, DEFAULT_KA, currentTime
    );

    // At 15 min into drinking: partial sub-doses absorbed
    const at15 = data.find((p) => p.time === BASE_TIME + 15 * 60_000);
    const instantAt15 = instantData.find((p) => p.time === BASE_TIME + 15 * 60_000);

    expect(at15).toBeDefined();
    expect(instantAt15).toBeDefined();

    const level15 = (at15!['active-drink'] as number) ?? 0;
    const instantLevel15 = (instantAt15!['active-drink'] as number) ?? 0;

    // Gradual ramp: active drink at 15min should have LESS caffeine than instant
    // because only ~half the sub-doses have been released
    expect(level15).toBeGreaterThan(0);
    expect(level15).toBeLessThan(instantLevel15);
  });

  it('without currentTime param, falls back to endTime (backward compatible)', () => {
    const drink = makeDrink({ id: 'compat-drink', caffeineMg: 95 });
    const startTime = BASE_TIME;
    const endTime = BASE_TIME + 2 * 3_600_000;
    const data = generateStackedCurveData([drink], startTime, endTime, stepMs, 5);

    const oneHourPoint = data.find((p) => p.time === BASE_TIME + 3_600_000);
    expect(oneHourPoint).toBeDefined();
    expect(oneHourPoint!['compat-drink']).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getCaffeineCurfew with durationMinutes parameter
// ---------------------------------------------------------------------------
describe('getCaffeineCurfew with durationMinutes parameter', () => {
  it('durationMinutes=0 matches default behavior', () => {
    const now = BASE_TIME;
    const bedtime = now + 10 * 3_600_000;

    const defaultResult = getCaffeineCurfew([], bedtime, now, 5, 50, 95);
    const explicitZero = getCaffeineCurfew([], bedtime, now, 5, 50, 95, 0);

    expect(defaultResult.status).toBe(explicitZero.status);
    if (defaultResult.status === 'ok' && explicitZero.status === 'ok') {
      expect(defaultResult.time).toBe(explicitZero.time);
    }
  });

  it('durationMinutes=30 produces earlier curfew than instant', () => {
    const now = BASE_TIME;
    const bedtime = now + 10 * 3_600_000;

    const instantResult = getCaffeineCurfew([], bedtime, now, 5, 50, 95, 0);
    const durationResult = getCaffeineCurfew([], bedtime, now, 5, 50, 95, 30);

    expect(instantResult.status).toBe('ok');
    expect(durationResult.status).toBe('ok');
    if (instantResult.status === 'ok' && durationResult.status === 'ok') {
      // Duration drink pushes more caffeine toward bedtime, so curfew is earlier
      expect(durationResult.time).toBeLessThan(instantResult.time);
    }
  });

  it('durationMinutes=60 produces earlier curfew than durationMinutes=30', () => {
    const now = BASE_TIME;
    const bedtime = now + 10 * 3_600_000;

    const dur30Result = getCaffeineCurfew([], bedtime, now, 5, 50, 95, 30);
    const dur60Result = getCaffeineCurfew([], bedtime, now, 5, 50, 95, 60);

    expect(dur30Result.status).toBe('ok');
    expect(dur60Result.status).toBe('ok');
    if (dur30Result.status === 'ok' && dur60Result.status === 'ok') {
      // Longer duration = even earlier curfew
      expect(dur60Result.time).toBeLessThan(dur30Result.time);
    }
  });

  it('existing call sites without durationMinutes still work', () => {
    const now = BASE_TIME;
    const bedtime = now + 10 * 3_600_000;

    // Call with just 6 positional args (no durationMinutes or ka)
    const result = getCaffeineCurfew([], bedtime, now, 5, 50, 95);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.time).toBeGreaterThan(now);
      expect(result.time).toBeLessThanOrEqual(bedtime);
    }
  });
});

// ---------------------------------------------------------------------------
// getDailyTotal unchanged by sub-dose expansion
// ---------------------------------------------------------------------------
describe('getDailyTotal unchanged', () => {
  it('sums raw caffeineMg regardless of startedAt/endedAt difference', () => {
    const todayStart = startOfDay(new Date(BASE_TIME)).getTime();
    const instantDrink = makeDrink({
      id: 'd1',
      caffeineMg: 95,
      startedAt: todayStart + 3_600_000,
      endedAt: todayStart + 3_600_000,
    });
    const durationDrink = makeDrink({
      id: 'd2',
      caffeineMg: 200,
      startedAt: todayStart + 5 * 3_600_000,
      endedAt: todayStart + 5 * 3_600_000 + 30 * 60_000,
    });

    const total = getDailyTotal([instantDrink, durationDrink], BASE_TIME);
    expect(total).toBe(95 + 200);
  });
});
