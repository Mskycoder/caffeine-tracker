import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  computeCaffeineMg,
  BREW_METHODS,
  BEAN_CAFFEINE_PERCENT,
  generatePresetName,
} from '../engine/calculator';
import { useCaffeineStore } from '../store/caffeine-store';
import type {
  BrewMethod,
  BeanType,
  GrindSize,
  CalculatorParams,
  CustomPreset,
} from '../engine/types';

/** Display-friendly names for grind size options. */
const GRIND_DISPLAY_NAMES: Record<GrindSize, string> = {
  'extra-fine': 'Extra Fine',
  'fine': 'Fine',
  'medium-fine': 'Medium-Fine',
  'medium': 'Medium',
  'coarse': 'Coarse',
};

interface CoffeeCalculatorProps {
  /** Undefined = create mode; defined = edit mode (re-edit flow per D-02). */
  preset?: CustomPreset;
  /** Called after successful save; parent closes BottomSheet. */
  onSave: () => void;
}

/**
 * Coffee calculator form component rendered inside BottomSheet.
 *
 * Lets the user select brew method, bean type, and coffee dose to compute
 * a live caffeine estimate via the mass-balance engine. A collapsible
 * fine-tuning section exposes grind size and water temperature controls.
 * Cold brew disables the temperature slider (per D-06).
 *
 * Results can be saved as custom presets with calculator metadata for
 * later re-editing. The preset name auto-generates from inputs but can
 * be manually overridden (per IC-09, D-09).
 *
 * All state is local React state (not Zustand) per research anti-pattern guidance.
 */
