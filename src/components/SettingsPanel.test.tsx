// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { useCaffeineStore } from '../store/caffeine-store';

describe('SettingsPanel', () => {
  beforeEach(() => {
    useCaffeineStore.setState({
      drinks: [],
      settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: '00:00' },
    });
  });

  it('renders Settings header', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('collapsed by default', () => {
    render(<SettingsPanel />);
    expect(screen.queryByText('Metabolism Speed')).not.toBeInTheDocument();
  });

  it('expands on toggle click', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByText('Metabolism Speed')).toBeInTheDocument();
  });

  it('collapses on second toggle click', () => {
    render(<SettingsPanel />);
    const toggle = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(toggle);
    expect(screen.getByText('Metabolism Speed')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('Metabolism Speed')).not.toBeInTheDocument();
  });

  it('toggle has aria-expanded false by default', () => {
    render(<SettingsPanel />);
    const toggle = screen.getByRole('button', { name: /settings/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle has aria-expanded true when open', () => {
    render(<SettingsPanel />);
    const toggle = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows three metabolism buttons when expanded', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
  });

  it('Average button has aria-pressed true by default (halfLife=5)', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const avgButton = screen.getByRole('button', { name: /average/i });
    expect(avgButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking Fast updates halfLifeHours to 3', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /fast/i }));
    expect(useCaffeineStore.getState().settings.halfLifeHours).toBe(3);
  });

  it('clicking Slow updates halfLifeHours to 7', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /slow/i }));
    expect(useCaffeineStore.getState().settings.halfLifeHours).toBe(7);
  });

  it('shows threshold input with value 50', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(50);
  });

  it('changing threshold updates store', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '80' } });
    expect(useCaffeineStore.getState().settings.thresholdMg).toBe(80);
  });

  it('shows bedtime input with value 00:00', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const input = screen.getByLabelText(/target bedtime/i);
    expect(input).toHaveValue('00:00');
  });

  it('changing bedtime updates store', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const input = screen.getByLabelText(/target bedtime/i);
    fireEvent.change(input, { target: { value: '22:30' } });
    expect(useCaffeineStore.getState().settings.targetBedtime).toBe('22:30');
  });

  describe('touch targets', () => {
    it('settings toggle has 44px minimum touch target', () => {
      render(<SettingsPanel />);
      const toggle = screen.getByRole('button', { name: /settings/i });
      expect(toggle.className).toContain('min-h-[44px]');
    });

    it('metabolism buttons have 44px minimum touch target', () => {
      render(<SettingsPanel />);
      fireEvent.click(screen.getByRole('button', { name: /settings/i }));
      const fastBtn = screen.getByRole('button', { name: /fast/i });
      expect(fastBtn.className).toContain('min-h-[44px]');
    });

    it('threshold input has 44px minimum touch target', () => {
      render(<SettingsPanel />);
      fireEvent.click(screen.getByRole('button', { name: /settings/i }));
      const input = screen.getByRole('spinbutton');
      expect(input.className).toContain('min-h-[44px]');
    });

    it('bedtime input has 44px minimum touch target', () => {
      render(<SettingsPanel />);
      fireEvent.click(screen.getByRole('button', { name: /settings/i }));
      const input = screen.getByLabelText(/target bedtime/i);
      expect(input.className).toContain('min-h-[44px]');
    });
  });
});
