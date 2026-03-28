import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DrinkEntry, Settings, CustomPreset, DrinkSchedule, CalculatorParams } from '../engine/types';
import { DEFAULT_COVARIATES } from '../engine/types';
import { getScheduledDrinksToLog, formatDateKey } from '../engine/schedule';

/**
 * Caffeine store state shape.
 *
 * State: drinks array + settings object + customPresets array + schedules array.
 * Actions: CRUD for drinks, CRUD for custom presets, CRUD for schedules, runCatchUp, partial update for settings.
 *
 * Persisted to localStorage via Zustand persist middleware (TECH-01).
 * Schema version 6. Migrations: v1->v2 (targetBedtime), v2->v3 (customPresets), v3->v4 (metabolismMode, covariates), v4->v5 (schedules), v5->v6 (hiddenPresetIds, showResearchThresholds).
 */
interface CaffeineState {
  drinks: DrinkEntry[];
  settings: Settings;
  customPresets: CustomPreset[];
  schedules: DrinkSchedule[];
  addDrink: (drink: Omit<DrinkEntry, 'id'>) => void;
  removeDrink: (id: string) => void;
  updateDrink: (id: string, updates: Partial<Omit<DrinkEntry, 'id'>>) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  clearDrinks: () => void;
  addCustomPreset: (name: string, caffeineMg: number, calculatorParams?: CalculatorParams) => void;
  updateCustomPreset: (id: string, updates: Partial<Pick<CustomPreset, 'name' | 'caffeineMg' | 'calculatorParams'>>) => void;
  removeCustomPreset: (id: string) => void;
  addSchedule: (schedule: Omit<DrinkSchedule, 'id' | 'paused' | 'lastRunDate'>) => void;
  updateSchedule: (id: string, updates: Partial<Omit<DrinkSchedule, 'id'>>) => void;
  removeSchedule: (id: string) => void;
  toggleSchedulePause: (id: string) => void;
  runCatchUp: (currentTime: number) => number;
}

export const useCaffeineStore = create<CaffeineState>()(
  persist(
    (set, get) => ({
      drinks: [],
      settings: {
        halfLifeHours: 5,
        thresholdMg: 50,
        targetBedtime: '00:00',
        metabolismMode: 'simple' as const,
        covariates: { ...DEFAULT_COVARIATES },
        hiddenPresetIds: [],
        showResearchThresholds: false,
        caffeineSensitivity: 'normal' as const,
        thresholdSource: 'manual' as const,
      },
      customPresets: [],
      schedules: [],

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

      addCustomPreset: (name, caffeineMg, calculatorParams?) =>
        set((state) => ({
          customPresets: [
            ...state.customPresets,
            {
              id: `custom-${crypto.randomUUID()}`,
              name,
              caffeineMg,
              ...(calculatorParams ? { calculatorParams } : {}),
            },
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

      addSchedule: (schedule) =>
        set((state) => ({
          schedules: [
            ...state.schedules,
            { ...schedule, id: crypto.randomUUID(), paused: false, lastRunDate: null },
          ],
        })),

      updateSchedule: (id, updates) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        })),

      removeSchedule: (id) =>
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        })),

      toggleSchedulePause: (id) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, paused: !s.paused } : s,
          ),
        })),

      runCatchUp: (currentTime) => {
        const state = get();
        const { drinks, processedScheduleIds } = getScheduledDrinksToLog(
          state.schedules,
          currentTime,
        );
        if (drinks.length === 0) return 0;
        const todayStr = formatDateKey(new Date(currentTime));
        set((state) => ({
          drinks: [
            ...state.drinks,
            ...drinks.map((d) => ({ ...d, id: crypto.randomUUID() })),
          ],
          schedules: state.schedules.map((s) =>
            processedScheduleIds.includes(s.id)
              ? { ...s, lastRunDate: todayStr }
              : s,
          ),
        }));
        return drinks.length;
      },
    }),
    {
      name: 'caffeine-tracker-storage',
      version: 6,
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
        if (version < 5) {
          // v4 -> v5: add schedules array (Phase 13)
          state.schedules = (state as Record<string, unknown>).schedules ?? [];
        }
        if (version < 6) {
          // v5 -> v6: add hiddenPresetIds and showResearchThresholds (Phase 15/17)
          const settings = state.settings as Record<string, unknown>;
          state.settings = {
            ...settings,
            hiddenPresetIds: settings.hiddenPresetIds ?? [],
            showResearchThresholds: settings.showResearchThresholds ?? false,
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
