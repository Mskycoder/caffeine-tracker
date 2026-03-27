// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { CovariateForm } from './CovariateForm';
import { DEFAULT_COVARIATES } from '../engine/types';
import type { CovariateSettings } from '../engine/types';

const defaultProps = (overrides?: Partial<CovariateSettings>) => ({
  covariates: { ...DEFAULT_COVARIATES, ...overrides },
  onChange: vi.fn(),
});

describe('CovariateForm', () => {
  it('renders all three section headings (Demographics, Lifestyle, Clinical)', () => {
    render(<CovariateForm {...defaultProps()} />);
    expect(screen.getByText('Demographics')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('Clinical')).toBeInTheDocument();
  });

  describe('pregnancy / OC mutual exclusion', () => {
    it('disables OC toggle when pregnancy trimester is set', () => {
      const props = defaultProps({ pregnancyTrimester: 'first' });
      render(<CovariateForm {...props} />);
      const ocCheckbox = screen.getByRole('checkbox', {
        name: /oral contraceptives/i,
      });
      expect(ocCheckbox).toBeDisabled();
      expect(
        screen.getByText('Not applicable during pregnancy'),
      ).toBeInTheDocument();
    });

    it('selecting a pregnancy trimester calls onChange with oralContraceptives forced to false', () => {
      const onChange = vi.fn();
      render(
        <CovariateForm
          covariates={{ ...DEFAULT_COVARIATES, oralContraceptives: true }}
          onChange={onChange}
        />,
      );
      fireEvent.change(screen.getByLabelText(/pregnancy/i), {
        target: { value: 'first' },
      });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pregnancyTrimester: 'first',
          oralContraceptives: false,
        }),
      );
    });

    it('OC toggle is enabled when not pregnant', () => {
      render(<CovariateForm {...defaultProps()} />);
      const ocCheckbox = screen.getByRole('checkbox', {
        name: /oral contraceptives/i,
      });
      expect(ocCheckbox).not.toBeDisabled();
    });
  });

  describe('weight kg/lbs conversion', () => {
    it('switching from kg to lbs converts 70kg to ~154lbs', () => {
      const onChange = vi.fn();
      render(
        <CovariateForm
          covariates={{ ...DEFAULT_COVARIATES, weight: 70, weightUnit: 'kg' }}
          onChange={onChange}
        />,
      );
      // Click the 'lbs' button in the weight unit segmented control
      fireEvent.click(screen.getByRole('button', { name: /lbs/i }));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 154, weightUnit: 'lbs' }),
      );
    });

    it('switching from lbs to kg converts 154lbs to ~70kg', () => {
      const onChange = vi.fn();
      render(
        <CovariateForm
          covariates={{
            ...DEFAULT_COVARIATES,
            weight: 154,
            weightUnit: 'lbs',
          }}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /kg/i }));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 70, weightUnit: 'kg' }),
      );
    });
  });

  describe('smoking toggle', () => {
    it('toggling smoker on calls onChange with smoking: true', () => {
      const onChange = vi.fn();
      render(
        <CovariateForm covariates={DEFAULT_COVARIATES} onChange={onChange} />,
      );
      fireEvent.click(screen.getByRole('checkbox', { name: /smoker/i }));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ smoking: true }),
      );
    });
  });

  describe('sex segmented control', () => {
    it('clicking Female calls onChange with sex: female', () => {
      const onChange = vi.fn();
      render(
        <CovariateForm covariates={DEFAULT_COVARIATES} onChange={onChange} />,
      );
      fireEvent.click(screen.getByRole('button', { name: /female/i }));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ sex: 'female' }),
      );
    });
  });

  describe('accessibility', () => {
    it('weight input has aria-label and inputMode', () => {
      render(<CovariateForm {...defaultProps()} />);
      const weightInput = screen.getByLabelText('Body weight');
      expect(weightInput).toHaveAttribute('inputMode', 'decimal');
    });

    it('sex segmented control has role group with aria-label', () => {
      render(<CovariateForm {...defaultProps()} />);
      expect(screen.getByRole('group', { name: /sex/i })).toBeInTheDocument();
    });

    it('OC toggle has aria-describedby linking to helper text when disabled', () => {
      const props = defaultProps({ pregnancyTrimester: 'second' });
      render(<CovariateForm {...props} />);
      const ocCheckbox = screen.getByRole('checkbox', {
        name: /oral contraceptives/i,
      });
      expect(ocCheckbox).toHaveAttribute('aria-describedby', 'oc-helper');
      expect(document.getElementById('oc-helper')).toBeInTheDocument();
    });
  });
});
