import { Header } from './components/Header';
import { DrinkLogger } from './components/DrinkLogger';

/**
 * App shell with centered single-column layout.
 *
 * Per D-07: Single-column stacked layout: header -> drink logging section.
 * Per D-08: Max-width centered container (~480-640px). max-w-lg = 512px.
 * Future phases add: decay curve chart (Phase 3), drink history (Phase 3).
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Header />
        <DrinkLogger />
        {/* Future: Decay curve chart (Phase 3) */}
        {/* Future: Drink history list (Phase 3) */}
      </div>
    </div>
  );
}

export default App;
