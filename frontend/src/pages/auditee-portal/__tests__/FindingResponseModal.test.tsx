import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { message } from 'antd';
import { FindingResponseModal } from '../FindingResponseModal';
import api from '../../../services/api';

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const FINDING = {
  id: 77,
  findingCode: 'FD-2026-014',
  findingTitle: 'Không thu hồi nợ quá hạn theo quy định',
  condition: 'Dư nợ quá hạn nhóm 3 tồn đọng 45 ngày chưa xử lý',
};

const OFFICIAL_OPINION =
  'Đơn vị đã bổ sung chứng từ thẩm định ngày 20/04 do lỗi lưu trữ';

const VALIDATION_MESSAGE =
  'Vui lòng nhập ý kiến giải trình của đơn vị trước khi gửi';

const buildProps = (overrides: Record<string, unknown> = {}) => ({
  open: true,
  finding: { ...FINDING },
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  ...overrides,
});

/**
 * TC-AUD-02 — "Phản Hồi Giải Trình: Đồng Ý Hoặc Không Đồng Ý"
 * (docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md #L621)
 *
 * The component under test (frontend/src/pages/auditee-portal/FindingResponseModal.tsx)
 * implements the auditee's official written opinion only; it has no explicit
 * "Đồng ý (Agree) / Không đồng ý (Disagree)" radio, no attachment upload, and no
 * team-leader notification call of its own. Those gaps are pinned by
 * `TC-AUD-02 (gap): …` tests below and reported, not invented as passing expectations.
 */
