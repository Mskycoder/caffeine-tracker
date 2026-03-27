import { useState, useCallback } from 'react';
import { DrinkPresets } from './DrinkPresets';
import { CustomDrinkForm } from './CustomDrinkForm';
import { datetimeLocalToEpoch } from '../utils/datetime';

/**
 * Container wiring presets + custom form + shared time picker.
 *
 * Per D-06: Default to current time, optional datetime-local picker for backdating.
 * Rendered inside BottomSheet (Phase 9, D-01/D-04).
 * The shared time picker state is owned here and passed to children via getTimestamp prop.
 * Per D-04: Touch targets on time picker elements are 44px minimum.
 */
export function DrinkLogger() {
  const [timeOverride, setTimeOverride] = useState('');

  const getTimestamp = useCallback((): number => {
    if (timeOverride) {
      return datetimeLocalToEpoch(timeOverride);
    }
    return Date.now();
  }, [timeOverride]);

  return (
    <>
      {/* Time picker: defaults to "now", can be overridden for backdating */}
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="time-override" className="text-sm text-gray-600">
          Time:
        </label>
        <input
          id="time-override"
          type="datetime-local"
          value={timeOverride}
          onChange={(e) => setTimeOverride(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded text-sm min-h-[44px]"
        />
        {!timeOverride && (
          <span className="text-sm text-gray-400">Now</span>
        )}
        {timeOverride && (
          <button
            type="button"
            onClick={() => setTimeOverride('')}
            className="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-2 flex items-center"
          >
            Reset
          </button>
        )}
      </div>

      {/* Preset drink cards */}
      <DrinkPresets getTimestamp={getTimestamp} />

      {/* Custom entry form */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Entry</h3>
        <CustomDrinkForm getTimestamp={getTimestamp} />
      </div>
    </>
  );
}
