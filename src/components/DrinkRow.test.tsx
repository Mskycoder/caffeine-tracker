// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrinkRow } from './DrinkRow';
import type { DrinkEntry } from '../engine/types';
import { epochToDatetimeLocal, datetimeLocalToEpoch } from '../utils/datetime';

const mockDrink: DrinkEntry = {
  id: 'drink-1',
  name: 'Espresso',
  caffeineMg: 200,
  startedAt: new Date('2026-03-25T08:00:00').getTime(),
  endedAt: new Date('2026-03-25T08:00:00').getTime(),
  presetId: 'espresso',
};

function renderDrinkRow(overrides: Partial<Parameters<typeof DrinkRow>[0]> = {}) {
  const defaultProps = {
    drink: mockDrink,
    isEditing: false,
    isConfirmingDelete: false,
    onStartEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return { ...render(<DrinkRow {...defaultProps} />), props: defaultProps };
}

describe('DrinkRow', () => {
  it('renders drink name, caffeine mg, and formatted time', () => {
    renderDrinkRow();
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('200 mg')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM')).toBeInTheDocument();
  });

  it('renders edit button with correct aria-label and delete button with correct aria-label', () => {
    renderDrinkRow();
    expect(screen.getByRole('button', { name: 'Edit Espresso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Espresso' })).toBeInTheDocument();
  });

  it('shows "Confirm?" text with red styling when isConfirmingDelete is true', () => {
    renderDrinkRow({ isConfirmingDelete: true });
    const deleteBtn = screen.getByRole('button', { name: 'Delete Espresso' });
    expect(deleteBtn).toHaveTextContent('Confirm?');
    expect(deleteBtn.className).toContain('bg-red-100');
    expect(deleteBtn.className).toContain('text-red-700');
  });

  it('shows Trash2 icon when isConfirmingDelete is false', () => {
    renderDrinkRow({ isConfirmingDelete: false });
    const deleteBtn = screen.getByRole('button', { name: 'Delete Espresso' });
    expect(deleteBtn).not.toHaveTextContent('Confirm?');
    // Icon renders as SVG child
    expect(deleteBtn.querySelector('svg')).toBeTruthy();
  });

  it('shows datetime-local input with Save and Cancel when isEditing is true', () => {
    renderDrinkRow({ isEditing: true });
    const input = screen.getByDisplayValue(epochToDatetimeLocal(mockDrink.startedAt));
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows normal display row when isEditing is false', () => {
    renderDrinkRow({ isEditing: false });
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Espresso' })).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('clicking edit button calls onStartEdit with the drink', () => {
    const { props } = renderDrinkRow();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Espresso' }));
    expect(props.onStartEdit).toHaveBeenCalledWith(mockDrink);
  });

  it('clicking delete button calls onDelete with the drink id', () => {
    const { props } = renderDrinkRow();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Espresso' }));
    expect(props.onDelete).toHaveBeenCalledWith('drink-1');
  });

  it('in edit mode, changing timestamp and clicking Save calls onSaveEdit', () => {
    const onSaveEdit = vi.fn();
    renderDrinkRow({ isEditing: true, onSaveEdit });

    const input = screen.getByDisplayValue(epochToDatetimeLocal(mockDrink.startedAt));
    fireEvent.change(input, { target: { value: '2026-03-25T09:30' } });

    fireEvent.click(screen.getByText('Save'));
    expect(onSaveEdit).toHaveBeenCalledWith('drink-1', datetimeLocalToEpoch('2026-03-25T09:30'));
  });

  it('in edit mode, clicking Cancel calls onCancelEdit', () => {
    const onCancelEdit = vi.fn();
    renderDrinkRow({ isEditing: true, onCancelEdit });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('all interactive elements have min-h-[44px] touch targets', () => {
    renderDrinkRow();
    const editBtn = screen.getByRole('button', { name: 'Edit Espresso' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete Espresso' });
    expect(editBtn.className).toContain('min-h-[44px]');
    expect(deleteBtn.className).toContain('min-h-[44px]');
  });

  it('edit mode Save and Cancel buttons have min-h-[44px] touch targets', () => {
    renderDrinkRow({ isEditing: true });
    const saveBtn = screen.getByText('Save');
    const cancelBtn = screen.getByText('Cancel');
    expect(saveBtn.className).toContain('min-h-[44px]');
    expect(cancelBtn.className).toContain('min-h-[44px]');
  });

  describe('duration badge', () => {
    it('shows duration badge for non-instant drinks', () => {
      const durationDrink: DrinkEntry = {
        ...mockDrink,
        endedAt: mockDrink.startedAt + 15 * 60_000,
      };
      renderDrinkRow({ drink: durationDrink });
      expect(screen.getByText(/15m/)).toBeInTheDocument();
      expect(screen.getByText(/\u00B7/)).toBeInTheDocument();
    });

    it('does not show duration badge for instant drinks (endedAt === startedAt)', () => {
      // mockDrink already has endedAt === startedAt
      renderDrinkRow();
      const listItem = screen.getByRole('listitem');
      expect(listItem.textContent).not.toMatch(/\u00B7.*\dm/);
    });

    it('does not show duration badge for active drinks (endedAt === undefined)', () => {
      const activeDrink: DrinkEntry = {
        ...mockDrink,
        endedAt: undefined,
      };
      renderDrinkRow({ drink: activeDrink });
      const listItem = screen.getByRole('listitem');
      expect(listItem.textContent).not.toMatch(/\u00B7.*\dm/);
    });

    it('duration badge has text-gray-400 styling', () => {
      const durationDrink: DrinkEntry = {
        ...mockDrink,
        endedAt: mockDrink.startedAt + 30 * 60_000,
      };
      renderDrinkRow({ drink: durationDrink });
      const badge = screen.getByText(/30m/);
      expect(badge.className).toContain('text-gray-400');
    });
  });
});
