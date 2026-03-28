// @vitest-environment happy-dom
import { useCaffeineStore, type CaffeineState } from './caffeine-store';
import type { CalculatorParams } from '../engine/types';

const DEFAULT_SETTINGS = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: '00:00',
  metabolismMode: 'simple' as const,
  covariates: {
    weight: 70, weightUnit: 'kg' as const, sex: 'male' as const,
    smoking: false, oralContraceptives: false, pregnancyTrimester: 'none' as const,
    liverDisease: 'none' as const, cyp1a2Genotype: 'unknown' as const,
    cyp1a2Inhibitor: 'none' as const,
  },
  hiddenPresetIds: [] as string[],
  showResearchThresholds: false,
  caffeineSensitivity: 'normal' as const,
  thresholdSource: 'manual' as const,
};

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
    customPresets: [],
    schedules: [],
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe('initial state', () => {
  it('drinks is an empty array', () => {
    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toEqual([]);
  });

  it('settings has correct defaults', () => {
    const { settings } = useCaffeineStore.getState();
    expect(settings.halfLifeHours).toBe(5);
    expect(settings.thresholdMg).toBe(50);
    expect(settings.targetBedtime).toBe('00:00');
    expect(settings.metabolismMode).toBe('simple');
    expect(settings.covariates).toEqual(DEFAULT_SETTINGS.covariates);
  });

  it('customPresets is an empty array', () => {
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addDrink
// ---------------------------------------------------------------------------
describe('addDrink', () => {
  it('adds a drink with auto-generated UUID id', () => {
    useCaffeineStore.getState().addDrink({
      name: 'Espresso',
      caffeineMg: 63,
      timestamp: Date.now(),
      presetId: null,
    });

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    expect(drinks[0].name).toBe('Espresso');
    expect(drinks[0].caffeineMg).toBe(63);
    expect(drinks[0].id).toBeDefined();
  });

  it('generated id matches UUID format', () => {
    useCaffeineStore.getState().addDrink({
      name: 'Drip Coffee',
      caffeineMg: 95,
      timestamp: Date.now(),
      presetId: null,
    });

    const { drinks } = useCaffeineStore.getState();
    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(drinks[0].id).toMatch(/^[0-9a-f]{8}-/);
  });

  it('appends multiple drinks preserving order', () => {
    const state = useCaffeineStore.getState();
    state.addDrink({ name: 'Coffee 1', caffeineMg: 95, timestamp: 1000, presetId: null });
    state.addDrink({ name: 'Coffee 2', caffeineMg: 150, timestamp: 2000, presetId: null });

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(2);
    expect(drinks[0].name).toBe('Coffee 1');
    expect(drinks[1].name).toBe('Coffee 2');
  });
});

// ---------------------------------------------------------------------------
// removeDrink
// ---------------------------------------------------------------------------
describe('removeDrink', () => {
  it('removes drink by id, leaves others intact', () => {
    const state = useCaffeineStore.getState();
    state.addDrink({ name: 'Keep', caffeineMg: 95, timestamp: 1000, presetId: null });
    state.addDrink({ name: 'Remove', caffeineMg: 63, timestamp: 2000, presetId: null });

    const drinks = useCaffeineStore.getState().drinks;
    const removeId = drinks[1].id;
    useCaffeineStore.getState().removeDrink(removeId);

    const updated = useCaffeineStore.getState().drinks;
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Keep');
  });
});

// ---------------------------------------------------------------------------
// updateDrink
// ---------------------------------------------------------------------------
describe('updateDrink', () => {
  it('updates specified fields on matching drink', () => {
    useCaffeineStore.getState().addDrink({
      name: 'Original',
      caffeineMg: 95,
      timestamp: 1000,
      presetId: null,
    });

    const drinkId = useCaffeineStore.getState().drinks[0].id;
    useCaffeineStore.getState().updateDrink(drinkId, { name: 'Updated', caffeineMg: 150 });

    const updated = useCaffeineStore.getState().drinks[0];
    expect(updated.name).toBe('Updated');
    expect(updated.caffeineMg).toBe(150);
    // Unchanged fields preserved
    expect(updated.timestamp).toBe(1000);
    expect(updated.presetId).toBeNull();
  });

  it('does not modify other drinks', () => {
    const state = useCaffeineStore.getState();
    state.addDrink({ name: 'First', caffeineMg: 95, timestamp: 1000, presetId: null });
    state.addDrink({ name: 'Second', caffeineMg: 63, timestamp: 2000, presetId: null });

    const drinkId = useCaffeineStore.getState().drinks[1].id;
    useCaffeineStore.getState().updateDrink(drinkId, { name: 'Changed' });

    const drinks = useCaffeineStore.getState().drinks;
    expect(drinks[0].name).toBe('First');
    expect(drinks[1].name).toBe('Changed');
  });
});

// ---------------------------------------------------------------------------
// updateSettings
// ---------------------------------------------------------------------------
describe('updateSettings', () => {
  it('merges partial settings with existing', () => {
    useCaffeineStore.getState().updateSettings({ halfLifeHours: 6 });

    const { settings } = useCaffeineStore.getState();
    expect(settings.halfLifeHours).toBe(6);
    // Other settings unchanged
    expect(settings.thresholdMg).toBe(50);
    expect(settings.targetBedtime).toBe('00:00');
  });

  it('can update multiple settings at once', () => {
    useCaffeineStore.getState().updateSettings({
      halfLifeHours: 4,
      thresholdMg: 30,
      targetBedtime: '22:30',
    });

    const { settings } = useCaffeineStore.getState();
    expect(settings.halfLifeHours).toBe(4);
    expect(settings.thresholdMg).toBe(30);
    expect(settings.targetBedtime).toBe('22:30');
  });
});

// ---------------------------------------------------------------------------
// clearDrinks
// ---------------------------------------------------------------------------
describe('clearDrinks', () => {
  it('empties the drinks array', () => {
    const state = useCaffeineStore.getState();
    state.addDrink({ name: 'Coffee', caffeineMg: 95, timestamp: 1000, presetId: null });
    state.addDrink({ name: 'Tea', caffeineMg: 47, timestamp: 2000, presetId: null });

    expect(useCaffeineStore.getState().drinks).toHaveLength(2);

    useCaffeineStore.getState().clearDrinks();
    expect(useCaffeineStore.getState().drinks).toHaveLength(0);
    expect(useCaffeineStore.getState().drinks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Persistence config
// ---------------------------------------------------------------------------
describe('persist config', () => {
  it('store name is caffeine-tracker-storage', () => {
    const options = useCaffeineStore.persist.getOptions();
    expect(options.name).toBe('caffeine-tracker-storage');
  });

  it('version is 6', () => {
    const options = useCaffeineStore.persist.getOptions();
    expect(options.version).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
describe('migration', () => {
  it('migrates v1 state: null targetBedtime becomes "00:00"', () => {
    const v1State = {
      drinks: [{ id: 'old-1', name: 'Coffee', caffeineMg: 95, timestamp: 1000, presetId: null }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null },
    };
    const options = useCaffeineStore.persist.getOptions();
    const migrated = options.migrate!(v1State, 1) as CaffeineState;
    expect(migrated.settings.targetBedtime).toBe('00:00');
    expect(migrated.drinks).toHaveLength(1);
    expect(migrated.settings.halfLifeHours).toBe(5);
  });

  it('preserves existing string targetBedtime during v1 migration', () => {
    const v1State = {
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '22:30' },
    };
    const options = useCaffeineStore.persist.getOptions();
    const migrated = options.migrate!(v1State, 1) as CaffeineState;
    expect(migrated.settings.targetBedtime).toBe('22:30');
  });

  it('migrates v2 state to v3: adds customPresets array, preserves drinks and settings', () => {
    const v2State = {
      drinks: [{ id: 'drink-1', name: 'Coffee', caffeineMg: 95, timestamp: 1000, presetId: 'drip-coffee' }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '23:00' },
    };
    const options = useCaffeineStore.persist.getOptions();
    const migrated = options.migrate!(v2State, 2) as CaffeineState;
    expect(migrated.customPresets).toEqual([]);
    expect(migrated.drinks).toHaveLength(1);
    expect(migrated.drinks[0].name).toBe('Coffee');
    expect(migrated.settings.targetBedtime).toBe('23:00');
  });

  it('migrates v1 state to v6 (chained): targetBedtime, customPresets, metabolismMode, covariates, schedules, hiddenPresetIds, showResearchThresholds', () => {
    const v1State = {
      drinks: [{ id: 'old-1', name: 'Tea', caffeineMg: 47, timestamp: 2000, presetId: null }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null },
    };
    const options = useCaffeineStore.persist.getOptions();
    const migrated = options.migrate!(v1State, 1) as CaffeineState;
    expect(migrated.settings.targetBedtime).toBe('00:00');
    expect(migrated.customPresets).toEqual([]);
    expect(migrated.settings.metabolismMode).toBe('simple');
    expect(migrated.settings.covariates).toEqual(DEFAULT_SETTINGS.covariates);
    expect(migrated.schedules).toEqual([]);
    expect(migrated.settings.hiddenPresetIds).toEqual([]);
    expect(migrated.settings.showResearchThresholds).toBe(false);
    expect(migrated.drinks).toHaveLength(1);
  });

  it('migrates v3 state to v4 adding metabolismMode and covariates', () => {
    const v3State = {
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '23:00' },
      customPresets: [{ id: 'custom-1', name: 'Mocha', caffeineMg: 120 }],
    };
    const options = useCaffeineStore.persist.getOptions();
    const migrated = options.migrate!(v3State, 3) as CaffeineState;
    expect(migrated.settings.metabolismMode).toBe('simple');
    expect(migrated.settings.covariates).toEqual({
      weight: 70, weightUnit: 'kg', sex: 'male',
      smoking: false, oralContraceptives: false, pregnancyTrimester: 'none',
      liverDisease: 'none', cyp1a2Genotype: 'unknown', cyp1a2Inhibitor: 'none',
    });
    // Existing settings preserved
    expect(migrated.settings.halfLifeHours).toBe(5);
    expect(migrated.settings.targetBedtime).toBe('23:00');
    expect(migrated.customPresets).toHaveLength(1);
  });

  it('migrates v4 state to v5: adds empty schedules array', () => {
    const v4State = {
      drinks: [],
      settings: { ...DEFAULT_SETTINGS },
      customPresets: [{ id: 'custom-abc', name: 'My Drink', caffeineMg: 100 }],
    };
    const options = useCaffeineStore.persist.getOptions();
    const result = options.migrate!(v4State, 4) as CaffeineState;
    expect(result.schedules).toEqual([]);
    expect(result.settings.targetBedtime).toBe('00:00');
    expect(result.settings.metabolismMode).toBe('simple');
    expect(result.customPresets).toHaveLength(1);
    expect(result.customPresets[0].name).toBe('My Drink');
  });

  it('migrates v5 state to v6 adding hiddenPresetIds, showResearchThresholds, caffeineSensitivity, thresholdSource', () => {
    const v5State = {
      drinks: [],
      settings: { ...DEFAULT_SETTINGS },
      customPresets: [],
      schedules: [],
    };
    // Remove the new fields to simulate a real v5 state
    delete (v5State.settings as Record<string, unknown>).hiddenPresetIds;
    delete (v5State.settings as Record<string, unknown>).showResearchThresholds;
    delete (v5State.settings as Record<string, unknown>).caffeineSensitivity;
    delete (v5State.settings as Record<string, unknown>).thresholdSource;
    const options = useCaffeineStore.persist.getOptions();
    const result = options.migrate!(v5State, 5) as CaffeineState;
    expect(result.settings.hiddenPresetIds).toEqual([]);
    expect(result.settings.showResearchThresholds).toBe(false);
    expect(result.settings.caffeineSensitivity).toBe('normal');
    expect(result.settings.thresholdSource).toBe('manual');
  });

  it('returns v6 state unchanged', () => {
    const v6State = {
      drinks: [],
      settings: { ...DEFAULT_SETTINGS },
      customPresets: [],
      schedules: [{ id: 'sched-1', presetId: 'drip-coffee', name: 'Drip Coffee', caffeineMg: 95, timeOfDay: '09:00', repeatDays: [1, 2, 3, 4, 5], paused: false, lastRunDate: null }],
    };
    const options = useCaffeineStore.persist.getOptions();
    const result = options.migrate!(v6State, 6) as CaffeineState;
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].name).toBe('Drip Coffee');
  });
});

// ---------------------------------------------------------------------------
// addCustomPreset
// ---------------------------------------------------------------------------
describe('addCustomPreset', () => {
  it('creates a preset with id matching custom-{uuid} pattern', () => {
    useCaffeineStore.getState().addCustomPreset('Morning Latte', 63);
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].name).toBe('Morning Latte');
    expect(customPresets[0].caffeineMg).toBe(63);
    expect(customPresets[0].id).toMatch(/^custom-[0-9a-f]{8}-/);
  });

  it('appends to existing customPresets without removing previous entries', () => {
    const state = useCaffeineStore.getState();
    state.addCustomPreset('Drink A', 50);
    useCaffeineStore.getState().addCustomPreset('Drink B', 100);
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toHaveLength(2);
    expect(customPresets[0].name).toBe('Drink A');
    expect(customPresets[1].name).toBe('Drink B');
  });
});

// ---------------------------------------------------------------------------
// updateCustomPreset
// ---------------------------------------------------------------------------
describe('updateCustomPreset', () => {
  it('changes only the name on the matching preset', () => {
    useCaffeineStore.getState().addCustomPreset('Original', 75);
    const id = useCaffeineStore.getState().customPresets[0].id;
    useCaffeineStore.getState().updateCustomPreset(id, { name: 'Updated' });
    const preset = useCaffeineStore.getState().customPresets[0];
    expect(preset.name).toBe('Updated');
    expect(preset.caffeineMg).toBe(75);
  });

  it('changes only caffeineMg on the matching preset', () => {
    useCaffeineStore.getState().addCustomPreset('My Drink', 75);
    const id = useCaffeineStore.getState().customPresets[0].id;
    useCaffeineStore.getState().updateCustomPreset(id, { caffeineMg: 100 });
    const preset = useCaffeineStore.getState().customPresets[0];
    expect(preset.name).toBe('My Drink');
    expect(preset.caffeineMg).toBe(100);
  });

  it('does not modify array with non-existent id', () => {
    useCaffeineStore.getState().addCustomPreset('Existing', 50);
    useCaffeineStore.getState().updateCustomPreset('non-existent-id', { name: 'Nope' });
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].name).toBe('Existing');
  });
});

// ---------------------------------------------------------------------------
// addCustomPreset with calculatorParams
// ---------------------------------------------------------------------------
describe('addCustomPreset with calculatorParams', () => {
  const sampleCalcParams: CalculatorParams = {
    brewMethod: 'espresso',
    beanType: 'arabica',
    beanCaffeinePercent: 1.2,
    doseG: 18,
    grindSize: 'fine',
    waterTempC: 93,
  };

  it('still works with 2 args (backward compat)', () => {
    useCaffeineStore.getState().addCustomPreset('Morning Latte', 63);
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].name).toBe('Morning Latte');
    expect(customPresets[0].caffeineMg).toBe(63);
    expect(customPresets[0].calculatorParams).toBeUndefined();
  });

  it('stores calculatorParams when provided as 3rd argument', () => {
    useCaffeineStore.getState().addCustomPreset('Espresso (Arabica, 18g)', 66, sampleCalcParams);
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].calculatorParams).toEqual(sampleCalcParams);
  });

  it('creates preset with id starting with "custom-" when calculatorParams provided', () => {
    useCaffeineStore.getState().addCustomPreset('My Brew', 63, sampleCalcParams);
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets[0].id).toMatch(/^custom-[0-9a-f]{8}-/);
  });
});

