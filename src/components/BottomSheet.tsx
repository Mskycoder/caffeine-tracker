import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Swipe-dismissable bottom sheet (mobile) / centered modal dialog (desktop).
 *
 * On mobile (< 768px): slides up from the bottom covering up to 85% of the
 * viewport. Dismissible via swipe-down on the drag handle, backdrop tap, or
 * X button. Swipe gesture uses pointer events with setPointerCapture for
 * reliable tracking.
 *
 * On desktop (>= 768px): renders as a centered modal with backdrop. No drag
 * handle (hidden via md:hidden). Dismissible via backdrop tap, X button, or
 * Escape key.
 *
 * Body scroll is locked while open. DrinkLogger content unmounts when closed
 * (BottomSheet returns null), resetting timeOverride state.
 */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape key dismissal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const delta = Math.max(0, e.clientY - startY.current);
      setDragY(delta);
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
    setIsDragging(false);
  }, [dragY, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal */}
      <div
        ref={sheetRef}
        className={`fixed z-50 bg-white flex flex-col
          bottom-0 inset-x-0 rounded-t-2xl max-h-[85vh]
          pb-[env(safe-area-inset-bottom)]
          md:bottom-auto md:inset-auto md:top-1/2 md:left-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-2xl md:w-[calc(100%-2rem)] md:max-w-lg md:shadow-xl
          md:pb-0
          ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ transform: `translateY(${dragY}px)` }}
        role="dialog"
        aria-modal="true"
        aria-label="Log a Drink"
      >
        {/* Drag handle (mobile only) */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing md:hidden touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 md:pt-4">
          <h2 className="text-lg font-semibold text-gray-800">Log a Drink</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center
                       text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content — scrollable area; min-h-0 lets flex child shrink below content size */}
        <div className="px-4 pb-4 overflow-y-auto min-h-0">{children}</div>
      </div>
    </>
  );
}
