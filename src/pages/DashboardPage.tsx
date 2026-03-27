import { CaffeineStatus } from '../components/CaffeineStatus';
import { DecayCurveChart } from '../components/DecayCurveChart';
import { DrinkHistory } from '../components/DrinkHistory';

/**
 * Dashboard page composing the main caffeine tracking views.
 *
 * Renders CaffeineStatus (hero: current mg + sleep estimate + curfew),
 * DecayCurveChart (48h stacked decay curve), and DrinkHistory (today's drinks).
 * No business logic -- thin composition of existing components.
 */
export function DashboardPage() {
  return (
    <>
      <CaffeineStatus />
      <DecayCurveChart />
      <DrinkHistory />
    </>
  );
}
