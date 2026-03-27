import { NavLink } from 'react-router';
import { LayoutDashboard, Coffee, Settings, Plus } from 'lucide-react';

interface TabBarProps {
  onAddDrink: () => void;
}

/**
 * Bottom tab bar (mobile) / floating pill dock (desktop/tablet).
 *
 * Three NavLink tabs (Dashboard, Drinks, Settings) with a center "+"
 * action button that triggers the drink-logging bottom sheet. Active tab
 * shows a filled icon in primary color; inactive tabs show outlined gray icons.
 *
 * Responsive: Full-width fixed bar on mobile (< 768px) transforms into a
 * centered pill-shaped floating dock on desktop/tablet (>= 768px) via
 * Tailwind `md:` breakpoint classes.
 */
export function TabBar({ onAddDrink }: TabBarProps) {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-40
                 bg-white/95 backdrop-blur-sm border-t border-gray-200
                 pb-[env(safe-area-inset-bottom)]
                 md:bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2
                 md:rounded-full md:border md:shadow-lg md:w-auto md:max-w-md
                 md:pb-0 md:border-gray-200/50"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {/* Dashboard tab */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 px-3 ${
              isActive ? 'text-purple-600' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard
                size={24}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="text-xs">Dashboard</span>
            </>
          )}
        </NavLink>

        {/* Drinks tab */}
        <NavLink
          to="/drinks"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 px-3 ${
              isActive ? 'text-purple-600' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Coffee
                size={24}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="text-xs">Drinks</span>
            </>
          )}
        </NavLink>

        {/* Center "+" action button */}
        <button
          type="button"
          onClick={onAddDrink}
          aria-label="Log a drink"
          className="relative -top-3 w-14 h-14 rounded-full bg-purple-600
                     text-white shadow-lg hover:bg-purple-700 active:bg-purple-800
                     flex items-center justify-center"
        >
          <Plus size={28} />
        </button>

        {/* Settings tab */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 px-3 ${
              isActive ? 'text-purple-600' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={24}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="text-xs">Settings</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
