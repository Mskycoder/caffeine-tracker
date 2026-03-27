import { useCaffeineStore } from '../store/caffeine-store';
import { computeHalfLife } from '../engine/metabolism';
import { CovariateForm } from './CovariateForm';
import type { CovariateSettings } from '../engine/types';

/**
 * Metabolism speed presets mapping user-friendly labels to half-life values (per D-02).
 * Fast metabolizers clear caffeine in ~3hr half-life, average ~5hr, slow ~7hr.
 */
const METABOLISM_PRESETS = [
  { label: 'Fast', halfLife: 3, description: '~3hr half-life' },
  { label: 'Average', halfLife: 5, description: '~5hr half-life' },
  { label: 'Slow', halfLife: 7, description: '~7hr half-life' },
] as const;

/**
 * Settings panel for personalizing the caffeine model.
 *
 * Always renders expanded (no collapsible toggle). Shows:
 * - Metabolism speed: segmented control (Fast / Average / Slow) in simple mode,
 *   or CovariateForm with computed half-life in advanced mode
 * - Mode toggle: "Use advanced settings" / "Use simple settings" link
 * - Sleep threshold: number input (10-200mg) for the sleep-ready cutoff
 * - Target bedtime: time picker for curfew calculation
 *
 * All changes immediately persist to Zustand store and reactively update
 * the decay curve, sleep estimate, and curfew display throughout the app.
 */
export function SettingsPanel() {
  const settings = useCaffeineStore((s) => s.settings);
  const updateSettings = useCaffeineStore((s) => s.updateSettings);

  const handleCovariateChange = (updated: CovariateSettings) => {
    updateSettings({ covariates: updated });
  };

  const computedHalfLife =
    settings.metabolismMode === 'advanced'
      ? computeHalfLife(settings.covariates)
      : 0; // not rendered in simple mode

  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="px-4 py-4 space-y-5">
        {/* Metabolism Speed */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Metabolism Speed
          </p>

          {settings.metabolismMode === 'simple' ? (
            <>
              <div role="group" aria-label="Metabolism speed" className="flex">
                {METABOLISM_PRESETS.map((preset, index) => {
                  const isActive = settings.halfLifeHours === preset.halfLife;
                  const roundedClass =
                    index === 0
                      ? 'rounded-l-lg'
                      : index === METABOLISM_PRESETS.length - 1
                        ? 'rounded-r-lg'
                        : '';

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => updateSettings({ halfLifeHours: preset.halfLife })}
                      className={`flex-1 py-3 px-2 min-h-[44px] text-center border ${roundedClass} ${
                        isActive
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <span className="block text-sm font-medium">{preset.label}</span>
                      <span className={`block text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ metabolismMode: 'advanced' })}
                aria-expanded={false}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Use advanced settings
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => updateSettings({ metabolismMode: 'simple' })}
                aria-expanded={true}
                className="mb-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Use simple settings
              </button>
              <CovariateForm
                covariates={settings.covariates}
                onChange={handleCovariateChange}
              />
              <div
                className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1"
                aria-live="polite"
              >
                <span className="text-sm text-gray-500">Computed half-life:</span>
                <span className="text-sm font-medium text-blue-600">
                  {computedHalfLife.toFixed(1)} hours
                </span>
                {(computedHalfLife <= 1.5 || computedHalfLife >= 20) && (
                  <span className="text-xs text-gray-400">(clamped)</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sleep Threshold */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Sleep Threshold
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={200}
              step={10}
              value={settings.thresholdMg}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) updateSettings({ thresholdMg: val });
              }}
              onBlur={() => {
                const val = Math.min(200, Math.max(10, settings.thresholdMg || 10));
                if (val !== settings.thresholdMg) updateSettings({ thresholdMg: val });
              }}
              className="w-20 text-center border border-gray-300 rounded px-2 py-2 text-sm min-h-[44px]"
            />
            <span className="text-sm text-gray-500">mg</span>
          </div>
        </div>

        {/* Target Bedtime */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Target Bedtime
            <input
              type="time"
              value={settings.targetBedtime ?? '00:00'}
              onChange={(e) => updateSettings({ targetBedtime: e.target.value })}
              className="block mt-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 font-normal normal-case tracking-normal min-h-[44px]"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
