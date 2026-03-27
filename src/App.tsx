import { Routes, Route, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DrinksPage } from './pages/DrinksPage';
import { SettingsPage } from './pages/SettingsPage';

/**
 * Route definitions for the caffeine tracker app.
 *
 * Layout shell wraps all pages (provides container + TabBar + BottomSheet).
 * Routes: / -> Dashboard, /drinks -> Drinks, /settings -> Settings.
 * Unknown routes redirect to / (catch-all).
 */
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="drinks" element={<DrinksPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
