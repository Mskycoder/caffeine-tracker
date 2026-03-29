import { expandDrinkToSubDoses, expandAllDrinks } from './subdose';
import type { DrinkEntry } from './types';

const BASE_TIME = new Date('2025-01-15T08:00:00').getTime();

function makeDrink(overrides: Partial<DrinkEntry> = {}): DrinkEntry {
  return {
    id: 'test-drink',
    name: 'Test Coffee',
    caffeineMg: 95,
    startedAt: BASE_TIME,
    endedAt: BASE_TIME, // instant by default
    presetId: 'drip-coffee',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// expandDrinkToSubDoses
// ---------------------------------------------------------------------------
describe('expandDrinkToSubDoses', () => {
  it('instant drink (startedAt === endedAt): returns [drink] unchanged', () => {
    const drink = makeDrink();
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(drink);
  });

  it('30-min duration drink: returns 6 sub-doses', () => {
    const drink = makeDrink({
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    // 30 min / 5 min = 6 sub-doses
    expect(result).toHaveLength(6);
  });

  it('60-min duration drink: returns 12 sub-doses', () => {
    const drink = makeDrink({
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 60 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    // 60 min / 5 min = 12 sub-doses
    expect(result).toHaveLength(12);
  });

  it('5-min duration drink: returns 2 sub-doses (minimum is 2)', () => {
    const drink = makeDrink({
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 5 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    // Math.max(2, Math.ceil(5 / 5)) = Math.max(2, 1) = 2
    expect(result).toHaveLength(2);
  });

  it('3-min duration (less than interval): returns 2 sub-doses', () => {
    const drink = makeDrink({
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 3 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    // Math.max(2, Math.ceil(3 / 5)) = Math.max(2, 1) = 2
    expect(result).toHaveLength(2);
  });

  it('total mg preserved: sum of sub-dose caffeineMg equals original within tolerance', () => {
    const drink = makeDrink({
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    const totalMg = result.reduce((sum, d) => sum + d.caffeineMg, 0);
    expect(Math.abs(totalMg - 200)).toBeLessThan(1e-10);
  });

  it('preserves parent drink ID on all sub-doses', () => {
    const drink = makeDrink({
      id: 'parent-id-123',
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    for (const subDose of result) {
      expect(subDose.id).toBe('parent-id-123');
    }
  });

  it('preserves parent drink name and presetId on all sub-doses', () => {
    const drink = makeDrink({
      name: 'Cold Brew',
      presetId: 'cold-brew',
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    for (const subDose of result) {
      expect(subDose.name).toBe('Cold Brew');
      expect(subDose.presetId).toBe('cold-brew');
    }
  });

  it('sub-dose startedAt values span [drink.startedAt, drink.endedAt]', () => {
    const drink = makeDrink({
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);

    // First sub-dose at startedAt
    expect(result[0].startedAt).toBe(BASE_TIME);
    // Last sub-dose at endedAt
    expect(result[result.length - 1].startedAt).toBe(BASE_TIME + 30 * 60_000);
    // Each sub-dose is instant (endedAt === startedAt)
    for (const subDose of result) {
      expect(subDose.endedAt).toBe(subDose.startedAt);
    }
  });

  it('active drink (endedAt=undefined): uses currentTime as provisional endedAt', () => {
    const currentTime = BASE_TIME + 20 * 60_000; // 20 minutes after start
    const drink = makeDrink({
      caffeineMg: 100,
      startedAt: BASE_TIME,
      endedAt: undefined,
    });
    const result = expandDrinkToSubDoses(drink, currentTime);

    // 20 min / 5 min = 4, so Math.max(2, 4) = 4 sub-doses
    expect(result).toHaveLength(4);

    // First at startedAt, last at currentTime
    expect(result[0].startedAt).toBe(BASE_TIME);
    expect(result[result.length - 1].startedAt).toBe(currentTime);

    // Total mg preserved
    const totalMg = result.reduce((sum, d) => sum + d.caffeineMg, 0);
    expect(Math.abs(totalMg - 100)).toBeLessThan(1e-10);
  });

  it('active drink where currentTime equals startedAt: returns [drink] unchanged', () => {
    const drink = makeDrink({
      startedAt: BASE_TIME,
      endedAt: undefined,
    });
    // currentTime === startedAt means zero duration
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    expect(result).toHaveLength(1);
    expect(result[0].caffeineMg).toBe(95);
  });

  it('each sub-dose caffeineMg is equal (evenly distributed)', () => {
    const drink = makeDrink({
      caffeineMg: 120,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandDrinkToSubDoses(drink, BASE_TIME);
    const expectedMg = 120 / 6;
    for (const subDose of result) {
      expect(subDose.caffeineMg).toBeCloseTo(expectedMg, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// expandAllDrinks
// ---------------------------------------------------------------------------
describe('expandAllDrinks', () => {
  it('mix of instant and duration drinks: correct flat array', () => {
    const instant = makeDrink({ id: 'instant-1', caffeineMg: 95 });
    const duration = makeDrink({
      id: 'duration-1',
      caffeineMg: 200,
      startedAt: BASE_TIME,
      endedAt: BASE_TIME + 30 * 60_000,
    });
    const result = expandAllDrinks([instant, duration], BASE_TIME);

    // instant: 1 entry, duration: 6 entries = 7 total
    expect(result).toHaveLength(7);

    // First should be the instant drink (unchanged)
    expect(result[0].id).toBe('instant-1');
    expect(result[0].caffeineMg).toBe(95);

    // Remaining 6 should be sub-doses of the duration drink
    const subDoses = result.filter((d) => d.id === 'duration-1');
    expect(subDoses).toHaveLength(6);
    const totalMg = subDoses.reduce((sum, d) => sum + d.caffeineMg, 0);
    expect(Math.abs(totalMg - 200)).toBeLessThan(1e-10);
  });

  it('empty array: returns empty array', () => {
    const result = expandAllDrinks([], BASE_TIME);
    expect(result).toHaveLength(0);
  });
});
