// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCaffeineStore } from '../store/caffeine-store';
import { CustomDrinkForm } from './CustomDrinkForm';

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

describe('CustomDrinkForm', () => {
  it('submitting with valid mg logs a drink', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} />);

    await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    expect(drinks[0].caffeineMg).toBe(100);
    expect(drinks[0].timestamp).toBe(FIXED_TIMESTAMP);
  });

  it('name defaults to "Custom" when left blank', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} />);

    await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks[0].name).toBe('Custom');
  });

  it('custom name is used when provided', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} />);

    await user.type(screen.getByLabelText('Caffeine amount in mg'), '100');
    await user.type(screen.getByLabelText('Drink name'), 'My Coffee');
    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks[0].name).toBe('My Coffee');
  });

  it('form clears after submission (D-05)', async () => {
    const user = userEvent.setup();
    render(<CustomDrinkForm getTimestamp={getTimestamp} />);

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
    render(<CustomDrinkForm getTimestamp={getTimestamp} />);

    await user.click(screen.getByRole('button', { name: /log/i }));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(0);
  });

  describe('touch targets', () => {
    it('mg input has 44px minimum touch target', () => {
      render(<CustomDrinkForm getTimestamp={getTimestamp} />);
      const input = screen.getByLabelText(/caffeine amount/i);
      expect(input.className).toContain('min-h-[44px]');
    });

    it('name input has 44px minimum touch target', () => {
      render(<CustomDrinkForm getTimestamp={getTimestamp} />);
      const input = screen.getByLabelText(/drink name/i);
      expect(input.className).toContain('min-h-[44px]');
    });

    it('submit button has 44px minimum touch target', () => {
      render(<CustomDrinkForm getTimestamp={getTimestamp} />);
      const btn = screen.getByRole('button', { name: /log/i });
      expect(btn.className).toContain('min-h-[44px]');
    });
  });
});
