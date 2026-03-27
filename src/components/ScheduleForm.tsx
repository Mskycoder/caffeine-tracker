import { useState } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { DRINK_PRESETS } from '../data/presets';
import { DAY_PILLS } from '../engine/schedule';
import type { DrinkSchedule } from '../engine/types';

interface ScheduleFormProps {
  schedule?: DrinkSchedule;
  onSave: (data: Omit<DrinkSchedule, 'id' | 'paused' | 'lastRunDate'>) => void;
  onClose: () => void;
}

/**
 * Schedule create/edit form for BottomSheet.
 *
 * Renders a preset dropdown (native select with optgroup for My Drinks + Built-in),
 * a native time picker, and 7 day toggle pills using DAY_PILLS mapping.
 * Hidden presets appear in a separate "Hidden" optgroup (Phase 15).
 *
 * In create mode, initializes with the first available preset and no days selected.
 * In edit mode, pre-populates from the provided schedule prop.
 *
 * Controlled component: calls onSave callback (no store mutation here).
 */
export function ScheduleForm({ schedule, onSave, onClose }: ScheduleFormProps) {
  const customPresets = useCaffeineStore((s) => s.customPresets);
  const hiddenPresetIds = useCaffeineStore((s) => s.settings.hiddenPresetIds ?? []);

  const isEdit = !!schedule;

  // Determine default preset: first custom preset if any, otherwise first built-in
  const defaultPresetId =
    customPresets.length > 0
      ? customPresets[0].id
      : DRINK_PRESETS[0].presetId;

  const [selectedPresetId, setSelectedPresetId] = useState(
    schedule?.presetId ?? defaultPresetId,
  );
  const [timeOfDay, setTimeOfDay] = useState(schedule?.timeOfDay ?? '09:00');
  const [repeatDays, setRepeatDays] = useState<number[]>(
    schedule?.repeatDays ?? [],
  );

  const toggleDay = (dayIndex: number) => {
    setRepeatDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repeatDays.length === 0) return;

    // Look up preset to get name and caffeineMg
    const customMatch = customPresets.find((p) => p.id === selectedPresetId);
    const builtInMatch = DRINK_PRESETS.find(
      (p) => p.presetId === selectedPresetId,
    );

    const name = customMatch?.name ?? builtInMatch?.name ?? 'Unknown';
    const caffeineMg =
      customMatch?.caffeineMg ?? builtInMatch?.caffeineMg ?? 0;

    onSave({
      presetId: selectedPresetId,
      name,
      caffeineMg,
      timeOfDay,
      repeatDays,
    });
    onClose();
  };

  const isDisabled = repeatDays.length === 0;

  const visibleBuiltIns = DRINK_PRESETS.filter((p) => !hiddenPresetIds.includes(p.presetId));
  const hiddenBuiltIns = DRINK_PRESETS.filter((p) => hiddenPresetIds.includes(p.presetId));
  const hasCustom = customPresets.length > 0;
  const hasHidden = hiddenBuiltIns.length > 0;
  const needsOptgroups = hasCustom || hasHidden;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preset dropdown */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">Drink</label>
        <select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px] bg-white"
        >
          {hasCustom && (
            <optgroup label="My Drinks">
              {customPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.caffeineMg} mg)
                </option>
              ))}
            </optgroup>
          )}
          {needsOptgroups ? (
            visibleBuiltIns.length > 0 && (
              <optgroup label="Built-in">
                {visibleBuiltIns.map((preset) => (
                  <option key={preset.presetId} value={preset.presetId}>
                    {preset.name} ({preset.caffeineMg} mg)
                  </option>
                ))}
              </optgroup>
            )
          ) : (
            visibleBuiltIns.map((preset) => (
              <option key={preset.presetId} value={preset.presetId}>
                {preset.name} ({preset.caffeineMg} mg)
              </option>
            ))
          )}
          {hasHidden && (
            <optgroup label="Hidden">
              {hiddenBuiltIns.map((preset) => (
                <option key={preset.presetId} value={preset.presetId}>
                  {preset.name} ({preset.caffeineMg} mg)
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Time picker */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">Time</label>
        <input
          type="time"
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value.slice(0, 5))}
          className="block w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px]"
        />
      </div>

      {/* Day pills */}
      <div>
        <p className="text-sm text-gray-700 mb-1">Repeat</p>
        <div className="flex gap-2">
          {DAY_PILLS.map((pill) => {
            const isActive = repeatDays.includes(pill.dayIndex);
            return (
              <button
                key={pill.dayIndex}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleDay(pill.dayIndex)}
                className={
                  isActive
                    ? 'min-h-[44px] min-w-[44px] rounded-full border border-purple-600 bg-purple-600 text-sm font-medium text-white'
                    : 'min-h-[44px] min-w-[44px] rounded-full border border-gray-200 bg-gray-100 text-sm font-medium text-gray-500'
                }
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className={`w-full min-h-[44px] rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700${
          isDisabled ? ' opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isEdit ? 'Save Changes' : 'Save Schedule'}
      </button>
    </form>
  );
}
