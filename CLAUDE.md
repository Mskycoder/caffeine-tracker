## Project

**Caffeine Tracker** — A multi-page React webapp that tracks caffeine in your bloodstream and visualizes the decay curve over time. Log drinks (presets or custom), see your current caffeine level, and get a projected time when you'll be clear to sleep. All data stays in the browser.

**Core Value:** Know when caffeine will be low enough to sleep well — the sleep-ready estimate is the one thing that must always work.

### Constraints

- React SPA with localStorage — no server, no database
- Multi-page React SPA with client-side routing (3 pages: Dashboard, Drinks, Settings)
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
| react-router | 7.x | Client-side routing |
| lucide-react | 1.x | Icon library |

## Architecture

- **Engine** (`src/engine/`): Pure functions for pharmacokinetic calculations. No side effects, no `Date.now()` — time is always passed as an argument.
- **Store** (`src/store/`): Zustand store with `persist` middleware. Shape: `{ drinks: DrinkEntry[], settings: Settings, customPresets: CustomPreset[], ...actions }`. Schema version 3 (v1->v2: targetBedtime, v2->v3: customPresets).
- **Types** (`src/engine/types.ts`): `DrinkEntry` (id, name, caffeineMg, timestamp, presetId), `Settings` (halfLifeHours, thresholdMg, targetBedtime), `CustomPreset` (id, name, caffeineMg), `CurfewResult`, `DrinkCurvePoint`.
- **Constants** (`src/engine/constants.ts`): `DEFAULT_KA = 4.6`, `BIOAVAILABILITY = 0.99`, default half-life 5hr, threshold 50mg.
- **Data** (`src/data/`): `presets.ts` (drink preset definitions), `colors.ts` (preset color map, hash function for custom drinks, daily total gradient).
- **Pages** (`src/pages/`): `DashboardPage` (composes CaffeineStatus + DecayCurveChart + DrinkHistory), `DrinksPage` (MyDrinksManager + DrinkHistory — custom preset management above drink history), `SettingsPage` (SettingsPanel expanded).
- **Components** (`src/components/`): `Layout` (route shell: TabBar + Outlet + BottomSheet), `TabBar` (bottom tab bar on mobile, floating pill dock on desktop/tablet, NavLink active states, center "+" button), `BottomSheet` (swipe-dismissable bottom sheet on mobile, centered modal on desktop), `CaffeineStatus` (hero: current mg + bedtime-contextualized sleep estimate [clear/on-track/won't-clear] + caffeine curfew with coherent 4-state display [ok/curfew_passed/budget_exceeded/too_soon] + daily total indicator), `DecayCurveChart` (Recharts stacked AreaChart with per-drink colored layers and 48h responsive-height decay curve), `DrinkHistory` (today's drinks list), `DrinkLogger` (preset + custom drink entry, rendered inside BottomSheet), `DrinkPresets` (two-section rendering in BottomSheet: "My Drinks" custom presets above "Built-in" presets when custom presets exist; tap-to-log only, no edit/delete), `CustomDrinkForm`, `MyDrinksManager` (custom preset CRUD on Drinks page: creation form + card list with inline edit and confirm-tap delete), `CustomPresetCard` (single custom preset card with display mode and inline edit mode), `SettingsPanel` (always expanded: metabolism selector, threshold input, bedtime picker).
- **Hooks** (`src/hooks/`): `useCurrentTime` (30-second interval timer for live status updates).
- **PWA** (`vite.config.ts` VitePWA plugin): Generates service worker (Workbox precache of all static assets, navigateFallback for SPA routing) and web app manifest. `registerType: 'autoUpdate'` for silent updates. No custom service worker code -- pure config.
- **Routing** (`src/main.tsx` BrowserRouter + `src/App.tsx` Routes): Client-side routing with react-router v7. BrowserRouter with `basename={import.meta.env.BASE_URL}` for GitHub Pages. Routes: `/` -> Dashboard, `/drinks` -> Drinks, `/settings` -> Settings, `*` -> redirect to `/`. 404.html fallback for GitHub Pages deep links.

## Conventions

- Engine functions are pure: `(drinks, currentTime, settings) => result`
- Never store derived state — compute from drink records + current time
- Colors for per-drink chart layers derived from `presetId` at render time
- Tests colocated with source (`*.test.ts` next to `*.ts`)
- Pages are thin composition layers — no business logic, just compose existing components
- Client-side routing via react-router v7 (BrowserRouter, declarative mode). Routes: / (Dashboard), /drinks (Drinks), /settings (Settings)
- Only Layout.tsx, TabBar.tsx, and page components import from react-router. All other components remain route-agnostic
