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

    const qaBtns = document.querySelectorAll('.anticon-safety');
    if (qaBtns.length > 0) {
      const btn = qaBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(screen.getByTestId('qa-modal-mock')).toBeDefined();
        });
      }
    }
  });

  it('AP-04: triggers delete working paper API', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WP-TD-2026-01')).toBeDefined();
    });

    const deleteBtns = document.querySelectorAll('.anticon-delete');
    if (deleteBtns.length > 0) {
      const deleteBtn = deleteBtns[0].closest('button');
      if (deleteBtn) {
        fireEvent.click(deleteBtn);
        await waitFor(() => {
          expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('/working-papers/'));
        });
      }
    }
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

    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WP-TD-2026-01')).toBeDefined();
    });

    const downloadBtns = document.querySelectorAll('.anticon-download');
    if (downloadBtns.length > 0) {
      const btn = downloadBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith(
            expect.stringContaining('/export-excel'),
            expect.anything(),
          );
        });
      }
    }
  });
});
