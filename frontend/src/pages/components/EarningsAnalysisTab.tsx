import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, Row, Col, Statistic, Table, Tag, Select, 
  Space, Typography, Alert, Progress, Tooltip, Button, Empty, Spin 
} from 'antd';
import { 
  DollarOutlined, RiseOutlined, FallOutlined, 
  WarningOutlined, CheckCircleOutlined, SyncOutlined, 
  PieChartOutlined, LineChartOutlined, BankOutlined, 
  CalculatorOutlined, InfoCircleOutlined 
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Props {
  onOpenMetricDrilldown?: (branchCode: string, metricKey: string) => void;
}

export const EarningsAnalysisTab: React.FC<Props> = ({ onOpenMetricDrilldown }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  const fetchEarningsData = (branch: string) => {
    setLoading(true);
    api.get(`/continuous-monitoring/earnings-analysis?branchCode=${encodeURIComponent(branch)}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEarningsData(selectedBranch);
  }, [selectedBranch]);

  if (loading && !data) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  const summary = data?.summary || {};
  const risks = data?.phantomProfitRisks || [];
  const branchBreakdown = data?.branchBreakdown || [];

  const columns = [
    {
      title: 'Chi nhánh / Đơn vị',
      dataIndex: 'branchCode',
      key: 'branchCode',
      fixed: 'left' as const,
      width: 170,
      render: (v: string) => <Text strong><BankOutlined /> {v}</Text>
    },
    {
      title: 'LNTT (PBT)',
      dataIndex: 'profitBeforeTax',
      key: 'profitBeforeTax',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#ea9105' }}>{v?.toLocaleString()} tỷ</Text>
    },
    {
      title: 'Tăng trưởng PBT',
      dataIndex: 'pbtGrowthPct',
      key: 'pbtGrowthPct',
      width: 130,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {v >= 0 ? `+${v}%` : `${v}%`}
        </span>
      )
    },
    {
      title: 'NII (Thu nhập lãi)',
      dataIndex: 'netInterestIncome',
      key: 'netInterestIncome',
      width: 130,
      align: 'right' as const,
      render: (v: number) => `${v?.toLocaleString()} tỷ`
    },
    {
      title: 'Non-II (Ngoài lãi)',
      dataIndex: 'nonInterestIncome',
      key: 'nonInterestIncome',
      width: 130,
      align: 'right' as const,
      render: (v: number) => `${v?.toLocaleString()} tỷ`
    },
    {
      title: 'Chi phí QL (OPEX)',
      dataIndex: 'operatingExpense',
      key: 'operatingExpense',
      width: 130,
      align: 'right' as const,
      render: (v: number) => `${v?.toLocaleString()} tỷ`
    },
    {
      title: 'Dự phòng RR (CoC)',
      dataIndex: 'provisionExpense',
      key: 'provisionExpense',
      width: 130,
      align: 'right' as const,
      render: (v: number) => `${v?.toLocaleString()} tỷ`
    },
    {
      title: 'NIM (%)',
      dataIndex: 'nimRatio',
      key: 'nimRatio',
      width: 95,
      render: (v: number, r: any) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => onOpenMetricDrilldown && onOpenMetricDrilldown(r.branchCode, 'nimRatio')}
          style={{ padding: 0, fontWeight: 600 }}
        >
          {v}%
        </Button>
      )
    },
    {
      title: 'ROA (%)',
      dataIndex: 'roaRatio',
      key: 'roaRatio',
      width: 90,
      render: (v: number, r: any) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => onOpenMetricDrilldown && onOpenMetricDrilldown(r.branchCode, 'roaRatio')}
          style={{ padding: 0, fontWeight: 600 }}
        >
          {v}%
        </Button>
      )
    },
    {
      title: 'CIR (%)',
      dataIndex: 'cirRatio',
      key: 'cirRatio',
      width: 90,
      render: (v: number, r: any) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => onOpenMetricDrilldown && onOpenMetricDrilldown(r.branchCode, 'cirRatio')}
          style={{ padding: 0, fontWeight: 600 }}
        >
          {v}%
        </Button>
      )
    },
    {
      title: 'Lãi dự thu (%)',
      dataIndex: 'accruedInterestRatio',
      key: 'accruedInterestRatio',
      width: 110,
      render: (v: number, r: any) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => onOpenMetricDrilldown && onOpenMetricDrilldown(r.branchCode, 'accruedInterestRatio')}
          style={{ padding: 0, fontWeight: 600, color: v > 7.0 ? '#cf1322' : undefined }}
        >
          {v}%
        </Button>
      )
    },
    {
      title: 'Đánh giá Chất lượng',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 140,
      render: (v: string, r: any) => <Tag color={r.qualityColor}>{v}</Tag>
    }
  ];

  return (
    <div>
      {/* Header controls */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <DollarOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
            Đánh giá Lợi nhuận & Chất lượng Thu nhập (Earnings Decomposition)
          </Title>
          <Text type="secondary">
            Bóc tách nguồn gốc tăng trưởng, cơ cấu doanh thu & giám sát rủi ro lãi ảo (Accrued Interest vs Group 2)
          </Text>
        </div>
        <Space>
          <Select 
            value={selectedBranch} 
            onChange={(v) => setSelectedBranch(v)}
            style={{ width: 220 }}
          >
            <Option value="ALL">Toàn hệ thống (Hợp nhất)</Option>
            <Option value="Hội sở chính (HO)">Hội sở chính (HO)</Option>
            <Option value="Chi nhánh Hà Nội">Chi nhánh Hà Nội</Option>
            <Option value="Chi nhánh Sài Gòn">Chi nhánh Sài Gòn</Option>
            <Option value="Chi nhánh Đà Nẵng">Chi nhánh Đà Nẵng</Option>
          </Select>
          <Button icon={<SyncOutlined />} onClick={() => fetchEarningsData(selectedBranch)} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Row 1: KPI Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
            <Statistic
              title="Tổng LNTT (PBT)"
              value={summary.totalPbt}
              suffix="tỷ"
              precision={1}
              valueStyle={{ color: '#1d39c4', fontWeight: 700 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Tăng trưởng MoM: <Text strong style={{ color: summary.pbtGrowth >= 0 ? '#389e0d' : '#cf1322' }}>
                {summary.pbtGrowth >= 0 ? `+${summary.pbtGrowth}%` : `${summary.pbtGrowth}%`}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title="Thu nhập Lãi thuần (NII)"
              value={summary.totalNii}
              suffix="tỷ"
              precision={1}
              valueStyle={{ color: '#237804', fontWeight: 700 }}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Tỷ trọng: <Text strong>{summary.niiShare}% TOI</Text> | MoM: <Text style={{ color: '#389e0d' }}>+{summary.niiGrowth}%</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
            <Statistic
              title="Thu nhập Ngoài lãi (Non-II)"
              value={summary.totalNonIi}
              suffix="tỷ"
              precision={1}
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Tỷ trọng: <Text strong>{summary.nonIiShare}% TOI</Text> | Phí dịch vụ & FX
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#fafafa', borderColor: '#d9d9d9' }}>
            <Statistic
              title="Biên lãi thuần bình quân (NIM)"
              value={summary.avgNim}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#ea9105', fontWeight: 700 }}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              CIR TB: <Text strong>{summary.avgCir}%</Text> | Lãi dự thu TB: <Text strong>{summary.avgAccruedRatio}%</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Profitability Breakdown & Phantom Profit Warning */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Left: Profit Drivers (Lợi nhuận đến từ đâu?) */}
        <Col xs={24} md={12}>
          <Card 
            size="small" 
            title={<><PieChartOutlined /> Bóc tách Nguồn gốc Lợi nhuận ("Lợi nhuận đến từ đâu?")</>}
            style={{ height: '100%' }}
          >
            <div style={{ marginBottom: 14 }}>
              <div className="flex justify-between mb-1">
                <Text strong>1. Hoạt động Tín dụng thuần (Thu nhập lãi - NII)</Text>
                <Text strong style={{ color: '#237804' }}>{summary.niiShare}% ({summary.totalNii} tỷ)</Text>
              </div>
              <Progress percent={summary.niiShare} strokeColor="#52c41a" showInfo={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>Đóng góp từ tăng trưởng tín dụng và tối ưu hóa chi phí vốn CASA</Text>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="flex justify-between mb-1">
                <Text strong>2. Dịch vụ, Thanh toán & Phí giao dịch</Text>
                {/* ponytail: tỷ lệ 65% phí dịch vụ / 35% FX là placeholder — upgrade khi có data tách cấu phần Non-II từ T24/Flexcube */}
                <Text strong style={{ color: '#fa8c16' }}>{summary.nonIiShare ? (summary.nonIiShare * 0.65).toFixed(1) : 15.0}% ({(summary.totalNonIi * 0.65).toFixed(1)} tỷ)</Text>
              </div>
              <Progress percent={summary.nonIiShare ? Number((summary.nonIiShare * 0.65).toFixed(0)) : 15} strokeColor="#fa8c16" showInfo={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>Phí tài trợ thương mại, thanh toán quốc tế và bảo hiểm bancassurance</Text>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="flex justify-between mb-1">
                <Text strong>3. Kinh doanh Ngoại hối & Đầu tư Chứng khoán</Text>
                <Text strong style={{ color: '#ea9105' }}>{summary.nonIiShare ? (summary.nonIiShare * 0.35).toFixed(1) : 8.0}% ({(summary.totalNonIi * 0.35).toFixed(1)} tỷ)</Text>
              </div>
              <Progress percent={summary.nonIiShare ? Number((summary.nonIiShare * 0.35).toFixed(0)) : 8} strokeColor="#ea9105" showInfo={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>Lãi kinh doanh trái phiếu chính phủ và kinh doanh chênh lệch tỷ giá FX</Text>
            </div>

            <div style={{ padding: '10px 12px', background: '#f5f5f5', borderRadius: 6 }}>
              <Text style={{ fontSize: 12 }}>
                <InfoCircleOutlined style={{ color: '#ea9105', marginRight: 6 }} />
                <strong>Đánh giá cơ cấu:</strong> Lợi nhuận ngân hàng duy trì sự lành mạnh với tỷ trọng NII chiếm ưu thế vững chắc ({summary.niiShare}%), nguồn thu ngoài lãi Non-II giữ vai trò đòn bẩy đa dạng hóa rủi ro.
              </Text>
            </div>
          </Card>
        </Col>

        {/* Right: Phantom profit risk & Accrued Interest Analysis */}
        <Col xs={24} md={12}>
          <Card 
            size="small" 
            title={<><WarningOutlined style={{ color: '#cf1322' }} /> Giám sát Lãi ảo & Chất lượng Lợi nhuận (Accrued Interest Risk)</>}
            style={{ height: '100%' }}
          >
            {risks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 36, color: '#52c41a', marginBottom: 8 }} />
                <div style={{ fontWeight: 600, color: '#52c41a' }}>Không phát hiện tín hiệu Lãi ảo nghiêm trọng</div>
                <Text type="secondary" style={{ fontSize: 12 }}>Tỷ lệ lãi dự thu và tốc độ tăng nợ nhóm 2 nằm trong ngưỡng kiểm soát an toàn.</Text>
              </div>
            ) : (
              <div>
                <Alert
                  type="warning"
                  showIcon
                  message="Phát hiện đơn vị có rủi ro Lãi ảo tiềm ẩn"
                  description="Các đơn vị có tỷ lệ Lãi dự thu/Thu nhập lãi cao kết hợp nợ nhóm 2 tăng nhanh cần được kiểm toán nội bộ rà soát thoái thu."
                  style={{ marginBottom: 12 }}
                />
                {risks.map((r: any, idx: number) => (
                  <div key={idx} style={{ padding: '8px 12px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 6, marginBottom: 8 }}>
                    <div className="flex justify-between items-center">
                      <Text strong style={{ color: '#cf1322' }}>{r.branchCode}</Text>
                      <Tag color="error">Cảnh báo Lãi ảo</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                      • Lãi dự thu/Thu nhập lãi: <Text strong style={{ color: '#cf1322' }}>{r.accruedInterestRatio}%</Text> (Tăng +{r.accruedInterestGrowth}% MoM)
                    </div>
                    <div style={{ fontSize: 12, color: '#595959' }}>
                      • Nợ nhóm 2 biến động MoM: <Text strong style={{ color: '#cf1322' }}>+{r.group2GrowthMom}%</Text>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>Quy chuẩn kiểm toán:</strong> Theo TT 52/2018 và TT 11/2021, khi NIM tăng nhưng Lãi dự thu/Thu nhập lãi &gt; 6% và Nợ nhóm 2 tăng &gt; 10% MoM, nguy cơ cao ngân hàng đang ghi nhận doanh thu từ các khoản nợ chậm luân chuyển.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Branch breakdown table */}
      <Card 
        size="small" 
        title={
          <div className="flex justify-between items-center">
            <span><BankOutlined /> Chi tiết Cơ cấu Lợi nhuận & Chỉ số Hiệu quả theo Chi nhánh</span>
            <Text type="secondary" style={{ fontSize: 12 }}>Click vào các chỉ số NIM, ROA, CIR, Lãi dự thu để xem báo cáo giải trình chi tiết</Text>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={branchBreakdown}
          rowKey="branchCode"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default EarningsAnalysisTab;
