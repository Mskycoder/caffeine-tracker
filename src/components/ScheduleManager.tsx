import { useState, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { ScheduleCard } from './ScheduleCard';
import { ScheduleForm } from './ScheduleForm';
import { BottomSheet } from './BottomSheet';
import type { DrinkSchedule } from '../engine/types';

/**
 * Schedule management section for the Drinks page.
 *
 * Renders a "Schedules" card with a list of ScheduleCard components (or empty state),
 * an "Add Schedule" button, and a BottomSheet containing ScheduleForm for create/edit.
 *
 * State management follows the same mutual exclusion pattern as MyDrinksManager:
 * only one card can be in delete-confirm state at a time.
 *
 * Per D-01: Schedules section appears below My Drinks section on the Drinks page.
 * Per D-02: Schedule form opens in the existing BottomSheet modal.
 */
export function ScheduleManager() {
  const schedules = useCaffeineStore((s) => s.schedules);
  const addSchedule = useCaffeineStore((s) => s.addSchedule);
  const updateSchedule = useCaffeineStore((s) => s.updateSchedule);
  const removeSchedule = useCaffeineStore((s) => s.removeSchedule);
  const toggleSchedulePause = useCaffeineStore((s) => s.toggleSchedulePause);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<
    DrinkSchedule | undefined
  >(undefined);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const handleAdd = useCallback(() => {
    setEditingSchedule(undefined);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((schedule: DrinkSchedule) => {
    setEditingSchedule(schedule);
    setConfirmingDeleteId(null);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    (data: Omit<DrinkSchedule, 'id' | 'paused' | 'lastRunDate'>) => {
      if (editingSchedule) {
        updateSchedule(editingSchedule.id, data);
      } else {
        addSchedule(data);
      }
      setSheetOpen(false);
      setEditingSchedule(undefined);
    },
    [editingSchedule, updateSchedule, addSchedule],
  );

  const handleClose = useCallback(() => {
    setSheetOpen(false);
    setEditingSchedule(undefined);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmingDeleteId === id) {
        removeSchedule(id);
        setConfirmingDeleteId(null);
      } else {
        setConfirmingDeleteId(id);
        setTimeout(
          () =>
            setConfirmingDeleteId((current) =>
              current === id ? null : current,
            ),
          3000,
        );
      }
    },
    [confirmingDeleteId, removeSchedule],
  );

  const handleTogglePause = useCallback(
    (id: string) => {
      toggleSchedulePause(id);
    },
    [toggleSchedulePause],
  );

  const sheetTitle = editingSchedule ? 'Edit Schedule' : 'Add Schedule';

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Schedules
      </h2>

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Set up a recurring drink to log it automatically
        </p>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              isConfirmingDelete={confirmingDeleteId === schedule.id}
              onEdit={() => handleEdit(schedule)}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full min-h-[44px] rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 mt-3"
      >
        Add Schedule
      </button>

      <BottomSheet open={sheetOpen} onClose={handleClose} title={sheetTitle}>
        <ScheduleForm
          schedule={editingSchedule}
          onSave={handleSave}
          onClose={handleClose}
        />
      </BottomSheet>
    </section>
  );
}
