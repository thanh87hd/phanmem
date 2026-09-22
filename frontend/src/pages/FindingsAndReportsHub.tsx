import React, { Suspense, lazy, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Card } from 'antd';
import type { TabsProps } from 'antd';
import { 
  BugOutlined, 
  FilePdfOutlined, 
  SendOutlined, 
  FundOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import HubHeaderBanner from '../components/HubHeaderBanner';
import HubTabLoading from '../components/HubTabLoading';

// Lazy-load sub-components
const AuditFindings = lazy(() => import('./AuditFindings'));
const FindingsAnalytics = lazy(() => import('./FindingsAnalytics'));
const AuditReports = lazy(() => import('./AuditReports'));
const AuditRatingView = lazy(() => import('./AuditRatingView').then(m => ({ default: m.AuditRatingView })));
const Recommendations = lazy(() => import('./Recommendations'));

export const FindingsAndReportsHub: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Đọc tab & subTab trực tiếp từ searchParams (hỗ trợ deep-link hai chiều)
  const currentTab = searchParams.get('tab') || 'findings';
  const currentSubTab = searchParams.get('subTab') || 'sub1';

  const handleTabChange = useCallback((key: string) => {
    setSearchParams({ tab: key, subTab: 'sub1' }, { replace: false });
  }, [setSearchParams]);

  const handleSubTabChange = useCallback((subKey: string) => {
    setSearchParams({ tab: currentTab, subTab: subKey }, { replace: false });
  }, [setSearchParams, currentTab]);

  const tabItems: TabsProps['items'] = useMemo(() => [
    {
      key: 'findings',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <BugOutlined />
          {t('menu.auditFindings', '1. Phát hiện 5C & Thống kê')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'findings' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><BugOutlined /> {t('menu.auditFindings', 'Danh mục Phát hiện Kiểm toán (5C)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <AuditFindings />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><FundOutlined /> {t('menu.auditFindingsAnalytics', 'Phân tích & Thống kê Phát hiện')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <FindingsAnalytics />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'reports',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <FilePdfOutlined />
          {t('menu.auditReports', '2. Báo cáo KT & Xếp hạng KSNB')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'reports' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><FilePdfOutlined /> {t('menu.auditReports', 'Báo cáo Kiểm toán Chính thức')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <AuditReports />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><CheckCircleOutlined /> {t('menu.auditRatings', 'Bảng điểm & Xếp hạng KSNB (A/B/C/D)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <AuditRatingView />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'recommendations',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <SendOutlined />
          {t('menu.recommendations', '3. Khắc phục Kiến nghị & SLA')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Suspense fallback={<HubTabLoading />}>
            <Recommendations />
          </Suspense>
        </Card>
      ),
    },
  ], [currentTab, currentSubTab, handleSubTabChange, t]);

  return (
    <div style={{ padding: '0 8px' }}>
      <HubHeaderBanner
        title={t('menu.groupReport', 'TRUNG TÂM PHÁT HIỆN, BÁO CÁO & THEO DÕI KHẮC PHỤC')}
        tagText="CHUẨN MỰC 5C & SLA"
        tagColor="#10b981"
        description="Hợp nhất quản lý Phát hiện Kiểm toán 5C toàn hàng, Soạn thảo và Ký duyệt Báo cáo chính thức, Giám sát tiến độ Khắc phục Kiến nghị"
      />

      <Tabs
        activeKey={currentTab}
        onChange={handleTabChange}
        type="card"
        size="large"
        items={tabItems}
      />
    </div>
  );
};

export default FindingsAndReportsHub;
