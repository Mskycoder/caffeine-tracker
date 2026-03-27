import { describe, it, expect } from 'vitest';
import { getScheduledDrinksToLog, formatDateKey } from './schedule';
import type { DrinkSchedule } from './types';

// Friday, March 27, 2026 at 10:00 AM local time
const FRIDAY_10AM = new Date('2026-03-27T10:00:00').getTime();

function makeSchedule(overrides: Partial<DrinkSchedule> = {}): DrinkSchedule {
  return {
    id: 'sched-1',
    presetId: 'drip-coffee',
    name: 'Drip Coffee',
    caffeineMg: 95,
    timeOfDay: '09:00',
    repeatDays: [5], // Friday only (getDay() = 5)
    paused: false,
    lastRunDate: null,
    ...overrides,
  };
}

describe('formatDateKey', () => {
  it('returns YYYY-MM-DD format for a given Date', () => {
    const date = new Date('2026-03-27T10:00:00');
    expect(formatDateKey(date)).toBe('2026-03-27');
  });

  it('zero-pads single-digit month and day', () => {
    const date = new Date('2026-01-05T08:00:00');
    expect(formatDateKey(date)).toBe('2026-01-05');
  });
});

describe('getScheduledDrinksToLog', () => {
  it('returns a drink for a schedule matching today when scheduled time has passed', () => {
    const schedule = makeSchedule({ timeOfDay: '09:00', repeatDays: [5] });
    const { drinks, processedScheduleIds } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks).toHaveLength(1);
    expect(processedScheduleIds).toContain('sched-1');
  });

  it('skips paused schedules', () => {
    const schedule = makeSchedule({ paused: true });
    const { drinks } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks).toHaveLength(0);
  });

  it('skips schedules already ran today (lastRunDate === today string)', () => {
    const schedule = makeSchedule({ lastRunDate: '2026-03-27' });
    const { drinks } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks).toHaveLength(0);
  });

  it('skips schedules on wrong day-of-week', () => {
    const schedule = makeSchedule({ repeatDays: [1, 2, 3] }); // Mon/Tue/Wed only
    const { drinks } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks).toHaveLength(0);
  });

  it('skips schedules whose time has not yet passed today', () => {
    const schedule = makeSchedule({ timeOfDay: '14:00' }); // 2 PM, but it's 10 AM
    const { drinks } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks).toHaveLength(0);
  });

  it('returns multiple drinks for multiple matching schedules', () => {
    const schedule1 = makeSchedule({ id: 'sched-1', timeOfDay: '07:00' });
    const schedule2 = makeSchedule({
      id: 'sched-2',
      presetId: 'espresso',
      name: 'Espresso',
      caffeineMg: 63,
      timeOfDay: '09:30',
    });
    const { drinks, processedScheduleIds } = getScheduledDrinksToLog(
      [schedule1, schedule2],
      FRIDAY_10AM,
    );
    expect(drinks).toHaveLength(2);
    expect(processedScheduleIds).toEqual(['sched-1', 'sched-2']);
  });

  it('returns empty arrays when no schedules match', () => {
    const schedule = makeSchedule({ paused: true });
    const { drinks, processedScheduleIds } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks).toEqual([]);
    expect(processedScheduleIds).toEqual([]);
  });

  it('returned drink entries have correct timestamp (scheduled time today, not current time)', () => {
    const schedule = makeSchedule({ timeOfDay: '09:00' });
    const { drinks } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    // Should be 09:00 today, not 10:00
    const expected = new Date('2026-03-27T09:00:00').getTime();
    expect(drinks[0].timestamp).toBe(expected);
  });

  it('returned drink entries have correct name, caffeineMg, presetId from schedule', () => {
    const schedule = makeSchedule({
      name: 'Morning Latte',
      caffeineMg: 150,
      presetId: 'custom-abc',
    });
    const { drinks } = getScheduledDrinksToLog([schedule], FRIDAY_10AM);
    expect(drinks[0].name).toBe('Morning Latte');
    expect(drinks[0].caffeineMg).toBe(150);
    expect(drinks[0].presetId).toBe('custom-abc');
  });

  it('processedScheduleIds contains ids of all schedules that were processed', () => {
    const schedule1 = makeSchedule({ id: 'a', timeOfDay: '08:00' });
    const schedule2 = makeSchedule({ id: 'b', timeOfDay: '09:30' });
    const schedule3 = makeSchedule({ id: 'c', paused: true }); // skipped
    const { processedScheduleIds } = getScheduledDrinksToLog(
      [schedule1, schedule2, schedule3],
      FRIDAY_10AM,
    );
    expect(processedScheduleIds).toEqual(['a', 'b']);
    expect(processedScheduleIds).not.toContain('c');
  });
});
