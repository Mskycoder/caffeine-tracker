import { SettingsPanel } from '../components/SettingsPanel';

/**
 * Settings page rendering the settings panel expanded.
 *
 * Unlike the previous collapsible panel, the dedicated settings page
 * shows all settings controls directly without a toggle.
 */
export function SettingsPage() {
  return <SettingsPanel />;
}
