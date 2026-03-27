import { MyDrinksManager } from '../components/MyDrinksManager';
import { DrinkHistory } from '../components/DrinkHistory';

/**
 * Drinks page with custom preset management and drink history.
 *
 * Renders MyDrinksManager (create/edit/delete custom presets) above DrinkHistory
 * (today's logged drinks). Custom presets created here appear in the BottomSheet
 * under "My Drinks" when logging drinks.
 */
export function DrinksPage() {
  return (
    <div className="space-y-4">
      <MyDrinksManager />
      <DrinkHistory />
    </div>
  );
}
