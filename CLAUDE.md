<!-- GSD:project-start source:PROJECT.md -->
## Project

**Caffeine Tracker**

A single-page React webapp that tracks caffeine in your bloodstream and visualizes the decay curve over time. You log drinks (from presets or custom entry), see your current caffeine level, and get a projected time when you'll be clear to sleep. All data stays in the browser — no accounts, no server.

**Core Value:** Know when caffeine will be low enough to sleep well — the sleep-ready estimate is the one thing that must always work.

### Constraints

- **Tech stack**: React SPA with localStorage — no server, no database
- **Simplicity**: Single page, minimal UI — log a drink, see the graph
- **Offline**: Must work without network after initial load
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.x | UI framework | Project requirement. v19 is stable (released Dec 2024, latest patch 19.2.4). Ref-as-prop eliminates forwardRef boilerplate. Hooks-first model is ideal for a small SPA with local state. |
| TypeScript | ~6.0 | Type safety | Catches caffeine math bugs at compile time. Vite 8's Oxc transform handles TS natively with near-zero overhead. Use strict mode. |
| Vite | 8.x | Build tool / dev server | Industry standard for React SPAs. v8 ships Rolldown (Rust bundler) for 10-30x faster builds over Vite 6. Native ES module dev server means sub-second HMR. Zero-config for React+TS out of the box. |
| Tailwind CSS | 4.2.x | Styling | v4 is CSS-first (no JS config file, just `@import "tailwindcss"`). Rust engine makes builds 5x faster. For a small SPA with simple UI, utility classes avoid the overhead of a component library while keeping styling co-located with markup. |
### State Management & Persistence
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zustand | 5.0.x | State management + localStorage persistence | Tiny (~1.5 KB), zero-boilerplate store. Built-in `persist` middleware writes to localStorage automatically -- this is the killer feature for this project. No context providers, no reducers. The entire caffeine state (drink log, settings) lives in one store with automatic browser persistence. |
### Charting
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Recharts | 3.8.x | Decay curve visualization | Best balance of simplicity and capability for React charting. Declarative JSX API (`<AreaChart>`, `<Line>`, `<ReferenceLine>`) maps directly to the decay curve use case. Built-in `<ResponsiveContainer>` for mobile. Uses only specific D3 submodules (not the full D3 bundle), keeping weight reasonable. Active maintenance (3.8.0 released March 2026). |
### Date/Time Handling
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| date-fns | 4.1.x | Date formatting, time calculations | Tree-shakable (import only `format`, `addHours`, `differenceInMinutes`). Functional, immutable API. Lighter than Luxon/Moment for the few date operations this app needs (formatting axis labels, calculating "safe to sleep" times). |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/vite | 4.2.x | Tailwind Vite integration | Always -- replaces the old PostCSS plugin approach for Tailwind v4 |
| @vitejs/plugin-react | 6.0.x | React Vite integration | Always -- v6 uses Oxc for React Refresh (no Babel dependency, smaller install) |
### Development Tools
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vitest | 4.1.x | Unit/integration testing | Shares Vite config, zero extra setup. Jest-compatible API. Use for testing caffeine decay math and store logic. |
| ESLint | 10.x | Linting | Use flat config (`eslint.config.js`). v10 is current stable. |
| eslint-plugin-react-hooks | latest | React hooks linting | Use `reactHooks.configs.flat.recommended` in flat config |
| typescript-eslint | latest | TypeScript linting | Integrates with ESLint flat config via `tseslint.config()` |
## Installation
# Scaffold project
# Core dependencies
# Tailwind CSS v4 (Vite plugin approach, no PostCSS config needed)
# Dev dependencies (Vitest + ESLint ecosystem)
### Post-Install Setup
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Recharts | Chart.js (react-chartjs-2) | When you need canvas-based rendering for very large datasets (thousands of points). Recharts uses SVG which is fine for caffeine data (dozens of points per day). |
| Recharts | Visx (Airbnb) | When you need pixel-level control over chart rendering and are willing to write more code. Visx is lower-level -- you build charts from primitives. Overkill for a decay curve. |
| Zustand | React Context + useReducer | When you want zero dependencies and the app has fewer than 3 pieces of shared state. Zustand's persist middleware makes it the clear winner here since you'd have to write your own localStorage sync with Context. |
| Zustand | Jotai | When your state is highly atomic (many independent atoms). Caffeine tracker state is a single coherent store (drink log + settings), which fits Zustand's store model better than Jotai's atom model. |
| Tailwind CSS | CSS Modules | When your team dislikes utility classes. CSS Modules work fine with Vite out of the box. But for a solo dev building a simple SPA, Tailwind's utility classes are faster to iterate with. |
| date-fns | dayjs | When bundle size is the absolute top priority and you need fewer functions. dayjs is smaller but less tree-shakable. date-fns v4 with selective imports is comparable in practice. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App (CRA) | Deprecated and unmaintained since 2023. Webpack-based, orders of magnitude slower than Vite. | Vite with `--template react-ts` |
| Redux / Redux Toolkit | Massive overkill for a localStorage-backed SPA with a single store. Boilerplate-heavy (slices, actions, reducers) for what Zustand does in 10 lines. | Zustand with persist middleware |
| Moment.js | Deprecated by its own maintainers. Mutable API. Massive bundle size (300+ KB). | date-fns (tree-shakable, immutable) |
| D3.js (raw) | Imperative DOM manipulation fights React's declarative model. D3 wants to own the DOM; React wants to own the DOM. Recharts wraps the useful D3 math modules while staying React-native. | Recharts (built on D3 math modules) |
| Material UI / Ant Design / Chakra | Component libraries add 100-500 KB for a handful of buttons and inputs. This app has ~3 screens worth of UI. Tailwind keeps things light. | Tailwind CSS utility classes |
| Next.js / Remix / React Router (framework mode) | Server-side frameworks are unnecessary overhead for a client-only app with no backend, no routing, and no SEO needs. A single `index.html` served statically is the correct architecture. | Plain Vite SPA (no framework) |
| localStorage raw API (manual sync) | Writing your own JSON serialization, hydration timing, error handling, and migration logic. Zustand persist handles all of this with battle-tested middleware. | Zustand persist middleware |
## Stack Patterns
- No router needed. Single-page means literally one page. If future scope adds settings/history views, add a simple tab component, not a router.
- No server-side rendering. Static deployment to any CDN or file server.
- No API layer. All computation (caffeine decay math) happens in the browser.
- Add Supabase or Firebase for backend persistence
- Zustand's persist middleware supports custom storage adapters, so swapping localStorage for a remote backend is a middleware change, not a rewrite
- Add vite-plugin-pwa for service worker generation
- The current stack (client-only, localStorage) is already offline-capable after first load
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| React 19.2.x | Zustand 5.x | Zustand 5 requires React 18+ minimum. React 19 fully supported. |
| React 19.2.x | Recharts 3.x | Recharts 3 supports React 18+. React 19 compatible. |
| Vite 8.x | @vitejs/plugin-react 6.x | v6 is the matching React plugin for Vite 8. Uses Oxc (no Babel). |
| Vite 8.x | @tailwindcss/vite 4.2.x | Tailwind v4 Vite plugin works with Vite 7+ and Vite 8. |
| Vite 8.x | Vitest 4.x | Vitest 4 designed for Vite 8 compatibility. Shares config. |
| Vite 8.x | Node.js | Requires Node.js 20.19+ or 22.12+. |
| TypeScript 6.x | All above | All listed packages ship TS types. TS 6 is the final JS-based compiler release. |
| ESLint 10.x | Flat config only | ESLint 10 removed legacy `.eslintrc` support. Must use `eslint.config.js`. |
## Sources
- [React npm versions page](https://www.npmjs.com/package/react?activeTab=versions) -- React 19.2.4 latest (HIGH confidence)
- [Vite 8.0 announcement](https://vite.dev/blog/announcing-vite8) -- Vite 8 with Rolldown, March 2026 (HIGH confidence)
- [Recharts npm page](https://www.npmjs.com/package/recharts) -- v3.8.0 latest (HIGH confidence)
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/middlewares/persist) -- Official persist API (HIGH confidence)
- [Zustand v5 migration guide](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) -- Breaking changes (HIGH confidence)
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) -- New CSS-first config (HIGH confidence)
- [Tailwind Vite installation docs](https://tailwindcss.com/docs/installation) -- @tailwindcss/vite plugin approach (HIGH confidence)
- [Vitest npm page](https://www.npmjs.com/package/vitest) -- v4.1.1 latest (HIGH confidence)
- [ESLint v10 announcement](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) -- ESLint 10 stable (HIGH confidence)
- [TypeScript 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) -- TS 6.0 stable (HIGH confidence)
- [date-fns npm page](https://www.npmjs.com/package/date-fns) -- v4.1.0 latest (HIGH confidence)
- [LogRocket React chart libraries comparison](https://blog.logrocket.com/best-react-chart-libraries-2025/) -- Charting library comparison (MEDIUM confidence)
- [@vitejs/plugin-react npm page](https://www.npmjs.com/package/@vitejs/plugin-react) -- v6.0.1 with Oxc (HIGH confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