describe('FindingResponseModal — TC-AUD-02 (Phản hồi giải trình của Auditee)', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.patch as any).mockResolvedValue({ data: { id: FINDING.id } });
  });

  afterEach(async () => {
    await unmountAllReactRoots();
  });

  afterAll(async () => {
    /**
     * antd's `message` auto-closes every toast after ~3s with real timers. If such a
     * close lands after this file's last test has finished, its React update is scheduled
     * onto the Scheduler (setImmediate under jsdom) and is then rendered after Vitest has
     * already deleted `window` — a run fails with "ReferenceError: window is not defined"
     * even though every assertion passed. Waiting the toast lifetime out here keeps that
     * work inside jsdom. Must run *before* Vitest tears the environment down.
     */
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 3200));
    });
    await act(async () => {
      message.destroy();
    });
    await flushPendingReactWork();
  });

  it('TC-AUD-02: renders the finding context (title, code, condition) and the official-opinion field', () => {
    render(<FindingResponseModal {...(buildProps() as any)} />);

    expect(
      screen.getByText('Bổ sung ý kiến giải trình của Đối tượng Kiểm toán'),
    ).toBeDefined();
    expect(screen.getByText(/Phát hiện:/)).toBeDefined();
    expect(screen.getByText('Không thu hồi nợ quá hạn theo quy định')).toBeDefined();
    expect(screen.getByText(/Mã phát hiện:/)).toBeDefined();
    expect(screen.getByText('FD-2026-014')).toBeDefined();
    expect(screen.getByText(/Hiện trạng lỗi:/)).toBeDefined();
    expect(
      screen.getByText('Dư nợ quá hạn nhóm 3 tồn đọng 45 ngày chưa xử lý'),
    ).toBeDefined();

    expect(
      screen.getByText(
        'Ý kiến giải trình chính thức của Đơn vị (Auditee Official Opinion)',
      ),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Nhập ý kiến phản hồi giải trình của đơn vị/i),
    ).toBeDefined();
    // The submit control the auditee actually presses.
    expect(
      screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }),
    ).toBeDefined();
  });

  it('TC-AUD-02: falls back to FD-<id> when the finding has no findingCode', () => {
    render(
      <FindingResponseModal
        {...(buildProps({
          finding: { id: 91, findingTitle: 'Chưa gắn mã phát hiện', condition: 'Thiếu hồ sơ' },
        }) as any)}
      />,
    );

    expect(screen.getByText('FD-91')).toBeDefined();
    expect(screen.queryByText('FD-2026-014')).toBeNull();
  });

  it('TC-AUD-02: blocks submission of an empty opinion with the component validation message and never calls the API', async () => {
    const errorSpy = vi.spyOn(message, 'error');
    const props = buildProps();

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }));

    expect(await screen.findByText(VALIDATION_MESSAGE)).toBeDefined();

    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect((props.onClose as any)).not.toHaveBeenCalled();
    expect((props.onSuccess as any)).not.toHaveBeenCalled();
    // Validation is inline under the field; it must not be reported as a server error toast.
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('TC-AUD-02: a valid submit PATCHes /audit-findings/<id> with the auditee opinion, toasts success, then closes and refreshes', async () => {
    const successSpy = vi.spyOn(message, 'success');
    const props = buildProps();

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.change(screen.getByPlaceholderText(/Nhập ý kiến phản hồi giải trình của đơn vị/i), {
      target: { value: OFFICIAL_OPINION },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/audit-findings/77', {
        auditeeResponse: OFFICIAL_OPINION,
      });
    });
    expect(api.patch).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith(
        'Đã gửi ý kiến phản hồi giải trình thành công!',
      );
    });

    // onClose() then onSuccess() — the parent (AuditeePortal) closes the modal and refetches.
    await waitFor(() => {
      expect((props.onClose as any)).toHaveBeenCalledTimes(1);
      expect((props.onSuccess as any)).toHaveBeenCalledTimes(1);
    });
    expect((props.onClose as any).mock.invocationCallOrder[0]).toBeLessThan(
      (props.onSuccess as any).mock.invocationCallOrder[0],
    );

    // No other write endpoint is involved (the team-leader notification is not a frontend call).
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('TC-AUD-02: pre-fills the previously saved auditee response for re-submission', () => {
    render(
      <FindingResponseModal
        {...(buildProps({
          finding: { ...FINDING, auditeeResponse: 'Đã giải trình lần 1' },
        }) as any)}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      /Nhập ý kiến phản hồi giải trình của đơn vị/i,
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Đã giải trình lần 1');
  });

  it('TC-AUD-02: a server error is surfaced verbatim and keeps the modal open (no onClose / onSuccess)', async () => {
    const errorSpy = vi.spyOn(message, 'error');
    const props = buildProps();

    (api.patch as any).mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Không có quyền phản hồi phát hiện này' } },
    });

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.change(screen.getByPlaceholderText(/Nhập ý kiến phản hồi giải trình của đơn vị/i), {
      target: { value: OFFICIAL_OPINION },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Không có quyền phản hồi phát hiện này');
    });
    expect((props.onClose as any)).not.toHaveBeenCalled();
    expect((props.onSuccess as any)).not.toHaveBeenCalled();
  });

  it('TC-AUD-02: a server error without a message falls back to the component default error text', async () => {
    const errorSpy = vi.spyOn(message, 'error');
    const props = buildProps();

    (api.patch as any).mockRejectedValueOnce(new Error('Network down'));

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.change(screen.getByPlaceholderText(/Nhập ý kiến phản hồi giải trình của đơn vị/i), {
      target: { value: OFFICIAL_OPINION },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Lỗi khi gửi ý kiến giải trình');
    });
    expect((props.onClose as any)).not.toHaveBeenCalled();
  });

  it('TC-AUD-02: cancel closes the modal through onClose without touching the API', () => {
    const props = buildProps();

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel|hủy|huỷ/i }));

    expect((props.onClose as any)).toHaveBeenCalledTimes(1);
    expect((props.onSuccess as any)).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('TC-AUD-02: the modal close (X) icon also routes through onClose only', () => {
    const props = buildProps();

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect((props.onClose as any)).toHaveBeenCalledTimes(1);
    expect((props.onSuccess as any)).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('TC-AUD-02: with no finding loaded the submit button is a no-op (guard clause) and writes nothing', async () => {
    const props = buildProps({ finding: null });

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }));

    // The guard returns before validateFields(), so no validation message is shown either.
    await waitFor(() => {
      expect(api.patch).not.toHaveBeenCalled();
    });
    expect((props.onClose as any)).not.toHaveBeenCalled();
    expect((props.onSuccess as any)).not.toHaveBeenCalled();
    expect(screen.queryByText(/Phát hiện:/)).toBeNull();
  });

  it('TC-AUD-02: an opinion made only of spaces is blocked and nothing is sent', async () => {
    const props = buildProps();

    render(<FindingResponseModal {...(props as any)} />);

    fireEvent.change(screen.getByPlaceholderText(/Nhập ý kiến phản hồi giải trình của đơn vị/i), {
      target: { value: '    ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến giải trình' }));

    // Đã sửa: rule `required` nay có `whitespace: true` ⇒ ý kiến toàn dấu cách bị chặn
    // ngay tại form, không gọi API và không đóng modal.
    await waitFor(() => {
      expect(screen.getByText(VALIDATION_MESSAGE)).toBeDefined();
    });
    expect(api.patch).not.toHaveBeenCalled();
    expect(props.onSuccess as any).not.toHaveBeenCalled();
    expect(props.onClose as any).not.toHaveBeenCalled();
  });

  it('TC-AUD-02 (gap): the modal offers no "Đồng ý / Không đồng ý" choice and no attachment upload', () => {
    render(<FindingResponseModal {...(buildProps() as any)} />);

    // UAT step 1 & 2 expect an explicit agree/disagree radio pair — it does not exist.
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(/Đồng ý \(Agree\)/i)).toBeNull();
    expect(screen.queryByText(/Không đồng ý/i)).toBeNull();
    // UAT step 2 expects "đính kèm văn bản chứng minh" (proof attachment) — no upload control exists.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText(/Tải lên|Đính kèm/i)).toBeNull();
  });
});
