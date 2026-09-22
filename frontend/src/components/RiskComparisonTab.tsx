import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Select, Card, Row, Col, Typography, Tag, Space, Divider, Spin, message, Statistic, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, LineOutlined, SwapOutlined, AreaChartOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const getLevelColor = (level: string, t?: any) => {
  if (!level) return 'default';
  const tr = (k: string, d: string) => (typeof t === 'function' ? t(k, d) : d);
  if (level.includes(tr('riskAssessment.groupOverview.levels.1', 'Hạng 1')) || level.includes('Hạng 1')) return 'success';
  if (level.includes(tr('riskAssessment.groupOverview.levels.2', 'Hạng 2')) || level.includes('Hạng 2')) return 'lime';
  if (level.includes(tr('riskAssessment.groupOverview.levels.3', 'Hạng 3')) || level.includes('Hạng 3')) return 'warning';
  if (level.includes(tr('riskAssessment.groupOverview.levels.4', 'Hạng 4')) || level.includes('Hạng 4')) return 'orange';
  if (level.includes(tr('riskAssessment.groupOverview.levels.5', 'Hạng 5')) || level.includes('Hạng 5')) return 'error';
  if (level === 'High' || level === 'Critical') return 'error';
  if (level === 'Medium') return 'warning';
  if (level === 'Low') return 'success';
  return 'default';
};

