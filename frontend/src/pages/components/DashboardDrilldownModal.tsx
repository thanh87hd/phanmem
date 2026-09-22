import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Table, Tag, Typography, Button, Space, Card, Row, Col, Statistic, Alert } from 'antd';
import { 
  FileTextOutlined, WarningOutlined, DollarOutlined, 
  BankOutlined, ClockCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export type DrilldownType = 'JOBS_LIST' | 'FINDINGS_LIST' | 'LEGAL_VIOLATIONS' | 'REMEDIATION_LIST' | 'CAMELS_RISK' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
  type: DrilldownType;
  title: string;
  data: any;
  extraMeta?: any;
}

export const DashboardDrilldownModal: React.FC<Props> = ({
  visible,
  onClose,
  type,
  title,
  data,
  extraMeta
}) => {
  const { t } = useTranslation();
  if (!visible) return null;

  // 1. Table Columns for Jobs List Drilldown
  const jobCols = [
    { 
      title: 'Tên Cuộc Kiểm toán (Job)', 
      dataIndex: 'title', 
      key: 'title',
      render: (v: string) => <Text strong style={{ color: '#ea9105' }}>{v}</Text>
    },
    { 
      title: 'Đơn vị kiểm toán', 
      dataIndex: 'unit', 
      key: 'unit',
      render: (v: string) => <><BankOutlined /> {v || 'Toàn hệ thống'}</>
    },
    { 
      title: 'Trưởng đoàn', 
      dataIndex: 'lead', 
      key: 'lead',
      render: (v: string) => <Tag color="gold">{v}</Tag>
    },
    { 
      title: 'Thời gian thực hiện', 
      key: 'period',
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12 }}>
          {r.startDate ? dayjs(r.startDate).format('DD/MM/YYYY') : 'T07/2026'} - {r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : 'T09/2026'}
        </span>
      )
    },
  ];

  // 2. Table Columns for Findings List Drilldown
  const findingCols = [
    {
      title: 'Mức rủi ro',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 120,
      render: (v: string) => {
        if (v === 'Critical' || v === 'High') return <Tag color="error">🔴 Rủi ro Cao</Tag>;
        if (v === 'Medium') return <Tag color="warning">🟡 Trung bình</Tag>;
        return <Tag color="success">🟢 Rủi ro Thấp</Tag>;
      }
    },
    {
      title: 'Nội dung Phát hiện Kiểm toán',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => <Text strong>{v}</Text>
    },
    {
      title: 'Thuộc Cuộc kiểm toán (Job)',
      dataIndex: 'jobName',
      key: 'jobName',
      render: (v: string) => <Tag color="geekblue">{v || 'Chung'}</Tag>
    },
    {
      title: 'Đơn vị phát hiện',
      dataIndex: 'unitName',
      key: 'unitName',
      render: (v: string) => v || 'Hội sở'
    }
  ];

  // 3. Table Columns for Legal / Administrative Violations (ND 340)
  const legalCols = [
    {
      title: 'Căn cứ Pháp lý & Điều khoản',
      dataIndex: 'law',
      key: 'law',
      width: 220,
      render: (v: string) => <Tag color="magenta" style={{ fontWeight: 600 }}>{v}</Tag>
    },
    {
      title: 'Hành vi Vi phạm Quy định Hành chính',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text strong>{v}</Text>
    },
    {
      title: 'Số vụ việc',
      dataIndex: 'cases',
      key: 'cases',
      width: 100,
      align: 'center' as const,
      render: (v: number) => <Tag color="red" style={{ fontWeight: 700 }}>{v} vụ</Tag>
    },
    {
      title: 'Ước tính Khung Phạt (VNĐ)',
      dataIndex: 'fine',
      key: 'fine',
      width: 160,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#cf1322' }}>{v ? v.toLocaleString() : '50,000,000'} đ</Text>
    }
  ];

  // 4. Table Columns for Remediation / Recommendations
  const recCols = [
    {
      title: 'Mức rủi ro',
      dataIndex: 'risk',
      key: 'risk',
      width: 110,
      render: (v: string) => {
        if (v === 'RRC') return <Tag color="red">🔴 RRC</Tag>;
        if (v === 'RRTB') return <Tag color="warning">🟡 RRTB</Tag>;
        return <Tag color="green">🟢 RRT</Tag>;
      }
    },
    {
      title: 'Nội dung Kiến nghị / Hành động Khắc phục',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => <Text strong>{v}</Text>
    },
    {
      title: 'Đơn vị đầu mối',
      dataIndex: 'dept',
      key: 'dept',
      render: (v: string) => <Tag>{v || 'Khối QLRR'}</Tag>
    },
    {
      title: 'Hạn chót (Deadline)',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (v: string, r: any) => (
        <span style={{ color: r.isOverdue ? '#cf1322' : '#595959', fontWeight: r.isOverdue ? 700 : 400 }}>
          {v || '30/08/2026'} {r.isOverdue ? '⚠️ Quá hạn' : ''}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusText',
      key: 'statusText',
      render: (v: string, r: any) => (
        <Tag color={r.isClosed ? 'success' : r.isOverdue ? 'error' : 'processing'}>
          {v || 'Đang khắc phục'}
        </Tag>
      )
    }
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={900}
      title={
        <Space>
          <FileTextOutlined style={{ color: '#ea9105', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        </Space>
      }
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>
      ]}
    >
      <div style={{ marginTop: 12 }}>
        {/* Banner metadata if available */}
        {extraMeta && (
          <Alert
            message={extraMeta.message || 'Báo cáo chi tiết trích xuất dữ liệu'}
            description={extraMeta.desc}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Content switch based on Drilldown Type */}
        {type === 'JOBS_LIST' && (
          <Table
            columns={jobCols}
            dataSource={Array.isArray(data) ? data : []}
            rowKey={(r: any) => r.id || r.title}
            pagination={{ pageSize: 8 }}
            size="small"
          />
        )}

        {type === 'FINDINGS_LIST' && (
          <Table
            columns={findingCols}
            dataSource={Array.isArray(data) ? data : []}
            rowKey={(r: any) => r.id || r.title}
            pagination={{ pageSize: 8 }}
            size="small"
          />
        )}

        {type === 'LEGAL_VIOLATIONS' && (
          <div>
            <div style={{ padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 6, marginBottom: 12 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title="Tổng số Vụ việc Vi phạm Pháp luật / Hành chính" 
                    value={Array.isArray(data) ? data.reduce((a: number, b: any) => a + (b.cases || 0), 0) : 0}
                    suffix="vụ"
                    valueStyle={{ color: '#cf1322', fontWeight: 700 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Tổng Khung tiền Phạt Tiềm ẩn Ước tính" 
                    value={Array.isArray(data) ? data.reduce((a: number, b: any) => a + (b.fine || 0), 0) : 0}
                    suffix="đ"
                    valueStyle={{ color: '#cf1322', fontWeight: 700 }}
                  />
                </Col>
              </Row>
            </div>
            <Table
              columns={legalCols}
              dataSource={Array.isArray(data) ? data : []}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </div>
        )}

        {type === 'REMEDIATION_LIST' && (
          <Table
            columns={recCols}
            dataSource={Array.isArray(data) ? data : []}
            rowKey={(r: any) => r.id || r.title}
            pagination={{ pageSize: 8 }}
            size="small"
          />
        )}

        {type === 'CAMELS_RISK' && (
          <div style={{ padding: 16, background: '#fafafa', borderRadius: 8 }}>
            <Title level={5}>Chỉ số Giám sát & Cảnh báo Sớm (CAMELS KRI)</Title>
            <Paragraph>
              Dữ liệu được tích hợp tự động từ phân hệ Giám sát Liên tục (CMCA), đối chiếu với các ngưỡng KRI theo Thông tư 52/2018, TT 11/2021 và TT 14/2025 của NHNN.
            </Paragraph>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DashboardDrilldownModal;
