import { useState, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { epochToDatetimeLocal, datetimeLocalToEpoch } from '../utils/datetime';
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
 * - Caffeine mg, formatted timestamp, edit button, and delete button on the right
 *
 * Delete uses a confirm-tap pattern: first tap shows "Confirm?", second tap removes.
 * Confirm state auto-resets after 3 seconds. Only one drink can be in confirm state at a time.
 *
 * Per D-09: Compact rows, text-only, no icons or colors.
 * Per D-11: Empty state shows "No drinks logged today" centered in gray.
 *
 * Refreshes automatically every 30 seconds via useCurrentTime hook.
 */
export function DrinkHistory() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const removeDrink = useCaffeineStore((s) => s.removeDrink);
  const updateDrink = useCaffeineStore((s) => s.updateDrink);
  const todaysDrinks = getTodaysDrinks(drinks, now);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimestamp, setEditTimestamp] = useState('');

  const handleDelete = useCallback((id: string) => {
    if (confirmingDeleteId === id) {
      removeDrink(id);
      setConfirmingDeleteId(null);
    } else {
      // Mutual exclusion: clear edit state when entering delete confirm
      setEditingId(null);
      setEditTimestamp('');
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId((current) => current === id ? null : current), 3000);
    }
  }, [confirmingDeleteId, removeDrink]);

  const startEdit = useCallback((drink: DrinkEntry) => {
    setEditingId(drink.id);
    setEditTimestamp(epochToDatetimeLocal(drink.timestamp));
    setConfirmingDeleteId(null); // Mutual exclusion: clear delete confirm
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId && editTimestamp) {
      updateDrink(editingId, { timestamp: datetimeLocalToEpoch(editTimestamp) });
    }
    setEditingId(null);
    setEditTimestamp('');
  }, [editingId, editTimestamp, updateDrink]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTimestamp('');
  }, []);

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
          {todaysDrinks.map((drink) =>
            editingId === drink.id ? (
              <li key={drink.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{drink.name}</span>
                  <span className="text-sm text-gray-500">{drink.caffeineMg} mg</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="datetime-local"
                    value={editTimestamp}
                    onChange={(e) => setEditTimestamp(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={drink.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{drink.name}</span>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{drink.caffeineMg} mg</span>
                    <span>{format(new Date(drink.timestamp), 'h:mm a')}</span>
                    <button
                      type="button"
                      onClick={() => startEdit(drink)}
                      aria-label={`Edit ${drink.name}`}
                      className="text-xs text-gray-400 hover:text-blue-500"
                    >
                      edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(drink.id)}
                      aria-label={`Delete ${drink.name}`}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        confirmingDeleteId === drink.id
                          ? 'bg-red-100 text-red-700 font-medium'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      {confirmingDeleteId === drink.id ? 'Confirm?' : 'x'}
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
