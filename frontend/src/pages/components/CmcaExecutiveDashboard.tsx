import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Progress, Tag, Table, Statistic, Badge, Space, Typography, Empty, Spin, Tooltip } from 'antd';
import {
  SafetyCertificateOutlined, BankOutlined, TeamOutlined,
  DollarOutlined, SwapOutlined, RadarChartOutlined,
  WarningOutlined, AlertOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PILLAR_META: Record<string, { icon: React.ReactNode; label: string; shortLabel: string; color: string }> = {
  'Capital':          { icon: <SafetyCertificateOutlined />, label: 'An toàn Vốn',              shortLabel: 'C', color: '#ea9105' },
  'Asset Quality':    { icon: <BankOutlined />,             label: 'Chất lượng Tài sản',        shortLabel: 'A', color: '#722ed1' },
  'Management':       { icon: <TeamOutlined />,             label: 'Quản trị & Tuân thủ',       shortLabel: 'M', color: '#13c2c2' },
  'Earnings':         { icon: <DollarOutlined />,           label: 'Hiệu quả Kinh doanh',      shortLabel: 'E', color: '#fa8c16' },
  'Liquidity':        { icon: <SwapOutlined />,             label: 'Thanh khoản & Nguồn vốn',   shortLabel: 'L', color: '#52c41a' },
  'Sensitivity':      { icon: <RadarChartOutlined />,       label: 'Độ nhạy Thị trường',        shortLabel: 'S', color: '#eb2f96' },
};

const getScoreColor = (score: number) => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
};

const getScoreStatus = (score: number): 'success' | 'normal' | 'exception' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'normal';
  return 'exception';
};

interface Props {
  loading?: boolean;
  onOpenMetricDrilldown?: (branchCode: string, metricKey: string) => void;
}

const PILLAR_DEFAULT_METRIC: Record<string, string> = {
  'Capital': 'carRatio',
  'Asset Quality': 'nplRatio',
  'Management': 'remediationOverdueDays',
  'Earnings': 'nimRatio',
  'Liquidity': 'ldrRatio',
  'Sensitivity': 'bdsExposureRatio',
};

