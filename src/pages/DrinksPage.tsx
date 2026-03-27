import { MyDrinksManager } from '../components/MyDrinksManager';

/**
 * Drinks page with custom preset management.
 *
 * Renders MyDrinksManager (create/edit/delete custom presets). Custom presets
 * created here appear in the BottomSheet under "My Drinks" when logging drinks.
 * This page is purely preset CRUD -- drink history is on the History page.
 */
export function DrinksPage() {
  return <MyDrinksManager />;
}
