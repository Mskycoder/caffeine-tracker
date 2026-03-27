import { useState, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { DrinkRow } from './DrinkRow';
import { startOfDay } from 'date-fns';
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
 * Displays all drinks logged today in a compact list using DrinkRow for each entry.
 *
 * Delete uses a confirm-tap pattern: first tap shows "Confirm?", second tap removes.
 * Confirm state auto-resets after 3 seconds. Only one drink can be in confirm state at a time.
 * Edit and delete are mutually exclusive (only one row active at a time).
 *
 * Per D-09: Compact rows with lucide-react icon buttons (Pencil/Trash2).
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

  const handleDelete = useCallback((id: string) => {
    if (confirmingDeleteId === id) {
      removeDrink(id);
      setConfirmingDeleteId(null);
    } else {
      // Mutual exclusion: clear edit state when entering delete confirm
      setEditingId(null);
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId((current) => current === id ? null : current), 3000);
    }
  }, [confirmingDeleteId, removeDrink]);

  const startEdit = useCallback((drink: DrinkEntry) => {
    setEditingId(drink.id);
    setConfirmingDeleteId(null); // Mutual exclusion: clear delete confirm
  }, []);

  const saveEdit = useCallback((id: string, timestamp: number) => {
    updateDrink(id, { timestamp });
    setEditingId(null);
  }, [updateDrink]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
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
          {todaysDrinks.map((drink) => (
            <DrinkRow
              key={drink.id}
              drink={drink}
              isEditing={editingId === drink.id}
              isConfirmingDelete={confirmingDeleteId === drink.id}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
