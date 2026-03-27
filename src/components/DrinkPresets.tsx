import { useState, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { DRINK_PRESETS } from '../data/presets';

interface DrinkPresetsProps {
  /** Returns the timestamp to use for the logged drink (Date.now() or backdated time). */
  getTimestamp: () => number;
}

/**
 * Two-section preset card list component rendered inside BottomSheet.
 *
 * When custom presets exist, renders "My Drinks" section above "Built-in" section.
 * When no custom presets exist, renders only the built-in presets under a "Drinks" heading.
 *
 * Per D-01: 12 built-in presets as scrollable vertical card list, text-only, no emoji.
 * Per D-03: Tapping a card immediately logs the drink via addDrink.
 * Per D-04: Custom presets appear under "My Drinks" heading above built-in presets.
 * Per D-05: Built-in presets appear under "Built-in" heading when custom presets exist.
 * Per D-09: Brief inline confirmation flash (green highlight + "Logged"), clears after ~1 second.
 * Per Pitfall 2: Ignores taps during confirmation flash to prevent double-logs.
 * Per Pitfall 3: No edit/delete buttons in BottomSheet (management is on DrinksPage only).
 */
export function DrinkPresets({ getTimestamp }: DrinkPresetsProps) {
  const addDrink = useCaffeineStore((s) => s.addDrink);
  const customPresets = useCaffeineStore((s) => s.customPresets);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const logDrink = useCallback(
    (name: string, caffeineMg: number, presetId: string) => {
      if (confirmedId) return; // ignore taps during confirmation (Pitfall 2)
      addDrink({ name, caffeineMg, timestamp: getTimestamp(), presetId });
      setConfirmedId(presetId);
      setTimeout(() => setConfirmedId(null), 1000);
    },
    [addDrink, confirmedId, getTimestamp],
  );

  const hasCustom = customPresets.length > 0;

  return (
    <div className="space-y-4">
      {/* My Drinks section: only when custom presets exist */}
      {hasCustom && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Drinks</h3>
          <div className="space-y-2">
            {customPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => logDrink(preset.name, preset.caffeineMg, preset.id)}
                className={`w-full text-left px-4 py-3 min-h-[44px] rounded-lg border transition-colors duration-300
                  ${
                    confirmedId === preset.id
                      ? 'bg-green-50 border-green-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
              >
                <span className="font-medium">{preset.name}</span>
                <span className="ml-2 text-gray-500">{preset.caffeineMg}mg</span>
                {confirmedId === preset.id && (
                  <span className="float-right text-green-600">Logged</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Built-in section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {hasCustom ? 'Built-in' : 'Drinks'}
        </h3>
        <div className="space-y-2">
          {DRINK_PRESETS.map((preset) => (
            <button
              key={preset.presetId}
              type="button"
              onClick={() => logDrink(preset.name, preset.caffeineMg, preset.presetId)}
              className={`w-full text-left px-4 py-3 min-h-[44px] rounded-lg border transition-colors duration-300
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
      </div>
    </div>
  );
}
