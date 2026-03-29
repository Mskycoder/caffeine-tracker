import { useState, useCallback } from 'react';
import { Timer } from 'lucide-react';
import { DrinkPresets } from './DrinkPresets';
import { CustomDrinkForm } from './CustomDrinkForm';
import { ActiveDrinkSection } from './ActiveDrinkSection';
import { useCaffeineStore } from '../store/caffeine-store';
import { DRINK_PRESETS } from '../data/presets';
import { datetimeLocalToEpoch } from '../utils/datetime';

type TimeChip = 'now' | '+15m' | '+30m' | '+1h' | 'custom';

const TIME_CHIPS: { key: TimeChip; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: '+15m', label: '+15m' },
  { key: '+30m', label: '+30m' },
  { key: '+1h', label: '+1h' },
  { key: 'custom', label: 'Custom' },
];

type DurationChip = 'instant' | '5m' | '15m' | '30m' | '1h';

const DURATION_CHIPS: { key: DurationChip; label: string; minutes: number }[] = [
  { key: 'instant', label: 'Instant', minutes: 0 },
  { key: '5m', label: '5m', minutes: 5 },
  { key: '15m', label: '15m', minutes: 15 },
  { key: '30m', label: '30m', minutes: 30 },
  { key: '1h', label: '1h', minutes: 60 },
];

/**
 * Container wiring presets + custom form + shared time chip picker.
 *
 * Per D-13: Chip row with Now, +15m, +30m, +1h, Custom presets.
 * Per D-14: Custom chip reveals datetime-local input for arbitrary time entry.
 * Per D-15: Outlined chip style (border-based, purple selected state).
 * Per D-16: Tapping already-selected chip deselects it (reverts to Now).
 * Rendered inside BottomSheet (Phase 9, D-01/D-04).
 * The shared time state is owned here and passed to children via getTimestamp prop.
 * Per D-04: Touch targets on chip elements are 44px minimum.
 */
export function DrinkLogger() {
  const [selectedChip, setSelectedChip] = useState<TimeChip>('now');
  const [customTime, setCustomTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<DurationChip>('instant');
  const [startDrinkingMode, setStartDrinkingMode] = useState(false);
  const [startedFlashId, setStartedFlashId] = useState<string | null>(null);
  const startDrink = useCaffeineStore((s) => s.startDrink);

  const handleStartDrinkPreset = useCallback((name: string, caffeineMg: number, presetId: string) => {
    startDrink({ name, caffeineMg, startedAt: Date.now(), presetId });
    setStartedFlashId(presetId);
    setTimeout(() => {
      setStartedFlashId(null);
      setStartDrinkingMode(false);
    }, 1000);
  }, [startDrink]);

  const getTimestamp = useCallback((): number => {
    const now = Date.now();
    switch (selectedChip) {
      case 'now': return now;
      case '+15m': return now + 15 * 60_000;
      case '+30m': return now + 30 * 60_000;
      case '+1h': return now + 60 * 60_000;
      case 'custom': return customTime ? datetimeLocalToEpoch(customTime) : now;
    }
  }, [selectedChip, customTime]);

  const getDurationMinutes = useCallback((): number => {
    return DURATION_CHIPS.find((c) => c.key === selectedDuration)?.minutes ?? 0;
  }, [selectedDuration]);

  const handleChipClick = useCallback((chip: TimeChip) => {
    setSelectedChip((prev) => prev === chip ? 'now' : chip);
  }, []);

  const handleDurationClick = useCallback((chip: DurationChip) => {
    setSelectedDuration((prev) => prev === chip ? 'instant' : chip);
  }, []);

  if (startDrinkingMode) {
    return (
      <>
        <button
          type="button"
          onClick={() => setStartDrinkingMode(false)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          Back to Log
        </button>
        <StartDrinkingPresets onSelect={handleStartDrinkPreset} flashId={startedFlashId} />
      </>
    );
  }

  return (
    <>
      <ActiveDrinkSection />

      {/* Time preset chips (per D-13) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TIME_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => handleChipClick(chip.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
              selectedChip === chip.key
                ? 'border border-purple-600 bg-purple-50 text-purple-600'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {/* Custom datetime input revealed when Custom chip selected (per D-14) */}
      {selectedChip === 'custom' && (
        <input
          type="datetime-local"
          value={customTime}
          onChange={(e) => setCustomTime(e.target.value)}
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded text-sm min-h-[44px] mb-4"
        />
      )}

      {/* Duration chip row (per D-01, D-05) */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-1">Duration</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleDurationClick(chip.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] ${
                selectedDuration === chip.key
                  ? 'border border-purple-600 bg-purple-50 text-purple-600'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset drink cards */}
      <DrinkPresets getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />

      {/* Custom entry form */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Entry</h3>
        <CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />
      </div>

      {/* Start Drinking button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setStartDrinkingMode(true)}
          className="w-full min-h-[44px] rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <Timer size={16} />
          Start Drinking
        </button>
      </div>
    </>
  );
}

/**
 * Start Drinking preset grid with single-tap behavior.
 * Shows same preset sections as DrinkPresets but tapping immediately starts a drink.
 * Shows green "Started" flash for 1 second before auto-closing.
 */
function StartDrinkingPresets({ onSelect, flashId }: {
  onSelect: (name: string, caffeineMg: number, presetId: string) => void;
  flashId: string | null;
}) {
  const customPresets = useCaffeineStore((s) => s.customPresets);
  const hiddenPresetIds = useCaffeineStore((s) => s.settings.hiddenPresetIds ?? []);
  const visiblePresets = DRINK_PRESETS.filter((p) => !hiddenPresetIds.includes(p.presetId));
  const hasCustom = customPresets.length > 0;

  const renderCard = (presetId: string, name: string, caffeineMg: number) => {
    const isFlash = flashId === presetId;
    return (
      <button
        key={presetId}
        type="button"
        onClick={() => !flashId && onSelect(name, caffeineMg, presetId)}
        className={`text-left px-3 py-2 min-h-[44px] rounded-lg border transition-colors duration-300
          ${isFlash
            ? 'bg-green-50 border-green-400'
            : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
      >
        <span className="font-semibold text-sm text-gray-900">{name}</span>
        {isFlash ? (
          <span className="block text-xs text-green-600">Started</span>
        ) : (
          <span className="block text-xs text-gray-500">{caffeineMg}mg</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {hasCustom && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Drinks</h3>
          <div className="grid grid-cols-2 gap-2">
            {customPresets.map((p) => renderCard(p.id, p.name, p.caffeineMg))}
          </div>
        </div>
      )}
      {visiblePresets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {hasCustom ? 'Built-in' : 'Drinks'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {visiblePresets.map((p) => renderCard(p.presetId, p.name, p.caffeineMg))}
          </div>
        </div>
      )}
    </div>
  );
}
