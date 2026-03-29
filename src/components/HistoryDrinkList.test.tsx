// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryDrinkList } from './HistoryDrinkList';
import { useCaffeineStore } from '../store/caffeine-store';
import type { DrinkEntry } from '../engine/types';

// Fixed reference time: 2026-03-25 at 2:00 PM local
const FIXED_NOW = new Date('2026-03-25T14:00:00').getTime();

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => FIXED_NOW,
}));

// Helper to create a drink entry
function makeDrink(overrides: Partial<DrinkEntry> & { id: string; name: string; caffeineMg: number; startedAt: number }): DrinkEntry {
  return {
    presetId: null,
    endedAt: overrides.startedAt,
    ...overrides,
  };
}

// Create drinks across multiple days relative to FIXED_NOW (2026-03-25)
const todayMorning = new Date('2026-03-25T08:00:00').getTime();
const todayAfternoon = new Date('2026-03-25T13:00:00').getTime();
const yesterdayMorning = new Date('2026-03-24T09:00:00').getTime();
const threeDaysAgo = new Date('2026-03-22T10:00:00').getTime();
const tenDaysAgo = new Date('2026-03-15T11:00:00').getTime();
const thirtyFiveDaysAgo = new Date('2026-02-18T12:00:00').getTime();

const MULTI_DAY_DRINKS: DrinkEntry[] = [
  makeDrink({ id: 'today-1', name: 'Morning Espresso', caffeineMg: 200, startedAt: todayMorning }),
  makeDrink({ id: 'today-2', name: 'Afternoon Tea', caffeineMg: 50, startedAt: todayAfternoon }),
  makeDrink({ id: 'yesterday-1', name: 'Yesterday Latte', caffeineMg: 150, startedAt: yesterdayMorning }),
  makeDrink({ id: 'three-days-1', name: 'Cold Brew', caffeineMg: 250, startedAt: threeDaysAgo }),
  makeDrink({ id: 'ten-days-1', name: 'Energy Drink', caffeineMg: 160, startedAt: tenDaysAgo }),
  makeDrink({ id: 'old-1', name: 'Ancient Coffee', caffeineMg: 95, startedAt: thirtyFiveDaysAgo }),
];

