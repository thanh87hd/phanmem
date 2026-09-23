import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Table,
  Tag,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Button,
} from 'antd';
import {
  RadarChartOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

const { Text } = Typography;

interface RiskSignalsDrawerProps {
  open: boolean;
  onClose: () => void;
  auditUniverseId?: number;
  auditUniverseName?: string;
  year?: number;
}

export const RiskSignalsDrawer: React.FC<RiskSignalsDrawerProps> = ({
  open,
  onClose,
  auditUniverseId,
  auditUniverseName,
  year = new Date().getFullYear(),
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const params: any = { year };
      if (auditUniverseId) {
        params.auditUniverseId = auditUniverseId;
      }
      const res = await api.get('/risk-signals', { params });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load risk signals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSignals();
    }
  }, [open, auditUniverseId, year]);

  const getSourceTag = (source: string) => {
    switch (source) {
      case 'KRI':
        return <Tag color="volcano" icon={<ThunderboltOutlined />}>KRI Tuyến 2</Tag>;
      case 'RCSA':
        return <Tag color="blue" icon={<SafetyCertificateOutlined />}>RCSA Tuyến 1/2</Tag>;
      case 'CAATS':
        return <Tag color="purple" icon={<RadarChartOutlined />}>CAATs / Giám sát liên tục</Tag>;
      case 'PRIOR_FINDING':
        return <Tag color="orange" icon={<FileSearchOutlined />}>Phát hiện kỳ trước</Tag>;
      default:
        return <Tag color="default">{source}</Tag>;
    }
  };

  const getLevelTag = (level: string) => {
    switch (level) {
      case 'Critical':
        return <Tag color="red" style={{ fontWeight: 700 }}>Nghiêm trọng</Tag>;
      case 'High':
        return <Tag color="volcano" style={{ fontWeight: 600 }}>Cao</Tag>;
      case 'Medium':
        return <Tag color="gold">Trung bình</Tag>;
      case 'Low':
        return <Tag color="green">Thấp</Tag>;
      default:
        return <Tag>{level}</Tag>;
    }
  };

  const summary = data?.summary || {
    totalSignals: 0,
    kriBreaches: 0,
    rcsaRisks: 0,
    caatsDetections: 0,
    priorFindings: 0,
    criticalCount: 0,
    highCount: 0,
  };

  const signals = data?.signals || [];

  const columns = [
    {
      title: 'Nguồn tín hiệu (Line 1/2/CAATs)',
      dataIndex: 'source',
      key: 'source',
      width: 170,
      render: (src: string) => getSourceTag(src),
    },
    {
      title: 'Mức độ',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (lvl: string) => getLevelTag(lvl),
    },
    {
      title: 'Mã & Tiêu đề Tín hiệu',
      key: 'title',
      render: (_: any, r: any) => (
        <div>
          <Space>
            <Tag color="cyan">{r.code}</Tag>
            <Text strong>{r.title}</Text>
          </Space>
          {r.details?.unitName && (
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Đơn vị: {r.details.unitName}
            </div>
          )}
          {r.details?.ruleName && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              Quy tắc CAATs: {r.details.ruleName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Ngày ghi nhận',
      dataIndex: 'observedAt',
      key: 'observedAt',
      width: 140,
      render: (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—',
    },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <RadarChartOutlined style={{ color: '#ea9105', fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              Tín hiệu Rủi ro Đầu vào (Risk Signals) — Năm {year}
            </span>
          </Space>
          {auditUniverseName && (
            <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
              {auditUniverseName}
            </Tag>
          )}
        </div>
      }
      placement="right"
      width={920}
      open={open}
      onClose={onClose}
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchSignals} loading={loading}>
          Làm mới
        </Button>
      }
    >
      <Alert
        message="Dữ liệu Tín hiệu Rủi ro Chỉ-Đọc (Read-Only RBIA Telemetry)"
        description="Theo chuẩn IIA Global Internal Audit Standards 2024 và Thông tư 13/2018/TT-NHNN, các cảnh báo KRI (Tuyến 2), RCSA (Tuyến 1/2), phát hiện giám sát liên tục (CAATs) và kiến nghị kỳ trước là thông tin đầu vào tham chiếu cho KTV Tuyến 3, không tạo thành màn hình thao tác độc lập trong chu trình lập kế hoạch."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16, borderRadius: 8 }}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" bordered style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
            <Statistic
              title="Tổng tín hiệu"
              value={summary.totalSignals}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered style={{ textAlign: 'center', background: '#fff2f0', borderRadius: 8 }}>
            <Statistic
              title="Mức Nghiêm trọng & Cao"
              value={summary.criticalCount + summary.highCount}
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered style={{ textAlign: 'center', background: '#fff7e6', borderRadius: 8 }}>
            <Statistic
              title="Cảnh báo KRI & RCSA"
              value={summary.kriBreaches + summary.rcsaRisks}
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered style={{ textAlign: 'center', background: '#f9f0ff', borderRadius: 8 }}>
            <Statistic
              title="CAATs & Phát hiện cũ"
              value={summary.caatsDetections + summary.priorFindings}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        loading={loading}
        dataSource={signals}
        rowKey={(r: any) => `${r.source}-${r.code}-${r.observedAt}`}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: 'Không có tín hiệu rủi ro nào ghi nhận cho đối tượng này.' }}
      />
    </Drawer>
  );
};

export default RiskSignalsDrawer;
