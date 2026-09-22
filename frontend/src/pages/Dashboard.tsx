import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Badge, Statistic, Typography, Progress, Spin, Tag, Table, Empty, Tabs, Popconfirm, Button, message, Modal, Input, Space, Result, Tooltip as AntTooltip, Divider, Select } from 'antd';
import { 
  ProjectOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  CloseCircleOutlined,
  FireOutlined,
  EyeOutlined,
  SettingOutlined,
  PieChartOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import api from '../services/api';
import AiriskMap from '../components/AiriskMap';
import { hasPermission } from '../utils/permission';
import { useDashboardConfig } from '../utils/useDashboardConfig';
import DashboardCustomizer from '../components/DashboardCustomizer';
import { SmartWidgetRenderer } from '../components/dashboard-widgets/WidgetRenderer';
import { useCurrentUser } from '../utils/useCurrentUser';
import { getUserScope } from '../utils/role-checker.util';
import ExecutiveGroupedDashboard from './components/ExecutiveGroupedDashboard';
import AuditWorkspaceHub from './components/AuditWorkspaceHub';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const COLORS_PIE = ['#52c41a', '#f59e0b', '#fbbf24', '#d97706'];

const getProgressColor = (score: number) => {
  if (score < 40) return '#ff4d4f'; // red (Hạng 5)
  if (score < 60) return '#fa8c16'; // orange (Hạng 4)
  if (score < 75) return '#faad14'; // yellow/gold (Hạng 3)
  if (score < 90) return '#a0d911'; // lime (Hạng 2)
  return '#52c41a'; // green (Hạng 1)
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const getLevelColor = (level: string) => {
    if (level.includes(t('riskAssessment.groupOverview.levels.1', 'Hạng 1'))) return 'success';
    if (level.includes(t('riskAssessment.groupOverview.levels.2', 'Hạng 2'))) return 'lime';
    if (level.includes(t('riskAssessment.groupOverview.levels.3', 'Hạng 3'))) return 'warning';
    if (level.includes(t('riskAssessment.groupOverview.levels.4', 'Hạng 4'))) return 'orange';
    if (level.includes(t('riskAssessment.groupOverview.levels.5', 'Hạng 5'))) return 'error';
    return 'default';
  };

  const [loading, setLoading] = useState(true);
  const [dataMap, setDataMap] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<string>('workspace');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const [selectedNeed, setSelectedNeed] = useState<string>('/audit-engagements');

  // Rejection modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Dynamic Reports states
  const [dynamicReports, setDynamicReports] = useState<any[]>([]);
  const [dynamicDataMap, setDynamicDataMap] = useState<Record<number, any[]>>({});

  const currentUser = useCurrentUser();
  const isApprover = currentUser?.role?.name === 'Admin' || currentUser?.role?.name === t('processAnalysis.reportLeaderSign', 'Trưởng Ban KTNB');
  const canViewDashboard = currentUser ? hasPermission(currentUser, 'view:dashboard') : false;

  // === Dashboard Customization ===
  const dashboardConfig = useDashboardConfig('home', activeTab);

  useEffect(() => {
    if (!canViewDashboard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      setLoading(true);
      try {
        const getQuery = (widgetId: string) => {
          const cfg = dashboardConfig.config.find(w => w.widgetId === widgetId);
          const dept = cfg?.settings?.department;
          const yr = cfg?.settings?.year;
          const params = new URLSearchParams();
          if (activeTab !== 'all') params.append('unitType', activeTab);
          if (dept) params.append('departmentId', dept);
          if (yr) params.append('year', yr);
          const qs = params.toString();
          return qs ? `?${qs}` : '';
        };

        const [
          kpiCardsRes, recCompletionRes, auditProgressRes, riskBarRes, 
          riskHeatmapRes, recByDeptRes, topHighRisksRes, 
          riskPendingReviewRes, ewsAlertsRes
        ] = await Promise.all([
          api.get(`/dashboard/stats${getQuery('kpi-cards')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/stats${getQuery('rec-completion')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/audit-progress${getQuery('audit-progress-pie')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/risk-distribution${getQuery('risk-bar-chart')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/risk-distribution${getQuery('risk-heatmap')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/recommendation-by-dept${getQuery('rec-by-dept')}`).catch(() => ({ data: [] })),
          api.get(`/dashboard/risk-widgets${getQuery('top-high-risks')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/risk-widgets${getQuery('risk-pending-review')}`).catch(() => ({ data: null })),
          api.get(`/dashboard/risk-widgets${getQuery('ews-alerts')}`).catch(() => ({ data: null })),
        ]);

        setDataMap({
          'kpi-cards': kpiCardsRes.data,
          'rec-completion': recCompletionRes.data,
          'audit-progress-pie': auditProgressRes.data,
          'risk-bar-chart': riskBarRes.data,
          'risk-heatmap': riskHeatmapRes.data,
          'rec-by-dept': Array.isArray(recByDeptRes.data) ? recByDeptRes.data : [],
          'top-high-risks': topHighRisksRes.data,
          'risk-pending-review': riskPendingReviewRes.data,
          'ews-alerts': ewsAlertsRes.data,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchDynamicReports = async () => {
      try {
        const res = await api.get('/reports/allowed');
        setDynamicReports(res.data || []);
        
        const dMap: Record<number, any[]> = {};
        await Promise.all((res.data || []).map(async (r: any) => {
          try {
            const dataRes = await api.get(`/reports/${r.id}/execute`);
            // Attempt to parse 'value' as number if needed
            const d = (dataRes.data || []).map((item: any) => ({
              ...item,
              value: parseFloat(item.value) || 0,
            }));
            dMap[r.id] = d;
          } catch(e) { console.error(e); }
        }));
        setDynamicDataMap(dMap);
      } catch(e) {
        console.error('Fetch dynamic reports error:', e);
      }
    };

    fetchAll();
    fetchDynamicReports();
  }, [activeTab, refreshTrigger, canViewDashboard, dashboardConfig.config]);

  const stats = dataMap['kpi-cards'];
  const pieData = dataMap['audit-progress-pie']?.chartData || [];
  const riskBarData = dataMap['risk-bar-chart']?.findingsByCategory || [];
  const riskAssessments = dataMap['risk-heatmap']?.assessments || [];
  const userScope = useMemo(() => getUserScope(currentUser), [currentUser]);
  const recByDept = dataMap['rec-by-dept'] || [];
  const riskWidgetsPR = dataMap['risk-pending-review'] || { pendingReviewCount: 0, pendingAssessments: [] };
  const riskWidgetsTHR = dataMap['top-high-risks'] || { topHighRisks: [] };
  const ewsAlerts = dataMap['ews-alerts'] || { assessments: [] };

  const handleApproveRisk = async (id: number) => {
    try {
      await api.patch(`/risk-assessments/${id}/approve`, {
        reviewedBy: currentUser?.id || 0,
        reviewedByName: currentUser?.fullName || currentUser?.username || 'Reviewer',
        reviewNotes: t('dashboard.approvalFromDashboard', 'Phê duyệt từ Dashboard'),
      });
      message.success('Đã phê duyệt đánh giá rủi ro');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditCommitteePortal.messages.approveError', 'Lỗi khi phê duyệt'));
    }
  };

  const handleOpenRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectModalOpen(true);
  };

  const handleRejectRisk = async () => {
    if (!rejectingId || !rejectReason) {
      message.warning(t('scoringTab.messages.rejectNoReason', 'Vui lòng nhập lý do từ chối'));
      return;
    }
    setSubmittingReject(true);
    try {
      await api.patch(`/risk-assessments/${rejectingId}/reject`, {
        reviewedBy: currentUser?.id || 0,
        reviewedByName: currentUser?.fullName || currentUser?.username || 'Reviewer',
        reviewNotes: rejectReason,
      });
      message.success('Đã từ chối đánh giá rủi ro');
      setRejectModalOpen(false);
      setRejectReason('');
      setRejectingId(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('processAnalysis.messages.rejectError', 'Lỗi khi từ chối'));
    } finally {
      setSubmittingReject(false);
    }
  };



  // === Widget Map: map widgetId → JSX ===
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const widgetMap: Record<string, React.ReactNode> = useMemo(() => ({
    'kpi-cards': (
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.auditPlans', 'Kế hoạch KT')} value={stats?.totalPlans || 0} prefix={<ProjectOutlined className="text-blue-500" />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.activeEngagements', 'Cuộc KT đang chạy')} value={stats?.activeEngagements || 0} valueStyle={{ color: '#ea9105' }} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.highRiskFindings', 'Phát hiện RR Cao')} value={stats?.highRiskFindings || 0} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.nd340Violations', 'Vi phạm NĐ340')} value={stats?.totalNd340Findings || 0} valueStyle={{ color: '#d4380d' }} prefix={<FireOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.fines', 'Mức phạt (Tr.Đồng)')} value={stats?.totalFineAmount || 0} valueStyle={{ color: '#d4380d' }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.fixedRecs', 'Kiến nghị khắc phục')} value={stats?.completedRecs || 0} suffix={`/ ${stats?.totalRecs || 0}`} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.overdueRecs', 'Kiến nghị Quá hạn')} value={stats?.overdueRecs || 0} valueStyle={{ color: '#fa8c16' }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={3}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic title={t('dashboard.stats.wpPendingReview', 'WP chờ duyệt')} value={stats?.wpPendingReview || 0} valueStyle={{ color: '#722ed1' }} prefix={<FileSearchOutlined />} />
          </Card>
        </Col>
      </Row>
    ),

    'airisk-map': <AiriskMap unitType={activeTab} />,

    'rec-completion': (
      <Card variant="borderless" className="shadow-sm" title={<span><AuditOutlined className="mr-2" />{t('dashboard.widgets.recCompletion', 'Tỷ lệ hoàn thành Kiến nghị tổng thể')}</span>}>
        <Progress percent={stats?.recCompletionRate || 0} status="active" strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} strokeWidth={20} format={pct => `${pct}%`} />
        <div className="flex gap-8 mt-3 text-sm text-gray-500">
          <span>{t('dashboard.stats.total', 'Tổng')}: <strong>{stats?.totalRecs || 0}</strong></span>
          <span style={{ color: '#52c41a' }}>{t('auditEngagements.statusLabels.Done', 'Hoàn thành')}: <strong>{stats?.completedRecs || 0}</strong></span>
          <span style={{ color: '#ea9105' }}>{t('executionDashboard.status.inProgress', 'Đang xử lý')}: <strong>{stats?.inProgressRecs || 0}</strong></span>
          <span style={{ color: '#fa8c16' }}>{t('dashboard.stats.overdue', 'Quá hạn')}: <strong>{stats?.overdueRecs || 0}</strong></span>
        </div>
      </Card>
    ),

    'audit-progress-pie': (
      <Card title={t('dashboard.widgets.auditProgress', 'Tiến độ Cuộc kiểm toán')} variant="borderless" className="shadow-sm" style={{ height: 420 }}>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={330}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color || COLORS_PIE[index % COLORS_PIE.length]} />))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (<Empty description={t('dashboard.noAuditData', 'Chưa có dữ liệu cuộc kiểm toán')} className="py-16" />)}
      </Card>
    ),

    'risk-bar-chart': (
      <Card title={t('dashboard.widgets.riskDistribution', 'Phân bổ Phát hiện theo Mức độ Rủi ro')} variant="borderless" className="shadow-sm" style={{ height: 420 }}>
        {riskBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={riskBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Critical" stackId="a" fill="#722ed1" name={t('auditFindings.critical', 'Nghiêm trọng')} />
              <Bar dataKey="High" stackId="a" fill="#cf1322" name={t('auditFindings.high', 'Cao')} />
              <Bar dataKey="Medium" stackId="a" fill="#faad14" name={t('auditFindings.medium', 'Trung bình')} />
              <Bar dataKey="Low" stackId="a" fill="#52c41a" name={t('auditFindings.low', 'Thấp')} />
            </BarChart>
          </ResponsiveContainer>
        ) : (<Empty description={t('dashboard.noFindingsData', 'Chưa có dữ liệu phát hiện')} className="py-16" />)}
      </Card>
    ),

    'risk-pending-review': (
      <Card
        title={<span><SafetyCertificateOutlined className="mr-2 text-amber-500" />{t('dashboard.widgets.pendingReview', 'Đánh giá Rủi ro Chờ duyệt')}{riskWidgetsPR?.pendingReviewCount > 0 && (<Badge count={riskWidgetsPR.pendingReviewCount} className="ml-2" style={{ backgroundColor: '#ea9105' }} />)}</span>}
        variant="borderless" className="shadow-sm" style={{ height: 420 }} styles={{ body: {} }}
      >
        {riskWidgetsPR?.pendingAssessments && riskWidgetsPR.pendingAssessments.length > 0 ? (
          <Table dataSource={riskWidgetsPR.pendingAssessments} rowKey="id" pagination={false} size="small"
            columns={[
              { title: t('dashboard.cols.department', 'Quy trình / Đơn vị'), dataIndex: 'universeName', key: 'universeName', render: (text: string, record: any) => (<div><div className="font-semibold text-sm">{text}</div><div className="text-xs text-gray-400">{record.department}</div></div>) },
              { title: t('scoringTab.score', 'Điểm'), dataIndex: 'totalScore', key: 'totalScore', width: 70, render: (score: number) => (<strong style={{ color: getProgressColor(score) }}>{score}</strong>) },
              { title: t('auditTemplates.cols.action', 'Thao tác'), key: 'action', width: 140, align: 'center',
                render: (_: any, record: any) => (
                  <Space size={4}>
                    {isApprover ? (<>
                      <Popconfirm title={t('dashboard.approveThisReview', 'Phê duyệt đánh giá này?')} onConfirm={() => handleApproveRisk(record.id)} okText={t('common.approve', 'Duyệt')} cancelText={t('common.cancel', 'Hủy')}>
                        <Button type="primary" size="small" className="bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600 text-xs px-2 py-0 h-6">{t('common.approve', 'Duyệt')}</Button>
                      </Popconfirm>
                      <Button danger type="primary" size="small" className="text-xs px-2 py-0 h-6" onClick={() => handleOpenRejectModal(record.id)}>{t('common.reject', 'Từ chối')}</Button>
                    </>) : (<Tag color="default" className="text-xs">{t('dashboard.noApprovalPermission', 'Không có quyền duyệt')}</Tag>)}
                  </Space>
                ),
              },
            ]}
          />
        ) : (<Empty description={t('dashboard.noPendingReviews', 'Không có đánh giá rủi ro nào đang chờ duyệt.')} className="py-16" />)}
      </Card>
    ),

    'top-high-risks': (
      <Card
        title={<span><FireOutlined className="mr-2 text-red-500" />{t('dashboard.widgets.topHighRisks', 'Top 5 Quy trình rủi ro cao nhất (Đã duyệt)')}</span>}
        variant="borderless" className="shadow-sm" style={{ height: 420 }} styles={{ body: {} }}
      >
        {riskWidgetsTHR?.topHighRisks && riskWidgetsTHR.topHighRisks.length > 0 ? (
          riskWidgetsTHR.topHighRisks.map((item: any, idx: number) => (
            <div key={item.id} className="mb-4 last:mb-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm truncate" style={{ maxWidth: '60%' }}>
                  {idx + 1}. {item.universeName}
                  <span className="text-xs text-gray-400 font-normal ml-2">({item.department})</span>
                </span>
                <Space>
                  <Tag color={getLevelColor(item.riskLevel)} className="m-0 font-semibold text-xs">{item.riskLevel}</Tag>
                  <strong style={{ color: getProgressColor(item.totalScore), fontSize: 13 }}>{item.totalScore}đ</strong>
                </Space>
              </div>
              <Progress percent={item.totalScore} strokeColor={getProgressColor(item.totalScore)} showInfo={false} status={item.totalScore < 40 ? 'exception' : 'active'} strokeWidth={8} />
            </div>
          ))
        ) : (<Empty description={t('dashboard.noApprovedReviews', 'Chưa có đánh giá rủi ro nào được duyệt.')} className="py-16" />)}
      </Card>
    ),

    'risk-heatmap': riskAssessments.length > 0 ? (
      <Card title={`🗺️ ${t('dashboard.widgets.riskHeatMap', 'Risk Heat Map — Đánh giá Rủi ro')}`} variant="borderless" className="shadow-sm">
        <Table dataSource={riskAssessments} rowKey="id" pagination={false} size="small"
          columns={[
            { title: t('dashboard.cols.department', 'Đơn vị / Quy trình'), dataIndex: 'universeName', key: 'universeName' },
            { title: t('auditEngagements.cols.year', 'Năm'), dataIndex: 'assessmentYear', key: 'assessmentYear', width: 80 },
            { title: t('scoringTab.score', 'Điểm'), dataIndex: 'totalScore', key: 'totalScore', width: 80, render: (v: number) => <strong>{v?.toFixed(1)}</strong> },
            { title: t('riskAssessment.groupOverview.auditRating', 'Xếp hạng Kiểm toán'), dataIndex: 'riskLevel', key: 'riskLevel', width: 180,
              render: (level: string) => {
                if (!level) return null;
                if (level.includes(t('riskAssessment.groupOverview.levels.1', 'Hạng 1'))) return <Tag color="success">{level}</Tag>;
                if (level.includes(t('riskAssessment.groupOverview.levels.2', 'Hạng 2'))) return <Tag color="lime">{level}</Tag>;
                if (level.includes(t('riskAssessment.groupOverview.levels.3', 'Hạng 3'))) return <Tag color="warning">{level}</Tag>;
                if (level.includes(t('riskAssessment.groupOverview.levels.4', 'Hạng 4'))) return <Tag color="orange">{level}</Tag>;
                if (level.includes(t('riskAssessment.groupOverview.levels.5', 'Hạng 5'))) return <Tag color="error">{level}</Tag>;
                const color = level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'green';
                const label = level === 'High' ? t('auditFindings.high', 'Cao') : level === 'Medium' ? t('auditFindings.medium', 'Trung bình') : t('auditFindings.low', 'Thấp');
                return <Tag color={color}>{label}</Tag>;
              },
            },
          ]}
        />
      </Card>
    ) : null,

    'ews-alerts': riskAssessments.length > 0 ? (
      <Card title={`🚨 ${t('dashboard.widgets.ewsAlerts', 'Early Warning System (EWS) - Cảnh báo Rủi ro Sớm')}`} variant="borderless" className="shadow-sm border border-red-200">
        <div className="bg-red-50 p-4 rounded mb-4">
          <WarningOutlined className="text-red-500 mr-2 text-lg" />
          <Text strong className="text-red-600 text-base">{t('dashboard.ewsAlertMessage', 'Danh sách Quy trình / Đơn vị có Rủi ro Cao (Hạng 4 & 5)')}</Text>
        </div>
        <Table
          dataSource={riskAssessments.filter((r: any) => typeof r.riskLevel === 'string' && (r.riskLevel.includes(t('riskAssessment.groupOverview.levels.4', 'Hạng 4')) || r.riskLevel.includes(t('riskAssessment.groupOverview.levels.5', 'Hạng 5'))))}
          rowKey="id" pagination={false} size="small"
          columns={[
            { title: t('dashboard.cols.department', 'Đơn vị / Quy trình'), dataIndex: 'universeName', key: 'universeName' },
            { title: t('auditEngagements.cols.year', 'Năm'), dataIndex: 'assessmentYear', key: 'assessmentYear', width: 80 },
            { title: t('scoringTab.score', 'Điểm'), dataIndex: 'totalScore', key: 'totalScore', width: 80, render: (v: number) => <strong>{v?.toFixed(1)}</strong> },
            { title: t('riskAssessment.groupOverview.auditRating', 'Xếp hạng Kiểm toán'), dataIndex: 'riskLevel', key: 'riskLevel', width: 180,
              render: (level: string) => {
                const color = level?.includes(t('riskAssessment.groupOverview.levels.5', 'Hạng 5')) ? 'red' : 'orange';
                return <Tag color={color} className="font-bold">{level}</Tag>;
              },
            },
          ]}
          locale={{ emptyText: t('dashboard.noHighRiskUnits', 'Không có đơn vị nào thuộc nhóm rủi ro cao.') }}
        />
      </Card>
    ) : null,

    'rec-by-dept': (
      <Card title={t('dashboard.widgets.recByDept', 'Tỷ lệ khắc phục theo Đơn vị')} variant="borderless" className="shadow-sm">
        {recByDept.length > 0 ? (
          recByDept.map((dept: any, i: number) => (
            <div className="mb-4" key={i}>
              <div className="flex justify-between mb-1">
                <span>{dept.department}</span>
                <span className="text-sm text-gray-500">
                  {dept.completed}/{dept.total} — {dept.completionRate}%
                  {dept.overdue > 0 && <Tag color="red" className="ml-2">{dept.overdue} {t('dashboard.stats.overdue', 'quá hạn')}</Tag>}
                </span>
              </div>
              <Progress percent={dept.completionRate} status={dept.completionRate === 100 ? 'success' : 'active'} strokeColor={dept.completionRate >= 80 ? '#52c41a' : dept.completionRate >= 50 ? '#faad14' : '#cf1322'} />
            </div>
          ))
        ) : (<Empty description={t('dashboard.noRecDataByDept', 'Chưa có dữ liệu kiến nghị theo đơn vị')} />)}
      </Card>
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dataMap, activeTab, isApprover, t, stats, pieData, riskBarData, riskAssessments, recByDept, riskWidgetsPR, riskWidgetsTHR, ewsAlerts]);

  const dashboardContent = (
    <div>
      <SmartWidgetRenderer config={dashboardConfig.config} widgetMap={widgetMap} />

      {/* MODAL TỪ CHỐI */}
      <Modal
        title={<span><CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Từ chối Đánh giá Rủi ro</span>}
        open={rejectModalOpen}
        onOk={handleRejectRisk}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
        okText={t('common.btnConfirmReject', 'Xác nhận Từ chối')}
        okButtonProps={{ danger: true, loading: submittingReject }}
        cancelText={t('common.btnCancel', 'Hủy')}
      >
        <div style={{ marginTop: 16 }}>
          <Text style={{ marginBottom: 8, display: 'block' }}>Vui lòng nhập lý do từ chối đánh giá này:</Text>
          <TextArea
            rows={4}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="VD: Thiếu dữ liệu chứng minh, cần bổ sung phân tích chi tiết hơn..."
          />
        </div>
      </Modal>
    </div>
  );

  if (!canViewDashboard) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        padding: 48,
        textAlign: 'center',
      }}>
        <Result
          status="403"
          title={<span style={{ color: '#d97706', fontWeight: 700, fontSize: 24 }}>TRUY CẬP BỊ GIỚI HẠN</span>}
          subTitle={
            <div style={{ fontSize: 16, color: '#334155', marginTop: 8 }}>
              {t('dashboard.youDoNotHavePermissionTo', 'Bạn không có quyền xem thông tin Dashboard này.')}<br />
              {t('dashboard.pleaseContactLpbankSystemAdministratorFor', 'Vui lòng liên hệ Quản trị viên hệ thống LPBank để được phân quyền.')}
            </div>
          }
          extra={
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 16 }}>
                {t('dashboard.youCanAccessOtherFunctionsTo', 'Bạn có thể truy cập các chức năng khác mà bạn được phân quyền bằng cách sử dụng menu bên trái.')}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* 🌟 LPBank Official Style Hero Banner */}
      <div className="lpbank-hero-gradient p-5 md:p-7 mb-4 relative overflow-hidden rounded-2xl">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                LPBank Smart Audit 4.0
              </span>
              {userScope.level === 'GLOBAL' && (
                <span className="bg-black/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  🏛️ Khối KTNB & Ban Kiểm Soát
                </span>
              )}
              {userScope.level === 'DEPARTMENT' && (
                <span className="bg-black/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  👔 Lãnh đạo Phòng: {currentUser?.department || currentUser?.teamCode || 'Phòng KT'}
                </span>
              )}
              {userScope.level === 'INDIVIDUAL' && (
                <span className="bg-black/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  🧑‍💻 Kiểm toán viên: {currentUser?.fullName || currentUser?.username}
                </span>
              )}
            </div>

            {dashboardConfig.canCustomize && (
              <Button
                icon={<SettingOutlined />}
                onClick={() => dashboardConfig.setEditMode(true)}
                className="bg-white/20 hover:!bg-white/30 text-white border-white/40 backdrop-blur-md rounded-lg text-xs font-semibold"
              >
                {t('dashboard.customize', 'Tùy chỉnh Dashboard')}
              </Button>
            )}
          </div>

          <Title level={3} className="!text-white !mb-2 font-black tracking-tight" style={{ color: '#ffffff', fontWeight: 800 }}>
            Dashboard Quản trị & Điều hành Kiểm toán Nội bộ LPBank
          </Title>
          <Paragraph className="!text-amber-50 !mb-4 max-w-3xl text-xs sm:text-sm leading-relaxed opacity-95">
            Lộc Phát Đồng Hành — Kiểm soát An toàn, Tuân thủ và Phát triển Bền vững.
            {userScope.level === 'GLOBAL' && ' Bạn đang giám sát toàn bộ hoạt động của Khối KTNB và Ban Kiểm soát trên toàn hệ thống LPBank.'}
            {userScope.level === 'DEPARTMENT' && ` Quản lý tiến độ các đoàn, công việc và nhân sự thuộc ${currentUser?.department || 'Phòng KT'} năm ${new Date().getFullYear()}.`}
            {userScope.level === 'INDIVIDUAL' && ` Theo dõi tiến độ nhiệm vụ và các cuộc kiểm toán được phân công năm ${new Date().getFullYear()}.`}
          </Paragraph>
        </div>
      </div>

      {/* 🚀 LPBank Floating Action Bar: "Nhu cầu của bạn là..." (Matching LPBank official portal) */}
      <div className="lpbank-floating-card p-4 md:p-5 mb-6 -mt-8 relative z-20 mx-2 md:mx-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-[#fef08a]">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm md:text-base flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            Nhu cầu kiểm toán của bạn là:
          </div>
          
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl">
            <Select
              value={selectedNeed}
              onChange={(val) => setSelectedNeed(val)}
              className="w-full text-sm"
              size="large"
              options={[
                { value: '/audit-engagements', label: '🎯 Quản lý Cuộc kiểm toán & Theo dõi tiến độ thực hiện' },
                { value: '/working-papers', label: '📝 Soạn thảo Giấy tờ làm việc (Working Papers & Sample Matrix)' },
                { value: '/audit-findings', label: '⚠️ Rà soát & Đăng ký Phát hiện kiểm toán (Finding Management)' },
                { value: '/audit-reports', label: '📊 Lập Báo cáo kiểm toán & Biên bản kiểm toán (MB04)' },
                { value: '/risk-assessment', label: '🧮 Đánh giá Rủi ro Đối tượng kiểm toán (Risk Assessment)' },
                { value: '/audit-plan', label: '📅 Kế hoạch kiểm toán năm & Phân bổ nhân sự' },
                { value: '/user-guide', label: '📚 Tra cứu Quy chế, Cẩm nang KTNB & Văn bản pháp quy' },
              ]}
            />
            <button
              onClick={() => navigate(selectedNeed)}
              className="lpbank-gold-pill-btn cursor-pointer justify-center text-sm py-2 px-5 flex-shrink-0"
            >
              <span>Tìm giải pháp</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Quick Service Shortcuts Row */}
        <div className="pt-3 flex items-center justify-between overflow-x-auto gap-2 text-xs font-semibold text-slate-800 no-scrollbar">
          <button 
            onClick={() => navigate('/audit-engagements')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#ea9105] text-xs">🎯</span>
            <span>Cuộc kiểm toán</span>
          </button>
          <button 
            onClick={() => navigate('/working-papers')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#ea9105] text-xs">📝</span>
            <span>Giấy tờ làm việc</span>
          </button>
          <button 
            onClick={() => navigate('/audit-findings')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#ea9105] text-xs">⚠️</span>
            <span>Phát hiện & Kiến nghị</span>
          </button>
          <button 
            onClick={() => navigate('/audit-reports')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#ea9105] text-xs">📊</span>
            <span>Báo cáo kiểm toán</span>
          </button>
          <button 
            onClick={() => navigate('/risk-assessment')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#ea9105] text-xs">🧮</span>
            <span>Đánh giá rủi ro</span>
          </button>
          <button 
            onClick={() => navigate('/user-guide')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#ea9105] text-xs">📚</span>
            <span>Cẩm nang nghiệp vụ</span>
          </button>
        </div>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        items={[
          { 
            key: 'workspace', 
            label: (
              <span className="font-semibold flex items-center gap-1.5 px-2 py-1">
                <ProjectOutlined className="text-blue-600" /> 🎯 Bàn làm việc Đoàn Kiểm toán (Workspace)
              </span>
            ) 
          },
          { 
            key: 'all', 
            label: (
              <span className="font-semibold flex items-center gap-1.5 px-2 py-1">
                <DashboardOutlined className="text-amber-600" /> 📊 Tổng quan Giám sát Điều hành & Kế hoạch
              </span>
            ) 
          },
          { key: 'ChiNhanh', label: '🏢 Chi nhánh & ĐVKD' },
          { key: 'Khoi', label: '🏛️ Khối Hội sở' },
          { key: 'Phong', label: '📑 Phòng ban' },
        ]}
        className="mb-6"
      />

      {activeTab === 'workspace' ? (
        <AuditWorkspaceHub />
      ) : activeTab === 'all' ? (
        <ExecutiveGroupedDashboard />
      ) : loading ? (
        <div className="flex items-center justify-center h-96">
          <Spin size="large" tip={t('dashboard.loadingDashboardData', 'Đang tải dữ liệu Dashboard...')} />
        </div>
      ) : (
        <>
          {dashboardContent}
          
          {/* Dynamic Reports Section */}
          {dynamicReports.length > 0 && (
            <>
              <Divider><Title level={4}><PieChartOutlined /> Báo cáo Động (Tùy chỉnh)</Title></Divider>
              <Row gutter={[24, 24]}>
                {dynamicReports.map(report => {
                  const chartData = dynamicDataMap[report.id] || [];
                  return (
                    <Col xs={24} lg={12} key={report.id}>
                      <Card title={report.name} variant="borderless" className="shadow-sm" style={{ height: 420 }}>
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={330}>
                            {report.chartType === 'bar' ? (
                              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#ea9105" name={report.aggregateFunc || 'Value'} />
                              </BarChart>
                            ) : report.chartType === 'pie' ? (
                              <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" label={({ label, percent }: any) => `${label} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                                  {chartData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            ) : report.chartType === 'line' ? (
                              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#52c41a" activeDot={{ r: 8 }} name={report.aggregateFunc || 'Value'} />
                              </LineChart>
                            ) : (
                              <Table 
                                dataSource={chartData} 
                                rowKey="label" 
                                pagination={{ pageSize: 5 }} 
                                size="small"
                                columns={[
                                  { title: report.groupBy || 'Nhãn', dataIndex: 'label' },
                                  { title: report.aggregateFunc || 'Giá trị', dataIndex: 'value' }
                                ]}
                              />
                            )}
                          </ResponsiveContainer>
                        ) : (<Empty description="Chưa có dữ liệu" className="py-16" />)}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}
        </>
      )}

      {/* Dashboard Customizer Drawer */}
      <DashboardCustomizer
        open={dashboardConfig.editMode}
        onClose={() => dashboardConfig.setEditMode(false)}
        dashboardKey="home"
        config={dashboardConfig.config}
        onToggle={dashboardConfig.toggleWidget}
        onResize={dashboardConfig.resizeWidget}
        onReorder={dashboardConfig.reorderWidgets}
        onUpdateSettings={dashboardConfig.updateWidgetSettings}
        onSave={dashboardConfig.saveConfig}
        onReset={dashboardConfig.resetConfig}
        hasChanges={dashboardConfig.hasChanges}
        saving={dashboardConfig.saving}
      />
    </div>
  );
};

export default Dashboard;
