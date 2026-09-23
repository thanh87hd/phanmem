import React, { Suspense, lazy, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Card } from 'antd';
import type { TabsProps } from 'antd';
import { 
  KeyOutlined, 
  TeamOutlined, 
  AuditOutlined, 
  SettingOutlined,
  FieldTimeOutlined,
  ReadOutlined,
  DollarOutlined,
  ApiOutlined
} from '@ant-design/icons';
import HubHeaderBanner from '../components/HubHeaderBanner';
import HubTabLoading from '../components/HubTabLoading';

// Lazy-load sub-components
const RolesPage = lazy(() => import('./RolesPage'));
const Personnel = lazy(() => import('./Personnel'));
const TimesheetPage = lazy(() => import('./Timesheet'));
const TrainingCPE = lazy(() => import('./TrainingCPE'));
const AuditExpenses = lazy(() => import('./AuditExpenses'));
const AuditTrailPage = lazy(() => import('./AuditTrail'));
const SystemManagement = lazy(() => import('./SystemManagement'));
const IntegrationSettings = lazy(() => import('./IntegrationSettings'));
const IndependenceTracker = lazy(() => import('./IndependenceTracker'));
const MasterDataGovernancePage = lazy(() => import('./MasterDataGovernance'));
const ExternalDatabaseConnections = lazy(() => import('./ExternalDatabaseConnections'));
const InfrastructureMonitor = lazy(() => import('./InfrastructureMonitor'));

export const SystemSettingsHub: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Đọc tab & subTab trực tiếp từ searchParams (hỗ trợ deep-link hai chiều)
  const currentTab = searchParams.get('tab') || 'roles';
  const currentSubTab = searchParams.get('subTab') || 'sub1';

  const handleTabChange = useCallback((key: string) => {
    setSearchParams({ tab: key, subTab: 'sub1' }, { replace: false });
  }, [setSearchParams]);

  const handleSubTabChange = useCallback((subKey: string) => {
    setSearchParams({ tab: currentTab, subTab: subKey }, { replace: false });
  }, [setSearchParams, currentTab]);

  const tabItems: TabsProps['items'] = useMemo(() => [
    {
      key: 'roles',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <KeyOutlined />
          {t('menu.roles', '1. Phân quyền & Vai trò (CASL)')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Suspense fallback={<HubTabLoading />}>
            <RolesPage />
          </Suspense>
        </Card>
      ),
    },
    {
      key: 'personnel',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <TeamOutlined />
          {t('menu.personnel', '2. Đội ngũ KTV & Nguồn lực')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'personnel' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><TeamOutlined /> {t('menu.personnel', 'Hồ sơ Nhân sự & KTV')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <Personnel />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><FieldTimeOutlined /> {t('menu.timesheet', 'Timesheet Giờ công')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <TimesheetPage />
                  </Suspense>
                ),
              },
              {
                key: 'sub3',
                label: <span><ReadOutlined /> {t('menu.trainingCPE', 'Đào tạo & Tích lũy CPE')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <TrainingCPE />
                  </Suspense>
                ),
              },
              {
                key: 'sub4',
                label: <span><DollarOutlined /> {t('menu.auditExpenses', 'Chi phí Kiểm toán')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <AuditExpenses />
                  </Suspense>
                ),
              },
              {
                key: 'sub5',
                label: <span><AuditOutlined /> {t('menu.independenceTracker', 'Giám sát Độc lập KTV (IIA 1100)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <IndependenceTracker />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'audit-trail',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <AuditOutlined />
          {t('menu.auditTrail', '3. Nhật ký Hệ thống (SHA-256)')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Suspense fallback={<HubTabLoading />}>
            <AuditTrailPage />
          </Suspense>
        </Card>
      ),
    },
    {
      key: 'config',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <SettingOutlined />
          {t('menu.systemManagement', '4. Tham số & Tích hợp')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'config' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><SettingOutlined /> {t('menu.systemManagement', 'Quản trị Tham số & Bảo trì')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <SystemManagement />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><ApiOutlined /> {t('menu.integrationSettings', 'Cấu hình Tích hợp (SSO/Core)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <IntegrationSettings />
                  </Suspense>
                ),
              },
              {
                key: 'sub3',
                label: <span><AuditOutlined /> {t('menu.masterData', 'Quản trị Dữ liệu Cốt lõi (Master Data)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <MasterDataGovernancePage />
                  </Suspense>
                ),
              },
              {
                key: 'sub4',
                label: <span><ApiOutlined /> {t('menu.externalDb', 'Kết nối CSDL Ngoài (Core/DWH)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <ExternalDatabaseConnections />
                  </Suspense>
                ),
              },
              {
                key: 'sub5',
                label: <span><SettingOutlined /> {t('menu.infraMonitor', 'Giám sát Hạ tầng & Tải (APM)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <InfrastructureMonitor />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
  ], [currentTab, currentSubTab, handleSubTabChange, t]);

  return (
    <div style={{ padding: '0 8px' }}>
      <HubHeaderBanner
        title={t('menu.groupAdmin', 'QUẢN TRỊ HỆ THỐNG & NGUỒN LỰC KIỂM TOÁN')}
        tagText="CASL RBAC & AUDIT TRAIL"
        tagColor="#6366f1"
        description="Quản trị Phân quyền 15 vai trò, Đội ngũ KTV, Timesheet, Chi phí & Đào tạo CPE, Lưu vết Nhật ký Kiểm toán bất biến SHA-256"
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

export default SystemSettingsHub;
