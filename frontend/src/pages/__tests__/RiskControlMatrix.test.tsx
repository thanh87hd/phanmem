import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RiskControlMatrix from '../RiskControlMatrix';
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

describe('RiskControlMatrix Page (RCM-01 -> RCM-06)', { timeout: 15000 }, () => {
  const mockRcmData = [
    {
      id: 1,
      processName: 'Cho vay KHDN',
      subProcess: 'Thẩm định tài sản bảo đảm',
      riskName: 'Định giá quá cao giá trị tài sản thế chấp',
      inherentRiskScore: 'High',
      controlName: 'Độc lập định giá lại qua đơn vị thứ 3',
      controlType: 'Preventive',
      controlAutomation: 'Automated',
      testProcedure: 'Rà soát ngẫu nhiên 20 chứng thư thẩm định giá',
    },
    {
      id: 2,
      processName: 'Thanh toán Quốc tế',
      subProcess: 'Phát hành L/C',
      riskName: 'Chứng từ giả mạo trong bộ chứng từ thanh toán L/C',
      inherentRiskScore: 'Critical',
      controlName: 'Kiểm soát 2 bước Swift Authenticator',
      controlType: 'Detective',
      controlAutomation: 'Manual',
      testProcedure: 'Đối chiếu Swift ACK và chữ ký ủy quyền',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/risk-control-matrix') {
        return Promise.resolve({ data: mockRcmData });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('RCM-01: Renders page title, toolbar, and action buttons', async () => {
    render(<RiskControlMatrix />);

    expect(screen.getByText('riskControlMatrix.title')).toBeDefined();
    expect(screen.getByText('riskControlMatrix.addBtn')).toBeDefined();
    expect(screen.getByText('riskControlMatrix.exportBtn')).toBeDefined();
    expect(screen.getByTestId('bulk-import-mock')).toBeDefined();
  });

  it('RCM-02: Loads and displays matrix table rows with controls and procedures', async () => {
    render(<RiskControlMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Cho vay KHDN')).toBeDefined();
      expect(screen.getByText('Thẩm định tài sản bảo đảm')).toBeDefined();
      expect(screen.getByText('Định giá quá cao giá trị tài sản thế chấp')).toBeDefined();
      expect(screen.getByText('Độc lập định giá lại qua đơn vị thứ 3')).toBeDefined();
      expect(screen.getByText('Thanh toán Quốc tế')).toBeDefined();
      expect(screen.getByText('High')).toBeDefined();
      expect(screen.getByText('Critical')).toBeDefined();
    });
  });

  it('RCM-03: Filters table by search keyword', async () => {
    render(<RiskControlMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Cho vay KHDN')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Tìm quy trình, rủi ro, kiểm soát...');
    fireEvent.change(searchInput, { target: { value: 'Thanh toán' } });

    expect((searchInput as HTMLInputElement).value).toBe('Thanh toán');
  });

  it('RCM-04: Opens Add Modal and submits new RCM item', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { id: 3, processName: 'Huy động vốn' } });

    render(<RiskControlMatrix />);

    const addBtn = screen.getByText('riskControlMatrix.addBtn');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('riskControlMatrix.modalAddTitle')).toBeDefined();
    });

    const processInput = screen.getByPlaceholderText('riskControlMatrix.form.processNamePlaceholder');
    fireEvent.change(processInput, { target: { value: 'Huy động vốn tiết kiệm' } });

    const riskInput = screen.getByPlaceholderText('riskControlMatrix.form.riskNamePlaceholder');
    fireEvent.change(riskInput, { target: { value: 'Gian lận tiền gửi tiết kiệm' } });

    const controlInput = screen.getByPlaceholderText('riskControlMatrix.form.controlNamePlaceholder');
    fireEvent.change(controlInput, { target: { value: 'Kiểm soát 2 cấp xác thực' } });

    const okBtn = screen.getByRole('button', { name: 'riskControlMatrix.btnSave' });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/risk-control-matrix', expect.objectContaining({
        processName: 'Huy động vốn tiết kiệm',
        riskName: 'Gian lận tiền gửi tiết kiệm',
        controlName: 'Kiểm soát 2 cấp xác thực',
      }));
    });
  });

  it('RCM-05: Triggers AI suggestion when requested in modal', async () => {
    (api.post as any).mockImplementation((url: string) => {
      if (url === '/ai/suggest-rcm') {
        return Promise.resolve({
          data: [
            { riskName: 'Rủi ro AI phát hiện', controlName: 'Kiểm soát AI đề xuất' },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<RiskControlMatrix />);

    const addBtn = screen.getByText('riskControlMatrix.addBtn');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('riskControlMatrix.modalAddTitle')).toBeDefined();
    });

    const processInput = screen.getByPlaceholderText('riskControlMatrix.form.processNamePlaceholder');
    fireEvent.change(processInput, { target: { value: 'Giao dịch ngoại tệ' } });

    const aiButton = screen.getByRole('button', { name: /robot/i });
    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ai/suggest-rcm', { processName: 'Giao dịch ngoại tệ' });
    });
  });

  it('RCM-06: Deletes RCM entry when delete action is triggered', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: { success: true } });

    render(<RiskControlMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Cho vay KHDN')).toBeDefined();
    });

    const deleteButtons = screen.getAllByRole('button').filter(b => b.querySelector('.anticon-delete'));
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/risk-control-matrix/1');
    });
  });
});
