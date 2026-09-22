import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Modal } from 'antd';
import RolesPage from '../RolesPage';
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

vi.mock('../../utils/tableFilterHelper', () => ({
  getColumnSearchProps: () => ({}),
  getColumnSorter: () => () => 0,
}));

describe('RolesPage (RP-01 -> RP-06)', { timeout: 15000 }, () => {
  const mockRoles = [
    {
      id: 1,
      name: 'Trưởng Ban KTNB',
      description: 'Quản trị toàn quyền hệ thống kiểm toán',
      permissions: 'dashboard,personnel,roles,audit_plan,audit_reports',
    },
    {
      id: 2,
      name: 'Kiểm toán viên Chuẩn',
      description: 'Thực hiện kiểm toán và lập working papers',
      permissions: 'dashboard,audit_engagements,working_papers,audit_findings',
    },
  ];

  const mockReports = [
    { id: 101, name: 'Báo cáo Dư nợ Tín dụng Chi nhánh' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/roles') {
        return Promise.resolve({ data: mockRoles });
      }
      if (url === '/reports') {
        return Promise.resolve({ data: mockReports });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { id: 3, name: 'Tân Kiểm toán viên' } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });
  });

  it('RP-01: renders RolesPage title, subtitle, and data table', async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Phân quyền — Chức danh Hệ thống')).toBeDefined();
      expect(screen.getByText('Trưởng Ban KTNB')).toBeDefined();
      expect(screen.getByText('Kiểm toán viên Chuẩn')).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith('/roles');
    expect(api.get).toHaveBeenCalledWith('/reports');
  });

  it('RP-02: opens authorization editor when clicking "Thêm Chức danh"', async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Thêm Chức danh')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Thêm Chức danh'));

    await waitFor(() => {
      expect(screen.getByText('Thêm Chức danh Hệ thống Mới')).toBeDefined();
      expect(screen.getByText('Thông tin Chức danh')).toBeDefined();
      expect(screen.getByText('Mẫu phân quyền nhanh')).toBeDefined();
    });
  });

  it('RP-03: selects quick preset "Quản trị viên (Toàn quyền)" successfully', async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Thêm Chức danh')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Thêm Chức danh'));

    await waitFor(() => {
      expect(screen.getByText(/Quản trị viên \(Toàn quyền\)/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Quản trị viên \(Toàn quyền\)/i));

    // Preset click should apply without errors and select all perms
    expect(screen.getAllByText('Lưu & Khởi tạo').length).toBeGreaterThan(0);
  });

  it('RP-04: creates new role when filling form and clicking "Lưu & Khởi tạo"', async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Thêm Chức danh')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Thêm Chức danh'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ví dụ: Trưởng Ban Kiểm toán/i)).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText(/Ví dụ: Trưởng Ban Kiểm toán/i);
    fireEvent.change(nameInput, { target: { value: 'Chuyên viên Giám sát EWS' } });

    // Click preset to have some permissions
    fireEvent.click(screen.getByText(/Quản trị viên \(Toàn quyền\)/i));

    // Click Save (first button from header or footer)
    const saveBtn = screen.getAllByText('Lưu & Khởi tạo')[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/roles',
        expect.objectContaining({
          name: 'Chuyên viên Giám sát EWS',
          permissions: expect.any(String),
        })
      );
    });
  });

  it('RP-05: opens edit modal and submits updates via PATCH /roles/:id', async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Trưởng Ban KTNB')).toBeDefined();
    });

    // Find edit buttons (EditOutlined)
    const editButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('.anticon-edit'));
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Cấu hình Chức danh: Trưởng Ban KTNB/i)).toBeDefined();
      expect(screen.getAllByText('Cập nhật Chức danh').length).toBeGreaterThan(0);
    });

    const updateBtn = screen.getAllByText('Cập nhật Chức danh')[0];
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/roles/1',
        expect.objectContaining({
          name: 'Trưởng Ban KTNB',
        })
      );
    });
  });

  it('RP-06: prompts confirmation and deletes role via DELETE /roles/:id', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((config: any) => {
      config.onOk?.();
      return {} as any;
    });

    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán viên Chuẩn')).toBeDefined();
    });

    // Find delete buttons (DeleteOutlined)
    const deleteButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('.anticon-delete'));
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/roles/2');
    });
  });
});
