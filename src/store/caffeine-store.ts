import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DrinkEntry, Settings, CustomPreset } from '../engine/types';
import { DEFAULT_COVARIATES } from '../engine/types';

/**
 * Caffeine store state shape.
 *
 * State: drinks array + settings object + customPresets array.
 * Actions: CRUD for drinks, CRUD for custom presets, partial update for settings.
 *
 * Persisted to localStorage via Zustand persist middleware (TECH-01).
 * Schema version 4. Migrations: v1->v2 (targetBedtime), v2->v3 (customPresets), v3->v4 (metabolismMode, covariates).
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
        metabolismMode: 'simple' as const,
        covariates: { ...DEFAULT_COVARIATES },
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
      version: 4,
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
        if (version < 4) {
          // v3 -> v4: add advanced metabolism fields (Phase 12)
          const settings = state.settings as Record<string, unknown>;
          state.settings = {
            ...settings,
            metabolismMode: settings.metabolismMode ?? 'simple',
            covariates: settings.covariates ?? {
              weight: 70,
              weightUnit: 'kg',
              sex: 'male',
              smoking: false,
              oralContraceptives: false,
              pregnancyTrimester: 'none',
              liverDisease: 'none',
              cyp1a2Genotype: 'unknown',
              cyp1a2Inhibitor: 'none',
            },
          };
        }
        return state as unknown as CaffeineState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CaffeineState> | undefined;
        return {
          ...currentState,
          ...persisted,
          settings: {
            ...currentState.settings,
            ...(persisted?.settings ?? {}),
          },
        };
      },
    },
  ),
);

export type { CaffeineState };
