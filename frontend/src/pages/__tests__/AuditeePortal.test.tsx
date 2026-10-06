import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import { message } from 'antd';
import AuditeePortal from '../AuditeePortal';
import api from '../../services/api';

/**
 * React 19 flushes passive effects through the Scheduler; under jsdom the Scheduler falls
 * back to Node's `setImmediate`, and that callback reads the global `window` as its very
 * first statement (react-dom-client: `performWorkOnRootViaSchedulerTask`). Vitest deletes
 * `window` immediately after this file's tests finish, so any Scheduler callback still
 * queued at that moment dies with "ReferenceError: window is not defined" and the run exits
 * non-zero even though every assertion passed.
 */
const flushPendingReactWork = async () => {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => {
      // Real time passes so in-flight jsdom rAF frames (rc-motion) can finish, then a
      // macrotask turn lets the Scheduler queue drain while `window` still exists.
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  }
};

/**
 * antd's global `message` root is a React root RTL does not own: it keeps committing
 * (notice enter/exit motion, queue flushing) in macrotasks after a test has finished,
 * which is exactly how Scheduler callbacks end up queued at environment teardown.
 */
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

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/excelExport', () => ({
  exportToExcel: vi.fn(),
  filterRecursive: () => true,
}));

vi.mock('../../components/EvidenceManager', () => ({
  default: () => <div data-testid="evidence-manager-mock">EvidenceManager</div>,
}));

