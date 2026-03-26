import { useState, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { DRINK_PRESETS, type DrinkPreset } from '../data/presets';

interface DrinkPresetsProps {
  /** Returns the timestamp to use for the logged drink (Date.now() or backdated time). */
  getTimestamp: () => number;
}

/**
 * Preset card list component.
 *
 * Per D-01: 12 presets as scrollable vertical card list, text-only, no emoji.
 * Per D-03: Tapping a card immediately logs the drink via addDrink.
 * Per D-09: Brief inline confirmation flash (green highlight + "Logged"), clears after ~1 second.
 * Per Pitfall 2: Ignores taps during confirmation flash to prevent double-logs.
 */
export function DrinkPresets({ getTimestamp }: DrinkPresetsProps) {
  const addDrink = useCaffeineStore((s) => s.addDrink);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const handleTap = useCallback(
    (preset: DrinkPreset) => {
      if (confirmedId) return; // ignore taps during confirmation (Pitfall 2)
      addDrink({
        name: preset.name,
        caffeineMg: preset.caffeineMg,
        timestamp: getTimestamp(),
        presetId: preset.presetId,
      });
      setConfirmedId(preset.presetId);
      setTimeout(() => setConfirmedId(null), 1000);
    },
    [addDrink, confirmedId, getTimestamp],
  );

  return (
    <div className="space-y-2">
      {DRINK_PRESETS.map((preset) => (
        <button
          key={preset.presetId}
          type="button"
          onClick={() => handleTap(preset)}
          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors duration-300
            ${
              confirmedId === preset.presetId
                ? 'bg-green-50 border-green-400'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
        >
          <span className="font-medium">{preset.name}</span>
          <span className="ml-2 text-gray-500">{preset.caffeineMg}mg</span>
          {confirmedId === preset.presetId && (
            <span className="float-right text-green-600">Logged</span>
          )}
        </button>
      ))}
    </div>
  );
}
