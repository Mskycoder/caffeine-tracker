import type { CovariateSettings } from '../engine/types';

interface CovariateFormProps {
  covariates: CovariateSettings;
  onChange: (updated: CovariateSettings) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

function ToggleSwitch({
  label,
  checked,
  onChange,
  disabled,
  describedBy,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <label
      className={`flex items-center justify-between min-h-[44px] ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-disabled={disabled}
          aria-describedby={describedBy}
          className="sr-only peer"
        />
        <div
          className={`w-11 h-6 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors ${
            disabled
              ? 'bg-gray-100 cursor-not-allowed'
              : checked
                ? 'bg-blue-500'
                : 'bg-gray-200'
          }`}
        />
        <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  ariaLabel: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-700 mb-1">{label}</p>
      <div role="group" aria-label={ariaLabel} className="flex">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 px-3 min-h-[44px] text-sm font-medium border ${
              i === 0
                ? 'rounded-l-lg'
                : i === options.length - 1
                  ? 'rounded-r-lg'
                  : ''
            } ${
              value === opt.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Covariate input form for advanced metabolism mode.
 *
 * Renders three sections (Demographics, Lifestyle, Clinical) with all 8
 * covariate inputs. This is a controlled component: it receives covariates
 * and an onChange callback, and does NOT access the Zustand store directly.
 *
 * Key interactions:
 * - Weight input with kg/lbs segmented toggle and unit conversion
 * - Sex segmented control (Female / Male)
 * - Smoking and Oral Contraceptives toggle switches
 * - Pregnancy/OC mutual exclusion: selecting a trimester disables OC and forces it false
 * - Clinical dropdowns for liver disease, CYP1A2 genotype, CYP1A2 inhibitor
 */
export function CovariateForm({ covariates, onChange }: CovariateFormProps) {
  const isPregnant = covariates.pregnancyTrimester !== 'none';

  const handleWeightUnitChange = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === covariates.weightUnit) return;
    const convertedWeight =
      newUnit === 'lbs'
        ? Math.round(covariates.weight * 2.20462)
        : Math.round(covariates.weight * 0.453592);
    onChange({ ...covariates, weight: convertedWeight, weightUnit: newUnit });
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      onChange({ ...covariates, weight: val });
    }
  };

  const handleWeightBlur = () => {
    const min = covariates.weightUnit === 'kg' ? 30 : 66;
    const max = covariates.weightUnit === 'kg' ? 300 : 660;
    const clamped = Math.min(max, Math.max(min, covariates.weight || min));
    if (clamped !== covariates.weight) {
      onChange({ ...covariates, weight: clamped });
    }
  };

  const handlePregnancyChange = (
    trimester: CovariateSettings['pregnancyTrimester'],
  ) => {
    const updated: CovariateSettings = {
      ...covariates,
      pregnancyTrimester: trimester,
    };
    // Force OC false when selecting any pregnancy trimester
    if (trimester !== 'none') {
      updated.oralContraceptives = false;
    }
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Demographics */}
      <div className="space-y-4">
        <SectionHeading>Demographics</SectionHeading>

        {/* Body Weight */}
        <div>
          <p className="text-sm text-gray-700 mb-1">Body Weight</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              aria-label="Body weight"
              inputMode="decimal"
              min={covariates.weightUnit === 'kg' ? 30 : 66}
              max={covariates.weightUnit === 'kg' ? 300 : 660}
              step={1}
              value={covariates.weight}
              onChange={handleWeightChange}
              onBlur={handleWeightBlur}
              className="w-24 text-center border border-gray-300 rounded px-2 py-2 text-sm min-h-[44px]"
            />
            <SegmentedControl
              label=""
              options={[
                { value: 'kg' as const, label: 'kg' },
                { value: 'lbs' as const, label: 'lbs' },
              ]}
              value={covariates.weightUnit}
              onChange={handleWeightUnitChange}
              ariaLabel="Weight unit"
            />
          </div>
        </div>

        {/* Sex */}
        <SegmentedControl
          label="Sex"
          options={[
            { value: 'female' as const, label: 'Female' },
            { value: 'male' as const, label: 'Male' },
          ]}
          value={covariates.sex}
          onChange={(val) => onChange({ ...covariates, sex: val })}
          ariaLabel="Sex"
        />
      </div>

      {/* Section 2: Lifestyle */}
      <div className="space-y-4">
        <SectionHeading>Lifestyle</SectionHeading>

        {/* Smoker */}
        <ToggleSwitch
          label="Smoker"
          checked={covariates.smoking}
          onChange={(val) => onChange({ ...covariates, smoking: val })}
        />

        {/* Oral Contraceptives */}
        <div>
          <ToggleSwitch
            label="Oral Contraceptives"
            checked={covariates.oralContraceptives}
            onChange={(val) =>
              onChange({ ...covariates, oralContraceptives: val })
            }
            disabled={isPregnant}
            describedBy={isPregnant ? 'oc-helper' : undefined}
          />
          {isPregnant && (
            <p id="oc-helper" className="text-xs text-gray-400 mt-1">
              Not applicable during pregnancy
            </p>
          )}
        </div>

        {/* Pregnancy */}
        <div>
          <label
            htmlFor="pregnancy"
            className="text-sm text-gray-700"
          >
            Pregnancy
          </label>
          <select
            id="pregnancy"
            value={covariates.pregnancyTrimester}
            onChange={(e) =>
              handlePregnancyChange(
                e.target.value as CovariateSettings['pregnancyTrimester'],
              )
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px] bg-white"
          >
            <option value="none">Not pregnant</option>
            <option value="first">Trimester 1</option>
            <option value="second">Trimester 2</option>
            <option value="third">Trimester 3</option>
          </select>
        </div>
      </div>

      {/* Section 3: Clinical */}
      <div className="space-y-4">
        <SectionHeading>Clinical</SectionHeading>

        {/* Liver Disease */}
        <div>
          <label
            htmlFor="liver-disease"
            className="text-sm text-gray-700"
          >
            Liver Disease
          </label>
          <select
            id="liver-disease"
            value={covariates.liverDisease}
            onChange={(e) =>
              onChange({
                ...covariates,
                liverDisease:
                  e.target.value as CovariateSettings['liverDisease'],
              })
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px] bg-white"
          >
            <option value="none">None</option>
            <option value="mild">Mild (compensated)</option>
            <option value="moderate">Moderate-Severe (decompensated)</option>
          </select>
        </div>

        {/* CYP1A2 Genotype */}
        <div>
          <label
            htmlFor="cyp1a2-genotype"
            className="text-sm text-gray-700"
          >
            CYP1A2 Genotype
          </label>
          <select
            id="cyp1a2-genotype"
            value={covariates.cyp1a2Genotype}
            onChange={(e) =>
              onChange({
                ...covariates,
                cyp1a2Genotype:
                  e.target.value as CovariateSettings['cyp1a2Genotype'],
              })
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px] bg-white"
          >
            <option value="unknown">Unknown (default)</option>
            <option value="fast">Fast metabolizer (AA)</option>
            <option value="normal">Normal metabolizer (AC)</option>
            <option value="slow">Slow metabolizer (CC)</option>
          </select>
        </div>

        {/* CYP1A2 Inhibitor Medication */}
        <div>
          <label
            htmlFor="cyp1a2-inhibitor"
            className="text-sm text-gray-700"
          >
            CYP1A2 Inhibitor Medication
          </label>
          <select
            id="cyp1a2-inhibitor"
            value={covariates.cyp1a2Inhibitor}
            onChange={(e) =>
              onChange({
                ...covariates,
                cyp1a2Inhibitor:
                  e.target.value as CovariateSettings['cyp1a2Inhibitor'],
              })
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 min-h-[44px] bg-white"
          >
            <option value="none">None</option>
            <option value="fluvoxamine">Fluvoxamine (strong)</option>
            <option value="ciprofloxacin">Ciprofloxacin (moderate)</option>
            <option value="other_moderate">Other moderate inhibitor</option>
          </select>
        </div>
      </div>
    </div>
  );
}
