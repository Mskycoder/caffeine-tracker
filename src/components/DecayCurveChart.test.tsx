// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { DecayCurveChart } from './DecayCurveChart';
import { useCaffeineStore } from '../store/caffeine-store';
import * as caffeineEngine from '../engine/caffeine';
import type { ReactNode } from 'react';

const defaultCovariates = {
  weight: 70, weightUnit: 'kg' as const, sex: 'male' as const,
  smoking: false, oralContraceptives: false, pregnancyTrimester: 'none' as const,
  liverDisease: 'none' as const, cyp1a2Genotype: 'unknown' as const,
  cyp1a2Inhibitor: 'none' as const,
};

// Fixed "now" for deterministic tests: 2024-06-15 12:00:00 UTC
const FIXED_NOW = new Date('2024-06-15T12:00:00Z').getTime();

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => FIXED_NOW,
}));

// Mock ResponsiveContainer since it requires real DOM dimensions.
// Recharts SVG rendering is incomplete in happy-dom, so we test data flow via spies.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('DecayCurveChart', () => {
  beforeEach(() => {
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null, metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });
  });

  it('renders chart container', () => {
    render(<DecayCurveChart />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders Caffeine Level heading', () => {
    render(<DecayCurveChart />);
    expect(screen.getByText('Caffeine Level')).toBeInTheDocument();
  });

  it('calls generateStackedCurveData with correct 48h window', () => {
    const spy = vi.spyOn(caffeineEngine, 'generateStackedCurveData');

    render(<DecayCurveChart />);

    expect(spy).toHaveBeenCalledTimes(1);
    const [drinks, startTime, endTime, stepMs, halfLifeHours] = spy.mock.calls[0];

    // 24h window on each side of FIXED_NOW
    const dayMs = 24 * 60 * 60 * 1000;
    expect(startTime).toBe(FIXED_NOW - dayMs);
    expect(endTime).toBe(FIXED_NOW + dayMs);
    expect(stepMs).toBe(5 * 60_000); // PROJECTION_STEP_MS
    expect(halfLifeHours).toBe(5);
    expect(drinks).toEqual([]);

    spy.mockRestore();
  });

  it('chart container has responsive height classes', () => {
    render(<DecayCurveChart />);
    const container = screen.getByTestId('responsive-container').parentElement;
    expect(container?.className).toContain('h-[220px]');
    expect(container?.className).toContain('sm:h-[300px]');
  });

  it('passes store drinks to generateStackedCurveData', () => {
    const testDrinks = [{
      id: 'test-1',
      name: 'Espresso',
      caffeineMg: 200,
      timestamp: FIXED_NOW - 3_600_000,
      presetId: 'espresso',
    }];

    useCaffeineStore.setState({ drinks: testDrinks });

    const spy = vi.spyOn(caffeineEngine, 'generateStackedCurveData');

    render(<DecayCurveChart />);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual(testDrinks);

    spy.mockRestore();
  });

  // --- Bedtime vertical line tests (BED-02) ---

  it('calls parseNextBedtime when targetBedtime is set', () => {
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-bed-1',
        name: 'Espresso',
        caffeineMg: 200,
        timestamp: FIXED_NOW - 3_600_000,
        presetId: 'espresso',
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '23:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    const spy = vi.spyOn(caffeineEngine, 'parseNextBedtime');

    render(<DecayCurveChart />);

    expect(spy).toHaveBeenCalledWith('23:00', FIXED_NOW);

    spy.mockRestore();
  });

  it('calls getCaffeineLevel with bedtime timestamp when targetBedtime is set', () => {
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-bed-2',
        name: 'Espresso',
        caffeineMg: 200,
        timestamp: FIXED_NOW - 3_600_000,
        presetId: 'espresso',
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '23:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    const spy = vi.spyOn(caffeineEngine, 'getCaffeineLevel');

    render(<DecayCurveChart />);

    // parseNextBedtime('23:00', FIXED_NOW) returns the next 11 PM occurrence
    const expectedBedtimeMs = caffeineEngine.parseNextBedtime('23:00', FIXED_NOW);
    // getCaffeineLevel should be called with bedtime timestamp (among other calls)
    const bedtimeCall = spy.mock.calls.find((call) => call[1] === expectedBedtimeMs);
    expect(bedtimeCall).toBeDefined();

    spy.mockRestore();
  });

  it('does not call parseNextBedtime when targetBedtime is null', () => {
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null, metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    const spy = vi.spyOn(caffeineEngine, 'parseNextBedtime');
    spy.mockClear(); // Ensure clean slate from any prior test spies

    render(<DecayCurveChart />);

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  // --- Research threshold line tests (THRS-02) ---

  it('renders without error when showResearchThresholds is false', () => {
    // Default settings have showResearchThresholds: false
    render(<DecayCurveChart />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    // No research line labels should be present
    expect(screen.queryByText(/Autonomic:/)).toBeNull();
    expect(screen.queryByText(/Deep sleep:/)).toBeNull();
  });

  it('renders without error when showResearchThresholds is true', () => {
    useCaffeineStore.setState({
      drinks: [],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: null,
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: true, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });

    // Should render without throwing, even though Recharts ReferenceLine rendering
    // in happy-dom may not produce visible SVG text for labels
    render(<DecayCurveChart />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
