import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, Row, Col, Statistic, Table, Tag, Select, 
  Space, Typography, Alert, Button, Spin, Tooltip, Badge, Divider 
} from 'antd';
import { 
  SwapOutlined, AlertOutlined, CheckCircleOutlined, 
  SyncOutlined, BankOutlined, ArrowRightOutlined, 
  FallOutlined, RiseOutlined, InfoCircleOutlined, ThunderboltOutlined 
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Props {
  onOpenMetricDrilldown?: (branchCode: string, metricKey: string) => void;
}

const GROUP_LABELS = [
  'Nhóm 1 (Đủ tiêu chuẩn)',
  'Nhóm 2 (Cần chú ý)',
  'Nhóm 3 (Dưới tiêu chuẩn)',
  'Nhóm 4 (Nghi ngờ)',
  'Nhóm 5 (Có khả năng mất vốn)'
];

const GROUP_SHORT = ['N1', 'N2', 'N3', 'N4', 'N5'];

export const DebtMigrationTab: React.FC<Props> = ({ onOpenMetricDrilldown }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  const fetchMigrationData = (branch: string) => {
    setLoading(true);
    api.get(`/continuous-monitoring/debt-migration?branchCode=${encodeURIComponent(branch)}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMigrationData(selectedBranch);
  }, [selectedBranch]);

  if (loading && !data) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  const summary = data?.summary || {};
  const matrix = data?.matrix || [];
  const rates = data?.rates || [];
  const records = data?.records || [];

  // 5x5 Matrix table columns
  const matrixColumns = [
    {
      title: 'Nhóm nợ Đầu kỳ (06/2026)',
      dataIndex: 'originGroup',
      key: 'originGroup',
      width: 220,
      render: (text: string, _: any, idx: number) => (
        <Text strong style={{ color: idx === 0 ? '#389e0d' : idx === 1 ? '#d46b08' : '#cf1322' }}>
          {text}
        </Text>
      )
    },
    ...GROUP_SHORT.map((colName, colIdx) => ({
      title: (
        <div style={{ textAlign: 'center' as const }}>
          <div>{colName}</div>
          <div style={{ fontSize: 10, color: '#8c8c8c' }}>Cuối kỳ</div>
        </div>
      ),
      key: `dest_${colIdx}`,
      width: 120,
      render: (_: any, record: any, rowIdx: number) => {
        const amount = matrix[rowIdx]?.[colIdx] || 0;
        const rate = rates[rowIdx]?.[colIdx] || 0;

        // Diagonal (retained in same group)
        const isDiagonal = rowIdx === colIdx;
        // Above diagonal = Downgraded (deterioration)
        const isDowngrade = colIdx > rowIdx;
        // Below diagonal = Upgraded (recovery / cure)
        const isUpgrade = colIdx < rowIdx;

        let bgColor = '#fff';
        let borderColor = '#f0f0f0';
        let textColor = '#262626';

        if (isDiagonal) {
          bgColor = '#f6ffed';
          borderColor = '#b7eb8f';
          textColor = '#237804';
        } else if (isDowngrade) {
          if (colIdx >= 2) {
            bgColor = '#fff1f0';
            borderColor = '#ffa39e';
            textColor = '#cf1322';
          } else {
            bgColor = '#fffbe6';
            borderColor = '#ffe58f';
            textColor = '#d46b08';
          }
        } else if (isUpgrade) {
          bgColor = '#fdf6ec';
          borderColor = '#f5d8a8';
          textColor = '#b26b00';
        }

        return (
          <div
            style={{
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              padding: '6px 4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: textColor }}>
              {amount.toLocaleString()} tỷ
            </div>
            <div style={{ fontSize: 11, color: '#595959' }}>
              ({rate}%)
            </div>
          </div>
        );
      }
    }))
  ];

  const matrixDataSource = GROUP_LABELS.map((label, idx) => ({
    key: `row_${idx}`,
    originGroup: label,
    rowIdx: idx
  }));

  // Branch migration summary table
  const branchSummaryColumns = [
    {
      title: 'Chi nhánh / Đơn vị',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (v: string, r: any) => <Text strong><BankOutlined /> {v || r.branchCode}</Text>
    },
    {
      title: 'Tổng Dư nợ',
      dataIndex: 'totalEndingBalance',
      key: 'totalEndingBalance',
      align: 'right' as const,
      render: (v: number) => `${v?.toLocaleString()} tỷ`
    },
    {
      title: 'Tỷ lệ nảy Nợ Nhóm 2 (G1 → G2)',
      dataIndex: 'g2FormationRate',
      key: 'g2FormationRate',
      align: 'right' as const,
      render: (v: number) => {
        const isHigh = v > 3.0;
        return (
          <Tag color={isHigh ? 'red' : v > 2.0 ? 'warning' : 'green'} style={{ fontWeight: 600 }}>
            {v}% {isHigh ? '⚠️' : ''}
          </Tag>
        );
      }
    },
    {
      title: 'Tỷ lệ Chuyển Nợ xấu (G1-2 → G3-5)',
      dataIndex: 'nplFormationRate',
      key: 'nplFormationRate',
      align: 'right' as const,
      render: (v: number) => {
        const isHigh = v > 0.5;
        return (
          <Tag color={isHigh ? 'error' : 'blue'} style={{ fontWeight: 600 }}>
            {v}%
          </Tag>
        );
      }
    },
    {
      title: 'Thu hồi Nợ xấu sau XL',
      dataIndex: 'recoveredAmount',
      key: 'recoveredAmount',
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#389e0d' }}>+{v} tỷ</Text>
    },
    {
      title: 'Rủi ro Dịch chuyển',
      key: 'riskLevel',
      render: (_: any, r: any) => {
        if (r.g2FormationRate > 3.2 || r.nplFormationRate > 0.6) {
          return <Tag color="error">🔴 Rủi ro cao</Tag>;
        }
        if (r.g2FormationRate > 2.2) {
          return <Tag color="warning">🟡 Cảnh báo</Tag>;
        }
        return <Tag color="success">🟢 An toàn</Tag>;
      }
    }
  ];

  return (
    <div>
      {/* Header controls */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <SwapOutlined style={{ color: '#722ed1', marginRight: 8 }} />
            Ma trận Dịch chuyển Nhóm nợ (Credit Migration Matrix 5×5)
          </Title>
          <Text type="secondary">
            Theo dõi luồng trượt nhóm nợ, tỷ lệ nảy nợ nhóm 2 và tốc độ hình thành nợ xấu mới qua các kỳ phân tích
          </Text>
        </div>
        <Space>
          <Select 
            value={selectedBranch} 
            onChange={(v) => setSelectedBranch(v)}
            style={{ width: 220 }}
          >
            <Option value="ALL">Toàn hệ thống (Hợp nhất)</Option>
            <Option value="Hội sở chính (HO)">Hội Sở Chính</Option>
            <Option value="Chi nhánh Hà Nội">Chi nhánh Hà Nội</Option>
            <Option value="Chi nhánh Sài Gòn">Chi nhánh Sài Gòn</Option>
            <Option value="Chi nhánh Đà Nẵng">Chi nhánh Đà Nẵng</Option>
          </Select>
          <Button icon={<SyncOutlined />} onClick={() => fetchMigrationData(selectedBranch)} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Row 1: KPI Statistics */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
            <Statistic
              title="Tổng Dư nợ Giám sát"
              value={summary.totalEnding}
              suffix="tỷ"
              precision={1}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
              prefix={<BankOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Kỳ trước: <Text strong>{summary.totalBeginning} tỷ</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
            <Statistic
              title="Tỷ lệ Nảy Nợ Nhóm 2 (G1 → G2)"
              value={summary.g2FormationRate}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
              prefix={<RiseOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Ngưỡng cảnh báo: <Text strong style={{ color: '#cf1322' }}>&gt; 3.0%</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
            <Statistic
              title="Tỷ lệ Hình thành Nợ xấu (NPL Formation)"
              value={summary.nplFormationRate}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
              prefix={<AlertOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Chuyển sang Nhóm 3-4-5 từ N1 &amp; N2
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title="Thu hồi Nợ xấu sau XL &amp; Phục hồi"
              value={summary.recoveredAmount}
              suffix="tỷ"
              precision={1}
              valueStyle={{ color: '#389e0d', fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Tỷ lệ Cure Rate (N2,3 → N1): <Text strong style={{ color: '#389e0d' }}>{summary.cureRate}%</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 2: 5x5 Transition Matrix Table */}
      <Card 
        size="small" 
        title={
          <div className="flex justify-between items-center">
            <span><SwapOutlined /> Ma trận Chuyển nhóm Nợ (Tháng 06/2026 → Tháng 07/2026)</span>
            <Space size="middle" style={{ fontSize: 12 }}>
              <span><Badge color="#52c41a" text="Giữ nguyên nhóm" /></span>
              <span><Badge color="#ff4d4f" text="Trượt nhóm (Suy giảm)" /></span>
              <span><Badge color="#ea9105" text="Nâng nhóm (Phục hồi)" /></span>
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={matrixColumns}
          dataSource={matrixDataSource}
          rowKey="key"
          pagination={false}
          size="middle"
          bordered
        />
      </Card>

      {/* Row 3: Transition Flow Analysis & Branch Comparison Table */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Card size="small" title={<><InfoCircleOutlined /> Phân tích Chi tiết Luồng Dịch chuyển</>} style={{ height: '100%' }}>
            <div style={{ padding: '8px 12px', background: '#fff1f0', borderRadius: 6, marginBottom: 10 }}>
              <Text strong style={{ color: '#cf1322' }}>🔻 Luồng Suy giảm Tín dụng (Deterioration Flow):</Text>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                • <strong>Nợ đủ tiêu chuẩn → Nhóm 2:</strong> {matrix[0]?.[1] || 0} tỷ ({rates[0]?.[1] || 0}%) do quá hạn 10-90 ngày.
              </div>
              <div style={{ fontSize: 12 }}>
                • <strong>Nợ nhóm 2 → Nợ xấu (N3-5):</strong> {((matrix[1]?.[2] || 0) + (matrix[1]?.[3] || 0) + (matrix[1]?.[4] || 0)).toFixed(1)} tỷ.
              </div>
            </div>

            <div style={{ padding: '8px 12px', background: '#fdf6ec', border: '1px solid #f5d8a8', borderRadius: 6, marginBottom: 10 }}>
              <Text strong style={{ color: '#b26b00' }}>🔺 Luồng Phục hồi Tín dụng (Recovery Flow):</Text>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                • <strong>Nợ nhóm 2, 3 hoàn trả về Nhóm 1:</strong> {((matrix[1]?.[0] || 0) + (matrix[2]?.[0] || 0)).toFixed(1)} tỷ.
              </div>
              <div style={{ fontSize: 12 }}>
                • <strong>Thu hồi nợ xấu ngoại bảng:</strong> {summary.recoveredAmount} tỷ VNĐ.
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              message="Khuyến nghị Kiểm toán Liên tục (CMCA)"
              description="Đơn vị có tỷ lệ nảy nợ nhóm 2 > 3.0% cần kiểm tra quy trình thẩm định cấp tín dụng ban đầu và kiểm soát dòng tiền trả nợ của khách hàng."
            />
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card 
            size="small" 
            title={<><BankOutlined /> Bảng So sánh & Cảnh báo Dịch chuyển Nợ theo Chi nhánh</>}
            style={{ height: '100%' }}
          >
            <Table
              columns={branchSummaryColumns}
              dataSource={records}
              rowKey={(r: any, idx) => r.id ?? r.branchCode ?? r.branch ?? `rec_${idx}`}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DebtMigrationTab;
