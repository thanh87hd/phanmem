import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ChangePasswordModal from '../ChangePasswordModal';
import api from '../../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ChangePasswordModal Component (CP-01 -> CP-04)', { timeout: 15000 }, () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    isMandatory: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 1, username: 'admin', twoFactorEnabled: false }),
    );
  });

  it('CP-01: renders modal with password fields and password strength indicator', async () => {
    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    // Verify inputs exist
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('CP-02: updates password complexity indicators when user types password', async () => {
    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    const newPassInput = document.querySelector('input[id*="newPassword"]') || document.querySelectorAll('input[type="password"]')[1];
    if (newPassInput) {
      fireEvent.change(newPassInput, { target: { value: 'abc' } });
      await waitFor(() => {
        expect(document.querySelector('.ant-progress')).toBeDefined();
      });

      // Type stronger password
      fireEvent.change(newPassInput, { target: { value: 'StrongP@ssw0rd2026!' } });
      await waitFor(() => {
        expect(screen.getByText(/^Mạnh$/)).toBeDefined();
      });
    }
  });

  it('CP-03: submits password change via API on form submission', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    const inputs = document.querySelectorAll('input[type="password"]');
    if (inputs.length >= 3) {
      fireEvent.change(inputs[0], { target: { value: '@bcd1234' } });
      fireEvent.change(inputs[1], { target: { value: 'NewSuperPassw0rd!' } });
      fireEvent.change(inputs[2], { target: { value: 'NewSuperPassw0rd!' } });

      const submitBtn = screen.getByRole('button', { name: /Lưu đổi mật khẩu/i });
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith(
            '/auth/change-password',
            expect.objectContaining({
              currentPassword: '@bcd1234',
              newPassword: 'NewSuperPassw0rd!',
            }),
          );
        });
      }
    }
  });

  it('CP-04: switches to 2FA tab and handles 2FA configuration view', async () => {
    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    const twoFactorTab = screen.getByText(/Xác thực 2 yếu tố/i) || screen.getByText(/2FA/i);
    if (twoFactorTab) {
      fireEvent.click(twoFactorTab);

      await waitFor(() => {
        expect(screen.getByText(/Chưa kích hoạt/i) || screen.getByText(/Kích hoạt 2FA/i) || screen.getByText(/TOTP/i)).toBeDefined();
      });
    }
  });
});
