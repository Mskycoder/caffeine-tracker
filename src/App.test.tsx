// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
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

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });

  useCaffeineStore.setState({
    drinks: [],
    settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null },
  });
});

describe('App layout', () => {
  it('renders Header', () => {
    render(<App />);
    expect(screen.getByText('Caffeine Tracker')).toBeInTheDocument();
  });

  it('renders CaffeineStatus', () => {
    render(<App />);
    expect(screen.getByText('Current Caffeine')).toBeInTheDocument();
  });

  it('renders DecayCurveChart', () => {
    render(<App />);
    expect(screen.getByText('Caffeine Level')).toBeInTheDocument();
  });

  it('renders DrinkHistory', () => {
    render(<App />);
    expect(screen.getByText("Today's Drinks")).toBeInTheDocument();
  });

  it('renders SettingsPanel', () => {
    render(<App />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('does NOT render DrinkLogger content when modal is closed', () => {
    render(<App />);
    // DrinkLogger presets are conditionally rendered only when modal is open
    // "Espresso" comes from DrinkPresets inside DrinkLogger -- should not appear when closed
    expect(screen.queryByText('Espresso')).toBeNull();
  });

  it('renders DrinkLoggerModal FAB', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /log a drink/i })).toBeInTheDocument();
  });

  it('layout order: CaffeineStatus before DecayCurveChart before DrinkHistory', () => {
    render(<App />);
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
});
