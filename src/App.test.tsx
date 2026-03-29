// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import App from './App';
import { useCaffeineStore } from './store/caffeine-store';

vi.mock('./hooks/useCurrentTime', () => ({
  useCurrentTime: () => new Date('2026-03-25T14:00:00').getTime(),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

/**
 * Helper to render App within a MemoryRouter at a given route.
 * Uses MemoryRouter so tests don't need a real browser history.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: {
      halfLifeHours: 5,
      thresholdMg: 50,
      targetBedtime: null,
      metabolismMode: 'simple' as const,
      covariates: {
        weight: 70, weightUnit: 'kg' as const, sex: 'male' as const,
        smoking: false, oralContraceptives: false, pregnancyTrimester: 'none' as const,
        liverDisease: 'none' as const, cyp1a2Genotype: 'unknown' as const,
        cyp1a2Inhibitor: 'none' as const,
      },
      hiddenPresetIds: [],
      showResearchThresholds: false,
      caffeineSensitivity: 'normal' as const,
      thresholdSource: 'manual' as const,
      lastCallDrinkId: null,
    },
  });
});

describe('routing', () => {
  it('/ renders Dashboard page with CaffeineStatus', () => {
    renderAt('/');
    expect(screen.getByText('Current Caffeine')).toBeInTheDocument();
  });

  it('/ renders Dashboard page with DecayCurveChart', () => {
    renderAt('/');
    expect(screen.getByText('Caffeine Level')).toBeInTheDocument();
  });

  it('/ renders Dashboard page with DrinkHistory', () => {
    renderAt('/');
    expect(screen.getByText("Today's Drinks")).toBeInTheDocument();
  });

  it('/drinks renders Drinks page with MyDrinksManager', () => {
    renderAt('/drinks');
    expect(screen.getByText('My Drinks')).toBeInTheDocument();
  });

  it('/history renders History page with filter chips', () => {
    renderAt('/history');
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
  });

  it('/settings renders Settings page with settings controls', () => {
    renderAt('/settings');
    expect(screen.getByText('Metabolism Speed')).toBeInTheDocument();
  });

  it('/unknown redirects to Dashboard', () => {
    renderAt('/nonexistent');
    expect(screen.getByText('Current Caffeine')).toBeInTheDocument();
  });
});

describe('navigation', () => {
  it('renders TabBar with navigation links', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders add drink button in TabBar', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: /log a drink/i })).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('Dashboard: CaffeineStatus before DecayCurveChart before DrinkHistory', () => {
    renderAt('/');
    const html = document.body.innerHTML;

    const statusPos = html.indexOf('Current Caffeine');
    const chartPos = html.indexOf('Caffeine Level');
    const historyPos = html.indexOf("Today&#39;s Drinks") !== -1
      ? html.indexOf("Today&#39;s Drinks")
      : html.indexOf("Today's Drinks");

    expect(statusPos).toBeGreaterThan(-1);
    expect(chartPos).toBeGreaterThan(-1);
    expect(historyPos).toBeGreaterThan(-1);
    expect(statusPos).toBeLessThan(chartPos);
    expect(chartPos).toBeLessThan(historyPos);
  });

  it('does NOT render DrinkLogger content when bottom sheet is closed', () => {
    renderAt('/');
    // DrinkLogger presets are conditionally rendered only when sheet is open
    // "Espresso" comes from DrinkPresets inside DrinkLogger -- should not appear when closed
    expect(screen.queryByText('Espresso')).toBeNull();
  });
});
