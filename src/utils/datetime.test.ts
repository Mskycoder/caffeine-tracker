import { epochToDatetimeLocal, datetimeLocalToEpoch } from './datetime';

describe('epochToDatetimeLocal', () => {
  it('produces a string matching yyyy-MM-ddTHH:mm format', () => {
    const result = epochToDatetimeLocal(1711382400000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('uses local timezone (not UTC)', () => {
    // Create a known local date: 2024-01-15 at noon local time
    const localNoon = new Date(2024, 0, 15, 12, 0, 0).getTime();
    const result = epochToDatetimeLocal(localNoon);
    // Should contain 12:00 in local time, not the UTC equivalent
    expect(result).toContain('T12:00');
  });
});

describe('datetimeLocalToEpoch', () => {
  it('converts a datetime-local string to epoch milliseconds', () => {
    const result = datetimeLocalToEpoch('2024-03-25T14:30');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

describe('round-trip', () => {
  it('epochToDatetimeLocal then datetimeLocalToEpoch returns same minute', () => {
    const original = Date.now();
    const formatted = epochToDatetimeLocal(original);
    const roundTripped = datetimeLocalToEpoch(formatted);
    // Should be within 60 seconds (datetime-local drops seconds)
    expect(Math.abs(roundTripped - original)).toBeLessThan(60000);
  });

  it('round-trips a specific timestamp within 60000ms', () => {
    const ts = 1711382400000;
    const formatted = epochToDatetimeLocal(ts);
    const roundTripped = datetimeLocalToEpoch(formatted);
    expect(Math.abs(roundTripped - ts)).toBeLessThan(60000);
  });
});
