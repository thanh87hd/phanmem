import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Modal } from 'antd';
import AuditUniverse from '../AuditUniverse';
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

vi.mock('../../utils/excelExport', () => ({
  exportToExcel: vi.fn(),
  filterRecursive: () => true,
}));

vi.mock('../../components/BulkImport', () => ({
  default: () => <div data-testid="bulk-import-mock">BulkImport Mock</div>,
}));

vi.mock('../../components/UnifiedRiskScoringModal', () => ({
  default: () => <div data-testid="risk-scoring-modal-mock">UnifiedRiskScoringModal Mock</div>,
}));

describe('AuditUniverse Page (AU-01 -> AU-06)', { timeout: 15000 }, () => {
  const mockUniverses = [
    {
      id: 1,
      name: 'Quy trình Tín dụng Doanh nghiệp',
      department: 'Khối KHDN',
      auditCategory: 'HoiSo',
      ownerTeam: 'PKT_HoiSo',
      inherentRiskScore: 4.5,
      residualRiskScore: 3.2,
      status: 'Active',
      lastAuditDate: '2025-06-15',
    },
    {
      id: 2,
      name: 'Chi nhánh Hà Nội - Nghiệp vụ Huy động',
      department: 'CN Hà Nội',
      auditCategory: 'ChiNhanh',
      ownerTeam: 'PKT_DVKD',
      inherentRiskScore: 3.8,
      residualRiskScore: 2.5,
      status: 'Active',
      lastAuditDate: '2024-11-20',
    },
  ];

  const mockDepartments = [
    { id: 1, name: 'Khối KHDN', code: 'KHDN' },
    { id: 2, name: 'CN Hà Nội', code: 'CN_HN' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-universe') {
        return Promise.resolve({ data: mockUniverses });
      }
      if (url === '/departments') {
        return Promise.resolve({ data: mockDepartments });
      }
      if (url.includes('/custom-fields')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { success: true, id: 3 } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });
  });

  it('AU-01: renders AuditUniverse page title, category filters, and table', async () => {
    render(<AuditUniverse />);

    await waitFor(() => {
      expect(screen.getByText(/Đối tượng Kiểm toán/i)).toBeDefined();
      expect(screen.getByText('Quy trình Tín dụng Doanh nghiệp')).toBeDefined();
      expect(screen.getByText('Chi nhánh Hà Nội - Nghiệp vụ Huy động')).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith('/audit-universe');
    expect(api.get).toHaveBeenCalledWith('/departments');
  });

  it('AU-02: displays audit category tags and active status tags', async () => {
    render(<AuditUniverse />);

    await waitFor(() => {
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
      expect(screen.getByText('Khối KHDN')).toBeDefined();
      expect(screen.getByText('CN Hà Nội')).toBeDefined();
    });
  });

  it('AU-03: filters entities by clicking category card', async () => {
    render(<AuditUniverse />);

    await waitFor(() => {
      expect(screen.getByText('PHÂN LOẠI KIỂM TOÁN')).toBeDefined();
    });

    // Click on Chi nhánh filter card
    const branchCards = screen.getAllByText('Chi nhánh');
    expect(branchCards.length).toBeGreaterThan(0);
    fireEvent.click(branchCards[0]);

    // Filter should be applied
    await waitFor(() => {
      expect(screen.getByText('Chi nhánh Hà Nội - Nghiệp vụ Huy động')).toBeDefined();
    });
  });

  it('AU-04: opens create modal when clicking "Thêm Hoạt động"', async () => {
    render(<AuditUniverse />);

    await waitFor(() => {
      expect(screen.getByText('Thêm Hoạt động')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Thêm Hoạt động'));

    await waitFor(() => {
      expect(screen.getByText(/Thêm Quy trình \/ Hoạt động mới/i)).toBeDefined();
    });
  });

  it('AU-05: submits new entity via POST /audit-universe', async () => {
    render(<AuditUniverse />);

    await waitFor(() => {
      expect(screen.getByText('Thêm Hoạt động')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Thêm Hoạt động'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/VD: Quy trình Vận hành thẻ/i)).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText(/VD: Quy trình Vận hành thẻ/i);
    fireEvent.change(nameInput, { target: { value: 'Nghiệp vụ Phái sinh Tiền tệ' } });

    // Submit modal form (button Lưu)
    const okBtn = screen.getByRole('button', { name: /Lưu/i });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/audit-universe',
        expect.objectContaining({
          name: 'Nghiệp vụ Phái sinh Tiền tệ',
        })
      );
    });
  });

  it('AU-06: triggers delete entity via DELETE /audit-universe/:id', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((config: any) => {
      config.onOk?.();
      return {} as any;
    });

    render(<AuditUniverse />);

    await waitFor(() => {
      expect(screen.getByText('Quy trình Tín dụng Doanh nghiệp')).toBeDefined();
    });

    // Find delete buttons (DeleteOutlined)
    const deleteButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('.anticon-delete'));
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/audit-universe/1');
    });
  });
});
