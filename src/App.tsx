import { Header } from './components/Header';
import { DrinkLogger } from './components/DrinkLogger';
import { CaffeineStatus } from './components/CaffeineStatus';
import { DecayCurveChart } from './components/DecayCurveChart';
import { DrinkHistory } from './components/DrinkHistory';

/**
 * App shell with centered single-column layout.
 *
 * Per D-13: Layout order: Header -> Drink Logger -> Status Display (hero) ->
 *           Decay Chart -> Drink History. Single-column stacked, max-width ~512px.
 * Per D-08: Max-width centered container (~480-640px). max-w-lg = 512px.
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <Header />
        <DrinkLogger />
        <CaffeineStatus />
        <DecayCurveChart />
        <DrinkHistory />
      </div>
    </div>
  );
}

export default App;
