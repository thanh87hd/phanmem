import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ChangePasswordModal from '../ChangePasswordModal';
import api from '../../services/api';
import { message } from 'antd';

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

// The antd static `message` API renders into its own global React root that is never
// unmounted by RTL cleanup, which leaves pending React work behind at teardown.
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
      open: vi.fn(),
      destroy: vi.fn(),
    },
  };
});

const getPasswordInputs = () =>
  Array.from(document.querySelectorAll('input[type="password"]')) as HTMLInputElement[];

const getFormErrorText = () =>
  Array.from(document.querySelectorAll('.ant-form-item-explain-error'))
    .map((el) => el.textContent || '')
    .join(' | ');

const clickSubmit = () => {
  const submitBtn = screen.getByRole('button', { name: /Lưu đổi mật khẩu/i });
  expect(submitBtn).toBeDefined();
  fireEvent.click(submitBtn);
};

const waitForSubmitToFinish = async (onClose: ReturnType<typeof vi.fn>) => {
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Lưu đổi mật khẩu/i }).className).not.toContain(
      'ant-btn-loading',
    );
  });
};

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

    // The password form must expose exactly the three required fields
    const inputs = getPasswordInputs();
    expect(inputs.length).toBe(3);
    expect(document.querySelector('#currentPassword')).not.toBeNull();
    expect(document.querySelector('#newPassword')).not.toBeNull();
    expect(document.querySelector('#confirmPassword')).not.toBeNull();

    // Strength indicator + complexity checklist are rendered with the PCI DSS 8.3.6 criteria
    expect(screen.getByText('Độ mạnh mật khẩu:')).toBeDefined();
    expect(screen.getByText('Chưa nhập')).toBeDefined();
    expect(screen.getByText('Độ dài ≥ 12 ký tự (0/12)')).toBeDefined();
    expect(screen.getByText('Chữ IN HOA (A-Z)')).toBeDefined();
    expect(screen.getByText('Chữ thường (a-z)')).toBeDefined();
    expect(screen.getByText('Chữ số (0-9)')).toBeDefined();
    expect(screen.getByText('Ký tự đặc biệt (!@#$%^&*...)')).toBeDefined();
    expect(document.querySelector('.ant-progress')).not.toBeNull();
  });

  it('CP-02: updates password complexity indicators when user types password', async () => {
    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    const newPassInput = document.querySelector('input[id*="newPassword"]') as HTMLInputElement;
    expect(newPassInput).not.toBeNull();

    fireEvent.change(newPassInput, { target: { value: 'abc' } });
    await waitFor(() => {
      expect(screen.getByText(/Độ dài ≥ 12 ký tự \(3\/12\)/)).toBeDefined();
      expect(screen.getByText(/^Yếu$/)).toBeDefined();
    });
    expect(document.querySelector('.ant-progress')).not.toBeNull();

    // Type stronger password
    fireEvent.change(newPassInput, { target: { value: 'StrongP@ssw0rd2026!' } });
    await waitFor(() => {
      expect(screen.getByText(/^Mạnh$/)).toBeDefined();
      expect(screen.getByText(/Độ dài ≥ 12 ký tự \(19\/12\)/)).toBeDefined();
    });
  });

  it('CP-03: submits password change via API on form submission', async () => {
    const onClose = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

    render(<ChangePasswordModal open onClose={onClose} isMandatory={false} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    const inputs = getPasswordInputs();
    expect(inputs).toHaveLength(3);

    fireEvent.change(inputs[0], { target: { value: '@bcd1234' } });
    fireEvent.change(inputs[1], { target: { value: 'NewSuperPassw0rd!' } });
    fireEvent.change(inputs[2], { target: { value: 'NewSuperPassw0rd!' } });

    clickSubmit();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: '@bcd1234',
        newPassword: 'NewSuperPassw0rd!',
      });
    });

    await waitForSubmitToFinish(onClose);

    // Success side-effects: the user is notified and the "must change password" flags are cleared
    expect(vi.mocked(message.success)).toHaveBeenCalledWith('Đổi mật khẩu thành công!');
    expect(JSON.parse(localStorage.getItem('user') as string).mustChangePassword).toBe(false);
  });

  it('CP-04: switches to 2FA tab and handles 2FA configuration view', async () => {
    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    const twoFactorTab = screen.getByText(/Xác thực 2 yếu tố/i);
    expect(twoFactorTab).toBeDefined();

    fireEvent.click(twoFactorTab);

    await waitFor(() => {
      expect(screen.getByText('Chưa kích hoạt')).toBeDefined();
      expect(screen.getByText('Thiết lập Google Authenticator')).toBeDefined();
    });
  });

  it('CP-05: requests a 2FA secret from the API when setting up Google Authenticator', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { qrCodeDataUrl: 'data:image/png;base64,MOCKQR', secret: 'JBSWY3DPEHPK3PXP' },
    });

    render(<ChangePasswordModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Xác thực 2 yếu tố/i));

    const setupBtn = await screen.findByRole('button', { name: /Thiết lập Google Authenticator/i });
    expect(setupBtn).toBeDefined();
    fireEvent.click(setupBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/2fa/generate');
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeDefined();
      expect(screen.getByText('Quét mã QR để thiết lập')).toBeDefined();
    });

    const qrImage = screen.getByAltText('2FA QR Code') as HTMLImageElement;
    expect(qrImage.getAttribute('src')).toBe('data:image/png;base64,MOCKQR');
  });

  it('TC-AUTH-03: blocks weak new passwords (too short / missing special char) and accepts a strong one', async () => {
    const onClose = vi.fn();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    const firstRender = render(<ChangePasswordModal open onClose={onClose} isMandatory={false} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    // 1) Pure numeric, too short password -> red validation error, no API call
    let inputs = getPasswordInputs();
    expect(inputs).toHaveLength(3);
    fireEvent.change(inputs[0], { target: { value: 'OldPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: '123456' } });
    fireEvent.change(inputs[2], { target: { value: '123456' } });
    clickSubmit();

    await waitFor(() => {
      expect(getFormErrorText()).toMatch(/ít nhất 12 ký tự/);
    });
    expect(document.querySelectorAll('.ant-form-item-explain-error').length).toBeGreaterThan(0);
    expect(api.post).not.toHaveBeenCalled();

    // 2) Fresh form: 12 characters long but missing a special character -> still blocked
    firstRender.unmount();
    render(<ChangePasswordModal open onClose={onClose} isMandatory={false} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đổi Mật Khẩu/i)[0]).toBeDefined();
    });

    inputs = getPasswordInputs();
    expect(inputs).toHaveLength(3);
    fireEvent.change(inputs[0], { target: { value: 'OldPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'Abcdefgh1234' } });
    fireEvent.change(inputs[2], { target: { value: 'Abcdefgh1234' } });
    clickSubmit();

    await waitFor(() => {
      expect(getFormErrorText()).toMatch(/tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt/);
    });
    expect(api.post).not.toHaveBeenCalled();

    // 3) Strong password (12+ chars, upper, lower, digit, special) -> accepted
    fireEvent.change(inputs[1], { target: { value: 'StrongP@ssw0rd2026!' } });
    fireEvent.change(inputs[2], { target: { value: 'StrongP@ssw0rd2026!' } });
    clickSubmit();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'OldPass@2026',
        newPassword: 'StrongP@ssw0rd2026!',
      });
    });

    await waitForSubmitToFinish(onClose);
  });
});
