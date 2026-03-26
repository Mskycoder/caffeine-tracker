// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCaffeineStore } from '../store/caffeine-store';
import { DrinkLogger } from './DrinkLogger';

const DEFAULT_SETTINGS = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: null,
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

  it('time picker defaults to empty (meaning "now")', () => {
    render(<DrinkLogger />);
    const timeInput = screen.getByLabelText('Time:') as HTMLInputElement;
    expect(timeInput.value).toBe('');
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('when time override is set, logged drink uses that timestamp', async () => {
    const user = userEvent.setup();
    render(<DrinkLogger />);

    const timeInput = screen.getByLabelText('Time:');
    // Set a specific time override
    await user.clear(timeInput);
    await user.type(timeInput, '2024-03-25T14:30');

    // Click a preset to log a drink
    await user.click(screen.getByText('Espresso'));

    const { drinks } = useCaffeineStore.getState();
    expect(drinks).toHaveLength(1);
    // The timestamp should match the override, not Date.now()
    const expectedTs = new Date('2024-03-25T14:30').getTime();
    expect(drinks[0].timestamp).toBe(expectedTs);
  });
});
