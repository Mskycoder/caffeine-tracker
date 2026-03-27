import { MyDrinksManager } from '../components/MyDrinksManager';
import { ScheduleManager } from '../components/ScheduleManager';

/**
 * Drinks page with custom preset management and schedule management.
 *
 * Renders two cards in a vertical stack:
 * - MyDrinksManager (create/edit/delete custom presets)
 * - ScheduleManager (create/edit/delete/pause recurring drink schedules)
 *
 * Custom presets created here appear in the BottomSheet under "My Drinks"
 * when logging drinks. Schedules auto-log drinks at configured times.
 * This page is purely preset/schedule CRUD -- drink history is on the History page.
 */
export function DrinksPage() {
  return (
    <div className="space-y-4">
      <MyDrinksManager />
      <ScheduleManager />
    </div>
  );
}
