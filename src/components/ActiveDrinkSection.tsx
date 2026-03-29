import { useState, useEffect, useCallback } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';
import { useCurrentTime } from '../hooks/useCurrentTime';

/**
 * "Currently Drinking" section at top of + sheet.
 * Only renders when active drinks exist.
 * Per D-08: Active drinks appear at top of + sheet.
 */
export function ActiveDrinkSection() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const finishDrink = useCaffeineStore((s) => s.finishDrink);
  const activeDrinks = drinks.filter((d) => d.endedAt === undefined);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmingId) return;
    const timer = setTimeout(() => setConfirmingId(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmingId]);

  const handleFinish = useCallback((id: string) => {
    if (confirmingId === id) {
      finishDrink(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
    }
  }, [confirmingId, finishDrink]);

  const handleKeepDrinking = useCallback(() => {
    setConfirmingId(null);
  }, []);

  if (activeDrinks.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Currently Drinking
      </p>
      <div className="space-y-2">
        {activeDrinks.map((drink) => {
          const elapsedMin = Math.round((now - drink.startedAt) / 60000);
          const isConfirming = confirmingId === drink.id;

          return (
            <div
              key={drink.id}
              className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-sm font-semibold text-gray-900">{drink.name}</span>
              </div>
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{elapsedMin}m</span>
                  <button
                    type="button"
                    onClick={() => handleFinish(drink.id)}
                    className="min-h-[44px] rounded-lg bg-green-600 text-white text-xs font-semibold px-4 py-2 hover:bg-green-700"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleKeepDrinking}
                    className="min-h-[44px] px-2 py-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Keep Drinking
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600 font-semibold">{elapsedMin} min</span>
                  <button
                    type="button"
                    onClick={() => handleFinish(drink.id)}
                    className="min-h-[44px] rounded-lg bg-purple-600 text-white text-xs font-semibold px-4 py-2 hover:bg-purple-700"
                  >
                    Finish
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
