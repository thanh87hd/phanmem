import React, { Suspense, lazy, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Card } from 'antd';
import type { TabsProps } from 'antd';
import { 
  AppstoreOutlined, 
  SafetyCertificateOutlined, 
  CalculatorOutlined, 
  CalendarOutlined,
  ApartmentOutlined,
  RadarChartOutlined,
  AuditOutlined,
  TeamOutlined
} from '@ant-design/icons';
import HubHeaderBanner from '../components/HubHeaderBanner';
import HubTabLoading from '../components/HubTabLoading';

// Lazy-load sub-components
const AuditUniverse = lazy(() => import('./AuditUniverse'));
const Departments = lazy(() => import('./Departments'));
const RiskControlMatrix = lazy(() => import('./RiskControlMatrix'));
const RiskRegister = lazy(() => import('./RiskRegister'));
const RiskAssessment = lazy(() => import('./RiskAssessment'));
const ScenarioRiskMap = lazy(() => import('./ScenarioRiskMap').then(m => ({ default: m.ScenarioRiskMap })));
const AuditPlan = lazy(() => import('./AuditPlan'));
const ResourceCapacityView = lazy(() => import('./ResourceCapacityView').then(m => ({ default: m.ResourceCapacityView })));

export const RiskAndPlanningHub: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Đọc tab & subTab trực tiếp từ searchParams (hỗ trợ deep-link hai chiều)
  const currentTab = searchParams.get('tab') || 'universe';
  const currentSubTab = searchParams.get('subTab') || 'sub1';

  const handleTabChange = useCallback((key: string) => {
    // Reset subTab về sub1 khi đổi tab chính
    setSearchParams({ tab: key, subTab: 'sub1' }, { replace: false });
  }, [setSearchParams]);

  const handleSubTabChange = useCallback((subKey: string) => {
    setSearchParams({ tab: currentTab, subTab: subKey }, { replace: false });
  }, [setSearchParams, currentTab]);

  const tabItems: TabsProps['items'] = useMemo(() => [
    {
      key: 'universe',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <AppstoreOutlined />
          {t('menu.auditUniverse', '1. Vũ trụ KT & Đơn vị')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'universe' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><AppstoreOutlined /> {t('menu.auditUniverse', 'Vũ trụ Đối tượng Kiểm toán')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <AuditUniverse />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><ApartmentOutlined /> {t('menu.departments', 'Cơ cấu Tổ chức & Chi nhánh')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <Departments />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'rcm',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <SafetyCertificateOutlined />
          {t('menu.riskControlMatrix', '2. Thư viện RCM & Sổ Rủi ro')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'rcm' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><SafetyCertificateOutlined /> {t('menu.riskControlMatrix', 'Ma trận Rủi ro & Kiểm soát (RCM)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <RiskControlMatrix />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><AuditOutlined /> {t('menu.riskRegister', 'Sổ Đăng ký Rủi ro (Risk Register)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <RiskRegister />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'assessment',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <CalculatorOutlined />
          {t('menu.riskAssessment', '3. Đánh giá Rủi ro & Heatmap')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'assessment' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><CalculatorOutlined /> {t('menu.riskAssessment', 'Đánh giá Rủi ro Định lượng')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <RiskAssessment />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><RadarChartOutlined /> {t('menu.scenarioRiskMap', 'Bản đồ Rủi ro Kịch bản (Heatmap)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <ScenarioRiskMap />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'plan',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <CalendarOutlined />
          {t('menu.auditPlan', '4. Kế hoạch Năm (AAP) & Nguồn lực')}
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={currentTab === 'plan' ? currentSubTab : 'sub1'}
            onChange={handleSubTabChange}
            items={[
              {
                key: 'sub1',
                label: <span><CalendarOutlined /> {t('menu.auditPlan', 'Kế hoạch Kiểm toán Năm (AAP)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <AuditPlan />
                  </Suspense>
                ),
              },
              {
                key: 'sub2',
                label: <span><TeamOutlined /> {t('menu.resourceCapacity', 'Cung - Cầu Định biên Nguồn lực (208 Man-days)')}</span>,
                children: (
                  <Suspense fallback={<HubTabLoading />}>
                    <ResourceCapacityView />
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
        title={t('menu.groupPlan', 'TRUNG TÂM QUẢN TRỊ RỦI RO & KẾ HOẠCH NĂM')}
        tagText="IIA STANDARD 2010 & TT 13"
        tagColor="#d97706"
        description="Hợp nhất quản lý Vũ trụ Kiểm toán, Thư viện RCM, Đánh giá Rủi ro định lượng và Kế hoạch Kiểm toán Năm (AAP)"
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

export default RiskAndPlanningHub;
