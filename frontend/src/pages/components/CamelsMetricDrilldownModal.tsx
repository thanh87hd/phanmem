import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Modal, Row, Col, Card, Typography, Tag, Table, 
  Statistic, Alert, Button, Space, Divider, message, Spin, Tooltip 
} from 'antd';
import { 
  ArrowUpOutlined, ArrowDownOutlined, CopyOutlined, 
  CheckOutlined, BookOutlined, CalculatorOutlined, 
  FileTextOutlined, InfoCircleOutlined, ThunderboltOutlined 
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const PILLAR_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'C': { bg: '#fef7e6', text: '#ea9105', label: 'C - An toàn Vốn (Capital)' },
  'A': { bg: '#f9f0ff', text: '#722ed1', label: 'A - Chất lượng Tài sản (Asset Quality)' },
  'M': { bg: '#e6fffb', text: '#13c2c2', label: 'M - Quản trị (Management)' },
  'E': { bg: '#fff7e6', text: '#fa8c16', label: 'E - Hiệu quả Kinh doanh (Earnings)' },
  'L': { bg: '#f6ffed', text: '#52c41a', label: 'L - Thanh khoản (Liquidity)' },
  'S': { bg: '#fff0f6', text: '#eb2f96', label: 'S - Độ nhạy Thị trường (Sensitivity)' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  branchCode: string;
  metricKey: string;
}

export const CamelsMetricDrilldownModal: React.FC<Props> = ({
  visible,
  onClose,
  branchCode,
  metricKey,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible && branchCode && metricKey) {
      setLoading(true);
      setCopied(false);
      api.get(`/continuous-monitoring/metric-drilldown?branchCode=${encodeURIComponent(branchCode)}&metricKey=${encodeURIComponent(metricKey)}`)
        .then(res => setData(res.data))
        .catch(() => message.error('Lỗi khi tải chi tiết giải trình chỉ số'))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [visible, branchCode, metricKey]);

  const handleCopyNarrative = () => {
    if (data?.auditNarrative) {
      try {
        navigator.clipboard.writeText(data.auditNarrative);
        setCopied(true);
        message.success('Đã sao chép nội dung nhận xét kiểm toán vào bộ nhớ tạm');
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // ponytail: fallback khi clipboard API bị block (HTTP / intranet ngân hàng)
        message.warning('Không thể sao chép tự động. Vui lòng chọn và copy thủ công.');
      }
    }
  };

  const driverCols = [
    { title: 'Yếu tố cấu thành / Tác động', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Kỳ trước', dataIndex: 'previous', key: 'previous', width: 110 },
    { title: 'Kỳ này', dataIndex: 'current', key: 'current', width: 110 },
    { title: 'Mức tác động', dataIndex: 'impact', key: 'impact', width: 120, render: (v: string) => {
      const isNegative = v.includes('-') || v.includes('Rủi ro') || v.includes('Cảnh báo');
      return <Tag color={isNegative ? 'red' : 'green'}>{v}</Tag>;
    }},
    { title: 'Ghi chú phân tích nghiệp vụ', dataIndex: 'note', key: 'note' },
  ];

  const pillarInfo = PILLAR_COLORS[data?.pillar || 'M'] || { bg: '#f5f5f5', text: '#595959', label: 'CAMELS' };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="copy" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopyNarrative} type="primary" ghost>
          {copied ? 'Đã sao chép' : 'Sao chép Nhận xét KT'}
        </Button>,
        <Button key="close" onClick={onClose} type="primary">
          Đóng
        </Button>
      ]}
      width={850}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
          <ThunderboltOutlined style={{ color: '#ea9105', fontSize: 20 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {data?.metricName || 'Chi tiết Chỉ số Giám sát CAMELS'}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              Đơn vị: <Text strong style={{ color: '#ea9105' }}>{branchCode}</Text> | Ngày chốt số liệu: {data?.metricDate ? dayjs(data.metricDate).format('DD/MM/YYYY') : '31/07/2026'}
            </div>
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#8c8c8c' }}>Đang bóc tách phân tích dữ liệu chỉ số...</div>
        </div>
      ) : data ? (
        <div style={{ marginTop: 8 }}>
          {/* Pillar tag & Status alert */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Tag color={pillarInfo.text} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
              {pillarInfo.label}
            </Tag>
            <div>
              {data.status === 'IMPROVED' && <Tag color="success" icon={<ArrowUpOutlined />}>Chỉ số cải thiện</Tag>}
              {data.status === 'DETERIORATED' && <Tag color="error" icon={<ArrowDownOutlined />}>Chỉ số suy giảm</Tag>}
              {data.status === 'NORMAL' && <Tag color="blue">Duy trì ổn định</Tag>}
            </div>
          </div>

          {/* Row 1: Key Metric Comparison Statistics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center', background: '#fafafa', borderColor: '#d9d9d9' }}>
                <Statistic
                  title={`Kỳ trước (${data.previousDate || 'Kỳ trước'})`}
                  value={data.previousValue}
                  suffix={data.unit || '%'}
                  valueStyle={{ color: '#595959', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center', background: '#fdf6ec', borderColor: '#f5d8a8' }}>
                <Statistic
                  title={`Kỳ này (${data.metricDate ? dayjs(data.metricDate).format('DD/MM/YYYY') : 'Kỳ này'})`}
                  value={data.currentValue}
                  suffix={data.unit || '%'}
                  valueStyle={{ color: '#ea9105', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center', background: data.diffValue >= 0 ? '#fff1f0' : '#f6ffed', borderColor: data.diffValue >= 0 ? '#ffccc7' : '#b7eb8f' }}>
                <Statistic
                  title="Biến động so với kỳ trước (MoM)"
                  value={Math.abs(data.diffValue)}
                  prefix={data.diffValue >= 0 ? <ArrowUpOutlined style={{ color: '#cf1322' }} /> : <ArrowDownOutlined style={{ color: '#389e0d' }} />}
                  suffix={`${data.unit || '%'} (${data.percentChange >= 0 ? '+' : ''}${data.percentChange}%)`}
                  valueStyle={{ color: data.diffValue >= 0 ? '#cf1322' : '#389e0d', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Row 2: Root Causes & Sub-component breakdown */}
          <Card 
            size="small" 
            title={<><CalculatorOutlined /> Bóc tách Nguyên nhân & Yếu tố Cấu thành ("Thay đổi do đâu?")</>} 
            style={{ marginBottom: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={driverCols}
              dataSource={data.drivers || []}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Row 3: Legal reference & Formula */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small" title={<><BookOutlined /> Căn cứ Pháp lý & Quy định NHNN</>} style={{ height: '100%' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <InfoCircleOutlined style={{ color: '#ea9105', marginRight: 6 }} />
                  {data.legalReference || 'Quy định giám sát an toàn vi mô theo TT 52/2018/TT-NHNN.'}
                </Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title={<><CalculatorOutlined /> Phương pháp & Công thức Tính toán</>} style={{ height: '100%' }}>
                <Text code style={{ fontSize: 12, display: 'block', padding: '6px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                  {data.formulaDescription}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Row 4: Executive Audit Narrative Mini-Report */}
          <Card 
            size="small" 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><FileTextOutlined /> Báo cáo Nhận xét Tóm tắt của Kiểm toán viên</span>
                <Button size="small" icon={<CopyOutlined />} onClick={handleCopyNarrative}>
                  Sao chép đoạn nhận xét
                </Button>
              </div>
            }
            style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
          >
            <Paragraph style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#135200' }}>
              {data.auditNarrative}
            </Paragraph>
          </Card>
        </div>
      ) : null}
    </Modal>
  );
};

export default CamelsMetricDrilldownModal;
