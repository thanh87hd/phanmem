import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Modal } from 'antd';
import SystemManagement from '../SystemManagement';
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

vi.mock('../../components/CustomFieldConfig', () => ({
  default: () => <div data-testid="custom-field-config">Cấu hình Trường Động</div>,
}));

vi.mock('../../components/WorkflowBuilder', () => ({
  default: () => <div data-testid="workflow-builder">Trình Thiết Kế Quy Trình</div>,
}));

vi.mock('../../components/ReportBuilder', () => ({
  default: () => <div data-testid="report-builder">Trình Tạo Báo Cáo Động</div>,
}));

vi.mock('../IntegrationSettings', () => ({
  default: () => <div data-testid="integration-settings">Cấu hình Tích hợp Core Banking</div>,
}));

vi.mock('../ExternalDatabaseConnections', () => ({
  default: () => <div data-testid="external-db-conn">Kết nối CSDL Ngoài</div>,
}));

vi.mock('../InfrastructureMonitor', () => ({
  default: () => <div data-testid="infra-monitor">Giám sát Hạ tầng</div>,
}));

describe('SystemManagement Page (SM-01 -> SM-06)', { timeout: 15000 }, () => {
  const mockLogStats = {
    totalAlerts: 15,
    lastCleanup: '2026-06-01T10:00:00Z',
  };

  const mockBackups = [
    {
      name: 'backup_20260901_full.sql',
      size: 26633830,
      createdAt: '2026-09-01T02:00:00Z',
      checksum: 'sha256-abc123xyz',
    },
    {
      name: 'backup_20260915_full.sql',
      size: 27367833,
      createdAt: '2026-09-15T02:00:00Z',
      checksum: 'sha256-def456uvw',
    },
  ];

  const mockBackupStats = {
    totalFiles: 2,
    totalSizeMB: '51.50',
  };

  const mockSecurityConfigs = [
    {
      id: 1,
      key: 'PASSWORD_MIN_LENGTH',
      name: 'Độ dài mật khẩu tối thiểu',
      description: 'Độ dài mật khẩu tối thiểu',
      standard: 'PCI_DSS',
      value: '12',
      valueType: 'number',
    },
    {
      id: 2,
      key: 'REQUIRE_2FA',
      name: 'Bắt buộc xác thực 2 lớp (2FA)',
      description: 'Bắt buộc xác thực 2 lớp (2FA)',
      standard: 'ISO_27001',
      value: 'true',
      valueType: 'boolean',
    },
  ];

  const mockCompliance = {
    pciDss: { score: 8, total: 8, passed: [], failed: [] },
    iso27001: { score: 7, total: 7, passed: [], failed: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/system-management/log-stats') {
        return Promise.resolve({ data: mockLogStats });
      }
      if (url === '/system-management/backups') {
        return Promise.resolve({ data: mockBackups });
      }
      if (url === '/system-management/backup-stats') {
        return Promise.resolve({ data: mockBackupStats });
      }
      if (url === '/system-management/security-config') {
        return Promise.resolve({ data: mockSecurityConfigs });
      }
      if (url === '/system-management/security-config/compliance') {
        return Promise.resolve({ data: mockCompliance });
      }
      if (url.includes('/kita/analytics') || url.includes('/kita/logs')) {
        return Promise.resolve({ data: { totalQuestions: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { success: true, fileName: 'backup_new.sql' } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
    (api.delete as any).mockResolvedValue({ data: { deleted: 150 } });
  });

  it('SM-01: renders SystemManagement page title and default maintenance tab stats', async () => {
    render(<SystemManagement />);

    await waitFor(() => {
      expect(screen.getByText('Quản trị & Bảo trì Hệ thống')).toBeDefined();
      expect(screen.getByText('Tổng số cảnh báo bảo mật')).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith('/system-management/log-stats');
    expect(api.get).toHaveBeenCalledWith('/system-management/backups');
  });

  it('SM-02: displays database backups table with backup files and sizes', async () => {
    render(<SystemManagement />);

    await waitFor(() => {
      expect(screen.getByText('backup_20260901_full.sql')).toBeDefined();
      expect(screen.getByText('backup_20260915_full.sql')).toBeDefined();
    });
  });

  it('SM-03: triggers backup creation when clicking "Tạo bản sao lưu tức thì (Full Backup)"', async () => {
    render(<SystemManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Tạo bản sao lưu tức thì/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Tạo bản sao lưu tức thì/i));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/system-management/backup');
    });
  });

  it('SM-04: triggers audit log cleanup when clicking cleanup button and confirming', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((config: any) => {
      config.onOk?.();
      return {} as any;
    });

    render(<SystemManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Thực hiện dọn dẹp/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Thực hiện dọn dẹp/i));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('/audit-trail/cleanup?months=6'));
    });
  });

  it('SM-05: switches to Security Config tab and displays security settings', async () => {
    render(<SystemManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Bảo mật & Tuân thủ/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Bảo mật & Tuân thủ/i));

    await waitFor(() => {
      expect(screen.getByText(/PCI DSS v4.0 Compliance/i)).toBeDefined();
      expect(screen.getByText('Độ dài mật khẩu tối thiểu')).toBeDefined();
    });
  });

  it('SM-06: switches to Dynamic Custom Fields tab and displays subcomponent', async () => {
    render(<SystemManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Trường Dữ liệu Động/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Trường Dữ liệu Động/i));

    await waitFor(() => {
      expect(screen.getByTestId('custom-field-config')).toBeDefined();
    });
  });
});
