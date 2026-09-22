import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import MainLayout from './layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import ErrorBoundary from './components/ErrorBoundary';

// Loading fallback component
const PageLoadingFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '60vh',
      width: '100%',
    }}>
      <Spin size="large" tip={t('common.loading', 'Đang tải trang...')} />
    </div>
  );
};

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Departments = lazy(() => import('./pages/Departments'));
const AuditUniverse = lazy(() => import('./pages/AuditUniverse'));
const RiskCriteria = lazy(() => import('./pages/RiskCriteria'));
const RiskAssessment = lazy(() => import('./pages/RiskAssessment'));
const AuditPlan = lazy(() => import('./pages/AuditPlan'));
const WorkingPapers = lazy(() => import('./pages/WorkingPapers'));
const AuditPrograms = lazy(() => import('./pages/AuditPrograms'));
const AuditFindings = lazy(() => import('./pages/AuditFindings'));
const AuditMinutesPage = lazy(() => import('./pages/AuditMinutesPage'));
const FindingsAnalytics = lazy(() => import('./pages/FindingsAnalytics'));
const AuditReports = lazy(() => import('./pages/AuditReports'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const QualityControl = lazy(() => import('./pages/QualityControl'));
const Personnel = lazy(() => import('./pages/Personnel'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const AuditEngagements = lazy(() => import('./pages/AuditEngagements'));
const TimesheetPage = lazy(() => import('./pages/Timesheet'));
const AuditTrailPage = lazy(() => import('./pages/AuditTrail'));
const AuditeePortal = lazy(() => import('./pages/AuditeePortal'));
const RiskControlMatrix = lazy(() => import('./pages/RiskControlMatrix'));
const RiskRegister = lazy(() => import('./pages/RiskRegister'));
const ThematicAnalysis = lazy(() => import('./pages/ThematicAnalysis'));
const TestOfControl = lazy(() => import('./pages/TestOfControl').then((m) => ({ default: m.TestOfControl })));
const AuditRatingView = lazy(() => import('./pages/AuditRatingView').then((m) => ({ default: m.AuditRatingView })));
const ScenarioRiskMap = lazy(() => import('./pages/ScenarioRiskMap').then((m) => ({ default: m.ScenarioRiskMap })));
const ResourceCapacityView = lazy(() => import('./pages/ResourceCapacityView').then((m) => ({ default: m.ResourceCapacityView })));
const RaciGovernanceView = lazy(() => import('./pages/RaciGovernanceView').then((m) => ({ default: m.RaciGovernanceView })));
const Evidences = lazy(() => import('./pages/Evidences'));
const AuditCommitteePortal = lazy(() => import('./pages/AuditCommitteePortal'));
const RegulatoryExams = lazy(() => import('./pages/RegulatoryExams'));
const AuditTemplates = lazy(() => import('./pages/AuditTemplates'));
const DataAnalytics = lazy(() => import('./pages/DataAnalytics'));
const IndependenceTracker = lazy(() => import('./pages/IndependenceTracker'));
const GeneralTasks = lazy(() => import('./pages/GeneralTasks'));
const AuditExpenses = lazy(() => import('./pages/AuditExpenses'));
const ResourceCalendar = lazy(() => import('./pages/ResourceCalendar'));
const TrainingCPE = lazy(() => import('./pages/TrainingCPE'));
const SummaryReports = lazy(() => import('./pages/SummaryReports'));
const ContinuousMonitoring = lazy(() => import('./pages/ContinuousMonitoring'));
const FindingKnowledgeBase = lazy(() => import('./pages/FindingKnowledgeBase'));
const RegulatoryKnowledgeBase = lazy(() => import('./pages/RegulatoryKnowledgeBase'));
const ProcessAnalysis = lazy(() => import('./pages/ProcessAnalysis'));
const KnowledgeExtraction = lazy(() => import('./pages/KnowledgeExtraction'));
const SystemManagement = lazy(() => import('./pages/SystemManagement'));
const PasswordChangeRequests = lazy(() => import('./pages/PasswordChangeRequests'));
const ExecutionDashboard = lazy(() => import('./pages/ExecutionDashboard'));
const AppStudio = lazy(() => import('./pages/AppStudio'));
const DynamicAppView = lazy(() => import('./pages/DynamicAppView'));
const WorkflowStudio = lazy(() => import('./pages/WorkflowStudio'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const IntegrationSettings = lazy(() => import('./pages/IntegrationSettings'));
const ExternalDatabaseConnections = lazy(() => import('./pages/ExternalDatabaseConnections'));
const InfrastructureMonitor = lazy(() => import('./pages/InfrastructureMonitor'));
const MasterDataGovernance = lazy(() => import('./pages/MasterDataGovernance'));
const UserGuide = lazy(() => import('./pages/UserGuide'));
const BscKpiPage = lazy(() => import('./pages/BscKpi'));
const DocumentManager = lazy(() => import('./pages/DocumentManager'));
const RiskAndPlanningHub = lazy(() => import('./pages/RiskAndPlanningHub'));
const FindingsAndReportsHub = lazy(() => import('./pages/FindingsAndReportsHub'));
const SystemSettingsHub = lazy(() => import('./pages/SystemSettingsHub'));

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  React.useEffect(() => {
    dayjs.locale(isEn ? 'en' : 'vi');
  }, [isEn]);

  return (
    <ConfigProvider
      locale={isEn ? enUS : viVN}
      theme={{
        token: {
          colorPrimary: '#f59e0b',
          colorPrimaryHover: '#d97706',
          colorPrimaryActive: '#b45309',
          colorLink: '#d97706',
          colorLinkHover: '#b45309',
          borderRadius: 8,
          colorBgBase: '#ffffff',
          colorBgLayout: '#faf8f5',
          colorTextBase: '#0f172a',
          colorTextSecondary: '#475569',
          colorBorder: '#fde68a',
          fontFamily: '"Outfit", "IBM Plex Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        components: {
          Table: {
            headerBg: '#fef9ee',
            headerColor: '#0f172a',
            headerSplitColor: '#fde68a',
            rowHoverBg: '#fffbeb',
            borderColor: '#fde68a',
            borderRadius: 10,
          },
          Card: {
            headerBg: '#ffffff',
            colorBorderSecondary: '#fef08a',
            borderRadiusLG: 14,
          },
          Button: {
            borderRadius: 8,
            controlHeight: 38,
            colorPrimary: '#f59e0b',
            colorPrimaryHover: '#d97706',
            colorPrimaryActive: '#b45309',
            primaryColor: '#ffffff',
            primaryShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
            fontWeight: 600,
            defaultColor: '#1e293b',
            defaultBorderColor: '#fde68a',
            defaultHoverColor: '#d97706',
            defaultHoverBorderColor: '#f59e0b',
            defaultHoverBg: '#fffbeb',
          },
          Input: {
            borderRadius: 8,
            controlHeight: 38,
            colorBorder: '#fde68a',
          },
          Select: {
            borderRadius: 8,
            controlHeight: 38,
            colorBorder: '#fde68a',
          },
          Tag: {
            borderRadius: 6,
          },
          Tabs: {
            itemSelectedColor: '#d97706',
            inkBarColor: '#f59e0b',
            itemHoverColor: '#b45309',
          },
        },
      }}
    >
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              
              {/* Routes for Everyone */}
              <Route path="user-guide" element={<UserGuide />} />
              <Route path="timesheet" element={<TimesheetPage />} />
              <Route path="auditee-portal" element={<AuditeePortal />} />
              <Route path="bsc-kpi" element={<BscKpiPage />} />
              <Route path="master-data-governance" element={<MasterDataGovernance />} />
   
              {/* ═══════════════════════════════════════════════════════════════
                  PHASE 4: 3 MEGA HUBS — ENTRY POINTS DUY NHẤT
                  ═══════════════════════════════════════════════════════════════ */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên']} />}>
                {/* ═══ Hub 1: Rủi Ro & Kế Hoạch Năm ═══ */}
                <Route path="risk-and-planning" element={<RiskAndPlanningHub />} />
                {/* ═══ Hub 2: Phát Hiện & Báo Cáo ═══ */}
                <Route path="findings-hub" element={<FindingsAndReportsHub />} />
                {/* ═══ Hub 3: Quản Trị Hệ Thống ═══ */}
                <Route path="system-admin" element={<SystemSettingsHub />} />

                {/* ═══════════════════════════════════════════════════════════════
                    COMPATIBILITY REDIRECTS — Bảo toàn bookmark & URL cũ (ADR-0011)
                    Nguyên tắc: Tuyệt đối không làm hỏng bookmark của KTV.
                    ═══════════════════════════════════════════════════════════════ */}

                {/* Hub 1 Redirects: Rủi Ro & Kế Hoạch */}
                <Route path="audit-universe" element={<Navigate to="/risk-and-planning?tab=universe&subTab=sub1" replace />} />
                <Route path="departments" element={<Navigate to="/risk-and-planning?tab=universe&subTab=sub2" replace />} />
                <Route path="risk-control-matrix" element={<Navigate to="/risk-and-planning?tab=rcm&subTab=sub1" replace />} />
                <Route path="risk-register" element={<Navigate to="/risk-and-planning?tab=rcm&subTab=sub2" replace />} />
                <Route path="thematic-analysis" element={<Navigate to="/risk-and-planning?tab=rcm&subTab=sub2" replace />} />
                <Route path="test-of-control" element={<Navigate to="/risk-and-planning?tab=rcm&subTab=sub1" replace />} />
                <Route path="risk-criteria" element={<Navigate to="/risk-and-planning?tab=assessment&subTab=sub1" replace />} />
                <Route path="risk-assessment" element={<Navigate to="/risk-and-planning?tab=assessment&subTab=sub1" replace />} />
                <Route path="scenario-risk-map" element={<Navigate to="/risk-and-planning?tab=assessment&subTab=sub2" replace />} />
                <Route path="audit-plan" element={<Navigate to="/risk-and-planning?tab=plan&subTab=sub1" replace />} />
                <Route path="resource-capacity" element={<Navigate to="/risk-and-planning?tab=plan&subTab=sub2" replace />} />

                {/* Hub 2 Redirects: Phát Hiện & Báo Cáo */}
                <Route path="audit-findings" element={<Navigate to="/findings-hub?tab=findings&subTab=sub1" replace />} />
                <Route path="audit-findings-analytics" element={<Navigate to="/findings-hub?tab=findings&subTab=sub2" replace />} />
                <Route path="audit-minutes" element={<Navigate to="/findings-hub?tab=findings&subTab=sub1" replace />} />
                <Route path="audit-reports" element={<Navigate to="/findings-hub?tab=reports&subTab=sub1" replace />} />
                <Route path="audit-ratings" element={<Navigate to="/findings-hub?tab=reports&subTab=sub2" replace />} />
                <Route path="recommendations" element={<Navigate to="/findings-hub?tab=recommendations" replace />} />

                {/* Dedicated Workspaces — Giữ nguyên, không redirect vào Hub */}
                <Route path="audit-engagements" element={<AuditEngagements />} />
                <Route path="continuous-monitoring" element={<ContinuousMonitoring />} />
                <Route path="execution-dashboard" element={<ExecutionDashboard />} />
                <Route path="audit-programs" element={<AuditPrograms />} />
                <Route path="working-papers" element={<WorkingPapers />} />
                <Route path="quality-control" element={<QualityControl />} />
                <Route path="evidences" element={<Evidences />} />
                <Route path="document-manager" element={<DocumentManager />} />
                <Route path="audit-templates" element={<AuditTemplates />} />
                <Route path="data-analytics" element={<DataAnalytics />} />
                <Route path="task-management" element={<TaskManagement />} />
                <Route path="general-tasks" element={<GeneralTasks />} />
                <Route path="resource-calendar" element={<ResourceCalendar />} />
                <Route path="summary-reports" element={<SummaryReports />} />
                <Route path="raci-governance" element={<RaciGovernanceView />} />
                <Route path="dynamic-app/:resourceName" element={<DynamicAppView />} />
              </Route>
   
              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Trưởng Ban KTNB', 'Ban Kiểm soát']} />}>
                <Route path="audit-committee" element={<AuditCommitteePortal />} />
                <Route path="regulatory-exams" element={<RegulatoryExams />} />
                <Route path="independence-tracker" element={<IndependenceTracker />} />
              </Route>
   
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Trưởng Ban KTNB']} />}>
                {/* Hub 3 Redirects: Quản Trị Hệ Thống (Admin-only paths) */}
                <Route path="roles" element={<Navigate to="/system-admin?tab=roles" replace />} />
                <Route path="personnel" element={<Navigate to="/system-admin?tab=personnel&subTab=sub1" replace />} />
                <Route path="audit-trail" element={<Navigate to="/system-admin?tab=audit-trail" replace />} />
                <Route path="system-management" element={<Navigate to="/system-admin?tab=config&subTab=sub1" replace />} />
                <Route path="integration-settings" element={<Navigate to="/system-admin?tab=config&subTab=sub2" replace />} />
                <Route path="external-database" element={<Navigate to="/system-admin?tab=config&subTab=sub2" replace />} />
                <Route path="active-directory" element={<Navigate to="/system-admin?tab=config&subTab=sub2" replace />} />
                <Route path="exchange-365" element={<Navigate to="/system-admin?tab=config&subTab=sub2" replace />} />
                <Route path="infrastructure-monitor" element={<Navigate to="/system-admin?tab=config&subTab=sub1" replace />} />
                <Route path="training-cpe" element={<Navigate to="/system-admin?tab=personnel&subTab=sub3" replace />} />
                <Route path="audit-expenses" element={<Navigate to="/system-admin?tab=personnel&subTab=sub4" replace />} />

                {/* Admin-only Dedicated Workspaces — Giữ nguyên */}
                <Route path="password-change-requests" element={<PasswordChangeRequests />} />
                <Route path="ai-knowledge" element={<FindingKnowledgeBase />} />
                <Route path="regulatory-kb" element={<RegulatoryKnowledgeBase />} />
                <Route path="process-analysis" element={<ProcessAnalysis />} />
                <Route path="knowledge-extraction" element={<KnowledgeExtraction />} />
                <Route path="app-studio" element={<AppStudio />} />
                <Route path="workflow-studio" element={<WorkflowStudio />} />
              </Route>
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
