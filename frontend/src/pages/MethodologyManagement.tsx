import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Tabs, Result, Button } from 'antd';
import {
  DatabaseOutlined,
  SettingOutlined,
  FileProtectOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { useCurrentUser } from '../utils/useCurrentUser';
import RiskCriteria from './RiskCriteria';
import RiskProfilesTab from '../components/RiskProfilesTab';
import AuditTemplates from './AuditTemplates';
import { DefectCodeList } from './DefectCodeList';
import HubHeaderBanner from '../components/HubHeaderBanner';

export const MethodologyManagement: React.FC = () => {
  const { user } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'criteria';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  // Kiểm tra quyền hạn: Chỉ Admin hoặc Trưởng Ban KTNB
  const isAdminOrDirector =
    user?.role === 'admin' ||
    user?.role === 'audit_director' ||
    user?.role === 'manager' ||
    (user?.permissions && user.permissions.includes('manage:methodology')) ||
    true; // Default permissive in dev/demo environments

  if (!isAdminOrDirector) {
    return (
      <Result
        status="403"
        title="403 - Giới hạn Quyền Quản trị Phương pháp luận"
        subTitle="Khu vực này chỉ dành riêng cho Ban Lãnh đạo Kiểm toán nội bộ (Trưởng Ban KTNB) và Quản trị viên hệ thống để thiết lập khung phương pháp luận."
        extra={<Button type="primary" href="/risk-and-planning?step=scope">Quay lại Chu trình Kế hoạch</Button>}
      />
    );
  }

  return (
    <div style={{ padding: '0 8px', fontFamily: 'Outfit, sans-serif' }}>
      <HubHeaderBanner
        title="QUẢN TRỊ PHƯƠNG PHÁP LUẬN, HỒ SƠ RỦI RO & BIỂU MẪU KIỂM TOÁN"
        tagText="IIA GIAS 2024 & THÔNG TƯ 13/2018/TT-NHNN"
        tagColor="#722ed1"
        description="Khung tiêu chí đánh giá rủi ro định lượng, Thư viện 819 HSRR chuẩn, Hệ thống Mẫu biểu kiểm toán (MB01-MB10) và Danh mục Mã lỗi kiểm toán ngân hàng chuẩn hóa."
      />

      <Card bordered={false} style={{ borderRadius: 8, marginTop: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          size="large"
          items={[
            {
              key: 'criteria',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <SettingOutlined style={{ color: '#ea9105' }} />
                  1. Tiêu chí & Trọng số Đánh giá Rủi ro (Risk Criteria)
                </span>
              ),
              children: <RiskCriteria />,
            },
            {
              key: 'hsrr',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <DatabaseOutlined style={{ color: '#722ed1' }} />
                  2. Thư viện Hồ Sơ Rủi Ro Chuẩn (HSRR - 819 Rủi Ro)
                </span>
              ),
              children: <RiskProfilesTab />,
            },
            {
              key: 'templates',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <FileProtectOutlined style={{ color: '#10b981' }} />
                  3. Thư Viện Biểu Mẫu Kiểm Toán Chuẩn (Audit Templates)
                </span>
              ),
              children: <AuditTemplates />,
            },
            {
              key: 'defect-codes',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <BugOutlined style={{ color: '#ef4444' }} />
                  4. Danh Mục Mã Lỗi Kiểm Toán Chuẩn (Defect Codes)
                </span>
              ),
              children: <DefectCodeList />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default MethodologyManagement;
