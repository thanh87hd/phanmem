import React from 'react';
import { Drawer, Space, Row, Col, Card, Statistic, Table, Tag } from 'antd';
import { LineChartOutlined, BarChartOutlined, BankOutlined, UserOutlined } from '@ant-design/icons';

export interface SamplingAnalyticsDrawerProps {
  visible: boolean;
  analyticsData: any | null;
  loading: boolean;
  onClose: () => void;
}

export const SamplingAnalyticsDrawer: React.FC<SamplingAnalyticsDrawerProps> = ({
  visible,
  analyticsData,
  loading,
  onClose,
}) => {
  return (
    <Drawer
      title={
        <Space>
          <LineChartOutlined className="text-blue-600" />
          <span>Phân Tích Dữ Liệu Chọn Mẫu: {analyticsData?.batchName}</span>
        </Space>
      }
      width={850}
      open={visible}
      onClose={onClose}
      loading={loading}
    >
      {analyticsData && (
        <div>
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <Card size="small" className="bg-slate-50 border-slate-200 text-center">
                <Statistic title="Tổng số mẫu bốc" value={analyticsData.totalSamples} prefix={<BarChartOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" className="bg-blue-50 border-blue-200 text-center">
                <Statistic
                  title="Mảng nghiệp vụ"
                  value={analyticsData.auditDomain === 'NON_CREDIT' ? 'Phi tín dụng' : 'Tín dụng'}
                  prefix={<BankOutlined />}
                  valueStyle={{ fontSize: 16, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" className="bg-purple-50 border-purple-200 text-center">
                <Statistic title="Số đơn vị kinh doanh" value={analyticsData.byBranch?.length || 0} prefix={<BankOutlined />} />
              </Card>
            </Col>
          </Row>

          <h4 className="font-bold text-slate-700 mt-4 mb-2 flex items-center gap-2">
            <BankOutlined /> 1. Phân bổ theo Đơn vị kinh doanh (Chi nhánh)
          </h4>
          <Table
            dataSource={analyticsData.byBranch || []}
            rowKey="branchCode"
            size="small"
            pagination={false}
            columns={[
              { title: 'Mã CN', dataIndex: 'branchCode', key: 'branchCode' },
              { title: 'Tên Chi nhánh', dataIndex: 'branchName', key: 'branchName', render: (t: string) => <strong>{t}</strong> },
              { title: 'Số mẫu', dataIndex: 'count', key: 'count' },
              {
                title: 'Tổng quy mô (VND)',
                dataIndex: 'totalAmount',
                key: 'totalAmount',
                render: (v: number) => (v ? v.toLocaleString() : '0'),
              },
              {
                title: 'Kết quả KSNB',
                key: 'results',
                render: (_: any, r: any) => (
                  <Space size="small">
                    <Tag color="success">Pass: {r.passCount}</Tag>
                    <Tag color="error">Fail: {r.failCount}</Tag>
                  </Space>
                ),
              },
            ]}
          />

          <h4 className="font-bold text-slate-700 mt-6 mb-2 flex items-center gap-2">
            <UserOutlined /> 2. Phân bổ theo Phân khúc Khách hàng
          </h4>
          <Table
            dataSource={analyticsData.byCustomerType || []}
            rowKey="type"
            size="small"
            pagination={false}
            columns={[
              {
                title: 'Phân khúc Khách hàng',
                dataIndex: 'type',
                key: 'type',
                render: (t: string) => <Tag color="blue">{t}</Tag>,
              },
              { title: 'Số lượng mẫu', dataIndex: 'count', key: 'count' },
              {
                title: 'Tổng giá trị (VND)',
                dataIndex: 'totalAmount',
                key: 'totalAmount',
                render: (v: number) => (v ? v.toLocaleString() : '0'),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
};
