import { useState } from 'react';
import { Outlet } from 'react-router';
import { TabBar } from './TabBar';
import { BottomSheet } from './BottomSheet';
import { DrinkLogger } from './DrinkLogger';
import { useScheduleCatchUp } from '../hooks/useScheduleCatchUp';
import { useAutoFinish } from '../hooks/useAutoFinish';
import { Toast } from './Toast';

/**
 * Layout shell wrapping all pages with a shared container, tab bar,
 * and bottom sheet drink logger.
 *
 * Provides the centered single-column layout, background color, and
 * bottom padding for the tab bar. TabBar triggers the BottomSheet open
 * state via the center "+" button. DrinkLogger is rendered inside the
 * BottomSheet and unmounts when closed (resetting timeOverride state).
 *
 * On mount, runs scheduled drink catch-up via useScheduleCatchUp hook.
 * If drinks were auto-logged, displays a Toast notification that
 * auto-dismisses after 3 seconds.
 */
export function Layout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const catchUpToast = useScheduleCatchUp();
  const autoFinishToast = useAutoFinish();

  // Show whichever toast is active (they shouldn't overlap in practice)
  const toastMessage = catchUpToast || autoFinishToast;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <Outlet />
      </div>
      <TabBar onAddDrink={() => setSheetOpen(true)} />
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <DrinkLogger />
      </BottomSheet>
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
