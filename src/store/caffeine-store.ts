import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DrinkEntry, Settings, CustomPreset } from '../engine/types';

/**
 * Caffeine store state shape.
 *
 * State: drinks array + settings object + customPresets array.
 * Actions: CRUD for drinks, CRUD for custom presets, partial update for settings.
 *
 * Persisted to localStorage via Zustand persist middleware (TECH-01).
 * Schema version 3. Migrations: v1->v2 (targetBedtime), v2->v3 (customPresets).
 */
interface CaffeineState {
  drinks: DrinkEntry[];
  settings: Settings;
  customPresets: CustomPreset[];
  addDrink: (drink: Omit<DrinkEntry, 'id'>) => void;
  removeDrink: (id: string) => void;
  updateDrink: (id: string, updates: Partial<Omit<DrinkEntry, 'id'>>) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  clearDrinks: () => void;
  addCustomPreset: (name: string, caffeineMg: number) => void;
  updateCustomPreset: (id: string, updates: Partial<Pick<CustomPreset, 'name' | 'caffeineMg'>>) => void;
  removeCustomPreset: (id: string) => void;
}

export const useCaffeineStore = create<CaffeineState>()(
  persist(
    (set) => ({
      drinks: [],
      settings: {
        halfLifeHours: 5,
        thresholdMg: 50,
        targetBedtime: '00:00',
      },
      customPresets: [],

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

      addCustomPreset: (name, caffeineMg) =>
        set((state) => ({
          customPresets: [
            ...state.customPresets,
            { id: `custom-${crypto.randomUUID()}`, name, caffeineMg },
          ],
        })),

      updateCustomPreset: (id, updates) =>
        set((state) => ({
          customPresets: state.customPresets.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      removeCustomPreset: (id) =>
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'caffeine-tracker-storage',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          // v1 -> v2: add targetBedtime default
          const settings = state.settings as Record<string, unknown>;
          state.settings = {
            ...settings,
            targetBedtime: settings.targetBedtime ?? '00:00',
          };
        }
        if (version < 3) {
          // v2 -> v3: add customPresets array (Phase 10)
          state.customPresets = (state as Record<string, unknown>).customPresets ?? [];
        }
        return state as unknown as CaffeineState;
      },
    },
  ),
);

export type { CaffeineState };