describe('AuditeePortal (AP-01 -> AP-06 + TC-AUD-01 branch scoping)', { timeout: 45000 }, () => {
  const mockRecommendations = [
    {
      id: 1,
      code: 'REC-2026-01',
      title: 'Tăng cường xác thực CCCD gắn chip qua VNeID',
      recommendation: 'Tăng cường xác thực CCCD gắn chip qua VNeID',
      department: 'Chi nhánh Hà Nội',
      deadline: '2026-06-30',
      dueDate: '2026-06-30',
      status: 'InProgress',
      progressPercent: 60,
      remediationPlan: 'Đã mua thiết bị đọc thẻ QR',
      finding: 'Thiếu xác thực CCCD',
    },
    {
      id: 2,
      code: 'REC-2026-02',
      title: 'Rà soát hạn mức tồn quỹ tiền mặt cuối ngày',
      recommendation: 'Rà soát hạn mức tồn quỹ tiền mặt cuối ngày',
      department: 'Chi nhánh Hà Nội',
      deadline: '2026-04-15',
      dueDate: '2026-04-15',
      status: 'Overdue',
      progressPercent: 20,
      remediationPlan: 'Chưa có tờ trình xin tăng hạn mức',
      finding: 'Tồn quỹ vượt hạn mức',
    },
  ];

  const mockFindings = [
    {
      id: 10,
      findingCode: 'FD-2026-01',
      findingTitle: 'Hồ sơ mở thẻ chưa đối soát khuôn mặt',
      riskLevel: 'High',
      status: 'Open',
      auditeeResponse: 'Đơn vị ghi nhận và sẽ cập nhật',
    },
  ];

  const mockRcsa = [
    {
      id: 101,
      processName: 'Mở tài khoản thanh toán',
      subProcess: 'Xác thực eKYC',
      inherentRiskLevel: 'High',
      controlEffectiveness: 'Tốt',
      residualRiskLevel: 'Medium',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/recommendations') {
        return Promise.resolve({ data: mockRecommendations });
      }
      if (url === '/audit-findings') {
        return Promise.resolve({ data: mockFindings });
      }
      if (url === '/risk-assessments/rcsa') {
        return Promise.resolve({ data: mockRcsa });
      }
      if (url === '/audit-universe') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(async () => {
    await unmountAllReactRoots();
  });

  afterAll(async () => {
    /**
     * antd's `message` auto-closes every toast after ~3s with real timers. If such a close
     * lands after this file's last test, its React update is scheduled onto the Scheduler
     * (setImmediate under jsdom) and rendered after Vitest has already deleted `window` —
     * the "ReferenceError: window is not defined" some suites end with. Waiting the toast
     * lifetime out here keeps that work inside jsdom, *before* teardown.
     */
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 3200));
    });
    await act(async () => {
      message.destroy();
    });
    await flushPendingReactWork();
  });

  it('AP-01: Renders page title, stats, and primary tabs', async () => {
    render(<AuditeePortal />);

    expect(screen.getByText(/Khắc phục Kiến nghị Kiểm toán/i)).toBeDefined();
    expect(screen.getByText(/Tự đánh giá Rủi ro & Kiểm soát/i)).toBeDefined();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/recommendations', expect.anything());
      expect(api.get).toHaveBeenCalledWith('/audit-findings');
    });
  });

  it('AP-02: Loads and renders recommendations table rows with progress', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
      expect(screen.getByText('Rà soát hạn mức tồn quỹ tiền mặt cuối ngày')).toBeDefined();
      expect(screen.getByText(/REC-1/)).toBeDefined();
      expect(screen.getByText(/REC-2/)).toBeDefined();
    });
  });

  it('AP-03: Opens Action Plan / Remediation Modal on button click', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
    });

    const actionBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('Cập nhật') || b.textContent?.includes('Kế hoạch'));
    expect(actionBtns.length).toBeGreaterThan(0);
    fireEvent.click(actionBtns[0]);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });
    // The modal really opens for the clicked recommendation row.
    expect(screen.getByText(/Kiến nghị: REC-2026-01/)).toBeDefined();
  });

  it('AP-04: Switches to Findings tab and shows auditee opinion interface', async () => {
    render(<AuditeePortal />);

    const findingsTab = screen.getByText(/Phản hồi Ý kiến Phát hiện/i);
    fireEvent.click(findingsTab);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ mở thẻ chưa đối soát khuôn mặt')).toBeDefined();
      expect(screen.getByText('Phản hồi ý kiến')).toBeDefined();
    });
  });

  it('AP-05: Switches to RCSA self-assessment tab and loads controls', async () => {
    render(<AuditeePortal />);

    const rcsaTab = screen.getByText(/Tự đánh giá Rủi ro & Kiểm soát/i);
    fireEvent.click(rcsaTab);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/risk-assessments/rcsa');
      expect(screen.getByText('Tổng số chốt tự đánh giá')).toBeDefined();
    });
  });

  it('AP-06: Filters recommendations by search keyword', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiến nghị/i);
    fireEvent.change(searchInput, { target: { value: 'VNeID' } });

    expect((searchInput as HTMLInputElement).value).toBe('VNeID');
  });

  it('TC-AUD-01: scopes every data request to the branch (department) of the signed-in auditee', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 7, username: 'cn-hn', fullName: 'Auditee Chi nhánh Hà Nội', department: 'Chi nhánh Hà Nội' }),
    );

    render(<AuditeePortal />);

    // The recommendations request carries the auditee's own branch scope as a query param.
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/recommendations', { params: { dept: 'Chi nhánh Hà Nội' } });
    });

    // The findings request carries NO branch scope at all: `api.get('/audit-findings')` is
    // called with a single argument, so the auditee receives whatever the server returns.
    // UAT TC-AUD-01 requires findings to be limited to the auditee's own branch; this is a
    // production gap, reported rather than invented as a passing expectation.
    expect(api.get).toHaveBeenCalledWith('/audit-findings');

    // Exact request set, in mount order, so that any new unscoped request fails this test.
    expect((api.get as any).mock.calls).toEqual([
      ['/recommendations', { params: { dept: 'Chi nhánh Hà Nội' } }],
      ['/audit-findings'],
      ['/risk-assessments/rcsa'],
      ['/audit-universe'],
    ]);

    // The header shows the branch the data was requested for.
    expect(screen.getByText('Chi nhánh Hà Nội', { selector: 'strong' })).toBeDefined();

    // ...and the branch's own recommendations are rendered.
    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
      expect(screen.getByText('Rà soát hạn mức tồn quỹ tiền mặt cuối ngày')).toBeDefined();
    });
  });

  it('TC-AUD-01 (gap): an auditee without a department requests an empty dept scope while the header claims a branch', async () => {
    // No `user` in localStorage at all -> `currentUser.department` is undefined.
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/recommendations', { params: { dept: '' } });
    });

    // Empty scope == no branch filter is actually sent, even though the header displays a
    // hard-coded fallback branch. Reported as a production gap.
    expect(api.get).toHaveBeenCalledWith('/audit-findings');
    expect(screen.getByText('Chi nhánh Hà Nội', { selector: 'strong' })).toBeDefined();
  });
});
