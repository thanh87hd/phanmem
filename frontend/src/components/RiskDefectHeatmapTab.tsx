import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Typography, Spin, Table, Tag } from 'antd';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from 'recharts';
import api from '../services/api';

const { Title, Text } = Typography;

const RiskDefectHeatmapTab: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/risk-assessments/risk-defect-heatmap');
      // format for recharts scatter
      const formattedData = response.data.map((item: any) => ({
        ...item,
        x: parseFloat(item.riskScore),
        y: parseFloat(item.defectScore),
        z: item.defectCount, // size of the bubble
      }));
      setData(formattedData);
    } catch (error) {
      console.error('Failed to load risk defect heatmap data', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>{data.universeName}</p>
          <p style={{ margin: 0 }}>Điểm rủi ro (Risk Score): {data.x.toFixed(2)}</p>
          <p style={{ margin: 0 }}>Điểm sai phạm (Defect Score): {data.y.toFixed(2)}</p>
          <p style={{ margin: 0 }}>Số lượng lỗi: {data.z}</p>
        </div>
      );
    }
    return null;
  };

  const getBubbleColor = (risk: number, defect: number) => {
    const total = risk + defect;
    if (total >= 8) return '#cf1322'; // Critical
    if (total >= 6) return '#d46b08'; // High
    if (total >= 4) return '#faad14'; // Medium
    return '#52c41a'; // Low
  };

  const columns = [
    { title: 'Quy trình (Audit Universe)', dataIndex: 'universeName', key: 'universeName' },
    { title: 'Điểm Rủi ro (Tuyến 1 & 2)', dataIndex: 'riskScore', key: 'riskScore', render: (val: number) => val.toFixed(2) },
    { title: 'Điểm Sai phạm (Tuyến 3)', dataIndex: 'defectScore', key: 'defectScore', render: (val: number) => val.toFixed(2) },
    { title: 'Số lượng Lỗi', dataIndex: 'defectCount', key: 'defectCount' },
    { 
      title: 'Xếp hạng Hợp nhất', 
      key: 'rating', 
      render: (_: any, record: any) => {
        const total = record.riskScore + record.defectScore;
        let color = 'green';
        let label = 'Low';
        if (total >= 8) { color = 'red'; label = 'Critical'; }
        else if (total >= 6) { color = 'volcano'; label = 'High'; }
        else if (total >= 4) { color = 'orange'; label = 'Medium'; }
        return <Tag color={color}>{label}</Tag>;
      } 
    },
  ];

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <Title level={4}>Biểu đồ phân tán: Rủi ro vs Lỗi (Risk vs Defect Heatmap)</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
        Biểu diễn mối tương quan giữa Điểm rủi ro dự kiến (trục X) và Điểm sai phạm thực tế/Số lượng lỗi (trục Y). 
        Kích thước bong bóng tương ứng với số lượng lỗi.
      </Text>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <Card style={{ flex: '1 1 500px', minWidth: '500px' }}>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Risk Score" domain={[0, 5]} label={{ value: 'Risk Score (Ảnh hưởng)', position: 'insideBottomRight', offset: -10 }} />
              <YAxis type="number" dataKey="y" name="Defect Score" domain={[0, 5]} label={{ value: 'Defect Score (Khả năng)', angle: -90, position: 'insideLeft' }} />
              <ZAxis type="number" dataKey="z" range={[50, 400]} name="Lỗi" />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Quy trình" data={data}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBubbleColor(entry.x, entry.y)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ flex: '1 1 500px', minWidth: '500px' }}>
          <Table 
            dataSource={data} 
            columns={columns} 
            rowKey="auditUniverseId" 
            pagination={{ pageSize: 5 }} 
            size="small"
          />
        </Card>
      </div>
    </div>
  );
};

export default RiskDefectHeatmapTab;
