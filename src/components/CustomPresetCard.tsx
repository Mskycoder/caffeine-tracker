import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { CustomPreset } from '../engine/types';

interface CustomPresetCardProps {
  preset: CustomPreset;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: { name: string; caffeineMg: number }) => void;
  onDelete: (id: string) => void;
}

/**
 * Single custom preset card with display and inline edit modes.
 *
 * Display mode: preset name, caffeine mg, pencil edit icon, trash delete icon.
 * Edit mode: inline form replacing card content with name/mg inputs and Save/Cancel.
 * Delete uses confirm-tap pattern: first tap shows "Confirm?", second tap deletes,
 * auto-resets after 3 seconds (managed by parent via isConfirmingDelete prop).
 *
 * Per D-09: edit via inline form on Drinks page.
 * Per D-10: delete with confirm-tap protection on Drinks page.
 */
export function CustomPresetCard({
  preset,
  isEditing,
  isConfirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: CustomPresetCardProps) {
  const [editName, setEditName] = useState(preset.name);
  const [editMg, setEditMg] = useState(String(preset.caffeineMg));

  const handleStartEdit = () => {
    setEditName(preset.name);
    setEditMg(String(preset.caffeineMg));
    onStartEdit();
  };

  const handleSave = () => {
    const trimmedName = editName.trim();
    const parsedMg = Number(editMg);
    if (!trimmedName || parsedMg < 1 || parsedMg > 1000 || Number.isNaN(parsedMg)) return;
    onSaveEdit(preset.id, { name: trimmedName, caffeineMg: parsedMg });
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-blue-300 bg-blue-50 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={40}
            required
            placeholder="Drink name"
            className="min-h-[44px] flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={editMg}
            onChange={(e) => setEditMg(e.target.value)}
            min={1}
            max={1000}
            required
            placeholder="mg"
            className="min-h-[44px] w-20 rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="min-h-[44px] px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{preset.name}</span>
        <span className="text-sm text-gray-500">{preset.caffeineMg} mg</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleStartEdit}
          aria-label={`Edit ${preset.name}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-blue-500"
        >
          <Pencil size={16} />
        </button>
        {isConfirmingDelete ? (
          <button
            type="button"
            onClick={() => onDelete(preset.id)}
            aria-label={`Confirm delete ${preset.name}`}
            className="min-h-[44px] rounded bg-red-100 px-3 py-2 text-sm font-medium text-red-700"
          >
            Confirm?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(preset.id)}
            aria-label={`Delete ${preset.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
