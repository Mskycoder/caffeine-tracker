// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCaffeineStore } from '../store/caffeine-store';
import { DrinkLogger } from './DrinkLogger';

import { DEFAULT_COVARIATES } from '../engine/types';

const DEFAULT_SETTINGS = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: null,
  metabolismMode: 'simple' as const,
  covariates: { ...DEFAULT_COVARIATES },
  hiddenPresetIds: [] as string[],
  showResearchThresholds: false,
  caffeineSensitivity: 'normal' as const,
  thresholdSource: 'manual' as const,
  lastCallDrinkId: null,
};

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
  });
});

describe('DrinkLogger', () => {
  it('renders both preset list and custom form', () => {
    render(<DrinkLogger />);
    // Preset list renders
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    // Custom form renders
    expect(screen.getByRole('button', { name: /log/i })).toBeInTheDocument();
  });

  it('renders time preset chips with Now selected by default', () => {
    render(<DrinkLogger />);
    const nowChip = screen.getByRole('button', { name: 'Now' });
    expect(nowChip).toBeInTheDocument();
    expect(nowChip.className).toContain('border-purple-600');
    // Other chips should be unselected
    const plus15 = screen.getByRole('button', { name: '+15m' });
    expect(plus15.className).toContain('border-gray-200');
    // All 5 chips present
    expect(screen.getByRole('button', { name: '+30m' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+1h' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
  });

  it('selecting +15m chip logs drink with future timestamp', async () => {
    const user = userEvent.setup();
    render(<DrinkLogger />);

    // Select +15m chip
    await user.click(screen.getByRole('button', { name: '+15m' }));

    // +15m chip should now be selected
    const plus15 = screen.getByRole('button', { name: '+15m' });
    expect(plus15.className).toContain('border-purple-600');

    // Now chip should be deselected
    const nowChip = screen.getByRole('button', { name: 'Now' });
    expect(nowChip.className).toContain('border-gray-200');

    // Two-tap to log a drink (first tap selects, second tap confirms)
    await user.click(screen.getByText('Espresso'));
    await user.click(screen.getByText('Espresso'));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    // The timestamp should be ~15 minutes in the future (within 5 seconds tolerance)
    const expectedTs = Date.now() + 15 * 60_000;
    expect(Math.abs(drinks[0].startedAt - expectedTs)).toBeLessThan(5000);
  });

  it('tapping selected chip deselects it back to Now', async () => {
    const user = userEvent.setup();
    render(<DrinkLogger />);

    // Select +30m chip
    await user.click(screen.getByRole('button', { name: '+30m' }));
    expect(screen.getByRole('button', { name: '+30m' }).className).toContain('border-purple-600');

    // Tap +30m again to deselect
    await user.click(screen.getByRole('button', { name: '+30m' }));

    // Now should be implicitly active (selected style)
    expect(screen.getByRole('button', { name: 'Now' }).className).toContain('border-purple-600');
    expect(screen.getByRole('button', { name: '+30m' }).className).toContain('border-gray-200');
  });

  it('Custom chip reveals datetime-local input', async () => {
    const user = userEvent.setup();
    render(<DrinkLogger />);

    // datetime-local input should NOT be visible initially
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();

    // Click Custom chip
    await user.click(screen.getByRole('button', { name: 'Custom' }));

    // datetime-local input should now be visible
    const input = document.querySelector('input[type="datetime-local"]');
    expect(input).not.toBeNull();

    // Custom chip should be selected
    expect(screen.getByRole('button', { name: 'Custom' }).className).toContain('border-purple-600');
  });

  it('Custom chip with entered time uses that timestamp for drink logging', async () => {
    const user = userEvent.setup();
    render(<DrinkLogger />);

    // Select Custom chip
    await user.click(screen.getByRole('button', { name: 'Custom' }));

    // Enter a specific time
    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '2024-03-25T14:30');

    // Log a drink
    await user.click(screen.getByText('Espresso'));
    await user.click(screen.getByText('Espresso'));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    const expectedTs = new Date('2024-03-25T14:30').getTime();
    expect(drinks[0].startedAt).toBe(expectedTs);
  });

  describe('duration chips', () => {
    it('renders 5 duration chips with correct labels', () => {
      render(<DrinkLogger />);
      expect(screen.getByRole('button', { name: 'Instant' })).toBeInTheDocument();
      // Note: '5m' and '15m' also exist as time chips (+15m), so use getAllByRole
      const buttons = screen.getAllByRole('button');
      const durationLabels = ['Instant', '5m', '15m', '30m'];
      durationLabels.forEach((label) => {
        // Find the exact button (duration chips don't have + prefix)
        const matches = buttons.filter((b) => b.textContent === label);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
      // '1h' appears in both time and duration chips
      const oneHourButtons = buttons.filter((b) => b.textContent === '1h');
      expect(oneHourButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('Instant is selected by default with purple styling', () => {
      render(<DrinkLogger />);
      const instantChip = screen.getByRole('button', { name: 'Instant' });
      expect(instantChip.className).toContain('border-purple-600');
    });

    it('tapping a duration chip selects it and deselects Instant', async () => {
      const user = userEvent.setup();
      render(<DrinkLogger />);

      // Find the duration "15m" chip (not the time "+15m" chip)
      const buttons = screen.getAllByRole('button');
      const duration15m = buttons.find((b) => b.textContent === '15m')!;
      await user.click(duration15m);

      expect(duration15m.className).toContain('border-purple-600');
      expect(screen.getByRole('button', { name: 'Instant' }).className).toContain('border-gray-200');
    });

    it('tapping already-selected duration chip reverts to Instant', async () => {
      const user = userEvent.setup();
      render(<DrinkLogger />);

      const buttons = screen.getAllByRole('button');
      const duration30m = buttons.find((b) => b.textContent === '30m' && !b.textContent?.includes('+'))!;
      // Select 30m
      await user.click(duration30m);
      expect(duration30m.className).toContain('border-purple-600');

      // Tap again to deselect
      await user.click(duration30m);
      expect(screen.getByRole('button', { name: 'Instant' }).className).toContain('border-purple-600');
      expect(duration30m.className).toContain('border-gray-200');
    });

    it('renders Duration section label', () => {
      render(<DrinkLogger />);
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });
  });
});
