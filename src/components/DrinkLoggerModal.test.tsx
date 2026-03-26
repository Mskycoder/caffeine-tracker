// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { DrinkLoggerModal } from './DrinkLoggerModal';
import { useCaffeineStore } from '../store/caffeine-store';

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => new Date('2026-03-25T14:00:00').getTime(),
}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });

  useCaffeineStore.setState({
    drinks: [],
    settings: { halfLifeHours: 5, thresholdMg: 50, targetBedtime: null },
  });
});

describe('DrinkLoggerModal', () => {
  it('renders FAB button with Log a drink label', () => {
    render(<DrinkLoggerModal />);
    expect(screen.getByRole('button', { name: /log a drink/i })).toBeInTheDocument();
  });

  it('dialog is closed by default', () => {
    render(<DrinkLoggerModal />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    // DrinkLogger content not rendered when modal is closed (conditionally gated by isOpen)
    expect(screen.queryByText('Espresso')).toBeNull();
  });

  it('clicking FAB opens modal', () => {
    render(<DrinkLoggerModal />);
    fireEvent.click(screen.getByRole('button', { name: /log a drink/i }));

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(screen.getByText('Log a Drink')).toBeInTheDocument();
  });

  it('modal shows DrinkLogger content (presets)', () => {
    render(<DrinkLoggerModal />);
    fireEvent.click(screen.getByRole('button', { name: /log a drink/i }));

    expect(screen.getByText('Espresso')).toBeInTheDocument();
  });

  it('close button closes modal', () => {
    render(<DrinkLoggerModal />);
    fireEvent.click(screen.getByRole('button', { name: /log a drink/i }));

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('Escape key closes modal via onClose', () => {
    render(<DrinkLoggerModal />);
    fireEvent.click(screen.getByRole('button', { name: /log a drink/i }));

    expect(screen.getByText('Log a Drink')).toBeInTheDocument();

    // Simulate native dialog close event (fired by browser on Escape)
    const dialog = document.querySelector('dialog')!;
    fireEvent(dialog, new Event('close'));

    // DrinkLogger content should no longer be rendered
    expect(screen.queryByText('Espresso')).toBeNull();
  });
});
