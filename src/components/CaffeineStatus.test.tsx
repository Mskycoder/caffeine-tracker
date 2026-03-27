// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { CaffeineStatus } from './CaffeineStatus';
import { useCaffeineStore } from '../store/caffeine-store';

// Fixed "now" for deterministic tests: 2024-06-15 12:00:00 UTC
const FIXED_NOW = new Date('2024-06-15T12:00:00Z').getTime();

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => FIXED_NOW,
}));

describe('CaffeineStatus', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00' },
    });
  });

  it('displays current caffeine level in mg', () => {
    // 200mg espresso logged 1 hour ago -- should be partially decayed (between 100-200mg)
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-1',
        name: 'Espresso',
        caffeineMg: 200,
        timestamp: FIXED_NOW - 3_600_000, // 1 hour ago
        presetId: 'espresso',
      }],
    });

    render(<CaffeineStatus />);

    // Should display a number followed by "mg"
    const mgText = screen.getByText('mg');
    expect(mgText).toBeInTheDocument();

    // The parent element should contain a rounded number > 100 and < 200
    const bigNumber = mgText.closest('p')!;
    const numericValue = parseInt(bigNumber.textContent!, 10);
    expect(numericValue).toBeGreaterThan(100);
    expect(numericValue).toBeLessThan(200);
  });

  it('shows on-track message when above threshold but will clear before bedtime', () => {
    // 200mg drink 1 hour ago with default bedtime 00:00 (midnight, 12h away).
    // Sleep-ready ~10 PM, well before midnight -> "On track for your 12:00 AM bedtime"
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-2',
        name: 'Espresso',
        caffeineMg: 200,
        timestamp: FIXED_NOW - 3_600_000,
        presetId: 'espresso',
      }],
    });

    render(<CaffeineStatus />);

    // Should show bedtime-contextualized "On track" message
    const onTrackText = screen.getByText(/On track for your/);
    expect(onTrackText).toBeInTheDocument();
    expect(onTrackText.textContent).toMatch(/On track for your \d{1,2}:\d{2} [AP]M bedtime/);
  });

  it('shows warning when caffeine will not clear before bedtime', () => {
    // Huge recent dose with bedtime only 2 hours away -> won't clear in time.
    // Use a bedtime 2 hours from now. FIXED_NOW is noon UTC, so bedtime at 2 PM = '14:00'.
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-wont-clear',
        name: 'Energy Drink',
        caffeineMg: 500,
        timestamp: FIXED_NOW - 3_600_000, // 1 hour ago
        presetId: null,
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '14:00' },
    });

    render(<CaffeineStatus />);

    // Sleep-ready time will be many hours from now, well past 2 PM bedtime
    const warningText = screen.getByText(/Won't be clear until/);
    expect(warningText).toBeInTheDocument();
    expect(warningText.textContent).toMatch(/Won't be clear until \d{1,2}:\d{2} [AP]M/);
  });

  it('shows clear to sleep when below threshold', () => {
    // 10mg drink logged 10 hours ago -- should be well below 50mg threshold
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-3',
        name: 'Tea',
        caffeineMg: 10,
        timestamp: FIXED_NOW - 36_000_000, // 10 hours ago
        presetId: 'tea',
      }],
    });

    render(<CaffeineStatus />);

    expect(screen.getByText("You're clear to sleep")).toBeInTheDocument();
  });

  it('shows 0 mg when no drinks logged', () => {
    render(<CaffeineStatus />);

    // With no drinks, caffeine is 0
    const mgText = screen.getByText('mg');
    const bigNumber = mgText.closest('p')!;
    expect(bigNumber.textContent).toContain('0');

    expect(screen.getByText("You're clear to sleep")).toBeInTheDocument();
  });

  it('shows curfew time when caffeine budget remains', () => {
    // Small drink long ago -- plenty of budget left at bedtime
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-curfew-1',
        name: 'Tea',
        caffeineMg: 30,
        timestamp: FIXED_NOW - 6 * 3_600_000, // 6 hours ago
        presetId: 'tea',
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00' },
    });

    render(<CaffeineStatus />);
    expect(screen.getByText(/Last call for caffeine/)).toBeInTheDocument();
  });

  it('shows warning when caffeine exceeds bedtime target', () => {
    // Huge dose recently -- no budget for additional caffeine
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-curfew-2',
        name: 'Mega Coffee',
        caffeineMg: 5000,
        timestamp: FIXED_NOW - 3_600_000, // 1 hour ago
        presetId: null,
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00' },
    });

    render(<CaffeineStatus />);
    expect(screen.getByText('Caffeine already above bedtime target')).toBeInTheDocument();
  });

  it('shows curfew when no drinks logged', () => {
    // No drinks -- full budget available, should show a curfew time
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '22:00' },
    });

    render(<CaffeineStatus />);
    expect(screen.getByText(/Last call for caffeine/)).toBeInTheDocument();
  });

  it('shows daily total with FDA limit', () => {
    // 200mg drink logged 1 hour ago (today)
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-daily-1',
        name: 'Cold Brew',
        caffeineMg: 200,
        timestamp: FIXED_NOW - 3_600_000,
        presetId: 'cold-brew',
      }],
    });

    render(<CaffeineStatus />);
    expect(screen.getByText(/Today:/)).toBeInTheDocument();
    expect(screen.getByText(/200mg/)).toBeInTheDocument();
    expect(screen.getByText(/400mg/)).toBeInTheDocument();
  });

  it('shows 0mg daily total when no drinks logged', () => {
    render(<CaffeineStatus />);
    const todayEl = screen.getByText(/Today:/);
    expect(todayEl).toBeInTheDocument();
    // The containing <p> should show "Today: 0mg / 400mg"
    expect(todayEl.textContent).toMatch(/Today:\s*0mg/);
  });

  it('daily total text has inline color style', () => {
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-daily-2',
        name: 'Drip Coffee',
        caffeineMg: 95,
        timestamp: FIXED_NOW - 3_600_000,
        presetId: 'drip-coffee',
      }],
    });

    render(<CaffeineStatus />);
    const todayEl = screen.getByText(/Today:/).closest('p')!;
    // dailyTotalColor returns an hsl() string -- verify inline style is applied
    expect(todayEl.getAttribute('style')).toMatch(/color:\s*hsl\(/);
  });
});
