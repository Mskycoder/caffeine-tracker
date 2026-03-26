// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { DecayCurveChart } from './DecayCurveChart';
import { useCaffeineStore } from '../store/caffeine-store';
import * as caffeineEngine from '../engine/caffeine';
import type { ReactNode } from 'react';

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
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null },
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
});
