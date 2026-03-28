// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { useCaffeineStore } from '../store/caffeine-store';
import { DEFAULT_COVARIATES } from '../engine/types';

const defaultSettings = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: '00:00',
  metabolismMode: 'simple' as const,
  covariates: { ...DEFAULT_COVARIATES },
  hiddenPresetIds: [] as string[],
  showResearchThresholds: false,
  caffeineSensitivity: 'normal' as const,
  thresholdSource: 'manual' as const,
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    useCaffeineStore.setState({
      drinks: [],
      settings: { ...defaultSettings },
    });
  });

  it('renders expanded by default (no toggle needed)', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Metabolism Speed')).toBeInTheDocument();
    expect(screen.getByText('Sleep Threshold')).toBeInTheDocument();
    expect(screen.getByText('Target Bedtime')).toBeInTheDocument();
  });

  it('shows three metabolism buttons', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
  });

  it('Average button has aria-pressed true by default (halfLife=5)', () => {
    render(<SettingsPanel />);
    const avgButton = screen.getByRole('button', { name: /average/i });
    expect(avgButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking Fast updates halfLifeHours to 3', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /fast/i }));
    expect(useCaffeineStore.getState().settings.halfLifeHours).toBe(3);
  });

  it('clicking Slow updates halfLifeHours to 7', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /slow/i }));
    expect(useCaffeineStore.getState().settings.halfLifeHours).toBe(7);
  });

  it('shows threshold input with value 50', () => {
    render(<SettingsPanel />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(50);
  });

  it('changing threshold updates store', () => {
    render(<SettingsPanel />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '80' } });
    expect(useCaffeineStore.getState().settings.thresholdMg).toBe(80);
  });

  it('shows bedtime input with value 00:00', () => {
    render(<SettingsPanel />);
    const input = screen.getByLabelText(/target bedtime/i);
    expect(input).toHaveValue('00:00');
  });

  it('changing bedtime updates store', () => {
    render(<SettingsPanel />);
    const input = screen.getByLabelText(/target bedtime/i);
    fireEvent.change(input, { target: { value: '22:30' } });
    expect(useCaffeineStore.getState().settings.targetBedtime).toBe('22:30');
  });

  describe('touch targets', () => {
    it('metabolism buttons have 44px minimum touch target', () => {
      render(<SettingsPanel />);
      const fastBtn = screen.getByRole('button', { name: /fast/i });
      expect(fastBtn.className).toContain('min-h-[44px]');
    });

    it('threshold input has 44px minimum touch target', () => {
      render(<SettingsPanel />);
      const input = screen.getByRole('spinbutton');
      expect(input.className).toContain('min-h-[44px]');
    });

    it('bedtime input has 44px minimum touch target', () => {
      render(<SettingsPanel />);
      const input = screen.getByLabelText(/target bedtime/i);
      expect(input.className).toContain('min-h-[44px]');
    });
  });

  describe('mode toggle', () => {
    it('renders "Use advanced settings" link in simple mode', () => {
      render(<SettingsPanel />);
      expect(screen.getByText('Use advanced settings')).toBeInTheDocument();
      expect(screen.queryByText('Use simple settings')).not.toBeInTheDocument();
    });

    it('clicking "Use advanced settings" switches to advanced mode', () => {
      render(<SettingsPanel />);
      fireEvent.click(screen.getByText('Use advanced settings'));
      expect(useCaffeineStore.getState().settings.metabolismMode).toBe('advanced');
    });

    it('renders CovariateForm and "Use simple settings" in advanced mode', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, metabolismMode: 'advanced' },
      });
      render(<SettingsPanel />);
      expect(screen.getByText('Use simple settings')).toBeInTheDocument();
      expect(screen.getByText('Demographics')).toBeInTheDocument();
      expect(screen.getByText('Lifestyle')).toBeInTheDocument();
      expect(screen.getByText('Clinical')).toBeInTheDocument();
    });

    it('shows computed half-life in advanced mode', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, metabolismMode: 'advanced' },
      });
      render(<SettingsPanel />);
      expect(screen.getByText('Computed half-life:')).toBeInTheDocument();
      expect(screen.getByText('5.0 hours')).toBeInTheDocument();
    });

    it('clicking "Use simple settings" preserves covariates per D-02', () => {
      useCaffeineStore.setState({
        settings: {
          ...defaultSettings,
          metabolismMode: 'advanced',
          covariates: { ...defaultSettings.covariates, smoking: true },
        },
      });
      render(<SettingsPanel />);
      fireEvent.click(screen.getByText('Use simple settings'));
      const state = useCaffeineStore.getState();
      expect(state.settings.metabolismMode).toBe('simple');
      expect(state.settings.covariates.smoking).toBe(true); // preserved
    });
  });

  describe('research thresholds', () => {
    it('renders Research Thresholds section header', () => {
      render(<SettingsPanel />);
      expect(screen.getByText('Research Thresholds')).toBeInTheDocument();
    });

    it('renders Show research thresholds toggle', () => {
      render(<SettingsPanel />);
      expect(screen.getByText('Show research thresholds')).toBeInTheDocument();
    });

    it('toggle is off by default', () => {
      render(<SettingsPanel />);
      const toggleCheckbox = screen.getByRole('checkbox');
      expect(toggleCheckbox).not.toBeChecked();
    });

    it('shows sensitivity and threshold source controls when toggle is on', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, showResearchThresholds: true },
      });
      render(<SettingsPanel />);
      expect(screen.getByText('Caffeine Sensitivity')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Sleep Threshold Source')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText('Autonomic')).toBeInTheDocument();
      expect(screen.getByText('Deep Sleep')).toBeInTheDocument();
    });

    it('hides sensitivity and threshold source controls when toggle is off', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, showResearchThresholds: false },
      });
      render(<SettingsPanel />);
      expect(screen.queryByText('Caffeine Sensitivity')).not.toBeInTheDocument();
    });

    it('Normal sensitivity button has aria-pressed true by default', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, showResearchThresholds: true },
      });
      render(<SettingsPanel />);
      const normalButton = screen.getByRole('button', { name: /normal/i });
      expect(normalButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('clicking sensitivity button updates store', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, showResearchThresholds: true },
      });
      render(<SettingsPanel />);
      // Use exact name match to avoid collision with "Slow" metabolism button
      fireEvent.click(screen.getByRole('button', { name: /^low tolerant/i }));
      expect(useCaffeineStore.getState().settings.caffeineSensitivity).toBe('low');
    });

    it('clicking threshold source button updates store', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, showResearchThresholds: true },
      });
      render(<SettingsPanel />);
      fireEvent.click(screen.getByRole('button', { name: /autonomic/i }));
      expect(useCaffeineStore.getState().settings.thresholdSource).toBe('autonomic');
    });

    it('sleep threshold input is disabled when threshold source is not manual', () => {
      useCaffeineStore.setState({
        settings: { ...defaultSettings, thresholdSource: 'autonomic' as const },
      });
      render(<SettingsPanel />);
      const input = screen.getByRole('spinbutton');
      expect(input).toBeDisabled();
    });
  });
});
