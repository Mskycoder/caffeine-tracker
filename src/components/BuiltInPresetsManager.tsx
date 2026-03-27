import { useCaffeineStore } from '../store/caffeine-store';
import { DRINK_PRESETS } from '../data/presets';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Built-in preset visibility management section for the Drinks page.
 *
 * Displays all 12 built-in presets with eye/eye-off toggle icons.
 * Toggling a preset adds/removes its presetId from hiddenPresetIds in settings.
 * Hidden presets are dimmed (text-gray-400) while visible presets show normal styling.
 *
 * Per D-01: Section card on Drinks page between MyDrinksManager and ScheduleManager.
 * Per D-02: Each row shows preset name, caffeine mg, and eye toggle button.
 * Per D-03: Hidden presets show dimmed text styling.
 * Per D-06: Single tap toggles visibility (instantly reversible, no confirmation needed).
 */
export function BuiltInPresetsManager() {
  const hiddenPresetIds = useCaffeineStore((s) => s.settings.hiddenPresetIds ?? []);
  const updateSettings = useCaffeineStore((s) => s.updateSettings);

  const toggleVisibility = (presetId: string) => {
    const isHidden = hiddenPresetIds.includes(presetId);
    updateSettings({
      hiddenPresetIds: isHidden
        ? hiddenPresetIds.filter((id) => id !== presetId)
        : [...hiddenPresetIds, presetId],
    });
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Built-in Presets
      </h2>
      <div className="divide-y divide-gray-100">
        {DRINK_PRESETS.map((preset) => {
          const isHidden = hiddenPresetIds.includes(preset.presetId);
          return (
            <div
              key={preset.presetId}
              className="flex items-center justify-between py-2 min-h-[44px]"
            >
              <span
                className={`text-sm ${isHidden ? 'text-gray-400' : 'text-gray-900'}`}
              >
                {preset.name}
              </span>
              <span
                className={`text-sm ${isHidden ? 'text-gray-400' : 'text-gray-500'} flex-1 text-right mr-2`}
              >
                {preset.caffeineMg} mg
              </span>
              <button
                type="button"
                aria-label={`${isHidden ? 'Show' : 'Hide'} ${preset.name}`}
                aria-pressed={!isHidden}
                onClick={() => toggleVisibility(preset.presetId)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  isHidden
                    ? 'text-gray-300 hover:text-blue-500'
                    : 'text-gray-400 hover:text-blue-500'
                }`}
              >
                {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
