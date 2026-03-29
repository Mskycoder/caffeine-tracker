// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCaffeineStore } from '../store/caffeine-store';
import { CustomDrinkForm } from './CustomDrinkForm';

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
};

const FIXED_TIMESTAMP = 1711382400000;
const getTimestamp = () => FIXED_TIMESTAMP;
const getDurationMinutes = () => 0;

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
  });
});

describe('CustomDrinkForm', () => {
  it('submitting with valid mg logs a drink', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);

    await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    expect(drinks[0].caffeineMg).toBe(100);
    expect(drinks[0].startedAt).toBe(FIXED_TIMESTAMP);
  });

  it('name defaults to "Custom" when left blank', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);

    await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks[0].name).toBe('Custom');
  });

  it('custom name is used when provided', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);

    await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
    await user.type(screen.getByLabelText('Drink name'), 'My Coffee');
    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks[0].name).toBe('My Coffee');
  });

  it('form clears after submission (D-05)', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);

    const mgInput = screen.getByLabelText('Caffeine amount in mg');
    const nameInput = screen.getByLabelText('Drink name');

    await user.type(mgInput, '100');
    await user.type(nameInput, 'My Coffee');
    await user.click(screen.getByRole('button', { name: /log/i }));

    expect(mgInput).toHaveValue(null);
    expect(nameInput).toHaveValue('');
  });

  it('rejects submission when mg is empty', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);

    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(0);
  });

  describe('touch targets', () => {
    it('mg input has 44px minimum touch target', () => {
      render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);
      const input = screen.getByLabelText(/caffeine amount/i);
      expect(input.className).toContain('min-h-[44px]');
    });

    it('name input has 44px minimum touch target', () => {
      render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);
      const input = screen.getByLabelText(/drink name/i);
      expect(input.className).toContain('min-h-[44px]');
    });

    it('submit button has 44px minimum touch target', () => {
      render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);
      const btn = screen.getByRole('button', { name: /log/i });
      expect(btn.className).toContain('min-h-[44px]');
    });
  });

  describe('duration integration', () => {
    it('logged drink includes endedAt computed from getDurationMinutes', async () => {
      const getDuration30 = () => 30;
      const user = userEvent.setup();
      render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDuration30} />);

      await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
      await user.click(screen.getByRole('button', { name: /log/i }));

      const { drinks } = useCaffeineStore.getState();
      expect(drinks).toHaveLength(1);
      expect(drinks[0].startedAt).toBe(FIXED_TIMESTAMP);
      expect(drinks[0].endedAt).toBe(FIXED_TIMESTAMP + 30 * 60_000);
    });

    it('instant duration sets endedAt equal to startedAt', async () => {
      const user = userEvent.setup();
      render(<CustomDrinkForm getTimestamp={getTimestamp} getDurationMinutes={getDurationMinutes} />);

      await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
      await user.click(screen.getByRole('button', { name: /log/i }));

      const { drinks } = useCaffeineStore.getState();
      expect(drinks).toHaveLength(1);
      expect(drinks[0].endedAt).toBe(drinks[0].startedAt);
    });
  });
});
