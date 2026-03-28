import { useState } from 'react';
import { MyDrinksManager } from '../components/MyDrinksManager';
import { BuiltInPresetsManager } from '../components/BuiltInPresetsManager';
import { ScheduleManager } from '../components/ScheduleManager';
import { CoffeeCalculator } from '../components/CoffeeCalculator';
import { BottomSheet } from '../components/BottomSheet';
import { FlaskConical } from 'lucide-react';
import type { CustomPreset } from '../engine/types';

/**
 * Drinks page with custom preset management, coffee calculator,
 * built-in preset visibility, and schedule management.
 *
 * Renders four cards in a vertical stack:
 * - MyDrinksManager (create/edit/delete custom presets)
 * - Coffee Calculator entry (opens calculator BottomSheet)
 * - BuiltInPresetsManager (toggle visibility of built-in presets)
 * - ScheduleManager (create/edit/delete/pause recurring drink schedules)
 *
 * Calculator presets in My Drinks show FlaskConical icon; tapping it
 * re-opens the calculator BottomSheet with saved parameters pre-filled.
 */
export function DrinksPage() {
  const [calcSheetOpen, setCalcSheetOpen] = useState(false);
  const [editingCalcPreset, setEditingCalcPreset] = useState<
    CustomPreset | undefined
  >(undefined);

  const handleOpenCalculator = () => {
    setEditingCalcPreset(undefined);
    setCalcSheetOpen(true);
  };

  const handleCalculatorEdit = (preset: CustomPreset) => {
    setEditingCalcPreset(preset);
    setCalcSheetOpen(true);
  };

  const handleCalcSave = () => {
    setCalcSheetOpen(false);
    setEditingCalcPreset(undefined);
  };

  const handleCalcClose = () => {
    setCalcSheetOpen(false);
    setEditingCalcPreset(undefined);
  };

  return (
    <div className="space-y-4">
      <MyDrinksManager onCalculatorEdit={handleCalculatorEdit} />

      {/* Coffee Calculator entry section per D-01 */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-xs font-normal text-gray-500 uppercase tracking-wide mb-3">
          Coffee Calculator
        </h2>
        <button
          type="button"
          onClick={handleOpenCalculator}
          className="w-full min-h-[44px] rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 flex items-center justify-center gap-2"
        >
          <FlaskConical size={16} />
          Coffee Calculator
        </button>
      </section>

      <BuiltInPresetsManager />
      <ScheduleManager />

      {/* Calculator BottomSheet */}
      <BottomSheet
        open={calcSheetOpen}
        onClose={handleCalcClose}
        title={editingCalcPreset ? 'Edit Coffee Preset' : 'Coffee Calculator'}
      >
        <CoffeeCalculator
          preset={editingCalcPreset}
          onSave={handleCalcSave}
        />
      </BottomSheet>
    </div>
  );
}
