import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RiskRegister from '../RiskRegister';
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

vi.mock('../../components/RiskLevelTag', () => ({
  default: ({ level }: { level: string }) => <span data-testid="risk-level-tag">{level}</span>,
}));

describe('RiskRegister Page (RR-01 -> RR-06)', { timeout: 15000 }, () => {
  const mockSummary = {
    total: 12,
    byRiskBand: {
      'Đỏ': 3,
      'Cam': 4,
      'Vàng': 3,
      'Xanh': 2,
    },
    byDomain: {
      'CNTT': 5,
      'TD_DVKD': 7,
    },
  };

  const mockRisks = [
    {
      id: 101,
      hsrrCode: 'HS01_CNTT_001',
      domain: 'CNTT',
      sequenceNo: 1,
      riskCategory: 'Rủi ro An toàn Thông tin',
      riskTitle: 'Lỗ hổng bảo mật máy chủ & thất thoát dữ liệu khách hàng',
      riskDescription: 'Hệ thống máy chủ chưa vá lỗi định kỳ',
      impactScore: 4.5,
      likelihoodScore: 3.5,
      inherentRiskScore: 3.97,
      inherentRiskLevel: 'Rất cao',
      controlObjective: 'Quét lỗ hổng 100% định kỳ',
      designEffectiveness: 1.0,
      operatingEffectiveness: 0.5,
      controlRating: 'Trung bình',
      residualRiskScore: 2.78,
      finalRiskBand: 'Cam',
      riskResponse: 'Mitigate',
      responsibleUnit: 'Trung tâm CNTT & ANM',
      targetDate: '2026-06-30',
      status: 'Active',
      auditObject: { id: 1, name: 'Hệ thống Core Banking' },
    },
    {
      id: 102,
      hsrrCode: 'HS10_TD_001',
      domain: 'TD_DVKD',
      sequenceNo: 2,
      riskCategory: 'Rủi ro Cấp tín dụng',
      riskTitle: 'Thẩm định nguồn thu nhập trả nợ không có chứng từ xác thực',
      riskDescription: 'Chỉ căn cứ vào sao kê không xác minh thực địa',
      impactScore: 5.0,
      likelihoodScore: 4.0,
      inherentRiskScore: 4.47,
      inherentRiskLevel: 'Rất cao',
      controlObjective: 'Kiểm soát chặt chẽ hồ sơ chứng minh thu',
      designEffectiveness: 0.5,
      operatingEffectiveness: 0.5,
      controlRating: 'Yếu',
      residualRiskScore: 3.9,
      finalRiskBand: 'Đỏ',
      riskResponse: 'Avoid',
      responsibleUnit: 'Khối KHDN',
      targetDate: '2026-09-30',
      status: 'Active',
      auditObject: { id: 2, name: 'Chi nhánh Hà Nội' },
    },
  ];

  const mockUniverses = [
    { id: 1, name: 'Hệ thống Core Banking' },
    { id: 2, name: 'Chi nhánh Hà Nội' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/risk-register/summary') {
        return Promise.resolve({ data: mockSummary });
      }
      if (url === '/risk-register') {
        return Promise.resolve({ data: { items: mockRisks, total: mockRisks.length } });
      }
      if (url === '/audit-universe') {
        return Promise.resolve({ data: mockUniverses });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('RR-01: Renders page title, stats cards, and action buttons', async () => {
    render(<RiskRegister />);

    expect(screen.getByText(/Sổ Đăng Ký Rủi Ro/i)).toBeDefined();
    expect(screen.getByText('Thêm Rủi Ro Mới')).toBeDefined();
    expect(screen.getByText('Nạp dữ liệu mẫu HSRR')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Tổng số rủi ro')).toBeDefined();
      expect(screen.getByText('Rủi ro Băng Đỏ (Rất cao)')).toBeDefined();
    });
  });

  it('RR-02: Loads and renders risk items table with proper columns & tags', async () => {
    render(<RiskRegister />);

    await waitFor(() => {
      expect(screen.getByText('HS01_CNTT_001')).toBeDefined();
      expect(screen.getByText('Lỗ hổng bảo mật máy chủ & thất thoát dữ liệu khách hàng')).toBeDefined();
      expect(screen.getByText('HS10_TD_001')).toBeDefined();
      expect(screen.getByText('Thẩm định nguồn thu nhập trả nợ không có chứng từ xác thực')).toBeDefined();
      expect(screen.getByText('Băng Đỏ')).toBeDefined();
      expect(screen.getByText('Băng Cam')).toBeDefined();
    });
  });

  it('RR-03: Supports searching by keyword and filtering by domain', async () => {
    render(<RiskRegister />);

    await waitFor(() => {
      expect(screen.getByText('HS01_CNTT_001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo mã HSRR/i);
    fireEvent.change(searchInput, { target: { value: 'máy chủ' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/risk-register', expect.anything());
    });
  });

  it('RR-04: Opens Create modal and submits new risk', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { id: 103, riskTitle: 'Rủi ro mới' } });

    render(<RiskRegister />);

    const addButton = screen.getByText('Thêm Rủi Ro Mới');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Thêm Mới Rủi Ro vào Sổ Đăng Ký/i)).toBeDefined();
    });

    const titleInput = screen.getByPlaceholderText(/Tên rủi ro ngắn gọn/i);
    fireEvent.change(titleInput, { target: { value: 'Rủi ro rò rỉ dữ liệu qua cổng API' } });

    const saveButton = screen.getByRole('button', { name: /Lưu rủi ro/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/risk-register', expect.objectContaining({
        domain: 'CNTT',
        riskTitle: 'Rủi ro rò rỉ dữ liệu qua cổng API',
      }));
    });
  });

  it('RR-05: Opens Import Sample Modal and displays sample templates', async () => {
    render(<RiskRegister />);

    const importButton = screen.getByText('Nạp dữ liệu mẫu HSRR');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText(/Nạp Dữ Liệu Hồ Sơ Rủi Ro Chuẩn Hóa/i)).toBeDefined();
      expect(screen.getByText(/Khung Hồ sơ rủi ro \(HSRR\) 12 Lĩnh vực THUCTE 2026/i)).toBeDefined();
    });
  });

  it('RR-06: Deletes a risk item and refreshes list', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: { success: true } });

    render(<RiskRegister />);

    await waitFor(() => {
      expect(screen.getByText('HS01_CNTT_001')).toBeDefined();
    });

    const deleteButtons = screen.getAllByRole('button').filter(b => b.querySelector('.anticon-delete'));
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa rủi ro này khỏi Sổ đăng ký?')).toBeDefined();
    });

    const confirmBtn = screen.getByText('Xóa');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/risk-register/101');
    });
  });
});
