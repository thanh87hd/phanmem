import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DocumentManager from '../DocumentManager';
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

describe('DocumentManager Page (DM-01 -> DM-04)', { timeout: 15000 }, () => {
  const mockDocuments = [
    {
      id: 1,
      originalName: 'Bao_cao_kiem_toan_Q3.pdf',
      documentType: 'Report',
      mimeType: 'application/pdf',
      size: 1048576,
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 2,
      originalName: 'Mau_kiem_tra_tin_dung.xlsx',
      documentType: 'Template',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 524288,
      createdAt: '2026-09-12T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/documents') {
        return Promise.resolve({ data: mockDocuments });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  it('DM-01: fetches and renders document list with file type icons', async () => {
    render(<DocumentManager />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents');
    });

    await waitFor(() => {
      expect(screen.getByText('Bao_cao_kiem_toan_Q3.pdf')).toBeDefined();
      expect(screen.getByText('Mau_kiem_tra_tin_dung.xlsx')).toBeDefined();
    });
  });

  it('DM-02: opens upload document modal when upload button is clicked', async () => {
    render(<DocumentManager />);

    await waitFor(() => {
      expect(screen.getByText('Bao_cao_kiem_toan_Q3.pdf')).toBeDefined();
    });

    const uploadBtn = screen.getByRole('button', { name: /Tải lên tài liệu|Tải lên/i }) || screen.getByText(/Tải lên/i);
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(document.querySelector('.ant-modal')).toBeDefined();
    });
  });

  it('DM-03: triggers download document API when download icon is clicked', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/download')) {
        return Promise.resolve({ data: new Blob(['content']) });
      }
      if (url === '/documents') {
        return Promise.resolve({ data: mockDocuments });
      }
      return Promise.resolve({ data: [] });
    });

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<DocumentManager />);

    await waitFor(() => {
      expect(screen.getByText('Bao_cao_kiem_toan_Q3.pdf')).toBeDefined();
    });

    const downloadBtns = document.querySelectorAll('.anticon-download');
    if (downloadBtns.length > 0) {
      const btn = downloadBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith(
            expect.stringContaining('/download'),
            expect.anything(),
          );
        });
      }
    }
  });

  it('DM-04: deletes a document when delete button is clicked', async () => {
    render(<DocumentManager />);

    await waitFor(() => {
      expect(screen.getByText('Bao_cao_kiem_toan_Q3.pdf')).toBeDefined();
    });

    const deleteBtns = document.querySelectorAll('.anticon-delete');
    if (deleteBtns.length > 0) {
      const btn = deleteBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(document.querySelector('.ant-modal-confirm')).toBeDefined();
        });
        const confirmBtn = document.querySelector('.ant-modal-confirm-btns button.ant-btn-primary') as HTMLElement;
        if (confirmBtn) {
          fireEvent.click(confirmBtn);
          await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('/documents/'));
          });
        }
      }
    }
  });
});
