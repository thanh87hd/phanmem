import React, { useMemo } from 'react';
import {
  Card,
  Table,
  Progress,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  Button,
  Space,
  Statistic,
} from 'antd';
import {
  PrinterOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type {
  PersonalKpiResult,
  KpiDetail,
} from './bscKpiTypes';
import {
  XEPLOAI_COLOR,
  BSC_PILLAR_COLOR,
  normalizeToPercent,
} from './bscKpiTypes';

const STATUS_ICON = {
  Passed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  Warning: <WarningOutlined style={{ color: '#fa8c16' }} />,
  Failed: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  NA: <InfoCircleOutlined style={{ color: '#8c8c8c' }} />,
};

const { Text } = Typography;

interface KpiPersonalTabProps {
  loading: boolean;
  result: PersonalKpiResult | null;
  period: string;
  onOpenPrintModal: () => void;
}

export const KpiPersonalTab: React.FC<KpiPersonalTabProps> = ({
  loading,
  result,
  period,
  onOpenPrintModal,
}) => {
  const radarData = useMemo(() => {
    if (!result?.pillarScores) return [];
    return Object.entries(result.pillarScores).map(([pillar, score]) => ({
      pillar: pillar.replace(' & PHÁT TRIỂN', ''),
      score: Math.min(Math.round(normalizeToPercent(score) * 10) / 10, 100),
      fullMark: 100,
    }));
  }, [result]);

  return (
    <Spin spinning={loading}>
      {result ? (
        <>
          {/* Thẻ tổng điểm */}
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={6}>
              <Card variant="borderless" style={{ textAlign: 'center', background: '#fff' }}>
                <Statistic
                  title="KPI Tổng (Chưa cộng)"
                  value={normalizeToPercent(result.totalScore).toFixed(2)}
                  suffix="%"
                  valueStyle={{
                    color: XEPLOAI_COLOR[result.xepLoai] || '#1890ff',
                    fontSize: 30,
                    fontWeight: 'bold',
                  }}
                />
                <Tag
                  color={XEPLOAI_COLOR[result.xepLoai] || 'blue'}
                  style={{ marginTop: 8, fontSize: 13 }}
                >
                  {result.xepLoai}
                </Tag>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card variant="borderless" style={{ textAlign: 'center', background: '#fff' }}>
                <Statistic
                  title="Điểm cộng thành tích"
                  value={result.bonusPoints}
                  prefix="+"
                  suffix="đ"
                  valueStyle={{ color: '#fa8c16', fontSize: 30, fontWeight: 'bold' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Rủi ro High/CT & Điểm Trưởng đoàn
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card variant="borderless" style={{ textAlign: 'center', background: '#fff' }}>
                <Statistic
                  title="Điểm Cuối Cùng (KPI + Cộng)"
                  value={normalizeToPercent(result.finalScore).toFixed(2)}
                  suffix="%"
                  valueStyle={{ color: '#ea9105', fontSize: 30, fontWeight: 'bold' }}
                />
                <Tag color="blue" style={{ marginTop: 8 }}>
                  Tính thi đua
                </Tag>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card variant="borderless" style={{ textAlign: 'center', background: '#fff' }}>
                <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>
                  Kỳ đánh giá & Đơn vị
                </div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#262626' }}>
                  {period}
                </div>
                <Tag color="cyan" style={{ marginTop: 6 }}>
                  {result.department || 'Khối KTNB'}
                </Tag>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={24} md={8}>
              <Card title="Biểu đồ BSC 4 Trụ Cột" variant="borderless">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11 }} />
                    <Radar
                      name="Điểm (%)"
                      dataKey="score"
                      stroke="#ea9105"
                      fill="#ea9105"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card title="Điểm theo Trụ Cột BSC" variant="borderless">
                {Object.entries(result.pillarScores || {}).map(([pillar, score]) => {
                  const percentScore = normalizeToPercent(score);
                  return (
                    <div key={pillar} style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Tag color={BSC_PILLAR_COLOR[pillar] || 'default'}>{pillar}</Tag>
                        <Text strong>{percentScore.toFixed(2)}%</Text>
                      </div>
                      <Progress
                        percent={Math.min(Math.round(percentScore * 10) / 10, 100)}
                        strokeColor={
                          XEPLOAI_COLOR[percentScore >= 10 ? 'Vượt yêu cầu' : 'Không đạt']
                        }
                        status={percentScore >= 8 ? 'success' : 'exception'}
                      />
                    </div>
                  );
                })}
              </Card>
            </Col>
          </Row>

          {/* Bảng chi tiết */}
          <Card
            title={`Chi tiết Chỉ Tiêu KPI Áp Dụng — ${result.fullName} | ${period}`}
            extra={
              <Space>
                <Button icon={<PrinterOutlined />} onClick={onOpenPrintModal}>
                  In Mẫu Biểu MB02
                </Button>
              </Space>
            }
            variant="borderless"
          >
            <Table
              dataSource={result.details}
              columns={[
                {
                  title: 'Mã KPI',
                  dataIndex: 'kpiCode',
                  width: 90,
                  render: (v: string) => (
                    <Tag color="default">
                      <b>{v}</b>
                    </Tag>
                  ),
                },
                {
                  title: 'Chỉ tiêu Đánh Giá (MB02.HRM.2026)',
                  dataIndex: 'kpiName',
                  render: (name: string, row: KpiDetail) => (
                    <div>
                      <div>
                        <b>{name}</b>
                      </div>
                      <Tag
                        color={BSC_PILLAR_COLOR[row.bscPillar] || 'default'}
                        style={{ fontSize: 10, marginTop: 2 }}
                      >
                        {row.bscPillar}
                      </Tag>
                      {row.notes && (
                        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                          📌 {row.notes}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  title: 'Trọng số',
                  dataIndex: 'weight',
                  width: 80,
                  render: (v: number) => (
                    <Text strong>{normalizeToPercent(v).toFixed(0)}%</Text>
                  ),
                },
                {
                  title: 'Ngưỡng / Mục tiêu',
                  width: 130,
                  render: (_: any, row: KpiDetail) => (
                    <div style={{ fontSize: 12 }}>
                      <div>
                        Ngưỡng: <b>{normalizeToPercent(row.threshold).toFixed(0)}%</b>
                      </div>
                      <div>
                        Mục tiêu: <b>{normalizeToPercent(row.target).toFixed(0)}%</b>
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Kết quả Thực Tế',
                  dataIndex: 'actualValue',
                  width: 110,
                  render: (v: number | null) =>
                    v !== null ? (
                      <Text strong style={{ color: '#ea9105' }}>
                        {normalizeToPercent(v).toFixed(1)}%
                      </Text>
                    ) : (
                      <Text type="secondary">N/A</Text>
                    ),
                },
                {
                  title: 'Tỷ lệ hoàn thành',
                  dataIndex: 'completionRate',
                  width: 160,
                  render: (v: number | null, row: KpiDetail) => {
                    if (v === null) return <Text type="secondary">Chưa đủ dữ liệu</Text>;
                    const p = normalizeToPercent(v);
                    return (
                      <Progress
                        percent={Math.min(Math.round(p), 100)}
                        size="small"
                        status={
                          row.status === 'Passed'
                            ? 'success'
                            : row.status === 'Failed'
                              ? 'exception'
                              : 'active'
                        }
                        format={() => `${p.toFixed(1)}%`}
                      />
                    );
                  },
                },
                {
                  title: 'Điểm có trọng số',
                  dataIndex: 'weightedScore',
                  width: 120,
                  render: (v: number | null) =>
                    v !== null ? (
                      <Text strong>{normalizeToPercent(v).toFixed(2)}%</Text>
                    ) : (
                      '-'
                    ),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  width: 100,
                  render: (status: 'Passed' | 'Warning' | 'Failed' | 'NA') => (
                    <Space>
                      {STATUS_ICON[status]}
                      <Text style={{ fontSize: 12 }}>
                        {status === 'Passed'
                          ? 'Đạt'
                          : status === 'Warning'
                            ? 'Cảnh báo'
                            : status === 'Failed'
                              ? 'Chưa đạt'
                              : 'N/A'}
                      </Text>
                    </Space>
                  ),
                },
              ]}
              rowKey="kpiCode"
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">Chọn kỳ đánh giá và nhấn "Tính lại" để xem KPI</Text>
          </div>
        </Card>
      )}
    </Spin>
  );
};
