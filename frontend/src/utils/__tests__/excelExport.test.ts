import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToExcel, filterRecursive } from '../excelExport';
import api from '../../services/api';
import { message } from 'antd';

vi.mock('antd', () => ({
  message: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('excelExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToExcel', () => {
    it('shows warning when data array is empty', async () => {
      await exportToExcel([], [{ title: 'Name', dataIndex: 'name' }], 'empty_export');
      expect(message.warning).toHaveBeenCalledWith('Không có dữ liệu để xuất Excel');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('transforms columns and sends payload to /import/export-template', async () => {
      const mockBlob = new Blob(['mock binary data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockBlob });

      // Mock URL methods and Anchor click
      const originalCreateObjectURL = window.URL.createObjectURL;
      const originalRevokeObjectURL = window.URL.revokeObjectURL;
      const originalClick = HTMLAnchorElement.prototype.click;
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-uuid');
      window.URL.revokeObjectURL = vi.fn();
      HTMLAnchorElement.prototype.click = vi.fn();

      const testData = [
        { id: 1, name: 'Sample A', role: { name: 'Admin' } },
        { id: 2, name: 'Sample B', role: { name: 'Auditor' } },
      ];

      const columns = [
        { title: 'Mã', dataIndex: 'id' },
        { title: 'Tên mẫu', dataIndex: 'name' },
        { title: 'Vai trò', dataIndex: 'role.name' },
        { title: 'Thao tác', dataIndex: 'action' }, // Should be excluded
      ];

      await exportToExcel(testData, columns, 'test_export', 'DanhSach');

      expect(api.post).toHaveBeenCalledWith(
        '/import/export-template',
        {
          templateData: [
            { 'Mã': 1, 'Tên mẫu': 'Sample A', 'Vai trò': 'Admin' },
            { 'Mã': 2, 'Tên mẫu': 'Sample B', 'Vai trò': 'Auditor' },
          ],
          sheetName: 'DanhSach',
          fileName: 'test_export',
        },
        { responseType: 'blob' }
      );

      // Restore
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
    });
  });

  describe('filterRecursive', () => {
    it('matches exact and accented Vietnamese search keywords recursively', () => {
      const record = {
        title: 'Báo cáo kiểm toán Quý 1',
        dept: 'Phòng Kiểm toán Nội bộ',
        code: 'KTNB-01',
      };

      expect(filterRecursive(record, 'Báo cáo')).toBe(true);
      expect(filterRecursive(record, 'bao cao')).toBe(true); // Unaccented matching
      expect(filterRecursive(record, 'KTNB')).toBe(true);
      expect(filterRecursive(record, 'KhongTonTai')).toBe(false);
    });
  });
});
