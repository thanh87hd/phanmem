import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Table, Select, Tag, Timeline, Spin, Empty, Space, Button, Divider, Alert, Statistic, Tabs, Badge } from 'antd';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  AuditOutlined, 
  BugOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  WarningOutlined, 
  ReloadOutlined,
  CalendarOutlined,
  FilterOutlined,
  EnvironmentOutlined,
  BookOutlined,
  ToolOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useDashboardConfig } from '../utils/useDashboardConfig';
import DashboardCustomizer from '../components/DashboardCustomizer';
import { SmartWidgetRenderer } from '../components/dashboard-widgets/WidgetRenderer';
import { SettingOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const COLORS = ['#cf1322', '#f5222d', '#faad14', '#52c41a']; // Critical (Dark Red), High (Red), Medium (Orange), Low (Green)
const PIE_COLORS = ['#f59e0b', '#d97706', '#13c2c2', '#fa8c16', '#722ed1', '#ea580c'];

const FindingsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dataMap, setDataMap] = useState<Record<string, any>>({});
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const dashboardConfig = useDashboardConfig('findings-analytics');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const getQuery = (widgetId: string) => {
          const cfg = dashboardConfig.config.find(w => w.widgetId === widgetId);
          const dept = cfg?.settings?.department;
          const yr = cfg?.settings?.year;
          const params = new URLSearchParams();
          if (dept) params.append('departmentId', dept);
          if (yr) params.append('year', yr);
          const qs = params.toString();
          return qs ? `?${qs}` : '';
        };

        const widgetIds = [
          'find-analytics-kpi', 'find-analytics-unit', 'find-analytics-process',
          'find-analytics-operation', 'find-analytics-region', 'find-analytics-history',
          'find-analytics-officer'
        ];

        const promises = widgetIds.map(async (wid) => {
          const qs = getQuery(wid);
          const res = await api.get(`/audit-findings/stats/multi-dimensional${qs}`).catch(() => ({ data: null }));
          return { wid, data: res.data || {} };
        });

        const results = await Promise.all(promises);
        const newDataMap: Record<string, any> = {};
        results.forEach(r => { newDataMap[r.wid] = r.data; });
        setDataMap(newDataMap);

        const histData = newDataMap['find-analytics-history']?.historyByUnit;
        if (histData && histData.length > 0) {
          setSelectedUnit(histData[0].unit);
        }
      } catch (error) {
        console.error('Lỗi khi tải thống kê đa chiều:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 flex-col gap-4">
        <Spin size="large" tip="Đang tính toán dữ liệu thống kê đa chiều..." />
        <Text style={{ color: '#8c8c8c' }}>Hệ thống đang quét cơ sở dữ liệu phát hiện & kiến nghị kiểm toán</Text>
      </div>
    );
  }

  // Fallback structures if empty
  const byUnit = dataMap['find-analytics-unit']?.byUnit || [];
  const kpiByUnit = dataMap['find-analytics-kpi']?.byUnit || [];
  const byProcess = dataMap['find-analytics-process']?.byProcess || [];
  const byCorrectiveUnit = dataMap['find-analytics-kpi']?.byCorrectiveUnit || [];
  const historyByUnit = dataMap['find-analytics-history']?.historyByUnit || [];
  const byRegion = dataMap['find-analytics-region']?.byRegion || [];
  const byOperationType = dataMap['find-analytics-operation']?.byOperationType || [];
  const byOfficer = dataMap['find-analytics-officer']?.byOfficer || { proposers: [], appraisers: [], leaders: [] };

  // Map raw operationType code to descriptive display name
  const formattedOperationTypeData = byOperationType.map((item: any) => {
    let name = item.operationType;
    if (item.operationType === 'TD') name = 'Tín dụng (TD)';
    else if (item.operationType === 'PTD') name = 'Phi tín dụng (PTD)';
    else if (item.operationType === 'TKBĐ') name = 'TK Bưu điện (TKBĐ)';
    else if (item.operationType === 'Khác') name = 'Nghiệp vụ khác';
    return { ...item, displayName: name };
  });

  // Calculate KPIs
  const totalFindings = kpiByUnit.reduce((s: number, u: any) => s + u.total, 0);
  const criticalHighFindings = kpiByUnit.reduce((s: number, u: any) => s + (u.Critical || 0) + (u.High || 0), 0);
  
  const totalRecs = byCorrectiveUnit.reduce((s: number, c: any) => s + c.total, 0);
  const completedRecs = byCorrectiveUnit.reduce((s: number, c: any) => s + (c.Completed || 0) + (c.Verified || 0), 0);
  const activeRecs = totalRecs - completedRecs;
  const recCompletionRate = totalRecs > 0 ? Math.round((completedRecs / totalRecs) * 100) : 0;

  // Pie chart data formatting
  const processPieData = byProcess.slice(0, 6).map((p: any, idx: number) => ({
    name: p.process.length > 25 ? p.process.substring(0, 25) + '...' : p.process,
    value: p.total,
    color: PIE_COLORS[idx % PIE_COLORS.length]
  }));

  // Selected unit historical timeline
  const selectedUnitHistory = historyByUnit.find((h: any) => h.unit === selectedUnit);

  const getRiskTagColor = (level: string) => {
    if (level === 'Critical') return 'purple';
    if (level === 'High') return 'red';
    if (level === 'Medium') return 'orange';
    return 'green';
  };

  return (
    <div>
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={3} className="!mb-1" style={{ color: '#0f172a', fontWeight: 800 }}>
            <AuditOutlined className="mr-2 text-amber-500" /> Báo cáo Phân tích Phát hiện & Lịch sử Đơn vị
          </Title>
          <Text className="text-gray-500">Hệ thống phân tích thống kê đa chiều theo chuẩn nghiệp vụ kiểm toán nội bộ LPBank</Text>
        </div>
        {dashboardConfig.canCustomize && (
          <Button
            icon={<SettingOutlined />}
            onClick={() => dashboardConfig.setEditMode(true)}
            style={{ borderColor: '#ea9105', color: '#ea9105', fontWeight: 600, borderRadius: 8, marginTop: '10px', marginRight: '8px' }}
          >
            Tùy chỉnh Dashboard
          </Button>
        )}
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8, marginTop: '10px' }}
        >
          Làm mới dữ liệu
        </Button>
      </div>

      <SmartWidgetRenderer
        config={dashboardConfig.config}
        widgetMap={{
          'analytics-kpi-cards': (<>
            {/* KPI Cards Row */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow">
            <Statistic 
              title={<span className="font-semibold text-gray-400">TỔNG PHÁT HIỆN GHI NHẬN</span>}
              value={totalFindings} 
              valueStyle={{ color: '#0f172a', fontWeight: 800 }}
              prefix={<BugOutlined className="text-amber-500 mr-1" />} 
              suffix="phát hiện"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm border-l-4 border-red-500 hover:shadow-md transition-shadow">
            <Statistic 
              title={<span className="font-semibold text-gray-400">PHÁT HIỆN RỦI RO CAO / N.TRỌNG</span>}
              value={criticalHighFindings}
              valueStyle={{ color: '#cf1322', fontWeight: 800 }}
              prefix={<WarningOutlined className="text-red-500 mr-1" />} 
              suffix="lỗi nghiêm trọng"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow">
            <Statistic 
              title={<span className="font-semibold text-gray-400">KIẾN NGHỊ ĐANG THEO DÕI</span>}
              value={activeRecs}
              valueStyle={{ color: '#ea9105', fontWeight: 800 }}
              prefix={<ClockCircleOutlined className="text-amber-500 mr-1" />} 
              suffix="chưa hoàn thành"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow">
            <Statistic 
              title={<span className="font-semibold text-gray-400">TỶ LỆ KHẮC PHỤC KIẾN NGHỊ</span>}
              value={recCompletionRate}
              valueStyle={{ color: '#52c41a', fontWeight: 800 }}
              prefix={<CheckCircleOutlined className="text-green-500 mr-1" />} 
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
          </>),
          'analytics-tabs': (<>
            {/* Main Charts & Analytics Tabs */}
      <Tabs defaultActiveKey="1" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <Tabs.TabPane tab={<span><EnvironmentOutlined /> Thống kê theo Đơn vị kiểm toán (Audited Units)</span>} key="1">
          <Row gutter={[24, 24]} className="mt-4">
            <Col xs={24} lg={14}>
              <Card title={<span className="font-bold text-gray-700">Mức độ rủi ro phát hiện tại các Đơn vị hàng đầu</span>} variant="borderless" className="bg-gray-50 border border-gray-100">
                {byUnit.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={byUnit.slice(0, 8)} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="unit" tick={{ fill: '#8c8c8c', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#8c8c8c' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Critical" name="Nghiêm trọng (Critical)" stackId="a" fill="#722ed1" />
                      <Bar dataKey="High" name="Cao (High)" stackId="a" fill="#cf1322" />
                      <Bar dataKey="Medium" name="Trung bình (Medium)" stackId="a" fill="#faad14" />
                      <Bar dataKey="Low" name="Thấp (Low)" stackId="a" fill="#52c41a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Chưa có dữ liệu thống kê theo đơn vị" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title={<span className="font-bold text-gray-700">Bảng chi tiết sai phạm theo Đơn vị</span>} variant="borderless" className="h-full border border-gray-100">
                <Table 
                  dataSource={byUnit.slice(0, 5)} 
                  rowKey="unit"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Đơn vị / Chi nhánh', dataIndex: 'unit', render: (t) => <strong style={{ color: '#0f172a' }}>{t}</strong> },
                    { title: 'Ng.Trọng', dataIndex: 'Critical', render: (v) => v > 0 ? <Tag color="purple">{v}</Tag> : '-' },
                    { title: 'R.ro Cao', dataIndex: 'High', render: (v) => v > 0 ? <Tag color="red">{v}</Tag> : '-' },
                    { title: 'Tổng', dataIndex: 'total', render: (v) => <strong className="text-gray-800">{v}</strong> }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><BookOutlined /> Phân tích sai hại theo Quy trình (Processes)</span>} key="2">
          <Row gutter={[24, 24]} className="mt-4">
            <Col xs={24} lg={10}>
              <Card title={<span className="font-bold text-gray-700">Cơ cấu phát hiện theo Quy trình nghiệp vụ</span>} variant="borderless" className="bg-gray-50 border border-gray-100">
                {processPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={processPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }: { name?: string, percent?: number }) => `${(name || '').substring(0, 12)} (${((percent || 0) * 100).toFixed(0)}%)`}
                        labelLine={true}
                      >
                        {processPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Chưa có dữ liệu thống kê quy trình" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card title={<span className="font-bold text-gray-700">Top Quy trình phát sinh nhiều lỗi nhất</span>} variant="borderless" className="h-full border border-gray-100">
                <Table 
                  dataSource={byProcess.slice(0, 6)} 
                  rowKey="process"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Quy trình kiểm soát / Phần hành', dataIndex: 'process', render: (t) => <span className="font-semibold">{t}</span> },
                    { title: 'Tổng lỗi', dataIndex: 'total', render: (v) => <Badge count={v} style={{ backgroundColor: '#ea9105' }} /> },
                    { title: 'Lỗi Critical/High', render: (_, r: any) => <span className="text-red-500 font-bold">{(r.Critical || 0) + (r.High || 0)}</span> }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><ToolOutlined /> Đơn vị chịu trách nhiệm Khắc phục (Remediation)</span>} key="3">
          <Row gutter={[24, 24]} className="mt-4">
            <Col xs={24}>
              <Card title={<span className="font-bold text-gray-700">Tiến độ khắc phục kiến nghị của các đơn vị thực thi</span>} variant="borderless" className="border border-gray-100">
                {byCorrectiveUnit.length > 0 ? (
                  <div className="overflow-x-auto">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={byCorrectiveUnit.slice(0, 10)} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="department" tick={{ fill: '#8c8c8c', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8c8c8c' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="NotStarted" name="Chưa thực hiện" fill="#d9d9d9" />
                        <Bar dataKey="InProgress" name="Đang thực hiện" fill="#ea9105" />
                        <Bar dataKey="Completed" name="Đã hoàn thành" fill="#52c41a" />
                        <Bar dataKey="Overdue" name="Quá hạn" fill="#fa8c16" />
                        <Bar dataKey="Verified" name="KTV xác nhận" fill="#52c41a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty description="Chưa có dữ liệu đơn vị khắc phục" />
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><EnvironmentOutlined /> 📍 Phân tích Rủi ro theo Vùng (Regions)</span>} key="4">
          <Row gutter={[24, 24]} className="mt-4">
            <Col xs={24} lg={14}>
              <Card title={<span className="font-bold text-gray-700">Mức độ rủi ro phát hiện theo Vùng địa bàn (A-AA)</span>} variant="borderless" className="bg-gray-50 border border-gray-100">
                {byRegion.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={byRegion} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="region" tick={{ fill: '#8c8c8c', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#8c8c8c' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Critical" name="Nghiêm trọng (Critical)" stackId="a" fill="#722ed1" />
                      <Bar dataKey="High" name="Cao (High)" stackId="a" fill="#cf1322" />
                      <Bar dataKey="Medium" name="Trung bình (Medium)" stackId="a" fill="#faad14" />
                      <Bar dataKey="Low" name="Thấp (Low)" stackId="a" fill="#52c41a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Chưa có dữ liệu thống kê theo vùng địa lý" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title={<span className="font-bold text-gray-700">Chi tiết phát hiện theo Vùng</span>} variant="borderless" className="h-full border border-gray-100">
                <Table 
                  dataSource={byRegion} 
                  rowKey="region"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Vùng / Địa bàn', dataIndex: 'region', render: (t) => <strong className="text-amber-600">{t}</strong> },
                    { title: 'Ng.Trọng', dataIndex: 'Critical', render: (v) => v > 0 ? <Tag color="purple">{v}</Tag> : '-' },
                    { title: 'R.ro Cao', dataIndex: 'High', render: (v) => v > 0 ? <Tag color="red">{v}</Tag> : '-' },
                    { title: 'Tổng số lỗi', dataIndex: 'total', render: (v) => <strong className="text-gray-800">{v}</strong> }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><ThunderboltOutlined /> ⚡ Nghiệp vụ & Nhân sự chịu trách nhiệm</span>} key="5">
          <Row gutter={[24, 24]} className="mt-4">
            <Col xs={24} lg={12}>
              <Card title={<span className="font-bold text-gray-700">1. Phân nhóm rủi ro theo Mảng nghiệp vụ (TD/PTD/TKBĐ)</span>} variant="borderless" className="bg-gray-50 border border-gray-100">
                {formattedOperationTypeData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={formattedOperationTypeData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="displayName" tick={{ fill: '#8c8c8c', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8c8c8c' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Critical" name="Nghiêm trọng" fill="#722ed1" />
                        <Bar dataKey="High" name="Rủi ro Cao" fill="#cf1322" />
                        <Bar dataKey="Medium" name="Trung bình" fill="#faad14" />
                        <Bar dataKey="Low" name="Thấp" fill="#52c41a" />
                      </BarChart>
                    </ResponsiveContainer>
                    <Table 
                      dataSource={formattedOperationTypeData} 
                      rowKey="operationType"
                      pagination={false}
                      size="small"
                      className="mt-4"
                      columns={[
                        { title: 'Mảng nghiệp vụ', dataIndex: 'displayName', render: (t) => <strong className="text-amber-800">{t}</strong> },
                        { title: 'Ng.Trọng', dataIndex: 'Critical', render: (v) => v || 0 },
                        { title: 'R.ro Cao', dataIndex: 'High', render: (v) => v || 0 },
                        { title: 'Trung bình', dataIndex: 'Medium', render: (v) => v || 0 },
                        { title: 'Thấp', dataIndex: 'Low', render: (v) => v || 0 },
                        { title: 'Tổng', dataIndex: 'total', render: (v) => <Tag color="volcano" className="font-bold">{v || 0}</Tag> }
                      ]}
                    />
                  </div>
                ) : (
                  <Empty description="Chưa có thống kê theo mảng nghiệp vụ" />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title={<span className="font-bold text-gray-700">2. Xếp hạng sai phạm theo Cán bộ chịu trách nhiệm (RCA)</span>} variant="borderless" className="border border-gray-100">
                <Tabs size="small" type="line" defaultActiveKey="proposers">
                  <Tabs.TabPane tab="CB Đề xuất hồ sơ lỗi" key="proposers">
                    {byOfficer.proposers.length > 0 ? (
                      <div className="mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-500 text-[10px] uppercase block mb-2 px-1">📊 Biểu đồ Top Cán bộ Đề xuất lỗi</span>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={byOfficer.proposers.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#475569', fontSize: 9, fontWeight: 500 }} />
                            <Tooltip />
                            <Bar dataKey="total" name="Tổng sai sót" fill="#fa541c" radius={[0, 4, 4, 0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}
                    <Table 
                      dataSource={byOfficer.proposers}
                      rowKey="name"
                      size="small"
                      pagination={{ pageSize: 5 }}
                      columns={[
                        { title: 'Tên cán bộ đề xuất', dataIndex: 'name', render: (t) => <strong className="text-gray-800">{t}</strong> },
                        { title: 'Lỗi Crit/High', render: (_, r: any) => <span className="text-red-500 font-bold">{(r.Critical || 0) + (r.High || 0)}</span> },
                        { title: 'Tổng sai sót', dataIndex: 'total', render: (v) => <Tag color="volcano" className="font-bold">{v}</Tag> }
                      ]}
                    />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="CB Thẩm định hồ sơ lỗi" key="appraisers">
                    {byOfficer.appraisers.length > 0 ? (
                      <div className="mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-500 text-[10px] uppercase block mb-2 px-1">📊 Biểu đồ Top Cán bộ Thẩm định lỗi</span>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={byOfficer.appraisers.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#475569', fontSize: 9, fontWeight: 500 }} />
                            <Tooltip />
                            <Bar dataKey="total" name="Tổng sai sót" fill="#fa8c16" radius={[0, 4, 4, 0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}
                    <Table 
                      dataSource={byOfficer.appraisers}
                      rowKey="name"
                      size="small"
                      pagination={{ pageSize: 5 }}
                      columns={[
                        { title: 'Tên cán bộ thẩm định', dataIndex: 'name', render: (t) => <strong className="text-gray-800">{t}</strong> },
                        { title: 'Lỗi Crit/High', render: (_, r: any) => <span className="text-red-500 font-bold">{(r.Critical || 0) + (r.High || 0)}</span> },
                        { title: 'Tổng sai sót', dataIndex: 'total', render: (v) => <Tag color="orange" className="font-bold">{v}</Tag> }
                      ]}
                    />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="Lãnh đạo DVKD duyệt lỗi" key="leaders">
                    {byOfficer.leaders.length > 0 ? (
                      <div className="mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-500 text-[10px] uppercase block mb-2 px-1">📊 Biểu đồ Top Lãnh đạo phê duyệt lỗi</span>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={byOfficer.leaders.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#475569', fontSize: 9, fontWeight: 500 }} />
                            <Tooltip />
                            <Bar dataKey="total" name="Tổng sai sót" fill="#722ed1" radius={[0, 4, 4, 0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}
                    <Table 
                      dataSource={byOfficer.leaders}
                      rowKey="name"
                      size="small"
                      pagination={{ pageSize: 5 }}
                      columns={[
                        { title: 'Lãnh đạo phê duyệt', dataIndex: 'name', render: (t) => <strong className="text-gray-800">{t}</strong> },
                        { title: 'Lỗi Crit/High', render: (_, r: any) => <span className="text-red-500 font-bold">{(r.Critical || 0) + (r.High || 0)}</span> },
                        { title: 'Tổng sai sót', dataIndex: 'total', render: (v) => <Tag color="purple" className="font-bold">{v}</Tag> }
                      ]}
                    />
                  </Tabs.TabPane>
                </Tabs>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
          </>),
          'analytics-history': (<>
            {/* Historical Audit Periods Section */}
      <Card 
        variant="borderless" 
        className="shadow-sm rounded-xl border border-gray-100"
        title={
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2">
            <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '16px' }}>
              <CalendarOutlined className="mr-2 text-amber-500" /> Tra cứu Lịch sử các Kỳ kiểm toán theo Đơn vị
            </span>
            <div className="flex items-center gap-2">
              <Text className="text-gray-400 text-xs font-semibold">Chọn Đơn vị:</Text>
              <Select 
                value={selectedUnit} 
                onChange={setSelectedUnit} 
                style={{ width: 250 }}
                placeholder="Chọn chi nhánh/đơn vị..."
              >
                {historyByUnit.map((h: any) => (
                  <Option key={h.unit} value={h.unit}>{h.unit}</Option>
                ))}
              </Select>
            </div>
          </div>
        }
      >
        {selectedUnitHistory ? (
          <div>
            <Alert
              message={<span className="font-bold text-amber-800 text-sm">Tổng quan lịch sử kiểm toán của {selectedUnit}</span>}
              description={
                <div className="text-gray-600 text-xs">
                  Đơn vị đã trải qua <Text strong className="text-amber-600">{selectedUnitHistory.history?.length || 0} kỳ kiểm toán</Text> qua các năm. 
                  Tổng số phát hiện tích lũy được phát hiện là <Text strong className="text-red-500">{(selectedUnitHistory.history || []).reduce((s: number, h: any) => s + (h.engagements || []).reduce((s2: number, e: any) => s2 + (e.findingsCount || 0), 0), 0)} lỗi vi phạm</Text>.
                </div>
              }
              type="warning"
              showIcon
              className="mb-6 rounded-lg bg-amber-50/50 border-amber-200"
            />

            <Timeline mode="left" className="px-6 py-4">
              {(selectedUnitHistory.history || []).map((yearGroup: any) => (
                <Timeline.Item 
                  key={yearGroup.year} 
                  label={<span className="font-bold text-amber-600 text-base">{yearGroup.year}</span>}
                  dot={<CalendarOutlined style={{ fontSize: '16px', color: '#ea9105' }} />}
                >
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 hover:bg-gray-100/50 transition-colors">
                    {yearGroup.engagements.map((eng: any, idx: number) => (
                      <div key={idx} className="mb-3 last:mb-0">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <Text strong className="text-gray-800 text-sm">{eng.engagementName}</Text>
                          <Space>
                            <Tag color="red" className="m-0 font-semibold">{eng.findingsCount} phát hiện</Tag>
                            <Tag color={eng.status === 'Completed' ? 'green' : 'blue'} className="m-0 text-[10px]">
                              {eng.status === 'Completed' ? 'Hoàn thành' : 'Đang xử lý'}
                            </Tag>
                          </Space>
                        </div>
                        <Paragraph className="text-gray-500 text-xs mt-1 mb-0">
                          Kỳ kiểm toán năm {yearGroup.year} tập trung rà soát các kiểm soát chốt nghiệp vụ, các hoạt động tuân thủ của đơn vị trong thời kỳ.
                        </Paragraph>
                      </div>
                    ))}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <EnvironmentOutlined className="text-4xl mb-3 text-gray-300" />
            <div>Vui lòng chọn đơn vị từ bộ lọc phía trên để hiển thị lịch sử kiểm toán.</div>
          </div>
        )}
      </Card>
          </>)
        }}
      />

      <DashboardCustomizer
        open={dashboardConfig.editMode}
        onClose={() => dashboardConfig.setEditMode(false)}
        dashboardKey="findings-analytics"
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

export default FindingsAnalytics;
