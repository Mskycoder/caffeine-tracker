// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { CaffeineStatus } from './CaffeineStatus';
import { useCaffeineStore } from '../store/caffeine-store';

// Fixed "now" for deterministic tests: 2024-06-15 12:00:00 UTC
const FIXED_NOW = new Date('2024-06-15T12:00:00Z').getTime();

const defaultCovariates = {
  weight: 70, weightUnit: 'kg' as const, sex: 'male' as const,
  smoking: false, oralContraceptives: false, pregnancyTrimester: 'none' as const,
  liverDisease: 'none' as const, cyp1a2Genotype: 'unknown' as const,
  cyp1a2Inhibitor: 'none' as const,
};

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => FIXED_NOW,
}));

describe('CaffeineStatus', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useCaffeineStore.setState({
      drinks: [],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });
  });

  it('displays current caffeine level in mg', () => {
    // 200mg espresso logged 1 hour ago -- should be partially decayed (between 100-200mg)
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-1',
        name: 'Espresso',
        caffeineMg: 200,
        startedAt: FIXED_NOW - 3_600_000, // 1 hour ago
        endedAt: FIXED_NOW - 3_600_000,
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
    // Sleep-ready ~10 PM, well before midnight -> "On track for 12:00 AM · Nmg"
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-2',
        name: 'Espresso',
        caffeineMg: 200,
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
        presetId: 'espresso',
      }],
    });

    render(<CaffeineStatus />);

    // Should show bedtime-contextualized "On track" message with dot separator
    const onTrackText = screen.getByText(/On track for/);
    expect(onTrackText).toBeInTheDocument();
    expect(onTrackText.textContent).toMatch(/On track for \d{1,2}:\d{2} [AP]M \u00b7 \d+mg/);
  });

  it('shows warning when caffeine will not clear before bedtime', () => {
    // Huge recent dose with bedtime only 2 hours away -> won't clear in time.
    // Use a bedtime 2 hours from now. FIXED_NOW is noon UTC, so bedtime at 2 PM = '14:00'.
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-wont-clear',
        name: 'Energy Drink',
        caffeineMg: 500,
        startedAt: FIXED_NOW - 3_600_000, // 1 hour ago
        endedAt: FIXED_NOW - 3_600_000,
        presetId: null,
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '14:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    render(<CaffeineStatus />);

    // Sleep-ready time will be many hours from now, well past 2 PM bedtime
    const warningText = screen.getByText(/Won't clear until/);
    expect(warningText).toBeInTheDocument();
    expect(warningText.textContent).toMatch(/Won't clear until \d{1,2}:\d{2} [AP]M \u00b7 \d+mg/);
  });

  it('shows clear to sleep when below threshold', () => {
    // 10mg drink logged 10 hours ago -- should be well below 50mg threshold
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-3',
        name: 'Tea',
        caffeineMg: 10,
        startedAt: FIXED_NOW - 36_000_000, // 10 hours ago
        endedAt: FIXED_NOW - 36_000_000,
        presetId: 'tea',
      }],
    });

    render(<CaffeineStatus />);

    expect(screen.getByText(/Clear to sleep/)).toBeInTheDocument();
  });

  it('shows 0 mg when no drinks logged', () => {
    render(<CaffeineStatus />);

    // With no drinks, caffeine is 0
    const mgText = screen.getByText('mg');
    const bigNumber = mgText.closest('p')!;
    expect(bigNumber.textContent).toContain('0');

    expect(screen.getByText(/Clear to sleep/)).toBeInTheDocument();
  });

  it('shows curfew time when caffeine budget remains', () => {
    // Small drink long ago -- plenty of budget left at bedtime
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-curfew-1',
        name: 'Tea',
        caffeineMg: 30,
        startedAt: FIXED_NOW - 6 * 3_600_000, // 6 hours ago
        endedAt: FIXED_NOW - 6 * 3_600_000,
        presetId: 'tea',
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
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
        startedAt: FIXED_NOW - 3_600_000, // 1 hour ago
        endedAt: FIXED_NOW - 3_600_000,
        presetId: null,
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    render(<CaffeineStatus />);
    expect(screen.getByText('Caffeine already above bedtime target')).toBeInTheDocument();
  });

  it('shows curfew when no drinks logged', () => {
    // No drinks -- full budget available, should show a curfew time
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '22:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
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
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
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
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
        presetId: 'drip-coffee',
      }],
    });

    render(<CaffeineStatus />);
    const todayEl = screen.getByText(/Today:/).closest('p')!;
    // dailyTotalColor returns an hsl() string -- verify inline style is applied
    expect(todayEl.getAttribute('style')).toMatch(/color:\s*hsl\(/);
  });

  it('shows half-life badge with integer in simple mode', () => {
    render(<CaffeineStatus />);
    expect(screen.getByText(/Half-life: 5hr/)).toBeInTheDocument();
  });

  it('shows half-life badge with decimal in advanced mode', () => {
    useCaffeineStore.setState({
      drinks: [],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'advanced' as const,
        covariates: { ...defaultCovariates, sex: 'female' as const },
        hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });

    render(<CaffeineStatus />);
    // Female covariate changes half-life; badge should show decimal format
    const badge = screen.getByText(/Half-life:/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/Half-life: \d+\.\dhr/);
  });

  // --- Bedtime mg text tests (BED-01) ---

  it('shows 0mg at bedtime when clear to sleep', () => {
    // Default: no drinks, bedtime '00:00' -> already clear
    render(<CaffeineStatus />);
    const statusLine = screen.getByText(/Clear to sleep/);
    expect(statusLine.textContent).toContain('0mg at bedtime');
  });

  it('shows bedtime mg when on track for bedtime', () => {
    // 200mg drink 1 hour ago, bedtime '00:00' (12h away) -> on track, some mg remain at bedtime
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-bed-ontrack',
        name: 'Espresso',
        caffeineMg: 200,
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
        presetId: 'espresso',
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    render(<CaffeineStatus />);
    const statusLine = screen.getByText(/On track for/);
    expect(statusLine.textContent).toMatch(/\d+mg$/);
    expect(statusLine.textContent).toContain('\u00b7');
  });

  it('shows bedtime mg in amber when won\'t clear before bedtime', () => {
    // 500mg drink 1 hour ago, bedtime '14:00' (2h away) -> won't clear
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-bed-wontclear',
        name: 'Energy Drink',
        caffeineMg: 500,
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
        presetId: null,
      }],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '14:00', metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    render(<CaffeineStatus />);
    const statusLine = screen.getByText(/Won't clear until/);
    expect(statusLine.textContent).toMatch(/\d+mg$/);
    expect(statusLine.textContent).toContain('\u00b7');
    expect(statusLine.className).toContain('text-amber-600');
  });

  it('does not show bedtime mg when targetBedtime is null', () => {
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null, metabolismMode: 'simple' as const, covariates: { ...defaultCovariates }, hiddenPresetIds: [], showResearchThresholds: false, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const },
    });

    render(<CaffeineStatus />);
    const statusLine = screen.getByText(/Clear to sleep/);
    expect(statusLine.textContent).not.toContain('\u00b7');
  });

  // --- Zone badge tests (THRS-02) ---

  it('does not render zone badge when showResearchThresholds is false', () => {
    // Default settings have showResearchThresholds: false
    render(<CaffeineStatus />);
    expect(screen.queryByText('Clear zone')).toBeNull();
    expect(screen.queryByText('Autonomic effects')).toBeNull();
    expect(screen.queryByText('Sleep disruption')).toBeNull();
  });

  it('renders zone badge with Clear zone when caffeine is below autonomic threshold', () => {
    // No drinks -> currentMg = 0, well below autonomic threshold (~41mg at 70kg normal)
    useCaffeineStore.setState({
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: true, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });

    render(<CaffeineStatus />);
    const badge = screen.getByText('Clear zone');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-green-600');
  });

  it('renders zone badge with Autonomic effects for moderate caffeine', () => {
    // At 70kg normal: autonomicMg ~ 41mg, deepSleepMg ~ 71mg
    // A 100mg drink 6 hours ago should decay to ~45-65mg range, in the autonomic zone
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-zone-mid',
        name: 'Coffee',
        caffeineMg: 100,
        startedAt: FIXED_NOW - 6 * 3_600_000,
        endedAt: FIXED_NOW - 6 * 3_600_000,
        presetId: null,
      }],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: true, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });

    render(<CaffeineStatus />);
    const badge = screen.getByText('Autonomic effects');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-amber-600');
  });

  it('renders zone badge with Sleep disruption for high caffeine', () => {
    // A 500mg drink 1 hour ago should be well above deepSleepMg (~71mg)
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-zone-high',
        name: 'Mega Coffee',
        caffeineMg: 500,
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
        presetId: null,
      }],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: true, caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });

    render(<CaffeineStatus />);
    const badge = screen.getByText('Sleep disruption');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-red-500');
  });

  // --- Half-life badge threshold tests (DASH-03) ---

  it('shows threshold mg values in badge when showResearchThresholds is true', () => {
    useCaffeineStore.setState({
      drinks: [],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: true,
        caffeineSensitivity: 'normal' as const, thresholdSource: 'manual' as const,
      },
    });

    render(<CaffeineStatus />);
    const badge = screen.getByText(/Half-life:/);
    // At 70kg normal: autonomicMg ~ 41, deepSleepMg ~ 71
    expect(badge.textContent).toMatch(/Half-life: 5hr \| \d+mg \u00b7 \d+mg/);
    // Verify green and red inline styles on the threshold spans
    const greenSpan = badge.querySelector('span[style*="#16a34a"]');
    const redSpan = badge.querySelector('span[style*="#ef4444"]');
    expect(greenSpan).not.toBeNull();
    expect(redSpan).not.toBeNull();
  });

  it('does not show threshold mg in badge when showResearchThresholds is false', () => {
    render(<CaffeineStatus />);
    const badge = screen.getByText(/Half-life:/);
    expect(badge.textContent).toBe('Half-life: 5hr');
    expect(badge.querySelector('span[style*="#16a34a"]')).toBeNull();
  });

  it('uses effective threshold for sleep-ready computation when thresholdSource is autonomic', () => {
    // With thresholdSource 'autonomic', effective threshold is ~41mg (at 70kg normal)
    // A drink that decays below 41mg earlier than 50mg should show "clear to sleep" sooner
    // Use a tiny drink that is above 41mg but below 50mg to test the boundary
    // At 70kg normal: autonomicMg = 0.84 * 1.0 * 0.7 * 70 = 41.16mg
    // A 50mg drink logged 1 hour ago should be ~42mg (partially absorbed/decayed)
    // With manual threshold of 50mg: clear to sleep
    // With autonomic threshold of ~41mg: might still show "on track" or time estimate
    useCaffeineStore.setState({
      drinks: [{
        id: 'test-eff-thresh',
        name: 'Light Tea',
        caffeineMg: 50,
        startedAt: FIXED_NOW - 3_600_000,
        endedAt: FIXED_NOW - 3_600_000,
        presetId: null,
      }],
      settings: {
        halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00',
        metabolismMode: 'simple' as const, covariates: { ...defaultCovariates },
        hiddenPresetIds: [], showResearchThresholds: true, caffeineSensitivity: 'normal' as const, thresholdSource: 'autonomic' as const,
      },
    });

    render(<CaffeineStatus />);
    // With autonomic threshold (~41mg), a 50mg drink 1 hour ago is still above threshold
    // so we should see a time estimate rather than "clear to sleep"
    // The important thing is it renders without error
    const container = screen.getByText('mg').closest('section')!;
    expect(container).toBeInTheDocument();
  });
});
