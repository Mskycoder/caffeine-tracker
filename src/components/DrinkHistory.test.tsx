// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrinkHistory } from './DrinkHistory';
import { useCaffeineStore } from '../store/caffeine-store';

// Fixed reference time: 2026-03-25 at 2:00 PM local
const FIXED_NOW = new Date('2026-03-25T14:00:00').getTime();

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => FIXED_NOW,
}));

describe('DrinkHistory', () => {
  beforeEach(() => {
    useCaffeineStore.setState({ drinks: [] });
  });

  it('shows empty state when no drinks today', () => {
    render(<DrinkHistory />);
    expect(screen.getByText('No drinks logged today')).toBeInTheDocument();
  });

  it("displays heading 'Today's Drinks'", () => {
    render(<DrinkHistory />);
    expect(screen.getByText("Today's Drinks")).toBeInTheDocument();
  });

  it('shows today\'s drinks with name, mg, and time', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: '1',
          name: 'Espresso',
          caffeineMg: 200,
          timestamp: new Date('2026-03-25T08:00:00').getTime(),
          presetId: 'espresso',
        },
        {
          id: '2',
          name: 'Drip Coffee',
          caffeineMg: 95,
          timestamp: new Date('2026-03-25T13:00:00').getTime(),
          presetId: 'drip-coffee',
        },
      ],
    });

    render(<DrinkHistory />);

    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('Drip Coffee')).toBeInTheDocument();
    expect(screen.getByText('200 mg')).toBeInTheDocument();
    expect(screen.getByText('95 mg')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM')).toBeInTheDocument();
    expect(screen.getByText('1:00 PM')).toBeInTheDocument();
  });

  it("filters out yesterday's drinks", () => {
    const yesterdayTimestamp = FIXED_NOW - 86_400_000;

    useCaffeineStore.setState({
      drinks: [
        {
          id: '1',
          name: 'Yesterday Latte',
          caffeineMg: 150,
          timestamp: yesterdayTimestamp,
          presetId: null,
        },
        {
          id: '2',
          name: 'Today Espresso',
          caffeineMg: 200,
          timestamp: new Date('2026-03-25T09:00:00').getTime(),
          presetId: 'espresso',
        },
      ],
    });

    render(<DrinkHistory />);

    expect(screen.getByText('Today Espresso')).toBeInTheDocument();
    expect(screen.queryByText('Yesterday Latte')).not.toBeInTheDocument();
  });

  it('sorts drinks oldest first', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: '1',
          name: 'Afternoon Tea',
          caffeineMg: 50,
          timestamp: new Date('2026-03-25T14:00:00').getTime(),
          presetId: null,
        },
        {
          id: '2',
          name: 'Morning Coffee',
          caffeineMg: 200,
          timestamp: new Date('2026-03-25T09:00:00').getTime(),
          presetId: 'drip-coffee',
        },
      ],
    });

    render(<DrinkHistory />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Morning Coffee');
    expect(items[1]).toHaveTextContent('Afternoon Tea');
  });
});
