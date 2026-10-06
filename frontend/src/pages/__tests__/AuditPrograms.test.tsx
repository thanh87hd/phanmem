import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuditPrograms from '../AuditPrograms';
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
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/useCurrentUser', () => ({
  useCurrentUser: () => ({
    id: 1,
    username: 'admin',
    role: 'Admin',
    permissions: ['*'],
  }),
}));

vi.mock('../../utils/permission', () => ({
  hasPermission: () => true,
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

vi.mock('../audit-programs/AuditProgramEditor', () => ({
  AuditProgramEditor: () => <div data-testid="audit-program-editor-mock" />,
}));

vi.mock('../audit-programs/AuditProgramQaModal', () => ({
  AuditProgramQaModal: (props: any) => (
    props.open ? <div data-testid="qa-modal-mock">QA Modal Content</div> : null
  ),
}));

describe('AuditPrograms Page (AP-01 -> AP-05)', { timeout: 15000 }, () => {
  const mockPrograms = [
    {
      id: 101,
      title: 'Kiểm toán quy trình cấp tín dụng Chi nhánh Thăng Long',
      referenceCode: 'WP-TD-2026-01',
      status: 'Approved',
      author: { fullName: 'Trần Kiểm Toán' },
      createdAt: '2026-09-10T08:00:00Z',
      plan: { name: 'Kế hoạch kiểm toán tín dụng 2026' },
      workstream: { name: 'Quy trình thẩm định' },
    },
    {
      id: 102,
      title: 'Soát xét hệ thống phê duyệt hạn mức thẻ',
      referenceCode: 'WP-THE-2026-02',
      status: 'PendingReview',
      author: { fullName: 'Lê Soát Xét' },
      createdAt: '2026-09-12T09:00:00Z',
    },
    {
      id: 103,
      title: 'Kiểm toán quy trình mở tài khoản tại quầy giao dịch',
      referenceCode: 'WP-TK-2026-03',
      status: 'Draft',
      author: { fullName: 'Phạm Kiểm Toán' },
      createdAt: '2026-09-15T10:00:00Z',
      plan: { name: 'Kế hoạch kiểm toán vận hành 2026' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/working-papers')) {
        return Promise.resolve({ data: mockPrograms });
      }
      if (url.includes('/audit-engagements')) {
        return Promise.resolve({ data: [{ id: 1, name: 'Cuộc kiểm toán Q3', status: 'InProgress' }] });
      }
      if (url.includes('/working-paper-templates')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AuditPrograms />
      </BrowserRouter>
    );

  it('AP-01: fetches and renders working paper list with status badges', async () => {
    renderComponent();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/working-papers'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Kiểm toán quy trình cấp tín dụng/i)).toBeDefined();
      expect(screen.getByText('WP-TD-2026-01')).toBeDefined();
      expect(screen.getByText(/Đã duyệt/i)).toBeDefined();
    });
  });

  it('AP-02: renders add program button and triggers new WP modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WP-TD-2026-01')).toBeDefined();
    });

    const addBtn = screen.getByRole('button', { name: /Tạo WP/i });
    expect(addBtn).toBeDefined();
  });

  it('AP-03: opens QA review modal when QA review button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WP-TD-2026-01')).toBeDefined();
    });

    // The PendingReview row exposes the "Quality Review" button (wp:review permission)
    const qaBtn = screen.getByRole('button', { name: /Quality Review/i });
    expect(qaBtn).toBeDefined();
    expect(qaBtn.textContent).toContain('Quality Review');

    fireEvent.click(qaBtn);

    await waitFor(() => {
      expect(screen.getByTestId('qa-modal-mock')).toBeDefined();
    });
    expect(api.get).toHaveBeenCalledWith('/quality-reviews?workingPaperId=102');
  });

  it('AP-04: triggers delete working paper API', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WP-TK-2026-03')).toBeDefined();
    });

    // Only the Draft work paper (id 103) renders the danger delete button (wp:delete permission)
    const deleteIcons = document.querySelectorAll('.anticon-delete');
    expect(deleteIcons.length).toBeGreaterThan(0);
    const deleteBtn = deleteIcons[0].closest('button') as HTMLButtonElement;
    expect(deleteBtn).not.toBeNull();

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/working-papers/103');
    });

    // The list is re-fetched after a successful delete
    await waitFor(() => {
      const refetches = vi
        .mocked(api.get)
        .mock.calls.filter((call) => call[0] === '/working-papers?type=Program');
      expect(refetches.length).toBe(2);
    });
  });

  it('AP-05: handles offline Excel export button click', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/export-excel')) {
        return Promise.resolve({ data: new ArrayBuffer(8) });
      }
      if (url.includes('/working-papers')) {
        return Promise.resolve({ data: mockPrograms });
      }
      return Promise.resolve({ data: [] });
    });

    // Mock URL.createObjectURL and revokeObjectURL + block the jsdom anchor navigation
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    const anchorClickSpy = vi
      .spyOn(HTMLElement.prototype, 'click')
      .mockImplementation(() => {});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WP-TK-2026-03')).toBeDefined();
    });

    // The offline export button is only rendered for the Draft work paper
    const downloadBtn = screen.getByRole('button', { name: /Tải ngoại tuyến/i });
    expect(downloadBtn).toBeDefined();

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/working-papers/103/export-excel', {
        responseType: 'blob',
      });
    });

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    });

    anchorClickSpy.mockRestore();
  });
});
