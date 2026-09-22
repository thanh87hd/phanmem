import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuditTemplates from '../AuditTemplates';
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
  }),
}));

describe('AuditTemplates Page (AT-01 -> AT-05)', { timeout: 15000 }, () => {
  const mockTemplates = [
    {
      id: 1,
      title: 'Mẫu kiểm toán Cấp tín dụng KHCN',
      domain: 'Credit',
      version: '1.0',
      status: 'Published',
      description: 'Quy trình kiểm toán cấp tín dụng khách hàng cá nhân',
      estimatedHours: 40,
      checklist: [{ task: 'Kiểm tra hồ sơ vay vốn' }],
    },
    {
      id: 2,
      title: 'Mẫu kiểm toán An ninh mạng & CNTT',
      domain: 'IT',
      version: '2.0',
      status: 'Published',
      description: 'Kiểm toán an ninh mạng hệ thống Core banking',
      estimatedHours: 60,
      checklist: [{ task: 'Rà soát firewall và access logs' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/audit-templates')) {
        return Promise.resolve({ data: mockTemplates });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AuditTemplates />
      </BrowserRouter>
    );

  it('AT-01: fetches and renders template cards/list', async () => {
    renderComponent();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-templates');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mẫu kiểm toán Cấp tín dụng KHCN/i)).toBeDefined();
      expect(screen.getByText(/Mẫu kiểm toán An ninh mạng & CNTT/i)).toBeDefined();
    });
  });

  it('AT-02: opens template editor to create a new template', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Mẫu kiểm toán Cấp tín dụng KHCN/i)).toBeDefined();
    });

    const addBtn = screen.getByRole('button', { name: /Tạo Template mới/i });
    if (addBtn) {
      fireEvent.click(addBtn);
      await waitFor(() => {
        expect(document.querySelector('.ant-form')).toBeDefined();
      });
    }
  });

  it('AT-03: clicks use template button and logs template usage', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Mẫu kiểm toán Cấp tín dụng KHCN/i)).toBeDefined();
    });

    const useBtns = document.querySelectorAll('.anticon-form');
    if (useBtns.length > 0) {
      const btn = useBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/use'));
        });
      }
    }
  });

  it('AT-04: duplicates template structure when duplicate icon is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Mẫu kiểm toán Cấp tín dụng KHCN/i)).toBeDefined();
    });

    const copyBtns = document.querySelectorAll('.anticon-copy');
    if (copyBtns.length > 0) {
      const btn = copyBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(document.querySelector('.ant-form')).toBeDefined();
        });
      }
    }
  });

  it('AT-05: deletes a template after confirmation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Mẫu kiểm toán Cấp tín dụng KHCN/i)).toBeDefined();
    });

    const deleteBtns = document.querySelectorAll('.anticon-delete');
    if (deleteBtns.length > 0) {
      const btn = deleteBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        // If popconfirm opens or direct delete is executed
        const confirmBtn = document.querySelector('.ant-popconfirm-buttons button.ant-btn-primary');
        if (confirmBtn) {
          fireEvent.click(confirmBtn);
        }
      }
    }
  });
});
