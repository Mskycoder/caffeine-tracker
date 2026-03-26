import { useCaffeineStore } from '../store/caffeine-store';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { format, startOfDay } from 'date-fns';
import type { DrinkEntry } from '../engine/types';

/**
 * Filter drinks to today only and sort oldest-first.
 *
 * Pure function: takes drinks array and current epoch ms, returns filtered/sorted array.
 * - Per D-12: uses startOfDay to filter by calendar day (only today, not yesterday)
 * - Per D-10: sorts oldest-first (morning to evening timeline)
 */
function getTodaysDrinks(drinks: DrinkEntry[], now: number): DrinkEntry[] {
  const todayStart = startOfDay(new Date(now)).getTime();
  return drinks
    .filter((d) => d.timestamp >= todayStart)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Today's drinks list component.
 *
 * Displays all drinks logged today in a compact list with:
 * - Drink name on the left
 * - Caffeine mg and formatted timestamp on the right
 *
 * Per D-09: Compact rows, text-only, no icons or colors.
 * Per D-11: Empty state shows "No drinks logged today" centered in gray.
 *
 * Refreshes automatically every 30 seconds via useCurrentTime hook.
 */
export function DrinkHistory() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const todaysDrinks = getTodaysDrinks(drinks, now);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Today's Drinks
      </h2>
      {todaysDrinks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No drinks logged today
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {todaysDrinks.map((drink) => (
            <li key={drink.id} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-900">{drink.name}</span>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{drink.caffeineMg} mg</span>
                <span>{format(new Date(drink.timestamp), 'h:mm a')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
