// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DrinkHistory } from './DrinkHistory';
import { useCaffeineStore } from '../store/caffeine-store';
import { epochToDatetimeLocal, datetimeLocalToEpoch } from '../utils/datetime';

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

  describe('delete drink', () => {
    const TWO_DRINKS = [
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
    ];

    beforeEach(() => {
      useCaffeineStore.setState({ drinks: TWO_DRINKS });
    });

    it('shows delete button on each drink row', () => {
      render(<DrinkHistory />);
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it('first click shows confirm state', () => {
      render(<DrinkHistory />);

      const deleteBtn = screen.getByRole('button', { name: /delete espresso/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText('Confirm?')).toBeInTheDocument();
    });

    it('second click removes drink from store', () => {
      render(<DrinkHistory />);

      const deleteBtn = screen.getByRole('button', { name: /delete espresso/i });
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByText('Confirm?');
      fireEvent.click(confirmBtn);

      expect(screen.queryByText('Espresso')).not.toBeInTheDocument();
    });

    it('confirm state resets after 3 seconds', () => {
      vi.useFakeTimers();
      render(<DrinkHistory />);

      const deleteBtn = screen.getByRole('button', { name: /delete espresso/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText('Confirm?')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Confirm?')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('clicking delete on another drink clears previous confirm', () => {
      render(<DrinkHistory />);

      const deleteEspresso = screen.getByRole('button', { name: /delete espresso/i });
      fireEvent.click(deleteEspresso);

      expect(screen.getByText('Confirm?')).toBeInTheDocument();

      const deleteDrip = screen.getByRole('button', { name: /delete drip coffee/i });
      fireEvent.click(deleteDrip);

      // Only one Confirm? should be visible (the one for Drip Coffee)
      const confirmButtons = screen.getAllByText('Confirm?');
      expect(confirmButtons).toHaveLength(1);
    });
  });

  describe('edit drink', () => {
    const TWO_DRINKS = [
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
    ];

    beforeEach(() => {
      useCaffeineStore.setState({ drinks: TWO_DRINKS });
    });

    it('shows edit button on each drink row', () => {
      render(<DrinkHistory />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(2);
    });

    it('clicking edit shows datetime-local input with current time', () => {
      render(<DrinkHistory />);

      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);

      const input = screen.getByDisplayValue(epochToDatetimeLocal(TWO_DRINKS[0].timestamp));
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'datetime-local');
    });

    it('shows save and cancel buttons in edit mode', () => {
      render(<DrinkHistory />);

      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('name and caffeine mg remain visible during edit', () => {
      render(<DrinkHistory />);

      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);

      expect(screen.getByText('Espresso')).toBeInTheDocument();
      expect(screen.getByText('200 mg')).toBeInTheDocument();
    });

    it('save updates timestamp in store', () => {
      render(<DrinkHistory />);

      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);

      const input = screen.getByDisplayValue(epochToDatetimeLocal(TWO_DRINKS[0].timestamp));
      fireEvent.change(input, { target: { value: '2026-03-25T09:30' } });

      const saveBtn = screen.getByText('Save');
      fireEvent.click(saveBtn);

      const updatedDrink = useCaffeineStore.getState().drinks.find((d) => d.id === '1');
      expect(updatedDrink?.timestamp).toBe(datetimeLocalToEpoch('2026-03-25T09:30'));
    });

    it('cancel discards changes', () => {
      const originalTimestamp = TWO_DRINKS[0].timestamp;
      render(<DrinkHistory />);

      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);

      const input = screen.getByDisplayValue(epochToDatetimeLocal(originalTimestamp));
      fireEvent.change(input, { target: { value: '2026-03-25T09:30' } });

      const cancelBtn = screen.getByText('Cancel');
      fireEvent.click(cancelBtn);

      const unchangedDrink = useCaffeineStore.getState().drinks.find((d) => d.id === '1');
      expect(unchangedDrink?.timestamp).toBe(originalTimestamp);
    });

    it('only one drink in edit mode at a time', () => {
      render(<DrinkHistory />);

      const editEspresso = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editEspresso);

      const editDrip = screen.getByRole('button', { name: /edit drip coffee/i });
      fireEvent.click(editDrip);

      // Only one datetime-local input should be visible
      const inputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      expect(inputs).toHaveLength(1);
    });

    it('starting edit clears pending delete confirm', () => {
      render(<DrinkHistory />);

      // Start delete confirm on Espresso
      const deleteBtn = screen.getByRole('button', { name: /delete espresso/i });
      fireEvent.click(deleteBtn);
      expect(screen.getByText('Confirm?')).toBeInTheDocument();

      // Start edit on Espresso -- should clear confirm
      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);

      expect(screen.queryByText('Confirm?')).not.toBeInTheDocument();
      // Edit form should be shown
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('starting delete confirm clears active edit', () => {
      render(<DrinkHistory />);

      // Start edit on Espresso
      const editBtn = screen.getByRole('button', { name: /edit espresso/i });
      fireEvent.click(editBtn);
      expect(screen.getByText('Save')).toBeInTheDocument();

      // Start delete confirm on Drip Coffee -- should clear edit on Espresso
      const deleteBtn = screen.getByRole('button', { name: /delete drip coffee/i });
      fireEvent.click(deleteBtn);

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.getByText('Confirm?')).toBeInTheDocument();
    });
  });
});
