import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Pencil } from 'lucide-react';
import { epochToDatetimeLocal, datetimeLocalToEpoch } from '../utils/datetime';
import type { DrinkEntry } from '../engine/types';

/**
 * Props for the DrinkRow component.
 *
 * DrinkRow is a controlled component -- all interaction state (editing, delete confirmation)
 * is managed by the parent. This enables list-level mutual exclusion (only one row
 * in edit or confirm-delete mode at a time).
 */
export interface DrinkRowProps {
  drink: DrinkEntry;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onStartEdit: (drink: DrinkEntry) => void;
  onSaveEdit: (id: string, timestamp: number) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

/**
 * Reusable drink row with edit/delete/confirm-tap interactions.
 *
 * Renders as an <li> element for use inside a <ul>.
 * - Display mode: name, caffeine mg, formatted time, edit button, delete button
 * - Edit mode: name + mg on top, datetime-local input + Save + Cancel below
 * - Delete confirm: "Confirm?" text with red styling on delete button
 *
 * All interactive elements have min-h-[44px] touch targets for mobile usability.
 */
export function DrinkRow({
  drink,
  isEditing,
  isConfirmingDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: DrinkRowProps) {
  const [editTimestamp, setEditTimestamp] = useState('');

  // Initialize editTimestamp when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditTimestamp(epochToDatetimeLocal(drink.startedAt));
    }
  }, [isEditing, drink.startedAt]);

  if (isEditing) {
    return (
      <li className="py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{drink.name}</span>
          <span className="text-sm text-gray-500">{drink.caffeineMg} mg</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="datetime-local"
            value={editTimestamp}
            onChange={(e) => setEditTimestamp(e.target.value)}
            className="min-h-[44px] text-sm border border-gray-300 rounded px-3 py-2 flex-1"
          />
          <button
            type="button"
            onClick={() => onSaveEdit(drink.id, datetimeLocalToEpoch(editTimestamp))}
            className="min-h-[44px] px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{drink.name}</span>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{drink.caffeineMg} mg</span>
          <span>{format(new Date(drink.startedAt), 'h:mm a')}</span>
          {drink.endedAt !== undefined && drink.endedAt !== drink.startedAt && (
            <span className="text-gray-400 text-sm">
              {'\u00B7'} {Math.round((drink.endedAt - drink.startedAt) / 60000)}m
            </span>
          )}
          <button
            type="button"
            onClick={() => onStartEdit(drink)}
            aria-label={`Edit ${drink.name}`}
            className="min-h-[44px] px-2 py-2 text-sm text-gray-400 hover:text-blue-500 flex items-center"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(drink.id)}
            aria-label={`Delete ${drink.name}`}
            className={`min-h-[44px] px-2 py-2 text-sm rounded transition-colors flex items-center ${
              isConfirmingDelete
                ? 'bg-red-100 text-red-700 font-medium'
                : 'text-gray-400 hover:text-red-500'
            }`}
          >
            {isConfirmingDelete ? 'Confirm?' : <Trash2 size={16} />}
          </button>
        </div>
      </div>
    </li>
  );
}
