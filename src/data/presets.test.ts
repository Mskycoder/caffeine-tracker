import { DRINK_PRESETS } from './presets';

describe('DRINK_PRESETS', () => {
  it('has exactly 12 entries', () => {
    expect(DRINK_PRESETS).toHaveLength(12);
  });

  it('all presetIds are unique', () => {
    const ids = DRINK_PRESETS.map((p) => p.presetId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all caffeineMg values are positive numbers', () => {
    for (const preset of DRINK_PRESETS) {
      expect(preset.caffeineMg).toBeGreaterThan(0);
    }
  });

  it('espresso has 63mg', () => {
    const espresso = DRINK_PRESETS.find((p) => p.presetId === 'espresso');
    expect(espresso).toBeDefined();
    expect(espresso!.caffeineMg).toBe(63);
  });

  it('pour-over has 150mg', () => {
    const pourOver = DRINK_PRESETS.find((p) => p.presetId === 'pour-over');
    expect(pourOver).toBeDefined();
    expect(pourOver!.caffeineMg).toBe(150);
  });

  it('cold-brew has 200mg', () => {
    const coldBrew = DRINK_PRESETS.find((p) => p.presetId === 'cold-brew');
    expect(coldBrew).toBeDefined();
    expect(coldBrew!.caffeineMg).toBe(200);
  });

  it('caffeine-pill has 200mg', () => {
    const pill = DRINK_PRESETS.find((p) => p.presetId === 'caffeine-pill');
    expect(pill).toBeDefined();
    expect(pill!.caffeineMg).toBe(200);
  });

  it('all entries have required fields', () => {
    for (const preset of DRINK_PRESETS) {
      expect(typeof preset.presetId).toBe('string');
      expect(preset.presetId.length).toBeGreaterThan(0);
      expect(typeof preset.name).toBe('string');
      expect(preset.name.length).toBeGreaterThan(0);
      expect(typeof preset.caffeineMg).toBe('number');
    }
  });
});
