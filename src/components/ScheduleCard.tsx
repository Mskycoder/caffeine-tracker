import { Pencil, Trash2 } from 'lucide-react';
import { DAY_PILLS } from '../engine/schedule';
import type { DrinkSchedule } from '../engine/types';

interface ScheduleCardProps {
  schedule: DrinkSchedule;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onTogglePause: (id: string) => void;
}

/**
 * Single schedule display card with pause toggle, edit, and delete actions.
 *
 * Row 1: drink name + caffeine mg + time + pause toggle + edit/delete icons.
 * Row 2: 7 small day indicators showing which days are active.
 *
 * When paused, text dims to gray-400 and a "Paused" label appears.
 * Delete uses confirm-tap pattern (parent manages confirmingDeleteId state).
 *
 * Per UI-SPEC: matches CustomPresetCard card styling and interaction patterns.
 */
export function ScheduleCard({
  schedule,
  isConfirmingDelete,
  onEdit,
  onDelete,
  onTogglePause,
}: ScheduleCardProps) {
  const isPaused = schedule.paused;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      {/* Row 1: info + actions */}
      <div className="flex items-center justify-between">
        {/* Left: drink name + mg + paused indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${isPaused ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {schedule.name}
          </span>
          <span
            className={`text-sm ${isPaused ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {schedule.caffeineMg} mg
          </span>
          {isPaused && (
            <span className="text-xs text-gray-400 italic">Paused</span>
          )}
        </div>

        {/* Right: time + toggle + edit + delete */}
        <div className="flex items-center gap-1">
          <span
            className={`text-sm ${isPaused ? 'text-gray-400' : 'text-gray-700'}`}
          >
            {schedule.timeOfDay}
          </span>

          {/* Pause toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!schedule.paused}
              onChange={() => onTogglePause(schedule.id)}
              className="sr-only peer"
              aria-label={`Pause ${schedule.name}`}
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${schedule.paused ? 'bg-gray-200' : 'bg-purple-600'}`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${schedule.paused ? '' : 'translate-x-5'}`}
              />
            </div>
          </label>

          {/* Edit */}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${schedule.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-blue-500"
          >
            <Pencil size={16} />
          </button>

          {/* Delete / confirm-tap */}
          {isConfirmingDelete ? (
            <button
              type="button"
              onClick={() => onDelete(schedule.id)}
              aria-label={`Confirm delete ${schedule.name}`}
              className="min-h-[44px] rounded bg-red-100 px-3 py-2 text-sm font-medium text-red-700"
            >
              Confirm?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(schedule.id)}
              aria-label={`Delete ${schedule.name}`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: day indicators */}
      <div className="mt-1 flex gap-1">
        {DAY_PILLS.map((pill) => {
          const isActive = schedule.repeatDays.includes(pill.dayIndex);
          return (
            <span
              key={pill.dayIndex}
              className={
                isActive
                  ? 'text-xs font-medium text-purple-600'
                  : 'text-xs text-gray-300'
              }
            >
              {pill.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
