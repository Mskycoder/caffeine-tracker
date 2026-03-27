import { useState, type FormEvent } from 'react';
import { useCaffeineStore } from '../store/caffeine-store';

interface CustomDrinkFormProps {
  /** Returns the timestamp to use for the logged drink (Date.now() or backdated time). */
  getTimestamp: () => number;
}

/**
 * Custom caffeine entry form.
 *
 * Per D-04: Always-visible inline form below presets. Fields: mg amount (required) and optional name.
 * Per D-05: Form clears after successful submission.
 * Per D-09: Button shows brief confirmation ("Logged" text, green bg) for 1 second.
 * Per Pitfall 3: Validates mg > 0 before logging.
 */
export function CustomDrinkForm({ getTimestamp }: CustomDrinkFormProps) {
  const addDrink = useCaffeineStore((s) => s.addDrink);
  const [mgInput, setMgInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const mg = Number(mgInput);
    if (!mg || mg <= 0) return; // Pitfall 3: reject empty/invalid mg

    addDrink({
      name: nameInput.trim() || 'Custom',
      caffeineMg: mg,
      timestamp: getTimestamp(),
      presetId: null,
    });

    setMgInput('');
    setNameInput('');
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        type="number"
        min="1"
        max="1000"
        placeholder="mg"
        value={mgInput}
        onChange={(e) => setMgInput(e.target.value)}
        required
        className="w-20 px-3 py-2 border border-gray-200 rounded-lg min-h-[44px]"
        aria-label="Caffeine amount in mg"
      />
      <input
        type="text"
        placeholder="Name (optional)"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-lg min-h-[44px]"
        aria-label="Drink name"
      />
      <button
        type="submit"
        className={`min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors duration-300
          ${confirmed ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
      >
        {confirmed ? 'Logged' : 'Log'}
      </button>
    </form>
  );
}
