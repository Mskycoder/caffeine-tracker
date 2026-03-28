// @vitest-environment happy-dom
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useCaffeineStore } from '../store/caffeine-store';
import { DrinkPresets } from './DrinkPresets';

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

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
    customPresets: [],
  });
});

describe('DrinkPresets', () => {
  it('renders all 12 preset cards', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('Double Espresso')).toBeInTheDocument();
    expect(screen.getByText('Drip Coffee')).toBeInTheDocument();
    expect(screen.getByText('Pour-Over')).toBeInTheDocument();
    expect(screen.getByText('Cold Brew')).toBeInTheDocument();
    expect(screen.getByText('Latte')).toBeInTheDocument();
    expect(screen.getByText('Black Tea')).toBeInTheDocument();
    expect(screen.getByText('Green Tea')).toBeInTheDocument();
    expect(screen.getByText('Matcha')).toBeInTheDocument();
    expect(screen.getByText('Energy Drink')).toBeInTheDocument();
    expect(screen.getByText('Cola')).toBeInTheDocument();
    expect(screen.getByText('Caffeine Pill')).toBeInTheDocument();
  });

  it('each card shows caffeine amount', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);
    // 63mg appears twice (Espresso and Latte)
    expect(screen.getAllByText('63mg')).toHaveLength(2);
    // 200mg appears twice (Cold Brew and Caffeine Pill)
    expect(screen.getAllByText('200mg')).toHaveLength(2);
    expect(screen.getByText('95mg')).toBeInTheDocument();
  });

  it('two taps required: first selects, second confirms and logs', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // First tap: select (no drink logged yet)
    fireEvent.click(screen.getByText('Espresso'));
    expect(useCaffeineStore.getState().drinks).toHaveLength(0);
    expect(screen.getByText('Confirm')).toBeInTheDocument();

    // Second tap: confirm and log
    fireEvent.click(screen.getByText('Espresso'));
    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    expect(drinks[0].name).toBe('Espresso');
    expect(drinks[0].caffeineMg).toBe(63);
    expect(drinks[0].presetId).toBe('espresso');
    expect(drinks[0].timestamp).toBe(FIXED_TIMESTAMP);
    expect(screen.getByText('Logged')).toBeInTheDocument();
  });

  it('post-log flash appears after confirm', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // Two taps: select then confirm
    fireEvent.click(screen.getByText('Espresso'));
    fireEvent.click(screen.getByText('Espresso'));

    expect(screen.getByText('Logged')).toBeInTheDocument();
  });

  it('taps blocked during post-log flash', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // Two taps: select then confirm to log Espresso
    fireEvent.click(screen.getByText('Espresso'));
    fireEvent.click(screen.getByText('Espresso'));
    expect(useCaffeineStore.getState().drinks).toHaveLength(1);

    // Try to tap Cold Brew during flash (should be blocked)
    fireEvent.click(screen.getByText('Cold Brew'));
    expect(useCaffeineStore.getState().drinks).toHaveLength(1);
  });

  it('first tap selects preset with purple confirmation state', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // Click Espresso once
    fireEvent.click(screen.getByText('Espresso'));

    // "Confirm" should appear, Espresso's "63mg" should be replaced by "Confirm"
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    // Espresso's 63mg is replaced by Confirm, but Latte still shows 63mg
    expect(screen.getAllByText('63mg')).toHaveLength(1);
    // No drink should be logged
    expect(useCaffeineStore.getState().drinks).toHaveLength(0);
  });

  it('selection auto-reverts after 3 seconds', () => {
    vi.useFakeTimers();
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    fireEvent.click(screen.getByText('Espresso'));
    expect(screen.getByText('Confirm')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    // Espresso's 63mg should be back (plus Latte's 63mg = 2 total)
    expect(screen.getAllByText('63mg')).toHaveLength(2);
    vi.useRealTimers();
  });

  it('tapping a different preset swaps selection', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // Select Espresso
    fireEvent.click(screen.getByText('Espresso'));
    expect(screen.getByText('Confirm')).toBeInTheDocument();

    // Swap to Cold Brew
    fireEvent.click(screen.getByText('Cold Brew'));
    // Only one "Confirm" should exist
    expect(screen.getAllByText('Confirm')).toHaveLength(1);
    // Espresso should revert to idle (63mg visible again alongside Latte's 63mg)
    expect(screen.getAllByText('63mg')).toHaveLength(2);
    // No drinks logged
    expect(useCaffeineStore.getState().drinks).toHaveLength(0);
  });

  it('only one preset selected at a time', () => {
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // Select Espresso
    fireEvent.click(screen.getByText('Espresso'));
    // Select Drip Coffee
    fireEvent.click(screen.getByText('Drip Coffee'));

    expect(screen.getAllByText('Confirm')).toHaveLength(1);
  });

  describe('without custom presets', () => {
    it('does NOT render "My Drinks" heading when customPresets is empty', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.queryByText('My Drinks')).not.toBeInTheDocument();
    });

    it('built-in section shows "Drinks" heading (not "Built-in") when no custom presets', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.getByText('Drinks')).toBeInTheDocument();
      expect(screen.queryByText('Built-in')).not.toBeInTheDocument();
    });
  });

  describe('with custom presets', () => {
    beforeEach(() => {
      useCaffeineStore.setState({
        drinks: [],
        settings: { ...DEFAULT_SETTINGS },
        customPresets: [
          { id: 'custom-test-1', name: 'My Latte', caffeineMg: 80 },
          { id: 'custom-test-2', name: 'Afternoon Brew', caffeineMg: 120 },
        ],
      });
    });

    it('renders "My Drinks" section heading when custom presets exist', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.getByText('My Drinks')).toBeInTheDocument();
    });

    it('renders custom preset names and their caffeine amounts', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.getByText('My Latte')).toBeInTheDocument();
      // 80mg appears twice: custom "My Latte" and built-in "Energy Drink"
      expect(screen.getAllByText('80mg').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Afternoon Brew')).toBeInTheDocument();
      expect(screen.getByText('120mg')).toBeInTheDocument();
    });

    it('renders "Built-in" section heading (not "Drinks") when custom presets exist', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.getByText('Built-in')).toBeInTheDocument();
      expect(screen.queryByText('Drinks')).not.toBeInTheDocument();
    });

    it('clicking a custom preset: two taps to log', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);

      // First tap: select
      fireEvent.click(screen.getByText('My Latte'));
      expect(useCaffeineStore.getState().drinks).toHaveLength(0);

      // Second tap: confirm
      fireEvent.click(screen.getByText('My Latte'));
      const { drinks } = useCaffeineStore.getState();
      expect(drinks).toHaveLength(1);
      expect(drinks[0].name).toBe('My Latte');
      expect(drinks[0].caffeineMg).toBe(80);
      expect(drinks[0].presetId).toBe('custom-test-1');
    });

    it('confirmation flash works for custom presets', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);

      // Two taps: select then confirm
      fireEvent.click(screen.getByText('Afternoon Brew'));
      fireEvent.click(screen.getByText('Afternoon Brew'));

      expect(screen.getByText('Logged')).toBeInTheDocument();
    });

    it('custom preset cards do NOT have edit/delete buttons (no Pencil/Trash2 icons)', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      // No edit or delete aria-labels should exist in the DrinkPresets component
      expect(screen.queryByLabelText(/Edit/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Delete/)).not.toBeInTheDocument();
    });
  });

  describe('hidden preset filtering', () => {
    it('hides built-in presets that are in hiddenPresetIds', () => {
      useCaffeineStore.setState({
        settings: { ...DEFAULT_SETTINGS, hiddenPresetIds: ['espresso', 'latte'] },
        customPresets: [],
      });
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.queryByText('Espresso')).not.toBeInTheDocument();
      expect(screen.queryByText('Latte')).not.toBeInTheDocument();
      expect(screen.getByText('Drip Coffee')).toBeInTheDocument();
    });

    it('does not render built-in section when all presets hidden', () => {
      const allIds = [
        'espresso', 'double-espresso', 'drip-coffee', 'pour-over',
        'cold-brew', 'latte', 'black-tea', 'green-tea',
        'matcha', 'energy-drink', 'cola', 'caffeine-pill',
      ];
      useCaffeineStore.setState({
        settings: { ...DEFAULT_SETTINGS, hiddenPresetIds: allIds },
        customPresets: [],
      });
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      expect(screen.queryByText('Built-in')).not.toBeInTheDocument();
      expect(screen.queryByText('Drinks')).not.toBeInTheDocument();
    });
  });
});
