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
});