describe('HistoryDrinkList', () => {
  beforeEach(() => {
    useCaffeineStore.setState({ drinks: MULTI_DAY_DRINKS });
  });

  it('renders 3 filter chips: Last 7 Days, Last 30 Days, All Time', () => {
    render(<HistoryDrinkList />);
    expect(screen.getByRole('button', { name: 'Last 7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Time' })).toBeInTheDocument();
    // Today and Yesterday chips should NOT exist
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yesterday' })).not.toBeInTheDocument();
  });

  it('"Last 7 Days" chip is selected by default with bg-purple-600 class', () => {
    render(<HistoryDrinkList />);
    const chip = screen.getByText('Last 7 Days');
    expect(chip.className).toContain('bg-purple-600');
    expect(chip.className).toContain('text-white');
  });

  it('clicking a different chip changes selection and updates styling', () => {
    render(<HistoryDrinkList />);
    const last30Chip = screen.getByRole('button', { name: 'Last 30 Days' });
    const last7Chip = screen.getByRole('button', { name: 'Last 7 Days' });

    // Initially Last 7 Days is selected
    expect(last7Chip.className).toContain('bg-purple-600');
    expect(last30Chip.className).not.toContain('bg-purple-600');

    // Click Last 30 Days
    fireEvent.click(last30Chip);

    // Now Last 30 Days is selected, Last 7 Days is not
    expect(last30Chip.className).toContain('bg-purple-600');
    expect(last7Chip.className).not.toContain('bg-purple-600');
  });

  it('groups drinks by date with section headers showing formatted date and daily total', () => {
    render(<HistoryDrinkList />);
    // Default filter is Last 7 Days, which includes: today, yesterday, 3 days ago
    // (10 days ago and 35 days ago are outside the 7-day window)
    const headings = screen.getAllByRole('heading', { level: 3 });
    const headingTexts = headings.map(h => h.textContent);
    expect(headingTexts).toContain('Today');
    expect(headingTexts).toContain('Yesterday');
    // 3 days ago is 2026-03-22 (Sunday)
    expect(headingTexts).toContain('Sunday, March 22');
  });

  it('"Today" and "Yesterday" labels are used for those days in section headers', () => {
    render(<HistoryDrinkList />);
    // The section headers should show "Today" and "Yesterday"
    const headings = screen.getAllByRole('heading', { level: 3 });
    const headingTexts = headings.map(h => h.textContent);
    expect(headingTexts).toContain('Today');
    expect(headingTexts).toContain('Yesterday');
  });

  it('other dates use format "EEEE, MMMM d" (e.g., "Sunday, March 22")', () => {
    render(<HistoryDrinkList />);
    // Three days ago from 2026-03-25 is 2026-03-22 (Sunday)
    expect(screen.getByText('Sunday, March 22')).toBeInTheDocument();
  });

  it('date groups are sorted newest-first (today before yesterday)', () => {
    render(<HistoryDrinkList />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    const headingTexts = headings.map(h => h.textContent);
    const todayIndex = headingTexts.indexOf('Today');
    const yesterdayIndex = headingTexts.indexOf('Yesterday');
    expect(todayIndex).toBeLessThan(yesterdayIndex);
  });

  it('drinks within each date group are sorted oldest-first (8 AM before 1 PM)', () => {
    render(<HistoryDrinkList />);
    // Today has "Morning Espresso" (8 AM) and "Afternoon Tea" (1 PM)
    const items = screen.getAllByRole('listitem');
    const todayItems = items.filter(
      item => item.textContent?.includes('Morning Espresso') || item.textContent?.includes('Afternoon Tea')
    );
    expect(todayItems.length).toBe(2);
    // Morning Espresso should come before Afternoon Tea
    const allItems = screen.getAllByRole('listitem');
    const morningIndex = allItems.findIndex(li => li.textContent?.includes('Morning Espresso'));
    const afternoonIndex = allItems.findIndex(li => li.textContent?.includes('Afternoon Tea'));
    expect(morningIndex).toBeLessThan(afternoonIndex);
  });

  it('shows empty state when filter returns no drinks', () => {
    useCaffeineStore.setState({ drinks: [] });
    render(<HistoryDrinkList />);
    expect(screen.getByText(/No drinks/)).toBeInTheDocument();
    expect(screen.getByText(/in the last 7 days/)).toBeInTheDocument();
  });

  it('daily total in section header shows correct sum of caffeineMg for that day', () => {
    render(<HistoryDrinkList />);
    // Today: 200 + 50 = 250mg, 3 days ago: 250mg -- both show 250mg
    const totals250 = screen.getAllByText('250mg');
    expect(totals250.length).toBe(2); // today + 3 days ago both 250mg
    // Yesterday: 150mg
    expect(screen.getByText('150mg')).toBeInTheDocument();
  });

  it('edit and delete mutual exclusion: only one row active at a time across all date groups', () => {
    render(<HistoryDrinkList />);

    // Click edit on Morning Espresso
    fireEvent.click(screen.getByRole('button', { name: 'Edit Morning Espresso' }));
    expect(screen.getByText('Save')).toBeInTheDocument();

    // Click delete on Yesterday Latte (different day group)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Yesterday Latte' }));

    // Edit should be cleared, delete confirm should be active
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
  });

  it('All Time filter shows all drinks including old ones', () => {
    render(<HistoryDrinkList />);
    fireEvent.click(screen.getByRole('button', { name: 'All Time' }));

    expect(screen.getByText('Morning Espresso')).toBeInTheDocument();
    expect(screen.getByText('Ancient Coffee')).toBeInTheDocument();
    expect(screen.getByText('Energy Drink')).toBeInTheDocument();
  });

  it('Last 30 Days filter excludes 35-day-old drinks', () => {
    render(<HistoryDrinkList />);
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 Days' }));

    expect(screen.getByText('Morning Espresso')).toBeInTheDocument();
    expect(screen.getByText('Energy Drink')).toBeInTheDocument();
    expect(screen.queryByText('Ancient Coffee')).not.toBeInTheDocument();
  });
});