// ---------------------------------------------------------------------------
// updateCustomPreset with calculatorParams
// ---------------------------------------------------------------------------
describe('updateCustomPreset with calculatorParams', () => {
  const sampleCalcParams: CalculatorParams = {
    brewMethod: 'espresso',
    beanType: 'arabica',
    beanCaffeinePercent: 1.2,
    doseG: 18,
    grindSize: 'fine',
    waterTempC: 93,
  };

  it('updates calculatorParams on existing preset', () => {
    useCaffeineStore.getState().addCustomPreset('Brew', 63, sampleCalcParams);
    const id = useCaffeineStore.getState().customPresets[0].id;
    const updatedParams: CalculatorParams = { ...sampleCalcParams, doseG: 20 };
    useCaffeineStore.getState().updateCustomPreset(id, { calculatorParams: updatedParams });
    const preset = useCaffeineStore.getState().customPresets[0];
    expect(preset.calculatorParams).toEqual(updatedParams);
    expect(preset.calculatorParams!.doseG).toBe(20);
  });

  it('preserves existing calculatorParams when updating only name', () => {
    useCaffeineStore.getState().addCustomPreset('Old Name', 63, sampleCalcParams);
    const id = useCaffeineStore.getState().customPresets[0].id;
    useCaffeineStore.getState().updateCustomPreset(id, { name: 'New Name' });
    const preset = useCaffeineStore.getState().customPresets[0];
    expect(preset.name).toBe('New Name');
    expect(preset.calculatorParams).toEqual(sampleCalcParams);
  });

  it('existing presets without calculatorParams have undefined calculatorParams', () => {
    useCaffeineStore.getState().addCustomPreset('Simple Drink', 50);
    const preset = useCaffeineStore.getState().customPresets[0];
    expect(preset.calculatorParams).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// removeCustomPreset
// ---------------------------------------------------------------------------
describe('removeCustomPreset', () => {
  it('removes the matching preset and leaves others intact', () => {
    const state = useCaffeineStore.getState();
    state.addCustomPreset('Keep', 50);
    useCaffeineStore.getState().addCustomPreset('Remove', 100);
    const presets = useCaffeineStore.getState().customPresets;
    const removeId = presets[1].id;
    useCaffeineStore.getState().removeCustomPreset(removeId);
    const updated = useCaffeineStore.getState().customPresets;
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Keep');
  });

  it('does not modify array with non-existent id', () => {
    useCaffeineStore.getState().addCustomPreset('Stays', 50);
    useCaffeineStore.getState().removeCustomPreset('non-existent-id');
    const { customPresets } = useCaffeineStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].name).toBe('Stays');
  });
});

// ---------------------------------------------------------------------------
// addSchedule
// ---------------------------------------------------------------------------
describe('addSchedule', () => {
  it('creates schedule with auto-generated UUID id, paused=false, lastRunDate=null', () => {
    useCaffeineStore.getState().addSchedule({
      presetId: 'drip-coffee',
      name: 'Drip Coffee',
      caffeineMg: 95,
      timeOfDay: '09:00',
      repeatDays: [1, 2, 3, 4, 5],
    });
    const { schedules } = useCaffeineStore.getState();
    expect(schedules).toHaveLength(1);
    expect(schedules[0].id).toMatch(/^[0-9a-f]{8}-/);
    expect(schedules[0].name).toBe('Drip Coffee');
    expect(schedules[0].caffeineMg).toBe(95);
    expect(schedules[0].paused).toBe(false);
    expect(schedules[0].lastRunDate).toBeNull();
  });

  it('appends to existing schedules', () => {
    const state = useCaffeineStore.getState();
    state.addSchedule({ presetId: 'drip-coffee', name: 'Coffee', caffeineMg: 95, timeOfDay: '09:00', repeatDays: [1] });
    useCaffeineStore.getState().addSchedule({ presetId: 'espresso', name: 'Espresso', caffeineMg: 63, timeOfDay: '14:00', repeatDays: [5] });
    const { schedules } = useCaffeineStore.getState();
    expect(schedules).toHaveLength(2);
    expect(schedules[0].name).toBe('Coffee');
    expect(schedules[1].name).toBe('Espresso');
  });
});

// ---------------------------------------------------------------------------
// updateSchedule
// ---------------------------------------------------------------------------
describe('updateSchedule', () => {
  it('updates matching schedule fields', () => {
    useCaffeineStore.getState().addSchedule({ presetId: 'drip-coffee', name: 'Coffee', caffeineMg: 95, timeOfDay: '09:00', repeatDays: [1, 2, 3, 4, 5] });
    const id = useCaffeineStore.getState().schedules[0].id;
    useCaffeineStore.getState().updateSchedule(id, { timeOfDay: '08:00', caffeineMg: 150 });
    const schedule = useCaffeineStore.getState().schedules[0];
    expect(schedule.timeOfDay).toBe('08:00');
    expect(schedule.caffeineMg).toBe(150);
    expect(schedule.name).toBe('Coffee'); // unchanged
  });

  it('leaves other schedules untouched', () => {
    const state = useCaffeineStore.getState();
    state.addSchedule({ presetId: 'a', name: 'A', caffeineMg: 50, timeOfDay: '08:00', repeatDays: [1] });
    useCaffeineStore.getState().addSchedule({ presetId: 'b', name: 'B', caffeineMg: 100, timeOfDay: '10:00', repeatDays: [2] });
    const id = useCaffeineStore.getState().schedules[1].id;
    useCaffeineStore.getState().updateSchedule(id, { name: 'Updated B' });
    const schedules = useCaffeineStore.getState().schedules;
    expect(schedules[0].name).toBe('A');
    expect(schedules[1].name).toBe('Updated B');
  });
});

// ---------------------------------------------------------------------------
// removeSchedule
// ---------------------------------------------------------------------------
describe('removeSchedule', () => {
  it('removes matching schedule, keeps others', () => {
    const state = useCaffeineStore.getState();
    state.addSchedule({ presetId: 'a', name: 'Keep', caffeineMg: 50, timeOfDay: '08:00', repeatDays: [1] });
    useCaffeineStore.getState().addSchedule({ presetId: 'b', name: 'Remove', caffeineMg: 100, timeOfDay: '10:00', repeatDays: [2] });
    const removeId = useCaffeineStore.getState().schedules[1].id;
    useCaffeineStore.getState().removeSchedule(removeId);
    const { schedules } = useCaffeineStore.getState();
    expect(schedules).toHaveLength(1);
    expect(schedules[0].name).toBe('Keep');
  });
});

// ---------------------------------------------------------------------------
// toggleSchedulePause
// ---------------------------------------------------------------------------
describe('toggleSchedulePause', () => {
  it('flips paused from false to true', () => {
    useCaffeineStore.getState().addSchedule({ presetId: 'a', name: 'Coffee', caffeineMg: 95, timeOfDay: '09:00', repeatDays: [1] });
    const id = useCaffeineStore.getState().schedules[0].id;
    expect(useCaffeineStore.getState().schedules[0].paused).toBe(false);
    useCaffeineStore.getState().toggleSchedulePause(id);
    expect(useCaffeineStore.getState().schedules[0].paused).toBe(true);
  });

  it('flips paused from true to false', () => {
    useCaffeineStore.getState().addSchedule({ presetId: 'a', name: 'Coffee', caffeineMg: 95, timeOfDay: '09:00', repeatDays: [1] });
    const id = useCaffeineStore.getState().schedules[0].id;
    useCaffeineStore.getState().toggleSchedulePause(id); // false -> true
    useCaffeineStore.getState().toggleSchedulePause(id); // true -> false
    expect(useCaffeineStore.getState().schedules[0].paused).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runCatchUp
// ---------------------------------------------------------------------------
describe('runCatchUp', () => {
  // Friday, March 27, 2026 at 10:00 AM local time
  const FRIDAY_10AM = new Date('2026-03-27T10:00:00').getTime();

  it('adds drinks and updates lastRunDate for matching schedules', () => {
    useCaffeineStore.getState().addSchedule({
      presetId: 'drip-coffee',
      name: 'Drip Coffee',
      caffeineMg: 95,
      timeOfDay: '09:00',
      repeatDays: [5], // Friday
    });
    useCaffeineStore.getState().runCatchUp(FRIDAY_10AM);
    const state = useCaffeineStore.getState();
    expect(state.drinks).toHaveLength(1);
    expect(state.drinks[0].name).toBe('Drip Coffee');
    expect(state.drinks[0].caffeineMg).toBe(95);
    expect(state.schedules[0].lastRunDate).toBe('2026-03-27');
  });

  it('returns count of drinks logged', () => {
    useCaffeineStore.getState().addSchedule({
      presetId: 'a',
      name: 'Coffee 1',
      caffeineMg: 95,
      timeOfDay: '07:00',
      repeatDays: [5],
    });
    useCaffeineStore.getState().addSchedule({
      presetId: 'b',
      name: 'Coffee 2',
      caffeineMg: 63,
      timeOfDay: '09:30',
      repeatDays: [5],
    });
    const count = useCaffeineStore.getState().runCatchUp(FRIDAY_10AM);
    expect(count).toBe(2);
  });

  it('returns 0 when no schedules match', () => {
    useCaffeineStore.getState().addSchedule({
      presetId: 'a',
      name: 'Monday Coffee',
      caffeineMg: 95,
      timeOfDay: '09:00',
      repeatDays: [1], // Monday only, but it's Friday
    });
    const count = useCaffeineStore.getState().runCatchUp(FRIDAY_10AM);
    expect(count).toBe(0);
    expect(useCaffeineStore.getState().drinks).toHaveLength(0);
  });

  it('is idempotent (running twice same day produces no additional drinks)', () => {
    useCaffeineStore.getState().addSchedule({
      presetId: 'drip-coffee',
      name: 'Coffee',
      caffeineMg: 95,
      timeOfDay: '09:00',
      repeatDays: [5],
    });
    const count1 = useCaffeineStore.getState().runCatchUp(FRIDAY_10AM);
    expect(count1).toBe(1);
    expect(useCaffeineStore.getState().drinks).toHaveLength(1);

    const count2 = useCaffeineStore.getState().runCatchUp(FRIDAY_10AM);
    expect(count2).toBe(0);
    expect(useCaffeineStore.getState().drinks).toHaveLength(1); // still just 1
  });
});
