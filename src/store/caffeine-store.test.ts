// @vitest-environment happy-dom
import { useCaffeineStore, type CaffeineState } from './caffeine-store';

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
};

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
    customPresets: [],
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

  it('version is 4', () => {
    const options = useCaffeineStore.persist.getOptions();
    expect(options.version).toBe(4);
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

  it('migrates v1 state to v4 (chained): targetBedtime, customPresets, metabolismMode, covariates', () => {
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

  it('returns v4 state unchanged', () => {
    const v4State = {
      drinks: [],
      settings: { ...DEFAULT_SETTINGS },
      customPresets: [{ id: 'custom-abc', name: 'My Drink', caffeineMg: 100 }],
    };
    const options = useCaffeineStore.persist.getOptions();
    const result = options.migrate!(v4State, 4) as CaffeineState;
    expect(result.settings.targetBedtime).toBe('00:00');
    expect(result.settings.metabolismMode).toBe('simple');
    expect(result.customPresets).toHaveLength(1);
    expect(result.customPresets[0].name).toBe('My Drink');
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