const CmcaExecutiveDashboard: React.FC<Props> = ({ onOpenMetricDrilldown }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/continuous-monitoring/executive-summary')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!data || typeof data === 'string' || !data.pillarScores || !data.alertSummary) {
    return <Empty description="Chưa có dữ liệu Tổng quan Lãnh đạo" style={{ margin: '80px 0' }} />;
  }

  const { pillarScores, alertSummary, activeScenarios = [], slaSummary = { total: 0, onTime: 0, pending: 0, overdue: 0 }, recentCases = [] } = data;

  const scenarioCols = [
    { title: 'Kịch bản', dataIndex: 'title', key: 'title', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: 'Đơn vị', dataIndex: 'unitName', key: 'unitName' },
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
  ];

  const caseCols = [
    { title: 'Mã Case', dataIndex: 'caseId', key: 'caseId', render: (v: string) => <Text copyable style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Chi nhánh', dataIndex: 'branchCode', key: 'branchCode' },
    { title: 'Trạng thái', dataIndex: 'explanationStatus', key: 'explanationStatus', render: (v: string) => {
      const colors: Record<string, string> = { PENDING_EXPLANATION: 'warning', EXPLAINED: 'processing', APPROVED: 'success', REJECTED: 'error' };
      const labels: Record<string, string> = { PENDING_EXPLANATION: 'Chờ giải trình', EXPLAINED: 'Đã giải trình', APPROVED: 'Chấp nhận', REJECTED: 'Từ chối' };
      return <Tag color={colors[v] || 'default'}>{labels[v] || v}</Tag>;
    }},
    { title: 'SLA', dataIndex: 'slaDeadline', key: 'slaDeadline', render: (v: string) => {
      const deadline = dayjs(v);
      const now = dayjs();
      const hoursLeft = deadline.diff(now, 'hour');
      if (hoursLeft < 0) return <Tag color="red">Quá hạn {Math.abs(hoursLeft)}h</Tag>;
      if (hoursLeft < 8) return <Tag color="warning">{hoursLeft}h còn lại</Tag>;
      return <Tag color="green">{hoursLeft}h còn lại</Tag>;
    }},
    { title: 'Tạo lúc', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
  ];

  return (
    <div>
      {/* Row 1: CAMELS Health Score Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {(pillarScores || []).map((ps: any) => {
          const meta = PILLAR_META[ps.pillar] || { icon: null, label: ps.pillar, shortLabel: '?', color: '#999' };
          const defaultMetric = PILLAR_DEFAULT_METRIC[ps.pillar] || 'carRatio';
          return (
            <Col key={ps.pillar} xs={12} sm={8} md={4}>
              <Card
                size="small"
                hoverable
                onClick={() => onOpenMetricDrilldown && onOpenMetricDrilldown('Hội sở chính (HO)', defaultMetric)}
                style={{
                  borderTop: `3px solid ${getScoreColor(ps.score)}`,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                styles={{ body: { padding: '12px 8px' } }}
              >
                <Tooltip title={`${meta.label}: ${ps.redCount} cảnh báo Đỏ, ${ps.yellowCount} cảnh báo Vàng. Click để mở báo cáo chi tiết chỉ số đại diện.`}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>
                    {meta.icon} <strong>{meta.shortLabel}</strong> — {meta.label}
                  </div>
                  <Progress
                    type="dashboard"
                    percent={ps.score}
                    size={72}
                    strokeColor={getScoreColor(ps.score)}
                    status={getScoreStatus(ps.score)}
                    format={(p) => <span style={{ fontSize: 16, fontWeight: 700 }}>{p}</span>}
                  />
                  <div style={{ marginTop: 4 }}>
                    {ps.redCount > 0 && <Badge count={ps.redCount} style={{ backgroundColor: '#ff4d4f', marginRight: 4 }} title="Đỏ" />}
                    {ps.yellowCount > 0 && <Badge count={ps.yellowCount} style={{ backgroundColor: '#faad14' }} title="Vàng" />}
                    {ps.redCount === 0 && ps.yellowCount === 0 && <Tag color="success">An toàn</Tag>}
                  </div>
                  <div style={{ fontSize: 10, color: '#ea9105', marginTop: 4 }}>
                    🔍 Xem drill-down
                  </div>
                </Tooltip>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Row 2: Alert Summary + Composite Scenarios */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card size="small" title={<><AlertOutlined /> Tổng hợp Cảnh báo đang mở</>}>
            <Row gutter={8}>
              <Col span={8}>
                <Statistic title="Tổng" value={alertSummary.total} prefix={<WarningOutlined />} />
              </Col>
              <Col span={8}>
                <Statistic title="Đỏ" value={alertSummary.red} valueStyle={{ color: '#cf1322' }} prefix={<ExclamationCircleOutlined />} />
              </Col>
              <Col span={8}>
                <Statistic title="Vàng" value={alertSummary.yellow} valueStyle={{ color: '#d46b08' }} prefix={<WarningOutlined />} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" title={<><RadarChartOutlined /> Kịch bản Tích hợp Nâng cao đang kích hoạt</>}>
            {activeScenarios.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div style={{ color: '#52c41a', marginTop: 4 }}>Không có kịch bản rủi ro nghiêm trọng nào đang kích hoạt</div>
              </div>
            ) : (
              <Table
                columns={scenarioCols}
                dataSource={activeScenarios}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: SLA Compliance + Recent Cases */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" title={<><ClockCircleOutlined /> SLA Compliance</>}>
            <Space orientation="vertical" style={{ width: '100%' }} size={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Tổng Hồ sơ</Text>
                <Text strong>{slaSummary.total}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text><CheckCircleOutlined style={{ color: '#52c41a' }} /> Đúng hạn / Đã xử lý</Text>
                <Text strong style={{ color: '#52c41a' }}>{slaSummary.onTime}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text><ClockCircleOutlined style={{ color: '#faad14' }} /> Đang chờ (trong SLA)</Text>
                <Text strong style={{ color: '#faad14' }}>{slaSummary.pending}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> Quá hạn SLA</Text>
                <Text strong style={{ color: '#ff4d4f' }}>{slaSummary.overdue}</Text>
              </div>
              {slaSummary.total > 0 && (
                <Progress
                  percent={Math.round(((slaSummary.onTime) / slaSummary.total) * 100)}
                  status={slaSummary.overdue > 0 ? 'exception' : 'success'}
                  format={(p) => `${p}% tuân thủ`}
                />
              )}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" title={<><SafetyCertificateOutlined /> Hồ sơ Kiểm toán gần đây (Audit Cases)</>}>
            <Table
              columns={caseCols}
              dataSource={recentCases || []}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có hồ sơ kiểm toán nào' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CmcaExecutiveDashboard;
