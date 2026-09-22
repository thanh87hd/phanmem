import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Tag, Typography, Progress, Row, Col, Spin, Tooltip, Badge } from 'antd';
import { RobotOutlined, RiseOutlined, FallOutlined, MinusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

interface AiriskMapProps {
  unitType?: string;
}

const AiriskMap: React.FC<AiriskMapProps> = ({ unitType }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = unitType && unitType !== 'all' ? `?unitType=${unitType}` : '';
      const res = await api.get(`/ai/risk-heatmap${query}`);
      setData(res.data);
    } catch (err) {
      console.error(t('airiskMap.errorLoadingAiRiskMap', 'Lỗi khi tải AI Risk Map'), err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitType]);

  const columns = [
    {
      title: t('findingsAnalytics.unitTab.colUnit', 'Đơn vị / Chi nhánh'),
      dataIndex: 'unitName',
      key: 'unitName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'AI Risk Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <div style={{ width: 150 }}>
          <Progress 
            percent={score} 
            size="small" 
            status={score > 70 ? 'exception' : 'active'}
            strokeColor={score > 70 ? '#ff4d4f' : score > 40 ? '#faad14' : '#52c41a'}
          />
        </div>
      ),
    },
    {
      title: t('findingKB.guide2b', 'Mức độ rủi ro'),
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        let color = 'green';
        if (level === 'Critical') color = 'red';
        else if (level === 'High') color = 'orange';
        else if (level === 'Medium') color = 'blue';
        return <Tag color={color}>{level.toUpperCase()}</Tag>;
      },
    },
    {
      title: t('riskAssessment.kriDashboard.compare.trend', 'Xu hướng'),
      dataIndex: 'trend',
      key: 'trend',
      render: (trend: string) => {
        if (trend === 'Up') {
          return <Text type="danger" style={{ fontWeight: 600 }}><RiseOutlined /> {t('aiRiskMap.trend.up', 'Tăng')}</Text>;
        }
        if (trend === 'Down') {
          return <Text type="success" style={{ fontWeight: 600 }}><FallOutlined /> {t('aiRiskMap.trend.down', 'Giảm')}</Text>;
        }
        return <Text type="secondary" style={{ color: '#ea9105', fontWeight: 600 }}><MinusOutlined /> {t('aiRiskMap.trend.stable', 'Ổn định')}</Text>;
      },
    },
    {
      title: t('aiRiskMap.cols.factors', 'Yếu tố chính'),
      dataIndex: 'factors',
      key: 'factors',
      render: (factors: any) => (
        <div className="text-xs">
          <div>{t('aiRiskMap.factors.highFindings', 'Phát hiện High:')} <Text strong>{factors.highFindings}</Text></div>
          <div>{t('aiRiskMap.factors.remediationRate', 'Tỷ lệ khắc phục:')} <Text strong>{factors.remediationRate}%</Text></div>
        </div>
      ),
    },
  ];

  return (
    <Card 
      title={
        <div className="flex items-center gap-2">
          <RobotOutlined className="text-blue-600" />
          <span>{t('aiRiskMap.title', 'Bản đồ Rủi ro Thông minh (AI Risk Heatmap)')}</span>
          <Tooltip title={t('aiRiskMap.tooltip', 'Điểm rủi ro được tính toán dựa trên số lượng phát hiện, mức độ nghiêm trọng và tốc độ khắc phục kiến nghị của đơn vị.')}>
            <InfoCircleOutlined className="text-gray-400 cursor-help ml-2" />
          </Tooltip>
        </div>
      }
      variant="borderless"
      className="shadow-sm"
    >
      {loading ? (
        <div className="text-center py-10"><Spin tip={t('aiRiskMap.loading', 'AI đang phân tích dữ liệu...')} /></div>
      ) : (
        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="unitName" 
          pagination={false}
          size="small"
        />
      )}
    </Card>
  );
};

export default AiriskMap;