const RiskComparisonTab: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year1, setYear1] = useState<number>(2025);
  const [year2, setYear2] = useState<number>(2026);
  const [loading, setLoading] = useState(false);
  const [compareData, setCompareData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const response = await api.get('/risk-assessments/compare', {
        params: { year1, year2 },
      });
      setCompareData(response.data);
    } catch (error) {
      console.error('Failed to load risk comparison:', error);
      message.error('Lỗi khi tải dữ liệu so sánh rủi ro');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    setTrendLoading(true);
    try {
      const response = await api.get('/risk-assessments');
      const allData = response.data || [];
      
      // Group by year and calculate averages
      const yearGroups: Record<number, { count: number; totalScoreSum: number; residualScoreSum: number }> = {};
      allData.forEach((item: any) => {
        const yr = item.assessmentYear;
        if (!yr) return;
        if (!yearGroups[yr]) {
          yearGroups[yr] = { count: 0, totalScoreSum: 0, residualScoreSum: 0 };
        }
        yearGroups[yr].count++;
        yearGroups[yr].totalScoreSum += item.totalScore || 0;
        yearGroups[yr].residualScoreSum += item.residualRiskScore || 0;
      });

      const formattedTrend = Object.entries(yearGroups).map(([yr, stats]) => ({
        year: Number(yr),
        'Điểm Rủi ro Tiềm ẩn (IR)': Number((stats.totalScoreSum / stats.count).toFixed(2)),
        'Điểm Rủi ro Còn lại (RR)': Number((stats.residualScoreSum / stats.count).toFixed(2)),
        count: stats.count
      })).sort((a, b) => a.year - b.year);

      setTrendData(formattedTrend);
    } catch (error) {
      console.error('Failed to load trend data:', error);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComparison();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year1, year2]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrendData();
  }, []);

  const stats = compareData ? {
    total: compareData.comparisons?.length || 0,
    increased: compareData.comparisons?.filter((c: any) => c.scoreDelta > 0).length || 0,
    decreased: compareData.comparisons?.filter((c: any) => c.scoreDelta < 0).length || 0,
    stable: compareData.comparisons?.filter((c: any) => c.scoreDelta === 0).length || 0,
    new: compareData.comparisons?.filter((c: any) => c.trend === 'new').length || 0,
  } : { total: 0, increased: 0, decreased: 0, stable: 0, new: 0 };

  const columns = [
    {
      title: 'Quy trình / Đơn vị',
      dataIndex: 'universeName',
      key: 'universeName',
      width: '28%',
      render: (text: string, record: any) => {
        const displayName = text || record.legacyUniverseName || record.name || record.processName || 'Quy trình kiểm toán';
        const deptName = record.department || record.legacyDepartmentName || record.departmentName || '';
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#262626' }}>{displayName}</div>
            {deptName && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{deptName}</div>
            )}
          </div>
        );
      },
    },
    {
      title: `Điểm ${year1}`,
      dataIndex: 'year1Score',
      key: 'year1Score',
      width: 140,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.year1Score || 0) - (b.year1Score || 0),
      render: (score: number, record: any) => score !== null && score !== undefined ? (
        <div>
          <strong style={{ fontSize: 14 }}>{typeof score === 'number' ? Number(score.toFixed(1)) : score}</strong>
          {record.year1Level && (
            <div style={{ marginTop: 2 }}>
              <Tag color={getLevelColor(record.year1Level, t)} style={{ fontSize: 10, scale: 0.9 }}>{record.year1Level}</Tag>
            </div>
          )}
        </div>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
    },
    {
      title: `Điểm ${year2}`,
      dataIndex: 'year2Score',
      key: 'year2Score',
      width: 140,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.year2Score || 0) - (b.year2Score || 0),
      render: (score: number, record: any) => score !== null && score !== undefined ? (
        <div>
          <strong style={{ fontSize: 14, color: '#ea9105' }}>{typeof score === 'number' ? Number(score.toFixed(1)) : score}</strong>
          {record.year2Level && (
            <div style={{ marginTop: 2 }}>
              <Tag color={getLevelColor(record.year2Level, t)} style={{ fontSize: 10, scale: 0.9 }}>{record.year2Level}</Tag>
            </div>
          )}
        </div>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
    },
    {
      title: 'Chênh lệch (Delta)',
      dataIndex: 'scoreDelta',
      key: 'scoreDelta',
      width: 150,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.scoreDelta || 0) - (b.scoreDelta || 0),
      render: (delta: number, record: any) => {
        if (record.trend === 'new') {
          return <Tag color="cyan" style={{ fontWeight: 600 }}>MỚI</Tag>;
        }
        if (delta === null || delta === undefined) return <Text type="secondary">—</Text>;
        const formattedDelta = typeof delta === 'number' ? Number(delta.toFixed(1)) : delta;
        if (delta > 0) {
          return <span style={{ color: '#ff4d4f', fontWeight: 700 }}><ArrowUpOutlined /> +{formattedDelta}</span>;
        }
        if (delta < 0) {
          return <span style={{ color: '#52c41a', fontWeight: 700 }}><ArrowDownOutlined /> {formattedDelta}</span>;
        }
        return <span style={{ color: '#8c8c8c' }}><LineOutlined /> 0</span>;
      }
    },
    {
      title: 'Xu hướng Rủi ro',
      key: 'trend',
      width: 140,
      render: (_: any, record: any) => {
        if (record.trend === 'new') {
          return <Tag color="blue" style={{ fontWeight: 600 }}>🌟 Đối tượng mới</Tag>;
        }
        if (record.scoreDelta > 0) {
          return <Tag color="red" style={{ fontWeight: 600 }}>📈 Rủi ro Tăng</Tag>;
        }
        if (record.scoreDelta < 0) {
          return <Tag color="green" style={{ fontWeight: 600 }}>📉 Rủi ro Giảm</Tag>;
        }
        return <Tag color="default" style={{ fontWeight: 600 }}>➡️ Ổn định</Tag>;
      }
    }
  ];

  return (
    <div style={{ marginTop: 12 }}>
      {/* Selection controls */}
      <Card variant="borderless" style={{ marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <Row align="middle" justify="space-between" gutter={16}>
          <Col>
            <Space size="large">
              <div>
                <span style={{ marginRight: 8, fontWeight: 600 }}>Kỳ so sánh gốc (Năm 1):</span>
                <Select value={year1} onChange={setYear1} style={{ width: 100 }}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <Option key={y} value={y} disabled={y === year2}>{y}</Option>
                  ))}
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <SwapOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />
              </div>
              <div>
                <span style={{ marginRight: 8, fontWeight: 600 }}>Kỳ so sánh đích (Năm 2):</span>
                <Select value={year2} onChange={setYear2} style={{ width: 100 }}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <Option key={y} value={y} disabled={y === year1}>{y}</Option>
                  ))}
                </Select>
              </div>
            </Space>
          </Col>
          <Col>
            <Text type="secondary" className="italic">
              So sánh điểm rủi ro tiềm ẩn giữa hai năm học để theo dõi diễn biến và cảnh báo biến động.
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Stats summaries */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" variant="borderless" style={{ borderLeft: '4px solid #ea9105', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic title="Tổng đối tượng so sánh" value={stats.total} valueStyle={{ color: '#ea9105', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" variant="borderless" style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title="Đơn vị có rủi ro tăng" 
              value={stats.increased} 
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
              prefix={<ArrowUpOutlined />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" variant="borderless" style={{ borderLeft: '4px solid #52c41a', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title="Đơn vị có rủi ro giảm" 
              value={stats.decreased} 
              valueStyle={{ color: '#389e0d', fontWeight: 700 }}
              prefix={<ArrowDownOutlined />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" variant="borderless" style={{ borderLeft: '4px solid #8c8c8c', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic title="Đơn vị giữ ổn định" value={stats.stable} valueStyle={{ color: '#595959', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Table comparison */}
        <Col span={15}>
          <Card 
            title={
              <span style={{ fontWeight: 600 }}>
                📊 Bảng so sánh rủi ro chi tiết giữa năm {year1} và {year2}
              </span>
            }
            variant="borderless" 
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12 }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin tip="Đang tải dữ liệu so sánh..." /></div>
            ) : (
              <Table
                dataSource={compareData?.comparisons || []}
                columns={columns}
                rowKey="universeName"
                size="middle"
                pagination={{ pageSize: 8 }}
                rowClassName={(record: any) => record.scoreDelta > 0 ? 'bg-red-50/10' : record.scoreDelta < 0 ? 'bg-green-50/10' : ''}
              />
            )}
          </Card>
        </Col>

        {/* Trend analysis chart */}
        <Col span={9}>
          <Card 
            title={
              <span style={{ fontWeight: 600 }}>
                <AreaChartOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                Xu hướng điểm rủi ro qua các năm
              </span>
            }
            variant="borderless"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, height: '100%' }}
          >
            {trendLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin tip="Đang tải biểu đồ xu hướng..." /></div>
            ) : trendData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#bfbfbf' }}>Chưa đủ dữ liệu để vẽ biểu đồ xu hướng</div>
            ) : (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                  Điểm rủi ro trung bình (Inherent Risk - IR vs Residual Risk - RR) của tất cả đơn vị được đánh giá.
                </Text>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip />
                      <Legend verticalAlign="top" height={36} />
                      <Line 
                        type="monotone" 
                        dataKey="Điểm Rủi ro Tiềm ẩn (IR)" 
                        stroke="#ea9105" 
                        strokeWidth={2.5} 
                        activeDot={{ r: 6 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Điểm Rủi ro Còn lại (RR)" 
                        stroke="#ea9105" 
                        strokeWidth={2.5} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <Divider style={{ margin: '16px 0 12px 0' }} />
                
                <Alert
                  type="info"
                  showIcon
                  message="Diễn giải chỉ số rủi ro"
                  description={
                    <div style={{ fontSize: 11 }}>
                      Tuyến 3 KTNB khuyến nghị ưu tiên kiểm toán thực địa hàng năm đối với các quy trình có <strong>Residual Risk (Rủi ro Còn lại) &ge; 40</strong> hoặc có xu hướng tăng rủi ro liên tục.
                    </div>
                  }
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RiskComparisonTab;
