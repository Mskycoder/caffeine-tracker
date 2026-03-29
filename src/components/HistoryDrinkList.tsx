import { useState, useMemo, useCallback } from 'react';
import { startOfDay, subDays, format, isSameDay } from 'date-fns';
import { DrinkRow } from './DrinkRow';
import { useCaffeineStore } from '../store/caffeine-store';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { dailyTotalColor } from '../data/colors';
import { FDA_DAILY_LIMIT_MG } from '../engine/constants';
import type { DrinkEntry } from '../engine/types';

/**
 * Filter options for the history drink list.
 * Default is 'last7' per D-07.
 */
type HistoryFilter = 'last7' | 'last30' | 'all';
const DEFAULT_FILTER: HistoryFilter = 'last7';

/** A group of drinks for a single calendar day. */
interface DrinkDateGroup {
  date: Date;           // startOfDay for the group
  drinks: DrinkEntry[]; // sorted oldest-first within day
  totalMg: number;      // sum of caffeineMg for the day
}

/** Filter chip definitions in display order. */
const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
];

/**
 * Filter drinks by time range.
 *
 * Uses startOfDay for timezone-safe day boundaries (per Pitfall 1).
 * - 'last7': drinks from 6 days ago through today (today counts as day 1)
 * - 'last30': drinks from 29 days ago through today (today counts as day 1)
 * - 'all': all drinks
 */
function getFilteredDrinks(drinks: DrinkEntry[], filter: HistoryFilter, now: number): DrinkEntry[] {
  if (filter === 'all') return drinks;

  const today = startOfDay(new Date(now));

  switch (filter) {
    case 'last7': {
      const cutoff = startOfDay(subDays(today, 6)).getTime();
      return drinks.filter((d) => d.startedAt >= cutoff);
    }
    case 'last30': {
      const cutoff = startOfDay(subDays(today, 29)).getTime();
      return drinks.filter((d) => d.startedAt >= cutoff);
    }
  }
}

/**
 * Group drinks by calendar day.
 *
 * Returns groups sorted newest-day-first. Within each group, drinks are
 * sorted oldest-first (morning to evening) per D-10.
 */
function groupDrinksByDate(drinks: DrinkEntry[]): DrinkDateGroup[] {
  const groupMap = new Map<number, DrinkEntry[]>();

  for (const drink of drinks) {
    const dayKey = startOfDay(new Date(drink.startedAt)).getTime();
    const existing = groupMap.get(dayKey);
    if (existing) {
      existing.push(drink);
    } else {
      groupMap.set(dayKey, [drink]);
    }
  }

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => b - a) // newest day first
    .map(([dayKey, dayDrinks]) => {
      dayDrinks.sort((a, b) => a.startedAt - b.startedAt); // oldest first within day
      return {
        date: new Date(dayKey),
        drinks: dayDrinks,
        totalMg: dayDrinks.reduce((sum, d) => sum + d.caffeineMg, 0),
      };
    });
}

/**
 * Format a date for section headers, relative to a reference time.
 *
 * Uses "Today" and "Yesterday" for recent days; otherwise "EEEE, MMMM d"
 * (e.g., "Wednesday, March 25").
 *
 * Accepts `now` to avoid relying on Date.now() -- this ensures correct
 * behavior in tests where useCurrentTime is mocked.
 */
function formatDateHeader(date: Date, now: number): string {
  const today = new Date(now);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, subDays(startOfDay(today), 1))) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

/**
 * Generate the empty state message for the selected filter.
 */
function filterEmptyMessage(filter: HistoryFilter): string {
  switch (filter) {
    case 'last7': return 'in the last 7 days';
    case 'last30': return 'in the last 30 days';
    case 'all': return 'logged yet';
  }
}

/**
 * Date-grouped drink list with filter chips.
 *
 * Shows a horizontal row of quick-filter chips (Last 7 Days, Last 30 Days,
 * All Time) with "Last 7 Days" selected by default (per D-07).
 *
 * Drinks are grouped by date with section headers showing the formatted date
 * and a color-coded daily caffeine total. Edit and delete interactions use
 * list-level mutual exclusion (only one row in edit or confirm-delete at a time
 * across all date groups, per Pitfall 5).
 */
export function HistoryDrinkList() {
  const drinks = useCaffeineStore((s) => s.drinks);
  const removeDrink = useCaffeineStore((s) => s.removeDrink);
  const updateDrink = useCaffeineStore((s) => s.updateDrink);
  const now = useCurrentTime();

  // Filter selection -- local state, resets on navigation per D-08
  const [selectedFilter, setSelectedFilter] = useState<HistoryFilter>(DEFAULT_FILTER);

  // List-level mutual exclusion for edit/delete (per Pitfall 5)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Memoize filtered + grouped result (per Pitfall 2)
  const groups = useMemo(
    () => groupDrinksByDate(getFilteredDrinks(drinks, selectedFilter, now)),
    [drinks, selectedFilter, now],
  );

  const handleDelete = useCallback((id: string) => {
    if (confirmingDeleteId === id) {
      removeDrink(id);
      setConfirmingDeleteId(null);
    } else {
      setEditingId(null);
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId((current) => current === id ? null : current), 3000);
    }
  }, [confirmingDeleteId, removeDrink]);

  const handleStartEdit = useCallback((drink: DrinkEntry) => {
    setEditingId(drink.id);
    setConfirmingDeleteId(null);
  }, []);

  const handleSaveEdit = useCallback((id: string, timestamp: number) => {
    updateDrink(id, { startedAt: timestamp });
    setEditingId(null);
  }, [updateDrink]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <section>
      {/* Filter chips row */}
      <div className="flex gap-2 pb-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setSelectedFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedFilter === f.key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped drink list or empty state */}
      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No drinks {filterEmptyMessage(selectedFilter)}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.date.getTime()} className="mb-6">
            {/* Section header: date + daily total */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">
                {formatDateHeader(group.date, now)}
              </h3>
              <span
                className="text-sm font-semibold"
                style={{ color: dailyTotalColor(group.totalMg, FDA_DAILY_LIMIT_MG) }}
              >
                {group.totalMg}mg
              </span>
            </div>
            {/* Drink rows */}
            <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm px-4">
              {group.drinks.map((drink) => (
                <DrinkRow
                  key={drink.id}
                  drink={drink}
                  isEditing={editingId === drink.id}
                  isConfirmingDelete={confirmingDeleteId === drink.id}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
