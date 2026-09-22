import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Personnel from '../Personnel';
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
  default: () => <button data-testid="bulk-import-btn">Import Excel</button>,
}));

vi.mock('../../components/DynamicFormRenderer', () => ({
  default: () => <div data-testid="dynamic-form" />,
  extractCustomFields: () => ({}),
}));

describe('Personnel Page (PS-01 -> PS-06)', { timeout: 15000 }, () => {
  const mockRoles = [
    { id: 1, name: 'Kiểm toán viên' },
    { id: 2, name: 'Trưởng đoàn' },
  ];

  const mockUsers = [
    {
      id: 11,
      fullName: 'Trần Văn Hải',
      username: 'haitv',
      email: 'haitv@bank.com',
      jobTitle: 'Kiểm toán viên chính',
      department: 'Phòng KTNB Hội sở',
      status: 'Active',
      role: { id: 1, name: 'Kiểm toán viên' },
    },
    {
      id: 12,
      fullName: 'Nguyễn Thị Mai',
      username: 'maint',
      email: 'maint@bank.com',
      jobTitle: 'Trưởng đoàn',
      department: 'Phòng KTNB Miền Nam',
      status: 'Active',
      role: { id: 2, name: 'Trưởng đoàn' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/users') && url.includes('status=')) {
        return Promise.resolve({ data: mockUsers });
      }
      if (url === '/roles') {
        return Promise.resolve({ data: mockRoles });
      }
      if (url.includes('/competencies')) {
        return Promise.resolve({ data: [{ id: 1, domain: 'Tín dụng', level: 4 }] });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { success: true } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
  });

  it('PS-01: renders Personnel page header, search input, and add button', async () => {
    render(<Personnel />);

    await waitFor(() => {
      expect(screen.getByText('Quản lý Nhân sự')).toBeDefined();
      expect(screen.getByText('Thêm Nhân sự')).toBeDefined();
      expect(screen.getByPlaceholderText(/Tìm theo tên, email/i)).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith('/users?status=Active&includeInactive=true');
    expect(api.get).toHaveBeenCalledWith('/roles');
  });

  it('PS-02: displays user table rows with correct data and role info', async () => {
    render(<Personnel />);

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Hải')).toBeDefined();
      expect(screen.getByText('@haitv')).toBeDefined();
      expect(screen.getByText('Nguyễn Thị Mai')).toBeDefined();
      expect(screen.getByText('@maint')).toBeDefined();
      expect(screen.getByText('Kiểm toán viên chính')).toBeDefined();
    });
  });

  it('PS-03: switches status tab and requests users with matching filter', async () => {
    render(<Personnel />);

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Hải')).toBeDefined();
    });

    const resignedTab = screen.getByText(/Đã nghỉ việc/i);
    fireEvent.click(resignedTab);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users?status=Resigned&includeInactive=true');
    });
  });

  it('PS-04: opens add personnel view when clicking "Thêm Nhân sự"', async () => {
    render(<Personnel />);

    await waitFor(() => {
      expect(screen.getByText('Thêm Nhân sự')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Thêm Nhân sự'));

    await waitFor(() => {
      expect(screen.getByText('Thêm Nhân sự mới')).toBeDefined();
      expect(screen.getByText('← Quay lại danh sách')).toBeDefined();
    });
  });

  it('PS-05: opens competency matrix modal and fetches user competencies', async () => {
    render(<Personnel />);

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Hải')).toBeDefined();
    });

    const trophyIcons = document.querySelectorAll('.ant-table-row .anticon-trophy');
    expect(trophyIcons.length).toBeGreaterThan(0);

    const compBtn = trophyIcons[0].closest('button')!;
    fireEvent.click(compBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/11/competencies');
      expect(screen.getByText(/Ma trận Năng lực & Chứng chỉ/i)).toBeDefined();
    });
  });

  it('PS-06: opens lifecycle status modal when clicking resign action icon', async () => {
    render(<Personnel />);

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Hải')).toBeDefined();
    });

    const resignIcons = document.querySelectorAll('.ant-table-row .anticon-close');
    expect(resignIcons.length).toBeGreaterThan(0);

    const resignBtn = resignIcons[0].closest('button')!;
    fireEvent.click(resignBtn);

    await waitFor(() => {
      expect(screen.getByText(/Báo Nghỉ Việc & Khóa Tài Khoản/i)).toBeDefined();
    });
  });
});
