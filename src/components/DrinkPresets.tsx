import { useState, useCallback, useRef, useEffect } from 'react';
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
 * Per Phase 11 D-01/D-06: Two-tap select-then-confirm flow. First tap selects
 * (purple highlight + "Confirm" label), second tap logs. Auto-reverts after 3 seconds.
 * Per D-04: Custom presets appear under "My Drinks" heading above built-in presets.
 * Per D-05: Built-in presets appear under "Built-in" heading when custom presets exist.
 * Per D-07/D-08: Brief inline confirmation flash (green highlight + "Logged"), clears after ~1 second.
 * Post-log flash blocks all taps to prevent double-logs.
 * Per Pitfall 3: No edit/delete buttons in BottomSheet (management is on DrinksPage only).
 */
export function DrinkPresets({ getTimestamp }: DrinkPresetsProps) {
  const addDrink = useCaffeineStore((s) => s.addDrink);
  const customPresets = useCaffeineStore((s) => s.customPresets);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup selection timer on unmount (Pitfall 2: BottomSheet close)
  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    };
  }, []);

  const handleCardTap = useCallback(
    (name: string, caffeineMg: number, presetId: string) => {
      if (confirmedId) return; // block during post-log flash (D-08)

      if (selectedId === presetId) {
        // Second tap on same card = confirm and log (D-06, D-07)
        if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
        addDrink({ name, caffeineMg, timestamp: getTimestamp(), presetId });
        setSelectedId(null);
        setConfirmedId(presetId);
        setTimeout(() => setConfirmedId(null), 1000);
      } else {
        // First tap = select, or swap selection to new card (D-01, D-03, D-04)
        if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
        setSelectedId(presetId);
        selectionTimerRef.current = setTimeout(() => {
          setSelectedId((current) => (current === presetId ? null : current));
        }, 3000);
      }
    },
    [addDrink, confirmedId, selectedId, getTimestamp],
  );

  const renderPresetCard = (presetId: string, name: string, caffeineMg: number) => {
    const isSelected = selectedId === presetId;
    const isConfirmed = confirmedId === presetId;

    return (
      <button
        key={presetId}
        type="button"
        onClick={() => handleCardTap(name, caffeineMg, presetId)}
        className={`text-left px-3 py-2 min-h-[44px] rounded-lg border transition-colors duration-300
          ${isConfirmed
            ? 'bg-green-50 border-green-400'
            : isSelected
              ? 'bg-purple-50 border-purple-600'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
      >
        <span className="font-semibold text-sm text-gray-900">{name}</span>
        {isConfirmed ? (
          <span className="block text-xs text-green-600">Logged</span>
        ) : isSelected ? (
          <span className="block text-xs font-semibold text-purple-600">Confirm</span>
        ) : (
          <span className="block text-xs text-gray-500">{caffeineMg}mg</span>
        )}
      </button>
    );
  };

  const hasCustom = customPresets.length > 0;

  return (
    <div className="space-y-4">
      {/* My Drinks section: only when custom presets exist */}
      {hasCustom && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Drinks</h3>
          <div className="grid grid-cols-2 gap-2">
            {customPresets.map((preset) => renderPresetCard(preset.id, preset.name, preset.caffeineMg))}
          </div>
        </div>
      )}

      {/* Built-in section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {hasCustom ? 'Built-in' : 'Drinks'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DRINK_PRESETS.map((preset) => renderPresetCard(preset.presetId, preset.name, preset.caffeineMg))}
        </div>
      </div>
    </div>
  );
}
