// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveDrinkCard } from './ActiveDrinkCard';
import { useCaffeineStore } from '../store/caffeine-store';

const FIXED_NOW = new Date('2026-03-25T14:00:00').getTime();

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => FIXED_NOW,
}));

describe('ActiveDrinkCard', () => {
  beforeEach(() => {
    useCaffeineStore.setState({ drinks: [] });
  });

  it('renders null when no active drinks', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'finished-1',
          name: 'Espresso',
          caffeineMg: 63,
          startedAt: FIXED_NOW - 60 * 60000,
          endedAt: FIXED_NOW - 30 * 60000,
          presetId: 'espresso',
        },
      ],
    });
    const { container } = render(<ActiveDrinkCard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders drink name and caffeine amount for active drinks', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'active-1',
          name: 'Latte',
          caffeineMg: 130,
          startedAt: FIXED_NOW - 10 * 60000,
          endedAt: undefined,
          presetId: 'latte',
        },
      ],
    });
    render(<ActiveDrinkCard />);
    expect(screen.getByText('Latte')).toBeInTheDocument();
    expect(screen.getByText('130 mg')).toBeInTheDocument();
  });

  it('shows elapsed time in minutes', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'active-1',
          name: 'Coffee',
          caffeineMg: 95,
          startedAt: FIXED_NOW - 15 * 60000,
          endedAt: undefined,
          presetId: 'drip-coffee',
        },
      ],
    });
    render(<ActiveDrinkCard />);
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('first tap on Finish shows confirmation with Done and Keep Drinking', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'active-1',
          name: 'Latte',
          caffeineMg: 130,
          startedAt: FIXED_NOW - 20 * 60000,
          endedAt: undefined,
          presetId: 'latte',
        },
      ],
    });
    render(<ActiveDrinkCard />);
    fireEvent.click(screen.getByText('Finish'));
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Keep Drinking')).toBeInTheDocument();
    expect(screen.getByText('20m')).toBeInTheDocument();
  });

  it('second tap on Done calls finishDrink', () => {
    const finishDrinkSpy = vi.fn();
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'active-1',
          name: 'Latte',
          caffeineMg: 130,
          startedAt: FIXED_NOW - 5 * 60000,
          endedAt: undefined,
          presetId: 'latte',
        },
      ],
      finishDrink: finishDrinkSpy,
    });
    render(<ActiveDrinkCard />);
    fireEvent.click(screen.getByText('Finish'));
    fireEvent.click(screen.getByText('Done'));
    expect(finishDrinkSpy).toHaveBeenCalledWith('active-1');
  });

  it('Keep Drinking dismisses confirmation', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'active-1',
          name: 'Latte',
          caffeineMg: 130,
          startedAt: FIXED_NOW - 5 * 60000,
          endedAt: undefined,
          presetId: 'latte',
        },
      ],
    });
    render(<ActiveDrinkCard />);
    fireEvent.click(screen.getByText('Finish'));
    expect(screen.getByText('Done')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Keep Drinking'));
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });

  it('renders Currently Drinking heading', () => {
    useCaffeineStore.setState({
      drinks: [
        {
          id: 'active-1',
          name: 'Coffee',
          caffeineMg: 95,
          startedAt: FIXED_NOW - 5 * 60000,
          endedAt: undefined,
          presetId: null,
        },
      ],
    });
    render(<ActiveDrinkCard />);
    expect(screen.getByText('Currently Drinking')).toBeInTheDocument();
  });
});
