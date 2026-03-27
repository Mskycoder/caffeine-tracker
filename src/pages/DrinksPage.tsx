import { MyDrinksManager } from '../components/MyDrinksManager';
import { BuiltInPresetsManager } from '../components/BuiltInPresetsManager';
import { ScheduleManager } from '../components/ScheduleManager';

/**
 * Drinks page with custom preset management, built-in preset visibility,
 * and schedule management.
 *
 * Renders three cards in a vertical stack:
 * - MyDrinksManager (create/edit/delete custom presets)
 * - BuiltInPresetsManager (toggle visibility of built-in presets)
 * - ScheduleManager (create/edit/delete/pause recurring drink schedules)
 *
 * Custom presets created here appear in the BottomSheet under "My Drinks"
 * when logging drinks. Built-in presets can be hidden from the quick-add
 * bottom sheet while remaining available in the schedule picker.
 * Schedules auto-log drinks at configured times.
 * This page is purely preset/schedule CRUD -- drink history is on the History page.
 */
export function DrinksPage() {
  return (
    <div className="space-y-4">
      <MyDrinksManager />
      <BuiltInPresetsManager />
      <ScheduleManager />
    </div>
  );
}
