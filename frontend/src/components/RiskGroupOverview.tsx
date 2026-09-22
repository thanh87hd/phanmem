/**
 * RiskGroupOverview.tsx
 * Dashboard tổng quan đánh giá rủi ro theo nhóm kiểm toán (IIA 2024 Hybrid Approach)
 * 5 nhóm: Hội sở, Chi nhánh, PGD, Hệ thống CNTT, Nghiệp vụ
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Typography, Tag, Spin, Tooltip, Badge, Progress } from 'antd';
import {
  BankOutlined, ShopOutlined, EnvironmentOutlined,
  LaptopOutlined, FileSearchOutlined, ApartmentOutlined,
  RightOutlined, WarningOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Text, Title } = Typography;



interface GroupData {
  category: string;
  label: string;
  icon: string;
  description: string;
  total: number;
  approved: number;
  submitted: number;
  draft: number;
  rejected: number;
  avgTotalScore: number;
  avgResidualRiskScore: number;
  riskDistribution: { hang1: number; hang2: number; hang3: number; hang4: number; hang5: number };
  highRiskCount: number;
  auditFrequencyBreakdown: { Annual: number; Biennial: number; Triennial: number; AdHoc: number };
}

interface RiskGroupOverviewProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  year?: number;
}

const RiskGroupOverview: React.FC<RiskGroupOverviewProps> = ({
  selectedCategory,
  onSelectCategory,
  year,
}) => {
  const { t } = useTranslation();

  const CATEGORY_CONFIG: Record<string, {
    label: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
  }> = {
    HoiSo: {
      label: t('auditPlan.tabs2.filter.hoiso', 'Hội sở'),
      icon: <BankOutlined />,
      color: '#d97706',
      gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    },
    ChiNhanh: {
      label: t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'),
      icon: <ShopOutlined />,
      color: '#389e0d',
      gradient: 'linear-gradient(135deg, #f0faf0 0%, #d9f0d6 100%)',
    },
    PGD: {
      label: t('auditPlan.tabs2.filter.pgd', 'Phòng giao dịch'),
      icon: <EnvironmentOutlined />,
      color: '#08979c',
      gradient: 'linear-gradient(135deg, #e6fffb 0%, #d3f5f0 100%)',
    },
    HeThong: {
      label: t('dashboard.tabs.it', 'Hệ thống CNTT'),
      icon: <LaptopOutlined />,
      color: '#722ed1',
      gradient: 'linear-gradient(135deg, #f5f0ff 0%, #e8dff5 100%)',
    },
    ChuyenDe: {
      label: t('auditPlan.tabs2.filter.chuyende', 'Nghiệp vụ'),
      icon: <FileSearchOutlined />,
      color: '#d46b08',
      gradient: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
    },
  };

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAssessments, setTotalAssessments] = useState(0);

  const fetchGroupedData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (year) params.year = year;
      const response = await api.get('/risk-assessments/grouped', { params });
      setGroups(response.data.groups || []);
      setTotalAssessments(response.data.totalAssessments || 0);
    } catch (error) {
      console.error('Failed to load grouped assessments:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroupedData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" tip="Đang tải dữ liệu nhóm kiểm toán..." />
      </div>
    );
  }

  const getRiskBarSegments = (dist: GroupData['riskDistribution']) => {
    const total = dist.hang1 + dist.hang2 + dist.hang3 + dist.hang4 + dist.hang5;
    if (total === 0) return [];
    return [
      { value: dist.hang1, color: '#52c41a', label: 'Hạng 1' },
      { value: dist.hang2, color: '#73d13d', label: 'Hạng 2' },
      { value: dist.hang3, color: '#faad14', label: 'Hạng 3' },
      { value: dist.hang4, color: '#fa8c16', label: 'Hạng 4' },
      { value: dist.hang5, color: '#cf1322', label: 'Hạng 5' },
    ].filter(s => s.value > 0);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
            📊 Tổng quan theo Nhóm Kiểm toán (IIA 2024 Hybrid Approach)
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            Click vào nhóm để lọc danh sách đánh giá. Tổng cộng: {totalAssessments} đánh giá
          </Text>
        </div>
        {selectedCategory && (
          <Tag
            closable
            onClose={() => onSelectCategory(null)}
            color="blue"
            style={{ fontSize: 13, padding: '4px 12px' }}
          >
            Đang lọc: {CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory}
          </Tag>
        )}
      </div>

      {/* Group Cards Grid */}
      <Row gutter={[16, 16]}>
        {groups.map(group => {
          const config = CATEGORY_CONFIG[group.category] || {
            label: group.category,
            icon: <FileSearchOutlined />,
            color: '#8c8c8c',
            gradient: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
          };
          const isSelected = selectedCategory === group.category;
          const segments = getRiskBarSegments(group.riskDistribution);
          const distTotal = group.riskDistribution.hang1 + group.riskDistribution.hang2 +
            group.riskDistribution.hang3 + group.riskDistribution.hang4 + group.riskDistribution.hang5;

          return (
            <Col xs={24} sm={12} lg={8} key={group.category}>
              <Card
                hoverable
                onClick={() => onSelectCategory(isSelected ? null : group.category)}
                style={{
                  borderRadius: 12,
                  border: isSelected ? `2px solid ${config.color}` : '1px solid #f0f0f0',
                  boxShadow: isSelected
                    ? `0 4px 16px ${config.color}30`
                    : '0 2px 8px rgba(0,0,0,0.04)',
                  background: isSelected ? config.gradient : '#fff',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 10,
                      background: `${config.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: config.color,
                    }}>
                      {config.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}>
                        {config.label}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>{group.description}</Text>
                    </div>
                  </div>
                  {group.highRiskCount > 0 && (
                    <Tooltip title={`${group.highRiskCount} đối tượng rủi ro cao (Hạng 4-5)`}>
                      <Badge count={group.highRiskCount} style={{ backgroundColor: '#cf1322' }}>
                        <WarningOutlined style={{ fontSize: 16, color: '#cf1322' }} />
                      </Badge>
                    </Tooltip>
                  )}
                </div>

                {/* Stats */}
                <Row gutter={8} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: config.color }}>{group.total}</div>
                      <Text type="secondary" style={{ fontSize: 10 }}>Đối tượng</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 20, fontWeight: 700,
                        color: Number(group.avgTotalScore) >= 75 ? '#389e0d' : Number(group.avgTotalScore) >= 40 ? '#d46b08' : '#cf1322',
                      }}>
                        {typeof group.avgTotalScore === 'number' ? Number(group.avgTotalScore.toFixed(1)) : (group.avgTotalScore || '—')}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>Điểm TB</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 20, fontWeight: 700,
                        color: Number(group.avgResidualRiskScore) >= 40 ? '#cf1322' : Number(group.avgResidualRiskScore) >= 25 ? '#d46b08' : '#389e0d',
                      }}>
                        {typeof group.avgResidualRiskScore === 'number' ? Number(group.avgResidualRiskScore.toFixed(1)) : (group.avgResidualRiskScore || '—')}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>RR còn lại</Text>
                    </div>
                  </Col>
                </Row>

                {/* Risk Distribution Bar */}
                {distTotal > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{
                      display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden',
                      background: '#f0f0f0',
                    }}>
                      {segments.map((seg, idx) => (
                        <Tooltip key={idx} title={`${seg.label}: ${seg.value} (${Math.round(seg.value / distTotal * 100)}%)`}>
                          <div style={{
                            width: `${(seg.value / distTotal) * 100}%`,
                            backgroundColor: seg.color,
                            transition: 'width 0.5s ease',
                          }} />
                        </Tooltip>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 9, color: '#8c8c8c' }}>
                        {group.approved} đã duyệt · {group.submitted} chờ duyệt
                      </Text>
                      <RightOutlined style={{ fontSize: 10, color: config.color, opacity: isSelected ? 1 : 0.4 }} />
                    </div>
                  </div>
                )}

                {group.total === 0 && (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Chưa có đánh giá</Text>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default RiskGroupOverview;
