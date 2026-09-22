import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col, Card, Statistic, Typography, Progress, Spin, Tag, Table, Select, Tabs, Button, Space, Badge } from 'antd';
import { 
  ProjectOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DashboardOutlined,
  AlertOutlined,
  BarChartOutlined,
  RightOutlined,
  SettingOutlined,
  SafetyOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import dayjs from 'dayjs';
import { useDashboardConfig } from '../utils/useDashboardConfig';
import DashboardCustomizer from '../components/DashboardCustomizer';
import { SmartWidgetRenderer } from '../components/dashboard-widgets/WidgetRenderer';
import { useCurrentUser } from '../utils/useCurrentUser';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  Todo: '#d9d9d9',      // grey
  InProgress: '#ea9105', // LPBank gold
  Review: '#faad14',     // gold
  Done: '#52c41a'        // green
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#8c8c8c',
  Medium: '#fa8c16',
  High: '#f5222d'
};

const COLORS_PIE = ['#52c41a', '#f59e0b', '#faad14', '#f5222d', '#d97706'];

const ExecutionDashboard: React.FC = () => {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    Todo: t('auditEngagements.statusLabels.Todo', 'Cần làm'),
    InProgress: t('executionDashboard.status.inProgress', 'Đang làm'),
    Review: t('auditEngagements.statusLabels.Review', 'Chờ duyệt'),
    Done: t('auditEngagements.statusLabels.Done', 'Hoàn thành')
  };

  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [dataMap, setDataMap] = useState<Record<string, { engagements: any[], tasks: any[] }>>({});
  // Fallback state for generic things
  const [engagements, setEngagements] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pendingReviewWps, setPendingReviewWps] = useState<any[]>([]);
  const [selectedEngagementFilter, setSelectedEngagementFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('1');

  // === Dashboard Customization ===
  const dashboardConfig = useDashboardConfig('execution');

  const fetchData = async () => {
    setLoading(true);
    try {
      const execEngConfig = dashboardConfig.config.find(w => w.widgetId === 'exec-engagement');
      const deptFilter = execEngConfig?.settings?.department;
      const engQuery = deptFilter ? `?departmentId=${encodeURIComponent(deptFilter)}` : '';

      const [engRes, taskRes, wpRes] = await Promise.all([
        api.get(`/audit-engagements${engQuery}`).catch(() => ({ data: [] })),
        api.get('/audit-tasks').catch(() => ({ data: [] })),
        api.get('/working-papers?status=Submitted').catch(() => ({ data: [] }))
      ]);

      setEngagements(Array.isArray(engRes.data) ? engRes.data : []);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
      setPendingReviewWps(Array.isArray(wpRes.data) ? wpRes.data : []);
    } catch (err) {
      console.error(t('executionDashboard.errorLoadingDashboardDataDo', 'Lỗi tải dữ liệu Dashboard Thực hiện:'), err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardConfig.config]);

  // Helper to get tasks for a widget
  const currentUserId = currentUser?.userId || currentUser?.id;
  const roleStr = typeof currentUser?.role === 'string' ? currentUser.role : (currentUser?.role?.name || currentUser?.roleName || '');
  const isAdmin = roleStr.toLowerCase().includes('admin') || roleStr.toLowerCase().includes('quản trị');

  const myEngagements = useMemo(() => {
    if (!engagements) return [];
    if (isAdmin) return engagements;
    return engagements.filter((e: any) => 
      e.leadAuditorId === currentUserId || 
      (e.leadAuditor && currentUser?.fullName && e.leadAuditor.toLowerCase().includes(currentUser.fullName.toLowerCase()))
    );
  }, [engagements, currentUserId, isAdmin, currentUser]);

  const getFilteredTasks = (widgetId: string) => {
    const tsks = tasks || [];
    if (selectedEngagementFilter === 'all') return tsks;
    return tsks.filter(t => t.engagementId === Number(selectedEngagementFilter));
  };

  // Compute Metrics for KPI Cards
  const kpiTasks = getFilteredTasks('exec-kpi-cards');
  const totalTasksCount = kpiTasks.length;
  const todoCount = kpiTasks.filter(t => t.status === 'Todo').length;
  const inProgressCount = kpiTasks.filter(t => t.status === 'InProgress').length;
  const reviewCount = kpiTasks.filter(t => t.status === 'Review').length;
  const doneCount = kpiTasks.filter(t => t.status === 'Done').length;
  const overdueCount = kpiTasks.filter(t => {
    if (t.status === 'Done' || !t.dueDate) return false;
    return dayjs(t.dueDate).isBefore(dayjs(), 'day');
  }).length;

  const progTasks = getFilteredTasks('exec-progress');
  const progTotal = progTasks.length;
  const progDone = progTasks.filter(t => t.status === 'Done').length;
  const taskCompletionRate = progTotal > 0 ? Math.round((progDone / progTotal) * 100) : 0;

  // Pie Chart Data (Status)
  const pieTasks = getFilteredTasks('exec-status-pie');
  const statusPieData = [
    { name: t('auditEngagements.statusLabels.Todo', 'Cần làm'), value: pieTasks.filter(t => t.status === 'Todo').length, color: '#8c8c8c' },
    { name: t('executionDashboard.status.inProgress', 'Đang làm'), value: pieTasks.filter(t => t.status === 'InProgress').length, color: '#ea9105' },
    { name: t('auditEngagements.statusLabels.Review', 'Chờ duyệt'), value: pieTasks.filter(t => t.status === 'Review').length, color: '#faad14' },
    { name: t('auditEngagements.statusLabels.Done', 'Hoàn thành'), value: pieTasks.filter(t => t.status === 'Done').length, color: '#52c41a' }
  ].filter(d => d.value > 0);

  // Bar Chart Data (Priority)
  const prioTasks = getFilteredTasks('exec-priority-bar');
  const priorityData = [
    { name: 'Cao (High)', 'Số lượng': prioTasks.filter(t => t.priority === 'High').length, fill: '#f5222d' },
    { name: t('executionDashboard.priority.medium', 'Trung bình (Med)'), 'Số lượng': prioTasks.filter(t => t.priority === 'Medium').length, fill: '#fa8c16' },
    { name: t('auditFindings.low', 'Thấp (Low)'), 'Số lượng': prioTasks.filter(t => t.priority === 'Low').length, fill: '#8c8c8c' }
  ];

  // Urgent Tasks
  const urgentTasksData = getFilteredTasks('exec-urgent-tasks')
    .filter(t => (t.priority === 'High' || t.priority === 'Critical') && t.status !== 'Done')
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
    .slice(0, 5);

  // Staff Perf
  const getStaffPerfData = () => {
    const staffTasks = getFilteredTasks('exec-staff-perf');
    const userMap: Record<string, any> = {};
    staffTasks.forEach((taskItem: any) => {
      const u = taskItem.assigneeName || taskItem.assignedTo || 'Chưa phân công';
      if (!userMap[u]) userMap[u] = { name: u, total: 0, done: 0, overdue: 0 };
      userMap[u].total++;
      if (taskItem.status === 'Done') userMap[u].done++;
      if (taskItem.status !== 'Done' && taskItem.dueDate && dayjs(taskItem.dueDate).isBefore(dayjs(), 'day')) userMap[u].overdue++;
    });
    return Object.values(userMap).map(u => ({
      ...u,
      completionRate: u.total > 0 ? Math.round((u.done / u.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  };
  const staffPerfData = getStaffPerfData();

  // Engagement Summary for Progress Table
  const engagementSummaryData = (engagements || []).map((eng: any) => {
    const engTasks = (tasks || []).filter((t: any) => t.engagementId === eng.id);
    const total = engTasks.length;
    const done = engTasks.filter((t: any) => t.status === 'Done').length;
    const inProgress = engTasks.filter((t: any) => t.status === 'InProgress').length;
    const review = engTasks.filter((t: any) => t.status === 'Review').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    
    return {
      key: eng.id,
      id: eng.id,
      name: eng.name,
      auditedDepartment: eng.auditedDepartment,
      leadAuditor: eng.leadAuditor,
      total,
      done,
      inProgress,
      review,
      percent,
      status: eng.status
    };
  });

  // Workload by Auditor
  const workloadMap: Record<string, { total: number; done: number; pending: number }> = {};
  getFilteredTasks('exec-workload').forEach((taskItem: any) => {
    const assignee = taskItem.assigneeName || taskItem.assignedTo || t('auditEngagements.notAssignedYet', 'Chưa phân công');
    if (!workloadMap[assignee]) {
      workloadMap[assignee] = { total: 0, done: 0, pending: 0 };
    }
    workloadMap[assignee].total += 1;
    if (taskItem.status === 'Done') {
      workloadMap[assignee].done += 1;
    } else {
      workloadMap[assignee].pending += 1;
    }
  });

  const workloadData = Object.entries(workloadMap).map(([name, stats]) => ({
    name,
    [t('auditEngagements.statusLabels.Done', 'Hoàn thành')]: stats.done,
    'Chưa hoàn thành': stats.pending,
    total: stats.total
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  const engagementColumns = [
    { 
      title: t('executionDashboard.cols.engagement', 'Đoàn / Cuộc kiểm toán'), 
      dataIndex: 'name', 
      key: 'name',
      render: (v: string, record: any) => (
        <div>
          <strong className="text-gray-800" style={{ fontSize: 14 }}>{v}</strong>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
            Đơn vị: <strong>{record.auditedDepartment}</strong> | Trưởng đoàn: <strong>{record.leadAuditor || 'Chưa gắn'}</strong>
          </div>
        </div>
      )
    },
    { 
      title: t('executionDashboard.cols.progress', 'Tiến độ công việc'), 
      key: 'progress',
      width: 250,
      render: (_: any, record: any) => (
        <div style={{ width: '100%' }}>
          <Progress 
            percent={record.percent} 
            size="small" 
            strokeColor={{ '0%': '#ea9105', '100%': '#52c41a' }}
            status={record.percent === 100 ? 'success' : 'active'}
          />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2, display: 'flex', gap: 8 }}>
            <span>Tổng: <strong>{record.total}</strong></span>
            <span style={{ color: '#52c41a' }}>Xong: <strong>{record.done}</strong></span>
            <span style={{ color: '#ea9105' }}>Đang làm: <strong>{record.inProgress}</strong></span>
            <span style={{ color: '#faad14' }}>Chờ duyệt: <strong>{record.review}</strong></span>
          </div>
        </div>
      )
    },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status',
      width: 140,
      render: (v: string) => {
        let color = 'default';
        if (v === 'InProgress') color = 'processing';
        else if (v === 'Completed') color = 'success';
        else if (v === 'Review') color = 'warning';
        return <Tag color={color} className="font-semibold">{v || 'Chưa bắt đầu'}</Tag>;
      }
    },
    { 
      title: t('auditTemplates.cols.action', 'Thao tác'), 
      key: 'action', 
      width: 110,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          ghost 
          size="small"
          onClick={() => navigate('/audit-engagements')}
          icon={<RightOutlined />}
          style={{ borderColor: '#ea9105', color: '#ea9105' }}
        >
          Kanban
        </Button>
      )
    }
  ];

  const workloadColumns = [
    { title: t('workingPapers.auditor', 'Kiểm toán viên'), dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { 
      title: t('executionDashboard.stats.totalTasks', 'Tổng công việc'), 
      dataIndex: 'total', 
      key: 'total',
      width: 130,
      align: 'center' as const,
      render: (v: number) => <Badge count={v} showZero style={{ backgroundColor: '#ea9105' }} />
    },
    { 
      title: t('auditEngagements.statusLabels.Done', 'Hoàn thành'), 
      dataIndex: t('auditEngagements.statusLabels.Done', 'Hoàn thành'), 
      key: 'done', 
      width: 130,
      align: 'center' as const,
      render: (v: number) => <Badge count={v} showZero style={{ backgroundColor: '#52c41a' }} />
    },
    { 
      title: t('executionDashboard.cols.pending', 'Chưa xong'), 
      dataIndex: 'Chưa hoàn thành', 
      key: 'pending', 
      width: 130,
      align: 'center' as const,
      render: (v: number) => <Badge count={v} showZero style={{ backgroundColor: '#faad14' }} />
    },
    { 
      title: t('executionDashboard.cols.ratio', 'Hiệu suất hoàn thành'), 
      key: 'ratio',
      width: 200,
      render: (_: any, r: any) => {
        const pct = r.total > 0 ? Math.round((r[t('auditEngagements.statusLabels.Done', 'Hoàn thành')] / r.total) * 100) : 0;
        return <Progress percent={pct} strokeColor={pct >= 80 ? '#52c41a' : pct >= 40 ? '#faad14' : '#f5222d'} size="small" />;
      }
    }
  ];

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100%' }}>
      {/* === TOP BANNER === */}
      <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <DashboardOutlined style={{ fontSize: 24, color: '#ea9105' }} />
            <Title level={3} className="!mb-0" style={{ fontWeight: 800 }}>{t('executionDashboard.title', 'Dashboard Thực hiện Kiểm toán')}</Title>
          </div>
          <Text className="text-gray-500" style={{ marginTop: 4, display: 'block' }}>
            {t('executionDashboard.subtitle', 'Tổng hợp và theo dõi tiến độ công việc, hiệu suất đoàn kiểm toán giai đoạn thực địa (Phase 3)')}
          </Text>
        </div>
        <div style={{ width: 300 }}>
          <span className="text-xs text-gray-400 font-semibold block mb-1">{t('executionDashboard.filterByEngagement', 'LỌC THEO CUỘC KIỂM TOÁN:')}</span>
          <Select 
            value={selectedEngagementFilter} 
            onChange={setSelectedEngagementFilter} 
            style={{ width: '100%' }}
            className="shadow-sm"
          >
            <Select.Option value="all">🌐 {t('executionDashboard.allEngagements', 'Tất cả các cuộc kiểm toán')}</Select.Option>
            {engagements.map(eng => (
              <Select.Option key={eng.id} value={eng.id.toString()}>
                🔎 {eng.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>

      {/* Customize button */}
      {dashboardConfig.canCustomize && (
        <div className="flex justify-end mb-4">
          <Button
            icon={<SettingOutlined />}
            onClick={() => dashboardConfig.setEditMode(true)}
            style={{ borderColor: '#ea9105', color: '#ea9105' }}
          >
            {t('dashboard.customize', 'Tùy chỉnh Dashboard')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spin size="large" tip="Đang tổng hợp dữ liệu công việc..." />
        </div>
      ) : (
        <>
          <SmartWidgetRenderer
            config={dashboardConfig.config}
            widgetMap={{
              'exec-my-team': (
                <Card
                  variant="borderless"
                  className="shadow-sm rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/30"
                  title={
                    <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                      <Space>
                        <SafetyOutlined className="text-indigo-600 text-lg" />
                        <span className="font-bold text-slate-800 text-sm sm:text-base">
                          {isAdmin ? '🛡️ Toàn bộ Đoàn KT & Hàng Đợi Soát Xét Four-Eyes' : '🛡️ Đoàn Kiểm Toán Của Tôi & Hàng Đợi Soát Xét Trưởng Đoàn'}
                        </span>
                      </Space>
                      <Space size="small">
                        <Tag color="orange" className="font-semibold text-xs">
                          {pendingReviewWps.length} W/P chờ duyệt 4 Mắt
                        </Tag>
                        <Tag color="blue" className="font-semibold text-xs">
                          {myEngagements.length} Đoàn phụ trách
                        </Tag>
                      </Space>
                    </div>
                  }
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={14}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          📋 Danh sách Đoàn Kiểm toán phụ trách ({myEngagements.length})
                        </span>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => navigate('/audit-engagements')}
                          className="text-xs p-0 text-indigo-600"
                        >
                          Xem tất cả →
                        </Button>
                      </div>
                      <Table
                        dataSource={myEngagements.slice(0, 5)}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Cuộc kiểm toán',
                            dataIndex: 'name',
                            key: 'name',
                            render: (val: string, r: any) => (
                              <div>
                                <div className="font-semibold text-xs text-slate-800 line-clamp-1">{val}</div>
                                <div className="text-[11px] text-slate-500">{r.auditedDepartment || '-'}</div>
                              </div>
                            ),
                          },
                          {
                            title: 'Giai đoạn',
                            dataIndex: 'status',
                            key: 'status',
                            width: 120,
                            render: (st: string) => {
                              const color = st === 'Fieldwork' ? 'blue' : st === 'Reporting' ? 'purple' : st === 'Completed' ? 'green' : 'default';
                              const label = st === 'Fieldwork' ? '2. Thực địa' : st === 'Reporting' ? '3. Báo cáo' : st === 'Completed' ? '4. Đã đóng' : '1. Lập KH';
                              return <Tag color={color} className="text-xs">{label}</Tag>;
                            },
                          },
                          {
                            title: 'Thao tác',
                            key: 'act',
                            width: 110,
                            align: 'center' as const,
                            render: (_: any, r: any) => (
                              <Button
                                type="primary"
                                size="small"
                                className="text-xs h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => navigate('/audit-engagements')}
                              >
                                Vào việc
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </Col>

                    <Col xs={24} lg={10}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <span>🔔 Hàng đợi W/P chờ duyệt (Four-Eyes)</span>
                          <Badge count={pendingReviewWps.length} style={{ backgroundColor: '#ea9105' }} />
                        </span>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => navigate('/working-papers')}
                          className="text-xs p-0 text-indigo-600"
                        >
                          Bàn làm việc W/P →
                        </Button>
                      </div>
                      {pendingReviewWps.length > 0 ? (
                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {pendingReviewWps.slice(0, 4).map((wp: any) => (
                            <div key={wp.id} className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200/80 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Tag color="geekblue" className="text-[10px] font-mono m-0 py-0 px-1">{wp.paperCode || `WP-${wp.id}`}</Tag>
                                  <span className="font-semibold text-xs text-slate-800 truncate">{wp.title}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Người lập: <strong className="text-slate-700">{wp.creator || wp.creatorUser?.fullName || 'KTV'}</strong>
                                </div>
                              </div>
                              <Button
                                size="small"
                                type="default"
                                icon={<EyeOutlined />}
                                className="text-xs h-7 px-2 border-amber-500 text-amber-700 hover:bg-amber-100/50 shrink-0"
                                onClick={() => navigate('/working-papers')}
                              >
                                Duyệt
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200 text-center h-[200px]">
                          <CheckCircleOutlined className="text-2xl text-green-500 mb-2" />
                          <span className="text-xs text-slate-600 font-medium">Hàng đợi trống — Tuyệt vời!</span>
                          <span className="text-[11px] text-slate-400 mt-0.5">Không có Giấy tờ làm việc nào đang chờ bạn duyệt 4 Mắt.</span>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card>
              ),
              'exec-kpi-cards': (
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={8} lg={4}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all border-l-4 border-blue-500 rounded-lg">
                      <Statistic title={t('executionDashboard.stats.totalTasks', 'Tổng công việc')} value={totalTasksCount} prefix={<ProjectOutlined className="text-blue-500 mr-2" />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all border-l-4 border-gray-400 rounded-lg">
                      <Statistic title={t('executionDashboard.todo', 'Cần làm (Todo)')} value={todoCount} valueStyle={{ color: '#8c8c8c' }} prefix={<ClockCircleOutlined className="text-gray-400 mr-2" />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all border-l-4 border-amber-500 rounded-lg">
                      <Statistic title={t('executionDashboard.inProgress', 'Đang làm (InProgress)')} value={inProgressCount} valueStyle={{ color: '#ea9105' }} prefix={<TeamOutlined className="text-amber-500 mr-2" />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all border-l-4 border-amber-400 rounded-lg">
                      <Statistic title={t('executionDashboard.review', 'Chờ duyệt (Review)')} value={reviewCount} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined className="text-amber-500 mr-2" />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all border-l-4 border-green-500 rounded-lg">
                      <Statistic title={t('executionDashboard.done', 'Hoàn thành (Done)')} value={doneCount} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined className="text-green-500 mr-2" />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all border-l-4 border-red-500 rounded-lg">
                      <Statistic title={t('executionDashboard.overdue', 'Trễ hạn (Overdue)')} value={overdueCount} valueStyle={{ color: '#f5222d' }} prefix={<AlertOutlined className="text-red-500 mr-2" />} />
                    </Card>
                  </Col>
                </Row>
              ),
              'exec-progress': (
                <Card variant="borderless" className="shadow-sm rounded-xl">
                  <span className="text-gray-500 font-semibold block mb-2">{t('executionDashboard.overallProgress', 'TIẾN ĐỘ THỰC HIỆN CÔNG VIỆC CHUNG:')}</span>
                  <Progress percent={taskCompletionRate} status="active" strokeColor={{ '0%': '#ea9105', '100%': '#52c41a' }} strokeWidth={16}
                    format={pct => <strong style={{ fontSize: 16 }}>{pct}% {t('executionDashboard.completedPct', 'Hoàn thành')}</strong>}
                  />
                </Card>
              ),
              'exec-status-pie': (
                <Card title={`📌 ${t('executionDashboard.taskStatus', 'Trạng thái Công việc')}`} variant="borderless" className="shadow-sm rounded-xl" style={{ height: 380 }}>
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={290}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                          {statusPieData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (<div className="flex items-center justify-center h-64"><Text type="secondary">{t('executionDashboard.noData', 'Chưa có dữ liệu công việc')}</Text></div>)}
                </Card>
              ),
              'exec-priority-bar': (
                <Card title={`🔥 ${t('executionDashboard.taskPriority', 'Mức độ Ưu tiên Công việc')}`} variant="borderless" className="shadow-sm rounded-xl" style={{ height: 380 }}>
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Số lượng" fill="#ea9105">
                        {priorityData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              ),
              'exec-urgent-tasks': (
                <Card title={<span><AlertOutlined className="mr-2 text-red-500" />{t('executionDashboard.urgentTasks', 'Nhiệm vụ Ưu tiên Cao & Chưa xong')}</span>}
                  variant="borderless" className="shadow-sm rounded-xl" style={{ height: 420 }}
                  styles={{ body: {} }}
                >
                  {urgentTasksData.length > 0 ? (
                    urgentTasksData.map((taskItem: any, idx: number) => (
                      <div key={taskItem.id} className="p-3 bg-red-50/50 rounded-lg mb-3 last:mb-0 border border-red-100 flex justify-between items-start">
                        <div style={{ maxWidth: '75%' }}>
                          <strong className="block text-gray-800" style={{ fontSize: 13 }}>{idx + 1}. {taskItem.title}</strong>
                          <span className="text-xs text-gray-400 block mt-1">Cuộc KT: {taskItem.engagementName}</span>
                          <span className="text-xs text-gray-500 block mt-1">Giao cho: <strong>{taskItem.assignedTo || 'Chưa gắn'}</strong></span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Tag color="red" className="m-0 text-xs font-semibold">Ưu tiên Cao</Tag>
                          {taskItem.dueDate && (<span className="text-xs block mt-2 text-red-600 font-medium"><ClockCircleOutlined className="mr-1" />Hạn: {dayjs(taskItem.dueDate).format('DD/MM/YYYY')}</span>)}
                        </div>
                      </div>
                    ))
                  ) : (<div className="flex items-center justify-center h-64"><Text type="secondary">Tuyệt vời! Không có công việc khẩn cấp nào tồn đọng.</Text></div>)}
                </Card>
              ),
              'exec-workload': (
                <Card title={<span><BarChartOutlined className="mr-2 text-blue-500" />{t('executionDashboard.workloadRatio', 'Tỷ lệ Phân bổ theo Kiểm toán viên')}</span>}
                  variant="borderless" className="shadow-sm rounded-xl" style={{ height: 420 }}
                  styles={{ body: {} }}
                >
                  {workloadData.length > 0 ? (
                    <Table dataSource={workloadData}
                      columns={[
                        { title: 'KTV', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
                        { title: t('auditEngagements.statusLabels.Todo', 'Cần làm'), dataIndex: 'Chưa hoàn thành', key: 'pending', align: 'center', render: (v: number) => <Tag color="orange">{v}</Tag> },
                        { title: t('auditEngagements.statusLabels.Done', 'Đã xong'), dataIndex: t('auditEngagements.statusLabels.Done', 'Hoàn thành'), key: 'done', align: 'center', render: (v: number) => <Tag color="green">{v}</Tag> },
                        { title: t('executionDashboard.stats.totalTasks', 'Tổng'), dataIndex: 'total', key: 'total', align: 'center', render: (v: number) => <strong>{v}</strong> }
                      ]}
                      pagination={false} size="small" rowKey="name"
                    />
                  ) : (<div className="flex items-center justify-center h-64"><Text type="secondary">{t('executionDashboard.noWorkload', 'Chưa có phân bổ kiểm toán viên')}</Text></div>)}
                </Card>
              ),
              'exec-engagement': (
                <Card variant="borderless" className="shadow-sm rounded-xl" title={`🔎 ${t('executionDashboard.engagementProgress', 'Tiến độ các Đoàn Kiểm toán')}`}>
                  <Table dataSource={engagementSummaryData} columns={engagementColumns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
                </Card>
              ),
              'exec-staff-perf': (
                <Card variant="borderless" className="shadow-sm rounded-xl" title={`👥 ${t('executionDashboard.staffPerformance', 'Chi tiết Hiệu suất Nhân sự')}`}>
                  <Table dataSource={staffPerfData} columns={workloadColumns} rowKey="name" pagination={false} size="middle" />
                </Card>
              ),
            }}
          />
        </>
      )}

      {/* Dashboard Customizer Drawer */}
      <DashboardCustomizer
        open={dashboardConfig.editMode}
        onClose={() => dashboardConfig.setEditMode(false)}
        dashboardKey="execution"
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

export default ExecutionDashboard;
