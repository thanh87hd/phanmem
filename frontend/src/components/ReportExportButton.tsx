import React, { useState } from 'react';
import { Button, Dropdown, Space, message, Tooltip } from 'antd';
import {
  FileWordOutlined,
  FileExcelOutlined,
  DownOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import api from '../services/api';

interface ReportExportButtonProps {
  /** ID of the audit report or minute or engagement or plan */
  recordId: number;
  /** The entity type to export */
  entityType: 'report' | 'minute' | 'sample' | 'plan';
  /** For reports: MB01B | MB02B. For plans: MB01A | MB02A. For minutes: MB04_TD | MB04_PTD | MB04_PGDBD | MB04_MERGED */
  defaultTemplateType?: string;
  /** Show Excel export option (for PTD/PGDBĐ with large tables) */
  showExcelOption?: boolean;
  /** Extra label for the button */
  label?: string;
  /** Additional query params */
  operationType?: string;
  /** engagement ID for sample exports */
  engagementId?: number;
}

const PLAN_TEMPLATES: Record<string, string> = {
  MB01A: 'Kế hoạch kiểm toán Đơn vị kinh doanh (MB01A)',
  MB02A: 'Kế hoạch kiểm toán Bưu điện tỉnh / PGDBĐ (MB02A)',
  MB03A: 'Kế hoạch kiểm toán Hội sở chính / Chuyên đề (MB03A)',
};

const REPORT_TEMPLATES: Record<string, string> = {
  MB01B: 'Báo cáo kiểm toán Đơn vị kinh doanh (MB01B)',
  MB02B: 'Báo cáo kiểm toán Bưu điện tỉnh / PGDBĐ (MB02B)',
  MB03B: 'Báo cáo kiểm toán Hội sở chính / Chuyên đề (MB03B)',
};

const MINUTE_TEMPLATES: Record<string, string> = {
  MB04_CHI_TIET: 'Biên bản kiểm toán chi tiết (MB04 Chi tiết)',
  MB04_TONG_HOP: 'Biên bản tổng hợp & Họp Exit Meeting (MB04)',
  MB04_TD: 'Biên bản Tín dụng (MB04 TD)',
  MB04_PTD: 'Biên bản Phi tín dụng (MB04 PTD)',
  MB04_PGDBD: 'Biên bản PGDBĐ / TKBĐ (MB04 PGDBĐ)',
  MB04_MERGED: 'Biên bản Hợp nhất Toàn diện (MB04)',
};

const SAMPLE_TYPES: Record<string, string> = {
  TD: 'Bảng kê Tín dụng',
  PTD: 'Bảng kê Phi tín dụng',
  'TKBĐ': 'Bảng kê Tiết kiệm Bưu điện',
  '': 'Bảng kê Toàn bộ',
};

const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  recordId,
  entityType,
  defaultTemplateType,
  showExcelOption = false,
  label,
  operationType,
  engagementId,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExportWord = async (templateType: string) => {
    const templates =
      entityType === 'plan'
        ? PLAN_TEMPLATES
        : entityType === 'report'
        ? REPORT_TEMPLATES
        : MINUTE_TEMPLATES;
    const typeName = templates[templateType] || templateType;
    message.loading({
      content: `Đang kết xuất ${typeName}...`,
      key: 'report_export',
    });
    setLoading(true);

    try {
      let url = '';
      if (entityType === 'plan') {
        url = `/audit-engagements/${recordId}/export/plan-word?type=${templateType}`;
      } else if (entityType === 'report') {
        url = `/audit-reports/${recordId}/export/word?type=${templateType}`;
      } else if (entityType === 'minute') {
        url = `/audit-minutes/${recordId}/export/word?type=${templateType}`;
      }

      const res = await api.get(url, { responseType: 'blob', timeout: 60000 });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const prefix =
        entityType === 'plan' ? 'KHKT' : entityType === 'report' ? 'BCKT' : 'BBKT';
      link.setAttribute('download', `${prefix}_${templateType}_${recordId}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      message.success({
        content: `Xuất file ${typeName} thành công!`,
        key: 'report_export',
      });
    } catch (error) {
      message.error({
        content: 'Lỗi khi xuất file Word. Vui lòng thử lại.',
        key: 'report_export',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async (opType?: string) => {
    const typeName = SAMPLE_TYPES[opType || ''] || 'Bảng kê mẫu';
    message.loading({
      content: `Đang kết xuất Excel ${typeName} (hỗ trợ > 1.000 dòng)...`,
      key: 'excel_export',
    });
    setLoading(true);

    try {
      const engId = engagementId || recordId;
      const queryType = opType ? `?operationType=${opType}` : '';
      const url = `/audit-samples/export/excel/${engId}${queryType}`;

      const res = await api.get(url, { responseType: 'blob', timeout: 120000 });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const typePrefix = opType ? `${opType}_` : '';
      link.setAttribute('download', `Bang_ke_mau_${typePrefix}${engId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      message.success({
        content: `Xuất file Excel ${typeName} thành công! Sẵn sàng chạy hàm đối soát.`,
        key: 'excel_export',
      });
    } catch (error) {
      message.error({
        content: 'Lỗi khi xuất file Excel. Vui lòng thử lại.',
        key: 'excel_export',
      });
    } finally {
      setLoading(false);
    }
  };

  // Build dropdown menu items
  const getWordMenuItems = () => {
    const templates =
      entityType === 'plan'
        ? PLAN_TEMPLATES
        : entityType === 'report'
        ? REPORT_TEMPLATES
        : MINUTE_TEMPLATES;
    return Object.entries(templates).map(([key, label]) => ({
      key: `word_${key}`,
      icon: <FileWordOutlined style={{ color: '#2B579A' }} />,
      label: `📄 ${label}`,
      onClick: () => handleExportWord(key),
    }));
  };

  const getExcelMenuItems = () => {
    return Object.entries(SAMPLE_TYPES).map(([key, label]) => ({
      key: `excel_${key || 'all'}`,
      icon: <FileExcelOutlined style={{ color: '#217346' }} />,
      label: `📊 ${label}`,
      onClick: () => handleExportExcel(key || undefined),
    }));
  };

  const menuItems = [
    {
      key: 'word_group',
      type: 'group' as const,
      label: '📄 Xuất Word (.docx)',
      children: getWordMenuItems(),
    },
    ...(showExcelOption
      ? [
          { type: 'divider' as const, key: 'divider' },
          {
            key: 'excel_group',
            type: 'group' as const,
            label: '📊 Xuất Excel (.xlsx) - Đối soát ĐVKD',
            children: getExcelMenuItems(),
          },
        ]
      : []),
  ];

  // Single button mode (when defaultTemplateType is provided)
  if (defaultTemplateType && !showExcelOption) {
    return (
      <Tooltip title={`Xuất file Word ${defaultTemplateType}`}>
        <Button
          type="primary"
          icon={<FileWordOutlined />}
          loading={loading}
          onClick={() => handleExportWord(defaultTemplateType)}
          style={{
            background: 'linear-gradient(135deg, #2B579A 0%, #4472C4 100%)',
            borderColor: '#2B579A',
          }}
        >
          {label || `Xuất ${defaultTemplateType}`}
        </Button>
      </Tooltip>
    );
  }

  // Dropdown mode
  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button
        type="primary"
        loading={loading}
        icon={<DownloadOutlined />}
        style={{
          background: 'linear-gradient(135deg, #1F4E79 0%, #2B579A 50%, #217346 100%)',
          borderColor: '#1F4E79',
        }}
      >
        <Space>
          {label || 'Kết xuất Biên bản / Báo cáo'}
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
};

export default ReportExportButton;
