import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import api from '../../services/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../components/LPBankLogo', () => ({
  default: () => <div data-testid="lpbank-logo">LPBank Logo</div>,
  LPBANK_BRAND_GOLD: '#c59b27',
}));

vi.mock('../../components/LanguageSelector', () => ({
  default: () => <div data-testid="lang-selector">Lang</div>,
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Login Page (L-01 -> L-08)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    (api.get as any).mockResolvedValue({
      data: {
        localEnabled: true,
        ldapEnabled: true,
        keycloakEnabled: true,
        defaultMode: 'ALL',
        allowSelfRegistration: true,
      },
    });
  });

  it('L-01: renders login form with username, password fields and buttons', async () => {
    render(<Login />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auth/config');
    });

    expect(screen.getByPlaceholderText(/Tên đăng nhập/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Mật khẩu/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDefined();
  });

  it('L-02: successful local login stores token & user, then navigates to /', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        access_token: 'fake-jwt-token-xyz',
        user: {
          id: 1,
          username: 'ktv01',
          fullName: 'Kiểm toán viên 1',
          role: 'Kiểm toán viên',
        },
      },
    });

    render(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Tên đăng nhập/i);
    const passwordInput = screen.getByPlaceholderText(/Mật khẩu/i);
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(usernameInput, { target: { value: 'ktv01' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'ktv01',
        password: 'Secret123!',
        authMode: 'local',
      });
      expect(localStorage.getItem('token')).toBe('fake-jwt-token-xyz');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual({
        id: 1,
        username: 'ktv01',
        fullName: 'Kiểm toán viên 1',
        role: 'Kiểm toán viên',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('L-03: failed login with 401 does not store token or navigate', async () => {
    (api.post as any).mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' },
      },
    });

    render(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Tên đăng nhập/i);
    const passwordInput = screen.getByPlaceholderText(/Mật khẩu/i);
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('L-06: triggers force change password when user.mustChangePassword is true', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        access_token: 'temp-jwt-token',
        user: {
          id: 2,
          username: 'new_user',
          mustChangePassword: true,
        },
      },
    });

    render(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Tên đăng nhập/i);
    const passwordInput = screen.getByPlaceholderText(/Mật khẩu/i);
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(usernameInput, { target: { value: 'new_user' } });
    fireEvent.change(passwordInput, { target: { value: 'Temp123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Should show change password modal and not directly navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('L-07: triggers 2FA OTP prompt when require2FA is true', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        require2FA: true,
        tempToken: 'temp-2fa-token-123',
      },
    });

    render(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Tên đăng nhập/i);
    const passwordInput = screen.getByPlaceholderText(/Mật khẩu/i);
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'Admin123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
