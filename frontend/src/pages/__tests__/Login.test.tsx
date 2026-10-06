import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { message } from 'antd';
import Login from '../Login';
import api from '../../services/api';

/**
 * Same React 19 / antd `message` root teardown handling as IntegrationSettings.test.tsx:
 * antd's global `message` root is a React root RTL does not own and keeps committing in
 * macrotasks after a test ends, which can queue Scheduler callbacks that read `window`
 * after Vitest has torn the jsdom environment down ("window is not defined").
 */
const flushPendingReactWork = async () => {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  }
};

const unmountAllReactRoots = async () => {
  await act(async () => {
    cleanup();
    message.destroy();
  });
};

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

  afterEach(async () => {
    await unmountAllReactRoots();
  });

  afterAll(async () => {
    // Must run *before* Vitest tears the jsdom environment down.
    await flushPendingReactWork();
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

  /**
   * TC-AUTH-05 — "Khóa tài khoản khi nhập sai 5 lần" (docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md #L143).
   *
   * Expected (UAT): lần 3-4 cảnh báo số lần còn lại, lần thứ 5 báo tài khoản bị khóa 30 phút theo PCI DSS.
   *
   * Backend contract verified in backend/src/auth/auth.service.ts:235-257 + auth.controller.ts:72-76:
   * every wrong-password attempt is HTTP 401 and the body carries the lockout bookkeeping message, and
   * Login.tsx:229-231 relays `error.response.data.message` verbatim through antd `message.error` for 401.
   * The messages below are the exact strings produced by that backend code.
   */
  it('TC-AUTH-05: 5 consecutive wrong passwords warn about remaining attempts then report the 30-minute PCI DSS lockout, and no failed attempt stores a session', async () => {
    const errorSpy = vi.spyOn(message, 'error');

    const attempts = [
      { message: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
      { message: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
      { message: 'Mật khẩu không đúng. Còn 2 lần thử trước khi tài khoản bị khóa.' },
      { message: 'Mật khẩu không đúng. Còn 1 lần thử trước khi tài khoản bị khóa.' },
      { message: 'Tài khoản bị khóa 30 phút do đăng nhập sai 5 lần liên tiếp.' },
    ];

    attempts.forEach((attempt) => {
      (api.post as any).mockRejectedValueOnce({
        response: { status: 401, data: { message: attempt.message } },
      });
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/Tên đăng nhập/i), {
      target: { value: 'maict' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/i), {
      target: { value: '111111111' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    /**
     * antd's Form validates asynchronously and its Button swallows clicks while `loading`
     * is true, so: wait until the button is no longer rendering its loading spinner
     * (`ant-btn-loading`, set by antd Button while `loading` is true), click exactly once,
     * then wait for the request. This keeps one click per attempt.
     */
    const submitOneAttempt = async (attemptNumber: number) => {
      await waitFor(() => {
        expect(submitBtn.className).not.toContain('ant-btn-loading');
      });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(attemptNumber);
      });
    };

    for (let i = 0; i < attempts.length; i += 1) {
      await submitOneAttempt(i + 1);

      // 1) The backend message must be surfaced to the user verbatim on every attempt…
      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledTimes(i + 1);
      });
      expect(errorSpy.mock.calls[i][0]).toBe(attempts[i].message);

      // …and it must actually be rendered (antd global message root), not just handed to the helper.
      const renderedToasts = await screen.findAllByText(attempts[i].message);
      expect(renderedToasts.length).toBeGreaterThan(0);

      // 2) No failed attempt may establish a session.
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    }

    // UAT attempt 3 & 4: explicit "how many tries are left" warning.
    expect(errorSpy.mock.calls[2][0]).toContain('Còn 2 lần thử');
    expect(errorSpy.mock.calls[3][0]).toContain('Còn 1 lần thử');
    // UAT attempt 5: the 30-minute PCI DSS lockout.
    expect(errorSpy.mock.calls[4][0]).toContain('bị khóa 30 phút');

    // Every attempt went to the same endpoint with the same payload (no client-side lockout short-circuit).
    for (let i = 0; i < attempts.length; i += 1) {
      expect(api.post).toHaveBeenNthCalledWith(i + 1, '/auth/login', {
        username: 'maict',
        password: '111111111',
        authMode: 'local',
      });
    }

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('TC-AUTH-05: the 30-minute lockout attempt does not leak a stale session left over from a previous login', async () => {
    const errorSpy = vi.spyOn(message, 'error');

    // Simulate a previously logged-in browser session being replaced by the failed attempt.
    localStorage.setItem('token', 'stale-jwt-from-previous-session');
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'ktv01' }));

    (api.post as any).mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'Tài khoản bị khóa 30 phút do đăng nhập sai 5 lần liên tiếp.' },
      },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/Tên đăng nhập/i), {
      target: { value: 'maict' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/i), {
      target: { value: '111111111' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Tài khoản bị khóa 30 phút do đăng nhập sai 5 lần liên tiếp.',
      );
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-AUTH-05: a successful login after failed attempts still stores token & user (the lockout is enforced by the backend, not silently by the UI)', async () => {
    const errorSpy = vi.spyOn(message, 'error');
    const successSpy = vi.spyOn(message, 'success');

    (api.post as any)
      .mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Mật khẩu không đúng. Còn 2 lần thử trước khi tài khoản bị khóa.' },
        },
      })
      .mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Mật khẩu không đúng. Còn 1 lần thử trước khi tài khoản bị khóa.' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'jwt-after-2-failed-attempts',
          user: { id: 9, username: 'maict', fullName: 'Mai Cao Tuấn', role: 'KTV' },
        },
      });

    render(<Login />);

    const passwordInput = screen.getByPlaceholderText(/Mật khẩu/i);
    fireEvent.change(screen.getByPlaceholderText(/Tên đăng nhập/i), {
      target: { value: 'maict' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    const submitOneAttempt = async (attemptNumber: number) => {
      await waitFor(() => {
        expect(submitBtn.className).not.toContain('ant-btn-loading');
      });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(attemptNumber);
      });
    };

    fireEvent.change(passwordInput, { target: { value: 'wrong-1' } });
    await submitOneAttempt(1);
    await waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem('token')).toBeNull();

    fireEvent.change(passwordInput, { target: { value: 'wrong-2' } });
    await submitOneAttempt(2);
    await waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem('token')).toBeNull();

    fireEvent.change(passwordInput, { target: { value: '@Lpbank2026!' } });
    await submitOneAttempt(3);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-after-2-failed-attempts');
    });
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({
      id: 9,
      username: 'maict',
      fullName: 'Mai Cao Tuấn',
      role: 'KTV',
    });
    expect(successSpy).toHaveBeenCalledWith('Chào mừng, Mai Cao Tuấn!');
    expect(mockNavigate).toHaveBeenCalledWith('/');
    // The 2 earlier failures are still reported, and no third error was raised.
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(api.post).toHaveBeenNthCalledWith(3, '/auth/login', {
      username: 'maict',
      password: '@Lpbank2026!',
      authMode: 'local',
    });
  });
});
