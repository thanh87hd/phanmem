import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Typography, Row, Col, Statistic, Table, Progress, Select, Tag, Empty, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProjectOutlined, WarningOutlined, CheckCircleOutlined, TeamOutlined, FileSearchOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;
const COLORS = ['#f59e0b', '#52c41a', '#faad14', '#d97706', '#cf1322', '#13c2c2'];

const SummaryReports: React.FC = () => {
  const { t } = useTranslation();

  const TEAM_LABELS: Record<string, string> = {
    PKT_HoiSo: t('auditUniverse.modal.teamHq', 'Phòng KT Hội sở & Hệ thống'),
    PKT_DVKD: t('auditUniverse.modal.teamBranch', 'Phòng KT Đơn vị Kinh doanh'),
    TongHop: t('auditEngagements.generalDepartment', 'Bộ phận Tổng hợp'),
  };

  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [engRes, findRes, recRes, expRes] = await Promise.all([
          api.get('/audit-engagements').catch(() => ({ data: [] })),
          api.get('/audit-findings').catch(() => ({ data: [] })),
          api.get('/recommendations').catch(() => ({ data: [] })),
          api.get('/audit-expenses').catch(() => ({ data: [] })),
        ]);
        setEngagements(Array.isArray(engRes.data) ? engRes.data : []);
        setFindings(Array.isArray(findRes.data) ? findRes.data : []);
        setRecs(Array.isArray(recRes.data) ? recRes.data : []);
        setExpenses(Array.isArray(expRes.data) ? expRes.data : []);
      // eslint-disable-next-line no-empty
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Filter by team
  const filteredEng = selectedTeam === 'all' ? engagements : engagements.filter(e => e.ownerTeam === selectedTeam);
  const filteredFindings = findings; // Findings don't have ownerTeam directly
  const filteredRecs = recs;

  // KPI calculations
  const totalPlanned = filteredEng.filter(e => e.engagementType === 'Planned').length;
  const totalUnplanned = filteredEng.filter(e => e.engagementType === 'Unplanned').length;
  const totalCompleted = filteredEng.filter(e => e.status === 'Completed').length;
  const completionRate = filteredEng.length > 0 ? Math.round((totalCompleted / filteredEng.length) * 100) : 0;

  const totalFindingsCritical = filteredFindings.filter(f => f.riskLevel === 'Critical').length;
  const totalFindingsHigh = filteredFindings.filter(f => f.riskLevel === 'High').length;

  const totalRecsOpen = filteredRecs.filter(r => r.status !== 'Closed' && r.status !== 'Verified').length;
  const totalRecsClosed = filteredRecs.filter(r => r.status === 'Closed' || r.status === 'Verified').length;
  const recRate = filteredRecs.length > 0 ? Math.round((totalRecsClosed / filteredRecs.length) * 100) : 0;

  const totalExpenseAmount = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + Number(e.amount || 0), 0);

  // Charts data
  const engStatusData = [
    { name: 'Planning', value: filteredEng.filter(e => e.status === 'Planning').length },
    { name: 'Fieldwork', value: filteredEng.filter(e => e.status === 'Fieldwork').length },
    { name: 'Reporting', value: filteredEng.filter(e => e.status === 'Reporting').length },
    { name: 'Completed', value: filteredEng.filter(e => e.status === 'Completed').length },
  ].filter(d => d.value > 0);

  const riskDistData = [
    { name: t('dashboard.charts.critical', 'Nghiêm trọng'), value: totalFindingsCritical, color: '#722ed1' },
    { name: 'Cao', value: totalFindingsHigh, color: '#cf1322' },
    { name: t('auditPlan.tabs2.filterRisk.medium', 'Trung bình'), value: filteredFindings.filter(f => f.riskLevel === 'Medium').length, color: '#faad14' },
    { name: t('auditPlan.tabs2.filterRisk.low', 'Thấp'), value: filteredFindings.filter(f => f.riskLevel === 'Low').length, color: '#52c41a' },
  ].filter(d => d.value > 0);

  // Team comparison
  const teamComparison = ['PKT_HoiSo', 'PKT_DVKD', 'TongHop'].map(team => ({
    team: TEAM_LABELS[team] || team,
    engagements: engagements.filter(e => e.ownerTeam === team).length,
    completed: engagements.filter(e => e.ownerTeam === team && e.status === 'Completed').length,
    findings: 0, // Would need ownerTeam on findings
  }));

  if (loading) return <div className="flex items-center justify-center h-96"><Spin size="large" tip={t('summaryReports.loadingReport', 'Đang tải báo cáo...')} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={3} className="!mb-1">{t('summaryReports.title', 'Báo cáo Tổng hợp')}</Title>
          <Text className="text-gray-500">Tổng hợp tình hình kiểm toán nội bộ — Năm {new Date().getFullYear()}</Text>
        </div>
        <Select value={selectedTeam} onChange={setSelectedTeam} style={{ width: 280 }}
          options={[{ value: 'all', label: t('summaryReports.filterAll', '📊 Toàn Khối KTNB') }, ...Object.entries(TEAM_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
        />
      </div>

      {/* KPI Row 1 */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} lg={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('summaryReports.kpis.planned', 'Cuộc KT kế hoạch')} value={totalPlanned} prefix={<ProjectOutlined />} /></Card></Col>
        <Col xs={12} lg={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('summaryReports.kpis.unplanned', 'KT Đột xuất')} value={totalUnplanned} valueStyle={{ color: '#722ed1' }} /></Card></Col>
        <Col xs={12} lg={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('workingPapers.actions.completed', 'Đã hoàn thành')} value={totalCompleted} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col xs={12} lg={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('summaryReports.kpis.findings', 'Phát hiện C/H')} value={totalFindingsCritical + totalFindingsHigh} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} /></Card></Col>
        <Col xs={12} lg={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('summaryReports.kpis.recsOpen', 'KN chưa xử lý')} value={totalRecsOpen} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col xs={12} lg={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('summaryReports.kpis.expense', 'Chi phí (VNĐ)')} value={totalExpenseAmount} prefix={<DollarOutlined />} formatter={(v) => Number(v).toLocaleString('vi-VN')} /></Card></Col>
      </Row>

      {/* Progress bars */}
      <Row gutter={16} className="mb-4">
        <Col span={12}>
          <Card variant="borderless" className="shadow-sm" title={t('summaryReports.progress.plan', 'Tiến độ thực hiện Kế hoạch KT')}>
            <Progress percent={completionRate} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} strokeWidth={20} format={p => `${p}%`} />
            <Text className="text-gray-500 text-sm">Hoàn thành {totalCompleted}/{filteredEng.length} cuộc kiểm toán</Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card variant="borderless" className="shadow-sm" title={t('summaryReports.progress.rec', 'Tỷ lệ khắc phục Kiến nghị')}>
            <Progress percent={recRate} strokeColor={{ '0%': '#faad14', '100%': '#52c41a' }} strokeWidth={20} format={p => `${p}%`} />
            <Text className="text-gray-500 text-sm">Đã xử lý {totalRecsClosed}/{filteredRecs.length} kiến nghị</Text>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} className="mb-4">
        <Col xs={24} lg={12}>
          <Card title={t('summaryReports.charts.status', 'Trạng thái Cuộc KT')} variant="borderless" className="shadow-sm" style={{ height: 400 }}>
            {engStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={engStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                    {engStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty description={t('summaryReports.noDataYet', 'Chưa có dữ liệu')} className="py-16" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('summaryReports.charts.risk', 'Phân bổ Phát hiện theo Mức độ')} variant="borderless" className="shadow-sm" style={{ height: 400 }}>
            {riskDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskDistData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name={t('summaryReports.quantity', 'Số lượng')}>
                    {riskDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty description={t('summaryReports.noDataYet', 'Chưa có dữ liệu')} className="py-16" />}
          </Card>
        </Col>
      </Row>

      {/* Team Comparison */}
      {selectedTeam === 'all' && (
        <Card title={t('summaryReports.charts.compare', 'So sánh giữa các Phòng KTNB')} variant="borderless" className="shadow-sm mb-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={teamComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="engagements" name={t('summaryReports.charts.compareEngagements', 'Tổng cuộc KT')} fill="#ea9105" />
              <Bar dataKey="completed" name={t('workingPapers.actions.completed', 'Đã hoàn thành')} fill="#52c41a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};

export default SummaryReports;
