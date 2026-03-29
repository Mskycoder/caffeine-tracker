import { getDay, startOfDay, setHours, setMinutes } from 'date-fns';
import type { DrinkSchedule, DrinkEntry } from './types';

/** Day pill labels mapped to JS getDay() indices. Used by both form and display. */
export const DAY_PILLS = [
  { label: 'M', dayIndex: 1 },
  { label: 'T', dayIndex: 2 },
  { label: 'W', dayIndex: 3 },
  { label: 'T', dayIndex: 4 },
  { label: 'F', dayIndex: 5 },
  { label: 'S', dayIndex: 6 },
  { label: 'S', dayIndex: 0 },
] as const;

/** Format date as 'YYYY-MM-DD' for lastRunDate comparison. */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determine which scheduled drinks should be auto-logged right now.
 * Pure function: no side effects, time is passed as argument, no store access.
 *
 * Filters out schedules that are paused, already ran today, not scheduled
 * for today's day-of-week, or whose time hasn't passed yet.
 *
 * Returns drink entries with timestamps set to the scheduled time (not current time)
 * and the ids of all processed schedules for lastRunDate updates.
 */
export function getScheduledDrinksToLog(
  schedules: DrinkSchedule[],
  currentTime: number,
): { drinks: Omit<DrinkEntry, 'id'>[]; processedScheduleIds: string[] } {
  const now = new Date(currentTime);
  const todayStr = formatDateKey(now);
  const todayDow = getDay(now);
  const todayStart = startOfDay(now);

  const drinks: Omit<DrinkEntry, 'id'>[] = [];
  const processedScheduleIds: string[] = [];

  for (const schedule of schedules) {
    if (schedule.paused) continue;
    if (schedule.lastRunDate === todayStr) continue;
    if (!schedule.repeatDays.includes(todayDow)) continue;

    const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
    const scheduledTime = setMinutes(setHours(todayStart, hours), minutes);

    if (scheduledTime.getTime() > currentTime) continue;

    drinks.push({
      name: schedule.name,
      caffeineMg: schedule.caffeineMg,
      startedAt: scheduledTime.getTime(),
      endedAt: scheduledTime.getTime(),
      presetId: schedule.presetId,
    });
    processedScheduleIds.push(schedule.id);
  }

  return { drinks, processedScheduleIds };
}
