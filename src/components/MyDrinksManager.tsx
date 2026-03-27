import { useState, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { CustomPresetCard } from './CustomPresetCard';

/**
 * Custom preset management section for the Drinks page.
 *
 * Contains a "My Drinks" header, a creation form (name + mg + Add button),
 * and a list of CustomPresetCard components for existing custom presets.
 *
 * Per D-01: User can create a custom drink preset by entering name and caffeine amount.
 * Per D-02: Validation requires non-empty name (max 40 chars) and caffeine 1-1000 mg.
 * Per D-09: Edit via inline form on each card.
 * Per D-10: Delete with confirm-tap protection on each card.
 *
 * State management follows the same mutual exclusion pattern as DrinkHistory:
 * only one card can be in edit or delete-confirm state at a time.
 */
export function MyDrinksManager() {
  const customPresets = useCaffeineStore((s) => s.customPresets);
  const addCustomPreset = useCaffeineStore((s) => s.addCustomPreset);
  const updateCustomPreset = useCaffeineStore((s) => s.updateCustomPreset);
  const removeCustomPreset = useCaffeineStore((s) => s.removeCustomPreset);

  // Creation form state
  const [newName, setNewName] = useState('');
  const [newMg, setNewMg] = useState('');

  // Card interaction state (mutual exclusion: only one active at a time)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = newName.trim();
      const parsedMg = Number(newMg);
      if (!trimmedName || parsedMg < 1 || parsedMg > 1000 || Number.isNaN(parsedMg)) return;
      addCustomPreset(trimmedName, parsedMg);
      setNewName('');
      setNewMg('');
    },
    [newName, newMg, addCustomPreset],
  );

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id);
    setConfirmingDeleteId(null); // mutual exclusion
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, updates: { name: string; caffeineMg: number }) => {
      updateCustomPreset(id, updates);
      setEditingId(null);
    },
    [updateCustomPreset],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmingDeleteId === id) {
        removeCustomPreset(id);
        setConfirmingDeleteId(null);
      } else {
        setEditingId(null); // mutual exclusion
        setConfirmingDeleteId(id);
        setTimeout(
          () => setConfirmingDeleteId((current) => (current === id ? null : current)),
          3000,
        );
      }
    },
    [confirmingDeleteId, removeCustomPreset],
  );

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        My Drinks
      </h2>

      {/* Creation form */}
      <form onSubmit={handleAdd} className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Drink name"
          maxLength={40}
          required
          className="min-h-[44px] flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={newMg}
          onChange={(e) => setNewMg(e.target.value)}
          placeholder="mg"
          min={1}
          max={1000}
          required
          className="min-h-[44px] w-20 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          Add
        </button>
      </form>

      {/* Custom preset list */}
      {customPresets.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Create your first custom drink above
        </p>
      ) : (
        <div className="space-y-2">
          {customPresets.map((preset) => (
            <CustomPresetCard
              key={preset.id}
              preset={preset}
              isEditing={editingId === preset.id}
              isConfirmingDelete={confirmingDeleteId === preset.id}
              onStartEdit={() => handleStartEdit(preset.id)}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
