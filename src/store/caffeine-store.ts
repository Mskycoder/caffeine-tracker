import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DrinkEntry, Settings } from '../engine/types';

/**
 * Caffeine store state shape.
 *
 * State: drinks array + settings object.
 * Actions: CRUD for drinks, partial update for settings.
 *
 * Persisted to localStorage via Zustand persist middleware (TECH-01).
 * Schema version 1 with migrate placeholder for future migrations.
 */
interface CaffeineState {
  drinks: DrinkEntry[];
  settings: Settings;
  addDrink: (drink: Omit<DrinkEntry, 'id'>) => void;
  removeDrink: (id: string) => void;
  updateDrink: (id: string, updates: Partial<Omit<DrinkEntry, 'id'>>) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  clearDrinks: () => void;
}

export const useCaffeineStore = create<CaffeineState>()(
  persist(
    (set) => ({
      drinks: [],
      settings: {
        halfLifeHours: 5,
        thresholdMg: 50,
        targetBedtime: null,
      },

      addDrink: (drink) =>
        set((state) => ({
          drinks: [...state.drinks, { ...drink, id: crypto.randomUUID() }],
        })),

      removeDrink: (id) =>
        set((state) => ({
          drinks: state.drinks.filter((d) => d.id !== id),
        })),

      updateDrink: (id, updates) =>
        set((state) => ({
          drinks: state.drinks.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        })),

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      clearDrinks: () => set({ drinks: [] }),
    }),
    {
      name: 'caffeine-tracker-storage',
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        // Future migrations go here
        // if (version === 0) { ... migrate from v0 to v1 ... }
        return persistedState as CaffeineState;
      },
    },
  ),
);

export type { CaffeineState };
