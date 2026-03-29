import { CaffeineStatus } from '../components/CaffeineStatus';
import { ActiveDrinkCard } from '../components/ActiveDrinkCard';
import { DecayCurveChart } from '../components/DecayCurveChart';
import { DrinkHistory } from '../components/DrinkHistory';

/**
 * Dashboard page composing the main caffeine tracking views.
 *
 * Renders CaffeineStatus (hero: current mg + sleep estimate + curfew),
 * ActiveDrinkCard (currently sipping drinks, renders null when none active),
 * DecayCurveChart (48h stacked decay curve), and DrinkHistory (today's drinks).
 * No business logic -- thin composition of existing components.
 */
export function DashboardPage() {
  return (
    <>
      <CaffeineStatus />
      <ActiveDrinkCard />
      <DecayCurveChart />
      <DrinkHistory />
    </>
  );
}
