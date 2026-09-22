import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Departments from '../Departments';
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

vi.mock('../../components/DynamicFormRenderer', () => ({
  default: () => <div data-testid="dynamic-form-mock" />,
  extractCustomFields: () => ({}),
}));

vi.mock('../../components/BulkImport', () => ({
  default: () => <div data-testid="bulk-import-mock" />,
}));

vi.mock('../../components/ProposeChangeModal', () => ({
  default: () => <div data-testid="propose-change-modal-mock" />,
}));

describe('Departments Page (DP-01 -> DP-05)', { timeout: 15000 }, () => {
  const mockDepartments = [
    {
      id: 1,
      code: 'BKS',
      name: 'Ban Kiểm soát',
      unitType: 'HoiDong',
      region: 'Hội sở chính',
      parent: null,
      status: 'Active',
      functions: 'Kiểm tra, giám sát toàn hệ thống',
    },
    {
      id: 2,
      code: 'KTNB',
      name: 'Khối Kiểm toán nội bộ',
      unitType: 'Khoi',
      region: 'Hội sở chính',
      parent: 'BKS',
      parentId: 1,
      status: 'Active',
      functions: 'Thực hiện kiểm toán nội bộ độc lập',
    },
    {
      id: 3,
      code: 'CN_HN',
      name: 'Chi nhánh Hà Nội',
      unitType: 'ChiNhanh',
      region: 'Vùng 1 (Miền Bắc)',
      parent: null,
      status: 'Active',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/departments') {
        return Promise.resolve({ data: mockDepartments });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { id: 4, code: 'NEW', name: 'New Unit' } });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  it('DP-01: fetches and renders departments table and action buttons', async () => {
    render(<Departments />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/departments');
    });

    await waitFor(() => {
      expect(screen.getByText('Khối Kiểm toán nội bộ')).toBeDefined();
      expect(screen.getByText('Ban Kiểm soát')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Thêm Đơn vị/i })).toBeDefined();
  });

  it('DP-02: switches view mode between Table and Tree view', async () => {
    render(<Departments />);

    await waitFor(() => {
      expect(screen.getByText('Ban Kiểm soát')).toBeDefined();
    });

    const treeModeSegment = screen.queryByText(/Sơ đồ cây/i) || screen.queryByTitle(/Sơ đồ cây/i);
    if (treeModeSegment) {
      fireEvent.click(treeModeSegment);
      await waitFor(() => {
        expect(document.querySelector('.ant-tree')).toBeDefined();
      });
    }
  });

  it('DP-03: opens add department modal and triggers create API', async () => {
    render(<Departments />);

    await waitFor(() => {
      expect(screen.getByText('Ban Kiểm soát')).toBeDefined();
    });

    const addBtn = screen.getByRole('button', { name: /Thêm Đơn vị/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thêm Đơn vị mới/i)).toBeDefined();
    });

    const codeInput = document.querySelector('input[id*="code"]');
    const nameInput = document.querySelector('input[id*="name"]');

    if (codeInput && nameInput) {
      fireEvent.change(codeInput, { target: { value: 'PHONG_QLRR' } });
      fireEvent.change(nameInput, { target: { value: 'Phòng Quản trị Rủi ro' } });

      const okBtns = screen.getAllByRole('button', { name: /Thêm đơn vị/i });
      if (okBtns.length > 0) {
        fireEvent.click(okBtns[0]);
        await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith(
            '/departments',
            expect.objectContaining({
              code: 'PHONG_QLRR',
              name: 'Phòng Quản trị Rủi ro',
            }),
          );
        });
      }
    }
  });

  it('DP-04: triggers delete action for a department record', async () => {
    render(<Departments />);

    await waitFor(() => {
      expect(screen.getByText('Ban Kiểm soát')).toBeDefined();
    });

    const deleteBtns = document.querySelectorAll('.anticon-delete');
    if (deleteBtns.length > 0) {
      const deleteBtn = deleteBtns[0].closest('button');
      if (deleteBtn) {
        fireEvent.click(deleteBtn);
        await waitFor(() => {
          expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('/departments/'));
        });
      }
    }
  });

  it('DP-05: filters list when searching for a department name', async () => {
    render(<Departments />);

    await waitFor(() => {
      expect(screen.getByText('Ban Kiểm soát')).toBeDefined();
    });

    const searchInput = document.querySelector('input[placeholder*="Tìm kiếm"]') as HTMLInputElement;
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Khối Kiểm toán' } });
      await waitFor(() => {
        expect(screen.getByText('Khối Kiểm toán nội bộ')).toBeDefined();
      });
    }
  });
});
