// @vitest-environment happy-dom
import { useCaffeineStore } from './caffeine-store';

const DEFAULT_SETTINGS = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: null,
};

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
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
    expect(settings.targetBedtime).toBeNull();
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
    expect(settings.targetBedtime).toBeNull();
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

  it('version is 1', () => {
    const options = useCaffeineStore.persist.getOptions();
    expect(options.version).toBe(1);
  });
});
