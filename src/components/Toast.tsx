import { Coffee } from 'lucide-react';

interface ToastProps {
  message: string;
}

/**
 * Auto-dismissing toast notification displayed at top center.
 * Used for catch-up feedback (D-08). Accessible via role="status" and aria-live="polite".
 */
export function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50
                 rounded-lg bg-white shadow-lg border border-gray-200
                 px-4 py-3 flex items-center gap-2"
      style={{
        animation: 'toast-fade-in 200ms ease-out',
      }}
    >
      <Coffee size={16} className="text-green-600 flex-shrink-0" />
      <span className="text-sm text-gray-700">{message}</span>
    </div>
  );
}