export function CoffeeCalculator({ preset, onSave }: CoffeeCalculatorProps) {
  const addCustomPreset = useCaffeineStore((s) => s.addCustomPreset);
  const updateCustomPreset = useCaffeineStore((s) => s.updateCustomPreset);

  // Form state — initialized from preset or espresso defaults
  const [brewMethod, setBrewMethod] = useState<BrewMethod>('espresso');
  const [beanType, setBeanType] = useState<BeanType>('arabica');
  const [beanCaffeinePercent, setBeanCaffeinePercent] = useState(1.2);
  const [doseG, setDoseG] = useState('18');
  const [grindSize, setGrindSize] = useState<GrindSize>('fine');
  const [waterTempC, setWaterTempC] = useState(93);
  const [showFineTuning, setShowFineTuning] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);

  // Populate fields from preset on mount or when preset changes (per IC-11)
  useEffect(() => {
    setShowSavedConfirmation(false);
    if (preset?.calculatorParams) {
      const p = preset.calculatorParams;
      setBrewMethod(p.brewMethod);
      setBeanType(p.beanType);
      setBeanCaffeinePercent(p.beanCaffeinePercent);
      setDoseG(String(p.doseG));
      setGrindSize(p.grindSize);
      setWaterTempC(p.waterTempC);
      setPresetName(preset.name);
      setNameManuallyEdited(true); // preserve existing name in edit mode
    } else {
      // Create mode — espresso defaults
      const method = BREW_METHODS['espresso'];
      setBrewMethod('espresso');
      setBeanType('arabica');
      setBeanCaffeinePercent(1.2);
      setDoseG(String(method.defaultDoseG));
      setGrindSize(method.defaultGrind);
      setWaterTempC(method.defaultTempC);
      setNameManuallyEdited(false);
      setPresetName(generatePresetName('espresso', 'arabica', method.defaultDoseG));
    }
    setShowFineTuning(false);
    setShowMath(false);
  }, [preset]);

  // Brew method change handler (per IC-03, research pitfall 4)
  const handleBrewMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMethod = e.target.value as BrewMethod;
    const config = BREW_METHODS[newMethod];
    setBrewMethod(newMethod);
    setDoseG(String(config.defaultDoseG));
    setGrindSize(config.defaultGrind);
    setWaterTempC(config.defaultTempC);
    if (!nameManuallyEdited) {
      setPresetName(generatePresetName(newMethod, beanType, config.defaultDoseG));
    }
  };

  // Bean type change handler (per IC-04)
  const handleBeanTypeChange = (newType: BeanType) => {
    setBeanType(newType);
    if (newType !== 'custom') {
      setBeanCaffeinePercent(BEAN_CAFFEINE_PERCENT[newType]);
    }
    if (!nameManuallyEdited) {
      setPresetName(generatePresetName(brewMethod, newType, Number(doseG) || 0));
    }
  };

  // Dose change handler (per IC-09)
  const handleDoseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDose = e.target.value;
    setDoseG(newDose);
    if (!nameManuallyEdited) {
      setPresetName(generatePresetName(brewMethod, beanType, Number(newDose) || 0));
    }
  };

  // Name change handler — marks as manually edited once user types
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetName(e.target.value);
    setNameManuallyEdited(true);
  };

  // Live result computation (per D-10, IC-02)
  const result = useMemo(
    () =>
      computeCaffeineMg({
        brewMethod,
        beanType,
        beanCaffeinePercent,
        doseG: Number(doseG) || 0,
        grindSize,
        waterTempC,
      }),
    [brewMethod, beanType, beanCaffeinePercent, doseG, grindSize, waterTempC],
  );

  // Computed helpers
  const isColdBrew = brewMethod === 'cold-brew';
  const canSave =
    presetName.trim().length > 0 &&
    (Number(doseG) || 0) > 0 &&
    result.caffeineMg > 0;

  // Save handler (per IC-10, D-12)
  const handleSave = () => {
    const trimmedName = presetName.trim();
    const dose = Number(doseG);
    if (!trimmedName || dose <= 0 || result.caffeineMg <= 0) return;

    const calcParams: CalculatorParams = {
      brewMethod,
      beanType,
      beanCaffeinePercent,
      doseG: dose,
      grindSize,
      waterTempC,
    };

    if (preset) {
      updateCustomPreset(preset.id, {
        name: trimmedName,
        caffeineMg: result.caffeineMg,
        calculatorParams: calcParams,
      });
    } else {
      addCustomPreset(trimmedName, result.caffeineMg, calcParams);
    }

    setShowSavedConfirmation(true);
    setTimeout(() => {
      onSave();
    }, 600); // brief green flash then close
  };

  return (
    <div className="space-y-4">
      {/* [1] Brew Method — native select per IC-03 */}
      <div>
        <label className="text-sm text-gray-700 block mb-1">Brew method</label>
        <select
          value={brewMethod}
          onChange={handleBrewMethodChange}
          className="min-h-[44px] w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          {Object.entries(BREW_METHODS).map(([key, config]) => (
            <option key={key} value={key}>
              {config.name}
            </option>
          ))}
        </select>
      </div>

      {/* [2] Bean Type — segmented control per IC-04 */}
      <div>
        <label className="text-sm text-gray-700 block mb-1">Bean type</label>
        <div role="group" aria-label="Bean type" className="flex gap-2">
          {(['arabica', 'robusta', 'blend', 'custom'] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={beanType === type}
              onClick={() => handleBeanTypeChange(type)}
              className={`min-h-[44px] flex-1 rounded text-sm font-medium ${
                beanType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {type === 'custom'
                ? 'Custom'
                : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        {/* Custom caffeine % input — conditional per D-04 */}
        {beanType === 'custom' && (
          <div className="mt-2">
            <label className="text-sm text-gray-700 block mb-1">
              Caffeine content (%)
            </label>
            <input
              type="number"
              value={beanCaffeinePercent}
              onChange={(e) =>
                setBeanCaffeinePercent(Number(e.target.value) || 0)
              }
              min={0.1}
              max={5}
              step={0.1}
              className="min-h-[44px] w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* [3] Coffee Dose per IC-09 */}
      <div>
        <label className="text-sm text-gray-700 block mb-1">
          Coffee dose (g)
        </label>
        <input
          type="number"
          value={doseG}
          onChange={handleDoseChange}
          min={1}
          max={200}
          step={1}
          className="min-h-[44px] w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* [4] Fine-Tuning collapsible per IC-05, D-05 */}
      <div>
        <button
          type="button"
          onClick={() => setShowFineTuning(!showFineTuning)}
          aria-expanded={showFineTuning}
          className="flex items-center gap-1 text-sm text-gray-600"
        >
          Fine-tuning
          {showFineTuning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showFineTuning && (
          <div className="space-y-4 mt-2">
            {/* Grind size pills per IC-06 */}
            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Grind size
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'extra-fine',
                    'fine',
                    'medium-fine',
                    'medium',
                    'coarse',
                  ] as const
                ).map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={grindSize === size}
                    onClick={() => setGrindSize(size)}
                    className={`min-h-[44px] rounded-full px-3 py-1 text-sm border ${
                      grindSize === size
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-200 bg-gray-100 text-gray-500'
                    }`}
                  >
                    {GRIND_DISPLAY_NAMES[size]}
                  </button>
                ))}
              </div>
            </div>
            {/* Temperature slider per IC-07, D-06 */}
            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Water temperature
              </label>
              {isColdBrew ? (
                <p className="text-xs text-gray-400">N/A for cold brew</p>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={85}
                    max={100}
                    step={1}
                    value={waterTempC}
                    onChange={(e) => setWaterTempC(Number(e.target.value))}
                    aria-label="Water temperature"
                    aria-valuemin={85}
                    aria-valuemax={100}
                    aria-valuenow={waterTempC}
                    className="flex-1 h-2 rounded-lg appearance-none bg-gray-300
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[44px]
                      [&::-webkit-slider-thumb]:h-[44px] [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-[44px] [&::-moz-range-thumb]:h-[44px]
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-600
                      [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {waterTempC}&deg;C
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* [5] Result block per IC-02, D-10, D-11 */}
      <div className="bg-amber-50 rounded-lg p-4">
        <p className="text-sm text-gray-500">Estimated Caffeine</p>
        <p className="text-2xl font-semibold text-amber-600">
          {result.caffeineMg} mg
        </p>
        <button
          type="button"
          onClick={() => setShowMath(!showMath)}
          className="flex items-center gap-1 text-sm text-gray-500 mt-2"
        >
          {showMath ? 'Hide math' : 'Show math'}
          {showMath ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showMath && (
          <p className="text-xs text-gray-400 mt-1 font-mono">
            {Number(doseG) || 0}g x {beanCaffeinePercent}% x{' '}
            {result.effectiveExtractionRate}% = {result.caffeineMg}mg
          </p>
        )}
      </div>

      {/* [6] Preset name per IC-09, D-09 */}
      <div>
        <label className="text-sm text-gray-700 block mb-1">Preset name</label>
        <input
          type="text"
          value={presetName}
          onChange={handleNameChange}
          maxLength={40}
          required
          placeholder="Preset name"
          className="min-h-[44px] w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* [7] Save button per IC-10, D-12 */}
      {showSavedConfirmation ? (
        <div className="w-full min-h-[44px] rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white text-center flex items-center justify-center">
          Saved!
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full min-h-[44px] rounded px-4 py-2 text-sm font-semibold text-white ${
            canSave
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-purple-600 opacity-50 cursor-not-allowed'
          }`}
        >
          Save as Preset
        </button>
      )}
    </div>
  );
}
