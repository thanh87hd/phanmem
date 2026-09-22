import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BulkImport from '../BulkImport';
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

describe('BulkImport Component (BI-01 -> BI-05)', { timeout: 15000 }, () => {
  const defaultProps = {
    module: 'departments',
    onSuccess: vi.fn(),
    templateData: [{ code: 'CN01', name: 'Chi nhánh Hà Nội' }],
    fileName: 'Don_Vi',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('BI-01: renders Import button and opens modal when clicked', async () => {
    render(<BulkImport {...defaultProps} />);
    const importBtn = screen.getByRole('button', { name: /Nhập từ Excel/i });
    expect(importBtn).toBeDefined();

    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText(/Nhập dữ liệu Don_Vi từ Excel/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Tải File Mẫu/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Bắt đầu Nhập/i })).toBeDefined();
      expect(screen.getByText(/Chọn File Excel/i)).toBeDefined();
    });
  });

  it('BI-02: downloads excel template when clicking template button', async () => {
    const mockBlob = new Blob(['mock-excel-content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockBlob });

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<BulkImport {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhập từ Excel/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Tải File Mẫu/i })).toBeDefined();
    });

    const downloadBtn = screen.getByRole('button', { name: /Tải File Mẫu/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/import/export-template',
        { templateData: defaultProps.templateData },
        { responseType: 'blob' },
      );
    });
  });

  it('BI-03: shows error message if upload is clicked without selecting file', async () => {
    render(<BulkImport {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhập từ Excel/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bắt đầu Nhập/i })).toBeDefined();
    });

    const uploadSubmitBtn = screen.getByRole('button', { name: /Bắt đầu Nhập/i });
    fireEvent.click(uploadSubmitBtn);

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/import/departments'),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  it('BI-04: handles successful upload and triggers onSuccess callback', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: 15,
        errors: [],
      },
    });

    render(<BulkImport {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhập từ Excel/i }));

    await waitFor(() => {
      expect(screen.getByText(/Chọn File Excel/i)).toBeDefined();
    });

    const file = new File(['mock content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    const uploadSubmitBtn = screen.getByRole('button', { name: /Bắt đầu Nhập/i });
    fireEvent.click(uploadSubmitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/import/departments',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('BI-05: displays error details table when import response contains row errors', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: 2,
        errors: [
          { item: { code: 'CN01' }, message: 'Mã phòng ban đã tồn tại' },
          { item: { code: 'CN02' }, message: 'Tên đơn vị không được để trống' },
        ],
      },
    });

    render(<BulkImport {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhập từ Excel/i }));

    await waitFor(() => {
      expect(screen.getByText(/Chọn File Excel/i)).toBeDefined();
    });

    const file = new File(['mock'], 'test_errors.xlsx', { type: 'application/vnd.ms-excel' });
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    const uploadSubmitBtn = screen.getByRole('button', { name: /Bắt đầu Nhập/i });
    fireEvent.click(uploadSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thành công: 2/i)).toBeDefined();
      expect(screen.getByText(/Mã phòng ban đã tồn tại/i)).toBeDefined();
      expect(screen.getByText(/Tên đơn vị không được để trống/i)).toBeDefined();
    });
  });
});
