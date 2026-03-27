// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCaffeineStore } from '../store/caffeine-store';
import { DrinkPresets } from './DrinkPresets';

const DEFAULT_SETTINGS = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: null,
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

  it('clicking a preset card logs drink with correct values', async () => {
    const user = userEvent.setup();
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    await user.click(screen.getByText('Espresso'));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    expect(drinks[0].name).toBe('Espresso');
    expect(drinks[0].caffeineMg).toBe(63);
    expect(drinks[0].presetId).toBe('espresso');
    expect(drinks[0].timestamp).toBe(FIXED_TIMESTAMP);
  });

  it('confirmation flash appears after tap', async () => {
    const user = userEvent.setup();
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    await user.click(screen.getByText('Espresso'));

    expect(screen.getByText('Logged')).toBeInTheDocument();
  });

  it('double-tap prevention: second click during flash does not add a second drink', async () => {
    const user = userEvent.setup();
    render(<DrinkPresets getTimestamp={getTimestamp} />);

    // First click
    await user.click(screen.getByText('Espresso'));
    expect(useCaffeineStore.getState().drinks).toHaveLength(1);

    // Second click during confirmation flash (within 1 second)
    await user.click(screen.getByText('Cold Brew'));
    expect(useCaffeineStore.getState().drinks).toHaveLength(1);
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

    it('clicking a custom preset logs drink with presetId matching the custom preset id', async () => {
      const user = userEvent.setup();
      render(<DrinkPresets getTimestamp={getTimestamp} />);

      await user.click(screen.getByText('My Latte'));

      const { drinks } = useCaffeineStore.getState();
      expect(drinks).toHaveLength(1);
      expect(drinks[0].name).toBe('My Latte');
      expect(drinks[0].caffeineMg).toBe(80);
      expect(drinks[0].presetId).toBe('custom-test-1');
      expect(drinks[0].timestamp).toBe(FIXED_TIMESTAMP);
    });

    it('confirmation flash works for custom presets', async () => {
      const user = userEvent.setup();
      render(<DrinkPresets getTimestamp={getTimestamp} />);

      await user.click(screen.getByText('Afternoon Brew'));

      expect(screen.getByText('Logged')).toBeInTheDocument();
    });

    it('custom preset cards do NOT have edit/delete buttons (no Pencil/Trash2 icons)', () => {
      render(<DrinkPresets getTimestamp={getTimestamp} />);
      // No edit or delete aria-labels should exist in the DrinkPresets component
      expect(screen.queryByLabelText(/Edit/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Delete/)).not.toBeInTheDocument();
    });
  });
});
