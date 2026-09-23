import React, { Suspense, lazy, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Card, Alert, Button } from 'antd';
import type { TabsProps } from 'antd';
import {
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  RadarChartOutlined,
  AuditOutlined,
  TeamOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import HubHeaderBanner from '../components/HubHeaderBanner';
import HubTabLoading from '../components/HubTabLoading';

// Lazy-load sub-components
const AuditUniverse = lazy(() => import('./AuditUniverse'));
const Departments = lazy(() => import('./Departments'));
const RiskControlMatrix = lazy(() => import('./RiskControlMatrix'));
const RiskProfilesTab = lazy(() => import('../components/RiskProfilesTab'));
const RiskRegister = lazy(() => import('./RiskRegister'));
const RiskAssessment = lazy(() => import('./RiskAssessment'));
const ScenarioRiskMap = lazy(() => import('./ScenarioRiskMap'));
const AuditPlan = lazy(() => import('./AuditPlan'));
const ResourceCapacityView = lazy(() =>
  import('./ResourceCapacityView').then((m) => ({ default: m.ResourceCapacityView }))
);

type HubStep = 'scope' | 'library' | 'prioritization' | 'plan';

export const RiskAndPlanningHub: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Đọc step & view từ searchParams, hỗ trợ backwards-compatibility với legacy tab/subTab
  const legacyTab = searchParams.get('tab');
  const legacySubTab = searchParams.get('subTab');

  const currentStep: HubStep = useMemo(() => {
    const s = searchParams.get('step');
    if (s === 'scope' || s === 'library' || s === 'prioritization' || s === 'plan') {
      return s;
    }
    // Backward compatibility with old tab query
    if (legacyTab === 'universe') return 'scope';
    if (legacyTab === 'rcm') return legacySubTab === 'sub2' ? 'prioritization' : 'library';
    if (legacyTab === 'assessment') return 'prioritization';
    if (legacyTab === 'plan') return 'plan';
    return 'scope';
  }, [searchParams, legacyTab, legacySubTab]);

  const currentView = useMemo(() => {
    const v = searchParams.get('view');
    if (v) return v;

    // Fallbacks based on legacy query
    if (legacyTab === 'universe' && legacySubTab === 'sub2') return 'departments';
    if (legacyTab === 'rcm' && legacySubTab === 'sub2') return 'register';
    if (legacyTab === 'assessment' && legacySubTab === 'sub2') return 'heatmap';
    if (legacyTab === 'plan' && legacySubTab === 'sub2') return 'capacity';

    // Default view per step
    switch (currentStep) {
      case 'scope':
        return 'universe';
      case 'library':
        return 'rcm';
      case 'prioritization':
        return 'assessment';
      case 'plan':
        return 'plan';
      default:
        return 'universe';
    }
  }, [searchParams, legacyTab, legacySubTab, currentStep]);

  const handleStepChange = useCallback(
    (stepKey: string) => {
      let defaultView = 'universe';
      if (stepKey === 'library') defaultView = 'rcm';
      if (stepKey === 'prioritization') defaultView = 'assessment';
      if (stepKey === 'plan') defaultView = 'plan';

      setSearchParams({ step: stepKey, view: defaultView }, { replace: false });
    },
    [setSearchParams]
  );

  const handleViewChange = useCallback(
    (viewKey: string) => {
      setSearchParams({ step: currentStep, view: viewKey }, { replace: false });
    },
    [setSearchParams, currentStep]
  );

  const tabItems: TabsProps['items'] = useMemo(
    () => [
      {
        key: 'scope',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <AppstoreOutlined />
            {t('menu.hubScope', '1. Phạm vi kiểm toán')}
          </span>
        ),
        children: (
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Tabs
              activeKey={currentView === 'departments' ? 'departments' : 'universe'}
              onChange={handleViewChange}
              items={[
                {
                  key: 'universe',
                  label: (
                    <span>
                      <AppstoreOutlined /> {t('menu.auditUniverse', 'Vũ trụ Đối tượng Kiểm toán (Audit Universe)')}
                    </span>
                  ),
                  children: (
                    <Suspense fallback={<HubTabLoading />}>
                      <AuditUniverse />
                    </Suspense>
                  ),
                },
                {
                  key: 'departments',
                  label: (
                    <span>
                      <ApartmentOutlined /> {t('menu.departments', 'Cơ cấu Tổ chức & Chi nhánh')}
                    </span>
                  ),
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
        key: 'library',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <SafetyCertificateOutlined />
            {t('menu.hubLibrary', '2. Thư viện rủi ro & kiểm soát')}
          </span>
        ),
        children: (
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Tabs
              activeKey={currentView === 'profile-ref' ? 'profile-ref' : 'rcm'}
              onChange={handleViewChange}
              items={[
                {
                  key: 'rcm',
                  label: (
                    <span>
                      <SafetyCertificateOutlined /> {t('menu.riskControlMatrix', 'Ma trận Rủi ro & Kiểm soát (RCM)')}
                    </span>
                  ),
                  children: (
                    <Suspense fallback={<HubTabLoading />}>
                      <RiskControlMatrix />
                    </Suspense>
                  ),
                },
                {
                  key: 'profile-ref',
                  label: (
                    <span>
                      <DatabaseOutlined /> {t('menu.riskProfileRef', 'Tra cứu Hồ sơ Rủi ro Chuẩn (HSRR - 819 Rủi ro)')}
                    </span>
                  ),
                  children: (
                    <div>
                      <Alert
                        message="Thư viện Hồ sơ Rủi ro Chuẩn (Tra cứu tham chiếu)"
                        description={
                          <div>
                            Các rủi ro và mục tiêu kiểm soát chuẩn được cập nhật và phê duyệt tập trung tại mục Quản trị Phương pháp luận.
                            <Button
                              type="link"
                              size="small"
                              href="/methodology"
                              style={{ paddingLeft: 8, fontWeight: 600 }}
                            >
                              Mở Quản trị Phương pháp luận (/methodology) →
                            </Button>
                          </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 16, borderRadius: 8 }}
                      />
                      <Suspense fallback={<HubTabLoading />}>
                        <RiskProfilesTab />
                      </Suspense>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ),
      },
      {
        key: 'prioritization',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <CalculatorOutlined />
            {t('menu.hubPrioritization', '3. Đánh giá & ưu tiên')}
          </span>
        ),
        children: (
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Tabs
              activeKey={
                currentView === 'register'
                  ? 'register'
                  : currentView === 'heatmap'
                  ? 'heatmap'
                  : 'assessment'
              }
              onChange={handleViewChange}
              items={[
                {
                  key: 'assessment',
                  label: (
                    <span>
                      <CalculatorOutlined /> {t('menu.riskAssessment', 'Đánh giá Rủi ro Phục vụ Kế hoạch KTNB')}
                    </span>
                  ),
                  children: (
                    <Suspense fallback={<HubTabLoading />}>
                      <RiskAssessment />
                    </Suspense>
                  ),
                },
                {
                  key: 'register',
                  label: (
                    <span>
                      <AuditOutlined /> {t('menu.riskRegister', 'Sổ Đăng ký Rủi ro RBIA (Risk Register)')}
                    </span>
                  ),
                  children: (
                    <Suspense fallback={<HubTabLoading />}>
                      <RiskRegister />
                    </Suspense>
                  ),
                },
                {
                  key: 'heatmap',
                  label: (
                    <span>
                      <RadarChartOutlined /> {t('menu.scenarioRiskMap', 'Bản đồ Rủi ro Kịch bản (Heatmap & Stress)')}
                    </span>
                  ),
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <CalendarOutlined />
            {t('menu.hubPlan', '4. Kế hoạch & nguồn lực')}
          </span>
        ),
        children: (
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Tabs
              activeKey={currentView === 'capacity' ? 'capacity' : 'plan'}
              onChange={handleViewChange}
              items={[
                {
                  key: 'plan',
                  label: (
                    <span>
                      <CalendarOutlined /> {t('menu.auditPlan', 'Kế hoạch Kiểm toán Năm (AAP)')}
                    </span>
                  ),
                  children: (
                    <Suspense fallback={<HubTabLoading />}>
                      <AuditPlan />
                    </Suspense>
                  ),
                },
                {
                  key: 'capacity',
                  label: (
                    <span>
                      <TeamOutlined /> {t('menu.resourceCapacity', 'Cung - Cầu Định biên Nguồn lực (208 Man-days)')}
                    </span>
                  ),
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
    ],
    [currentView, handleViewChange, t]
  );

  return (
    <div style={{ padding: '0 8px' }}>
      <HubHeaderBanner
        title={t('menu.groupPlan', 'CHU TRÌNH LẬP KẾ HOẠCH KIỂM TOÁN DỰA TRÊN RỦI RO (RBIA)')}
        tagText="IIA GIAS 2024 & TT 13"
        tagColor="#d97706"
        description="Quy trình lập kế hoạch kiểm toán nội bộ dựa trên rủi ro dành riêng cho Tuyến 3 (KTNB). Tín hiệu rủi ro Tuyến 1, Tuyến 2 (KRI, RCSA), CAATs và phát hiện kỳ trước là dữ liệu đầu vào chỉ-đọc."
      />

      <Tabs
        activeKey={currentStep}
        onChange={handleStepChange}
        type="card"
        size="large"
        items={tabItems}
      />
    </div>
  );
};

export default RiskAndPlanningHub;
