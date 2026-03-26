import { Header } from './components/Header';
import { CaffeineStatus } from './components/CaffeineStatus';
import { DecayCurveChart } from './components/DecayCurveChart';
import { DrinkHistory } from './components/DrinkHistory';
import { SettingsPanel } from './components/SettingsPanel';
import { DrinkLoggerModal } from './components/DrinkLoggerModal';

/**
 * App shell with centered single-column layout.
 *
 * Layout order: Header -> CaffeineStatus (hero) -> Decay Chart ->
 *               Drink History -> Settings Panel.
 * DrinkLogger moved to modal triggered by FAB (Phase 7, D-01).
 * Per D-08/D-09: Safe-area padding on outer container.
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <Header />
        <CaffeineStatus />
        <DecayCurveChart />
        <DrinkHistory />
        <SettingsPanel />
      </div>
      <DrinkLoggerModal />
    </div>
  );
}

export default App;
