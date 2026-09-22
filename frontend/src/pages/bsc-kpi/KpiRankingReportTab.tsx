import React from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  Button,
  Space,
  Slider,
  Progress,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { normalizeToPercent } from './bscKpiTypes';

const { Text } = Typography;

interface KpiRankingReportTabProps {
  summaryLoading: boolean;
  quotaA1: number;
  setQuotaA1: (val: number) => void;
  quotaA2: number;
  setQuotaA2: (val: number) => void;
  autoAssignRanks: () => void;
  totalCount: number;
  currentA1Count: number;
  currentA2Count: number;
  currentA3Count: number;
  currentCCount: number;
  departmentStats: any[];
}

export const KpiRankingReportTab: React.FC<KpiRankingReportTabProps> = ({
  summaryLoading,
  quotaA1,
  setQuotaA1,
  quotaA2,
  setQuotaA2,
  autoAssignRanks,
  totalCount,
  currentA1Count,
  currentA2Count,
  currentA3Count,
  currentCCount,
  departmentStats,
}) => {
  return (
    <Spin spinning={summaryLoading}>
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#722ed1' }} />
            <span>Bộ Ràng Buộc Tỷ Lệ Xếp Hạng Cuối Năm (Quota Matrix A1 / A2 / A3)</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={autoAssignRanks}
            >
              Tự Động Phân Bổ Rank
            </Button>
          </Space>
        }
        style={{ marginBottom: 20 }}
        variant="borderless"
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>
                  <Tag color="#722ed1">Rank A1 (Vượt trội)</Tag> Tối đa:
                </Text>
                <Text strong style={{ color: '#722ed1' }}>
                  {quotaA1}% ({Math.floor(totalCount * (quotaA1 / 100))} NS)
                </Text>
              </div>
              <Slider min={5} max={30} step={1} value={quotaA1} onChange={setQuotaA1} />
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                Hiện tại:{' '}
                <b>
                  {currentA1Count}/{totalCount} (
                  {totalCount > 0 ? ((currentA1Count / totalCount) * 100).toFixed(1) : 0}
                  %)
                </b>{' '}
                {currentA1Count <= Math.floor(totalCount * (quotaA1 / 100)) ? (
                  <Tag color="success">Hợp lệ</Tag>
                ) : (
                  <Tag color="error">Vượt Quota</Tag>
                )}
              </div>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>
                  <Tag color="#ea9105">Rank A2 (Tốt)</Tag> Tối đa:
                </Text>
                <Text strong style={{ color: '#ea9105' }}>
                  {quotaA2}% ({Math.floor(totalCount * (quotaA2 / 100))} NS)
                </Text>
              </div>
              <Slider min={10} max={50} step={1} value={quotaA2} onChange={setQuotaA2} />
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                Hiện tại:{' '}
                <b>
                  {currentA2Count}/{totalCount} (
                  {totalCount > 0 ? ((currentA2Count / totalCount) * 100).toFixed(1) : 0}
                  %)
                </b>{' '}
                {currentA2Count <= Math.floor(totalCount * (quotaA2 / 100)) ? (
                  <Tag color="success">Hợp lệ</Tag>
                ) : (
                  <Tag color="error">Vượt Quota</Tag>
                )}
              </div>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>
                  <Tag color="#52c41a">Rank A3 (Đạt)</Tag> Dự kiến:
                </Text>
                <Text strong style={{ color: '#52c41a' }}>
                  {Math.max(0, 100 - quotaA1 - quotaA2)}%
                </Text>
              </div>
              <Progress
                percent={
                  totalCount > 0
                    ? Math.round(((currentA1Count + currentA2Count) / totalCount) * 100)
                    : 0
                }
                status="active"
                strokeColor={{ from: '#722ed1', to: '#ea9105' }}
              />
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                Rank A3: <b>{currentA3Count} NS</b> | Không đạt (C):{' '}
                <b>{currentCCount} NS</b>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Thống kê KPI Theo Phòng Ban */}
      <Card
        title="📊 Báo Cáo Động KPI Theo Phòng Ban"
        style={{ marginBottom: 20 }}
        variant="borderless"
      >
        <Table
          dataSource={departmentStats}
          rowKey="department"
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: 'Phòng Ban',
              dataIndex: 'department',
              render: (v: string) => <b>{v}</b>,
            },
            {
              title: 'Tổng Nhân Sự',
              dataIndex: 'totalStaff',
              width: 120,
              render: (v: number) => <Tag color="blue">{v} cán bộ</Tag>,
            },
            {
              title: 'Điểm TB Tổng',
              dataIndex: 'avgTotalScore',
              width: 130,
              render: (v: number) => (
                <Text strong>{normalizeToPercent(v).toFixed(1)}%</Text>
              ),
            },
            {
              title: 'Điểm TB Cuối Cùng',
              dataIndex: 'avgFinalScore',
              width: 140,
              render: (v: number) => (
                <Text strong style={{ color: '#ea9105', fontSize: 15 }}>
                  {normalizeToPercent(v).toFixed(1)}%
                </Text>
              ),
            },
            {
              title: 'Phân Bổ Rank (A1 / A2 / A3 / C)',
              render: (_: any, row: any) => (
                <Space wrap>
                  <Tag color="#722ed1">
                    <b>A1: {row.countA1}</b>
                  </Tag>
                  <Tag color="#ea9105">
                    <b>A2: {row.countA2}</b>
                  </Tag>
                  <Tag color="#52c41a">
                    <b>A3: {row.countA3}</b>
                  </Tag>
                  {row.countC > 0 && (
                    <Tag color="#ff4d4f">
                      <b>C: {row.countC}</b>
                    </Tag>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Spin>
  );
};
