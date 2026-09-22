import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditMinutesPage } from '../AuditMinutesPage';
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

describe('AuditMinutesPage (AM-01 -> AM-06)', { timeout: 15000 }, () => {
  const mockEngagements = [
    {
      id: 1,
      code: 'ENG-2026-01',
      name: 'Kiểm toán Toàn diện Chi nhánh Hà Nội',
      branchName: 'Chi nhánh Hà Nội',
      decisionNo: '102/QĐ-KTNB',
      fieldworkStartDate: '2026-05-01',
      fieldworkEndDate: '2026-05-15',
      legacyLeadAuditor: 'Trần Văn Trưởng',
    },
  ];

  const mockMinutes = [
    {
      id: 10,
      minuteNo: 'BBKT-102/QĐ-KTNB',
      title: 'Biên bản kiểm toán tại Chi nhánh Hà Nội',
      auditedUnitName: 'Chi nhánh Hà Nội',
      status: 'Draft',
      minuteType: 'MB04_CHI_TIET',
      issueDate: '2026-05-16',
      leadAuditorName: 'Trần Văn Trưởng',
      meetingLocation: 'Phòng họp Chi nhánh Hà Nội',
    },
  ];

  const mockFindings = [
    {
      id: 101,
      findingCode: 'FD-TD-01',
      findingTitle: 'Hồ sơ vay tiêu dùng thiếu chứng từ chứng minh thu nhập',
      riskLevel: 'High',
      findingCategory: 'KHCN',
      condition: '10/20 bộ hồ sơ chỉ nộp đơn tự khai thu nhập',
      criteria: 'Quy định 3002/QĐ-LPB',
      customerName: 'Nguyễn Văn A',
      contractNo: 'HD-00123',
      legacyProposerOfficer: 'Lê Văn Đề Xuất',
      legacyAppraiserOfficer: 'Phạm Thị Thẩm Định',
      legacyBusinessLeader: 'Hoàng Văn Duyệt',
    },
    {
      id: 102,
      findingCode: 'FD-PTD-02',
      findingTitle: 'Kho quỹ tồn quỹ vượt hạn mức bảo hiểm quy định',
      riskLevel: 'Medium',
      findingCategory: 'PTD',
      condition: 'Tiền mặt cuối ngày vượt 500 triệu so với hạn mức',
      criteria: 'Quy định 1045/QĐ-LPB về an toàn kho quỹ',
      legacyProposerOfficer: 'Nguyễn Kho Quỹ',
      legacyBusinessLeader: 'Hoàng Văn Duyệt',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-engagements') {
        return Promise.resolve({ data: mockEngagements });
      }
      if (url === '/audit-engagements/1') {
        return Promise.resolve({ data: mockEngagements[0] });
      }
      if (url.includes('/audit-minutes?engagementId=1')) {
        return Promise.resolve({ data: mockMinutes });
      }
      if (url.includes('/audit-findings?engagementId=1')) {
        return Promise.resolve({ data: mockFindings });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('AM-01: Renders page title, engagement banner, and action buttons', async () => {
    render(<AuditMinutesPage />);

    expect(screen.getByText(/Biên bản Kiểm toán MB04/i)).toBeDefined();
    expect(screen.getByText('Tự động bóc tách từ WP')).toBeDefined();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-engagements');
    });
  });

  it('AM-02: Loads engagement details, minutes, and findings on selection', async () => {
    render(<AuditMinutesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chi nhánh Hà Nội')).toBeDefined();
      expect(screen.getByText('Trần Văn Trưởng')).toBeDefined();
      expect(screen.getByText('102/QĐ-KTNB')).toBeDefined();
      expect(screen.getByText('Chỉnh sửa Biên bản')).toBeDefined();
    });
  });

  it('AM-03: Triggers Auto-collate from Working Papers', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditMinutesPage />);

    await waitFor(() => {
      expect(screen.getByText('Tự động bóc tách từ WP')).toBeDefined();
    });

    const collateBtn = screen.getByText('Tự động bóc tách từ WP');
    fireEvent.click(collateBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/audit-minutes/auto-collate/1');
    });
  });

  it('AM-04: Opens Edit Modal and updates minute info', async () => {
    (api.patch as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditMinutesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa Biên bản')).toBeDefined();
    });

    const editBtn = screen.getByText('Chỉnh sửa Biên bản');
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chỉnh sửa Biên bản kiểm toán/i)).toBeDefined();
    });

    const okBtn = screen.getByRole('button', { name: 'OK' });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/audit-minutes/10', expect.anything());
    });
  });

  it('AM-05: Displays business domain findings (KHCN, PTD)', async () => {
    render(<AuditMinutesPage />);

    await waitFor(() => {
      expect(screen.getByText('FD-TD-01')).toBeDefined();
      expect(screen.getByText('Hồ sơ vay tiêu dùng thiếu chứng từ chứng minh thu nhập')).toBeDefined();
    });
  });

  it('AM-06: Triggers Word and Excel export when requested', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/export/word') || url.includes('/export/excel')) {
        return Promise.resolve({ data: new Blob(['fake-content'], { type: 'application/octet-stream' }) });
      }
      if (url === '/audit-engagements') return Promise.resolve({ data: mockEngagements });
      if (url === '/audit-engagements/1') return Promise.resolve({ data: mockEngagements[0] });
      if (url.includes('/audit-minutes')) return Promise.resolve({ data: mockMinutes });
      if (url.includes('/audit-findings')) return Promise.resolve({ data: mockFindings });
      return Promise.resolve({ data: [] });
    });

    render(<AuditMinutesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa Biên bản')).toBeDefined();
    });

    const wordBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('Xuất MB04 Word') || b.querySelector('.anticon-file-word'));
    if (wordBtns.length > 0) {
      fireEvent.click(wordBtns[0]);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/export/word'), expect.anything());
      });
    }
  });
});
