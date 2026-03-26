import { useState, useRef, useEffect } from 'react';
import { DrinkLogger } from './DrinkLogger';

/**
 * FAB + native dialog modal wrapper for DrinkLogger.
 *
 * Phase 7, D-01/D-02: Moves drink logging into an overlay modal triggered by a
 * fixed-position floating action button (FAB). Uses the native <dialog> element
 * for built-in Escape-key dismissal and top-layer rendering.
 *
 * D-09: FAB positioned with safe-area-inset-bottom offset for notched devices.
 * DrinkLogger is conditionally rendered so its timeOverride state resets on close.
 */
export function DrinkLoggerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Log a drink"
        className="fixed right-6 z-10 w-14 h-14 rounded-full bg-blue-600 text-white
                   shadow-lg hover:bg-blue-700 active:bg-blue-800
                   flex items-center justify-center text-2xl font-light"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        +
      </button>

      {/* Modal dialog */}
      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="backdrop:bg-black/50 rounded-2xl p-0 w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-y-auto mx-auto"
      >
        <div className="p-4" onClick={(e) => e.stopPropagation()}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Log a Drink</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
          </div>

          {/* DrinkLogger content — conditionally rendered so state resets on close */}
          {isOpen && <DrinkLogger />}
        </div>
      </dialog>
    </>
  );
}
