## Project

**Caffeine Tracker** — A single-page React webapp that tracks caffeine in your bloodstream and visualizes the decay curve over time. Log drinks (presets or custom), see your current caffeine level, and get a projected time when you'll be clear to sleep. All data stays in the browser.

**Core Value:** Know when caffeine will be low enough to sleep well — the sleep-ready estimate is the one thing that must always work.

### Constraints

- React SPA with localStorage — no server, no database
- Single page, minimal UI — log a drink, see the graph
- Must work offline after initial load

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.x | UI framework |
| TypeScript | ~6.0 | Type safety (strict mode) |
| Vite | 8.x | Build tool / dev server |
| Tailwind CSS | 4.2.x | Utility-first styling |
| Zustand | 5.0.x | State management + localStorage persist |
| Recharts | 3.8.x | Decay curve visualization |
| date-fns | 4.1.x | Date formatting / calculations |
| Vitest | 4.1.x | Unit testing |
| vite-plugin-pwa | 1.2.0 | PWA service worker + manifest |

## Architecture

- **Engine** (`src/engine/`): Pure functions for pharmacokinetic calculations. No side effects, no `Date.now()` — time is always passed as an argument.
- **Store** (`src/store/`): Zustand store with `persist` middleware. Shape: `{ drinks: DrinkEntry[], settings: Settings, ...actions }`.
- **Types** (`src/engine/types.ts`): `DrinkEntry` (id, name, caffeineMg, timestamp, presetId), `Settings` (halfLifeHours, thresholdMg, targetBedtime), `CurfewResult`, `DrinkCurvePoint`.
- **Constants** (`src/engine/constants.ts`): `DEFAULT_KA = 4.6`, `BIOAVAILABILITY = 0.99`, default half-life 5hr, threshold 50mg.
- **Data** (`src/data/`): `presets.ts` (drink preset definitions), `colors.ts` (preset color map, hash function for custom drinks, daily total gradient).
- **Components** (`src/components/`): `CaffeineStatus` (hero: current mg + sleep estimate + caffeine curfew + daily total indicator), `DecayCurveChart` (Recharts stacked AreaChart with per-drink colored layers and 48h responsive-height decay curve), `DrinkHistory` (today's drinks list), `DrinkLoggerModal` (FAB + native dialog modal wrapping DrinkLogger), `DrinkLogger` (preset + custom drink entry, rendered inside modal), `DrinkPresets`, `CustomDrinkForm`, `SettingsPanel` (collapsible: metabolism selector, threshold input, bedtime picker), `Header`.
- **Hooks** (`src/hooks/`): `useCurrentTime` (30-second interval timer for live status updates).
- **PWA** (`vite.config.ts` VitePWA plugin): Generates service worker (Workbox precache of all static assets) and web app manifest. `registerType: 'autoUpdate'` for silent updates. No custom service worker code -- pure config.

## Conventions

- Engine functions are pure: `(drinks, currentTime, settings) => result`
- Never store derived state — compute from drink records + current time
- Colors for per-drink chart layers derived from `presetId` at render time
- Tests colocated with source (`*.test.ts` next to `*.ts`)
- No router — single page, use tab components if needed
