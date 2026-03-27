// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { useCaffeineStore } from '../store/caffeine-store';
import { BuiltInPresetsManager } from './BuiltInPresetsManager';
import { DRINK_PRESETS } from '../data/presets';
import { DEFAULT_COVARIATES } from '../engine/types';

const DEFAULT_SETTINGS = {
  halfLifeHours: 5,
  thresholdMg: 50,
  targetBedtime: '00:00',
  metabolismMode: 'simple' as const,
  covariates: { ...DEFAULT_COVARIATES },
  hiddenPresetIds: [] as string[],
  showResearchThresholds: false,
};

beforeEach(() => {
  useCaffeineStore.setState({
    drinks: [],
    settings: { ...DEFAULT_SETTINGS },
    customPresets: [],
    schedules: [],
  });
});

describe('BuiltInPresetsManager', () => {
  it('renders all 12 built-in preset names', () => {
    render(<BuiltInPresetsManager />);
    for (const preset of DRINK_PRESETS) {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    }
  });

  it('each preset row shows caffeine mg value', () => {
    render(<BuiltInPresetsManager />);
    // 63 mg appears twice (Espresso and Latte), 200 mg appears twice (Cold Brew and Caffeine Pill)
    expect(screen.getAllByText('63 mg')).toHaveLength(2);
    expect(screen.getAllByText('200 mg')).toHaveLength(2);
    expect(screen.getByText('95 mg')).toBeInTheDocument();
    expect(screen.getByText('126 mg')).toBeInTheDocument();
    expect(screen.getByText('150 mg')).toBeInTheDocument();
    expect(screen.getByText('47 mg')).toBeInTheDocument();
    expect(screen.getByText('28 mg')).toBeInTheDocument();
    expect(screen.getByText('70 mg')).toBeInTheDocument();
    expect(screen.getByText('80 mg')).toBeInTheDocument();
    expect(screen.getByText('34 mg')).toBeInTheDocument();
  });

  it('each preset has eye toggle button with correct aria-label when visible', () => {
    render(<BuiltInPresetsManager />);
    expect(screen.getByLabelText('Hide Espresso')).toBeInTheDocument();
    expect(screen.getByLabelText('Hide Drip Coffee')).toBeInTheDocument();
    expect(screen.getByLabelText('Hide Cold Brew')).toBeInTheDocument();
  });

  it('clicking eye toggle on a visible preset adds its presetId to hiddenPresetIds', () => {
    render(<BuiltInPresetsManager />);
    fireEvent.click(screen.getByLabelText('Hide Espresso'));
    const { settings } = useCaffeineStore.getState();
    expect(settings.hiddenPresetIds).toContain('espresso');
  });

  it('clicking eye toggle on a hidden preset removes its presetId from hiddenPresetIds', () => {
    useCaffeineStore.setState({
      settings: { ...DEFAULT_SETTINGS, hiddenPresetIds: ['espresso'] },
    });
    render(<BuiltInPresetsManager />);
    expect(screen.getByLabelText('Show Espresso')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show Espresso'));
    const { settings } = useCaffeineStore.getState();
    expect(settings.hiddenPresetIds).not.toContain('espresso');
  });

  it('hidden preset rows have dimmed text styling', () => {
    useCaffeineStore.setState({
      settings: { ...DEFAULT_SETTINGS, hiddenPresetIds: ['espresso'] },
    });
    render(<BuiltInPresetsManager />);
    const nameEl = screen.getByText('Espresso');
    expect(nameEl.className).toContain('text-gray-400');
  });

  it('visible preset rows have normal text styling', () => {
    render(<BuiltInPresetsManager />);
    const nameEl = screen.getByText('Espresso');
    expect(nameEl.className).toContain('text-gray-900');
  });
});
