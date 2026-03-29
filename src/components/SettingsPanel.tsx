import { useCaffeineStore } from '../store/caffeine-store';
import { computeHalfLife } from '../engine/metabolism';
import { getEffectiveThreshold } from '../engine/thresholds';
import { CovariateForm } from './CovariateForm';
import { DRINK_PRESETS } from '../data/presets';
import type { CovariateSettings, CaffeineSensitivity, ThresholdSource } from '../engine/types';

/**
 * Metabolism speed presets mapping user-friendly labels to half-life values (per D-02).
 * Fast metabolizers clear caffeine in ~3hr half-life, average ~5hr, slow ~7hr.
 */
const METABOLISM_PRESETS = [
  { label: 'Fast', halfLife: 3, description: '~3hr half-life' },
  { label: 'Average', halfLife: 5, description: '~5hr half-life' },
  { label: 'Slow', halfLife: 7, description: '~7hr half-life' },
] as const;

const SENSITIVITY_OPTIONS: readonly { label: string; value: CaffeineSensitivity; description: string }[] = [
  { label: 'Low', value: 'low', description: 'Tolerant (+25%)' },
  { label: 'Normal', value: 'normal', description: 'Baseline' },
  { label: 'High', value: 'high', description: 'Sensitive (-25%)' },
] as const;

const THRESHOLD_SOURCE_OPTIONS: readonly { label: string; value: ThresholdSource }[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'Autonomic', value: 'autonomic' },
  { label: 'Deep Sleep', value: 'deep_sleep' },
] as const;

function ToggleSwitch({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between min-h-[44px]">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-200'
        }`} />
        <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

/**
 * Settings panel for personalizing the caffeine model.
 *
 * Always renders expanded (no collapsible toggle). Shows:
 * - Metabolism speed: segmented control (Fast / Average / Slow) in simple mode,
 *   or CovariateForm with computed half-life in advanced mode
 * - Mode toggle: "Use advanced settings" / "Use simple settings" link
 * - Sleep threshold: number input (10-200mg) for the sleep-ready cutoff,
 *   disabled when linked to a research threshold source
 * - Target bedtime: time picker for curfew calculation
 * - Last-call drink: native select picker (optgroup for My Drinks/Built-in)
 *   for personalizing curfew display with a specific drink name and caffeine amount
 * - Research thresholds: toggle for research-backed threshold display,
 *   caffeine sensitivity selector (Low/Normal/High), and sleep threshold
 *   source selector (Manual/Autonomic/Deep Sleep)
 *
 * All changes immediately persist to Zustand store and reactively update
 * the decay curve, sleep estimate, and curfew display throughout the app.
 */
export function SettingsPanel() {
  const settings = useCaffeineStore((s) => s.settings);
  const updateSettings = useCaffeineStore((s) => s.updateSettings);
  const customPresets = useCaffeineStore((s) => s.customPresets);

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
          <div className={`flex items-center gap-2 ${
            settings.thresholdSource !== 'manual' ? 'opacity-50 pointer-events-none' : ''
          }`}>
            <input
              type="number"
              min={10}
              max={200}
              step={10}
              value={settings.thresholdSource === 'manual'
                ? settings.thresholdMg
                : Math.round(getEffectiveThreshold(settings))}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) updateSettings({ thresholdMg: val });
              }}
              onBlur={() => {
                const val = Math.min(200, Math.max(10, settings.thresholdMg || 10));
                if (val !== settings.thresholdMg) updateSettings({ thresholdMg: val });
              }}
              disabled={settings.thresholdSource !== 'manual'}
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

        {/* Last-Call Drink (Phase 20, per D-01, D-02, D-03, D-04) */}
        <div>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
              Last-Call Drink
            </span>
            <select
              value={settings.lastCallDrinkId ?? ''}
              onChange={(e) => updateSettings({ lastCallDrinkId: e.target.value || null })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px] bg-white"
            >
              <option value="">None (default 95mg)</option>
              {customPresets.length > 0 && (
                <optgroup label="My Drinks">
                  {customPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.caffeineMg}mg)
                    </option>
                  ))}
                </optgroup>
              )}
              {customPresets.length > 0 ? (
                <optgroup label="Built-in">
                  {DRINK_PRESETS.filter(
                    (p) => !settings.hiddenPresetIds.includes(p.presetId)
                  ).map((preset) => (
                    <option key={preset.presetId} value={preset.presetId}>
                      {preset.name} ({preset.caffeineMg}mg)
                    </option>
                  ))}
                </optgroup>
              ) : (
                DRINK_PRESETS.filter(
                  (p) => !settings.hiddenPresetIds.includes(p.presetId)
                ).map((preset) => (
                  <option key={preset.presetId} value={preset.presetId}>
                    {preset.name} ({preset.caffeineMg}mg)
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {/* Research Thresholds (THRS-04) */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Research Thresholds
          </p>
          <ToggleSwitch
            label="Show research thresholds"
            checked={settings.showResearchThresholds}
            onChange={(val) => updateSettings({ showResearchThresholds: val })}
          />

          {settings.showResearchThresholds && (
            <div className="mt-4 space-y-4">
              {/* Sensitivity Selector (THRS-05, D-07, D-08) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Caffeine Sensitivity
                </p>
                <div role="group" aria-label="Caffeine sensitivity" className="flex">
                  {SENSITIVITY_OPTIONS.map((option, index) => {
                    const isActive = (settings.caffeineSensitivity ?? 'normal') === option.value;
                    const roundedClass =
                      index === 0
                        ? 'rounded-l-lg'
                        : index === SENSITIVITY_OPTIONS.length - 1
                          ? 'rounded-r-lg'
                          : '';
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => updateSettings({ caffeineSensitivity: option.value })}
                        className={`flex-1 py-3 px-2 min-h-[44px] text-center border ${roundedClass} ${
                          isActive
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className={`block text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sleep Threshold Source (D-10) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Sleep Threshold Source
                </p>
                <div role="group" aria-label="Sleep threshold source" className="flex">
                  {THRESHOLD_SOURCE_OPTIONS.map((option, index) => {
                    const isActive = (settings.thresholdSource ?? 'manual') === option.value;
                    const roundedClass =
                      index === 0
                        ? 'rounded-l-lg'
                        : index === THRESHOLD_SOURCE_OPTIONS.length - 1
                          ? 'rounded-r-lg'
                          : '';
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => updateSettings({ thresholdSource: option.value })}
                        className={`flex-1 py-3 px-2 min-h-[44px] text-center border ${roundedClass} ${
                          isActive
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Helper text showing active threshold value */}
                <p className="text-xs text-gray-400 mt-1">
                  {(() => {
                    const source = settings.thresholdSource ?? 'manual';
                    const effectiveVal = Math.round(getEffectiveThreshold(settings));
                    if (source === 'manual') return `Using your custom ${effectiveVal}mg threshold`;
                    if (source === 'autonomic') return `Using autonomic threshold (${effectiveVal}mg)`;
                    return `Using deep sleep threshold (${effectiveVal}mg)`;
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
