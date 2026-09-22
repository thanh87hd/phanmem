import React, { useState, useEffect } from 'react';
import { Table, Select, Card, Row, Col, Typography, Tag, Space, Spin, message, Statistic, Alert, Button, Badge } from 'antd';
import {
  SwapOutlined,
  ArrowUpOutlined,
  ApartmentOutlined,
  ShopOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const UnitRestructuringComparisonTab: React.FC = () => {
  const [year1, setYear1] = useState<number>(2025);
  const [year2, setYear2] = useState<number>(2026);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments/compare/periods', {
        params: { year1, year2 },
      });
      setData(res.data);
    } catch (error) {
      console.error('Failed to load department comparison:', error);
      message.error('Lỗi khi tải dữ liệu so sánh cơ cấu tổ chức');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [year1, year2]);

  const columns = [
    {
      title: 'Mã đơn vị',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Tên Đơn vị kinh doanh / PGDBĐ',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: `Loại hình kỳ ${year1}`,
      dataIndex: 'from',
      key: 'from',
      width: 170,
      render: (type: string) => (
        <Tag color={type === 'ChiNhanh' ? 'green' : type === 'PGD' ? 'cyan' : type === 'PGDBD_TKBD' ? 'purple' : 'default'}>
          {type === 'ChiNhanh' ? 'Chi nhánh' : type === 'PGD' ? 'Phòng giao dịch' : type === 'PGDBD_TKBD' ? 'PGDBĐ / TKBĐ' : type}
        </Tag>
      ),
    },
    {
      title: `Loại hình kỳ ${year2}`,
      dataIndex: 'to',
      key: 'to',
      width: 170,
      render: (type: string) => (
        <Tag color={type === 'ChiNhanh' ? 'green' : type === 'PGD' ? 'cyan' : type === 'PGDBD_TKBD' ? 'purple' : 'default'}>
          {type === 'ChiNhanh' ? 'Chi nhánh' : type === 'PGD' ? 'Phòng giao dịch' : type === 'PGDBD_TKBD' ? 'PGDBĐ / TKBĐ' : type}
        </Tag>
      ),
    },
    {
      title: 'Tính chất biến động',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 220,
      render: (change: string) => {
        if (change === 'NangCap') {
          return (
            <Tag color="volcano" icon={<ArrowUpOutlined />}>
              Nâng cấp lên Chi nhánh
            </Tag>
          );
        }
        if (change === 'ThanhLapMoi') {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Thành lập mới
            </Tag>
          );
        }
        if (change === 'DongCua') {
          return (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Đóng cửa / Giải thể
            </Tag>
          );
        }
        return <Tag color="orange">{change}</Tag>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header filter */}
      <Card className="shadow-sm border-slate-200">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space align="center" size="middle">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <ApartmentOutlined className="text-2xl" />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Đối Soát Biến Động Cơ Cấu Tổ Chức & Phân Loại Hình ĐVKD
                </Title>
                <Text type="secondary">
                  So sánh lịch sử nâng cấp PGD lên Chi nhánh, sáp nhập, mở/đóng các phòng giao dịch bưu điện (PGDBĐ) qua từng kỳ kiểm toán
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Space>
                <Text strong>Kỳ gốc:</Text>
                <Select value={year1} onChange={setYear1} style={{ width: 110 }}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => (
                    <Option key={y} value={y}>Năm {y}</Option>
                  ))}
                </Select>
              </Space>
              <SwapOutlined className="text-slate-400" />
              <Space>
                <Text strong>Kỳ so sánh:</Text>
                <Select value={year2} onChange={setYear2} style={{ width: 110 }}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => (
                    <Option key={y} value={y}>Năm {y}</Option>
                  ))}
                </Select>
              </Space>
              <Button type="primary" onClick={fetchComparison}>
                Đối soát
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <Spin size="large" tip="Đang đối soát cơ cấu tổ chức giữa 2 kỳ..." />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="border-l-4 border-l-orange-500 shadow-sm">
                <Statistic
                  title="ĐVKD Nâng cấp (PGD -> CN)"
                  value={data?.upgradedUnits?.length || 0}
                  prefix={<ArrowUpOutlined className="text-orange-500" />}
                  valueStyle={{ color: '#d46b08', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <Statistic
                  title="Thành lập mới"
                  value={data?.newUnits?.length || 0}
                  prefix={<ShopOutlined className="text-emerald-500" />}
                  valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <Statistic
                  title="Chuyển đổi / Sáp nhập"
                  value={data?.restructuredUnits?.length || 0}
                  prefix={<MailOutlined className="text-purple-500" />}
                  valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="border-l-4 border-l-slate-400 shadow-sm">
                <Statistic
                  title="Cơ cấu ổn định"
                  value={data?.unchangedCount || 0}
                  prefix={<CheckCircleOutlined className="text-slate-500" />}
                  valueStyle={{ color: '#595959', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          <Alert
            message="Khuyến nghị tự động khi lập Kế hoạch & Biên bản kiểm toán"
            description={`Hệ thống phát hiện biến động cơ cấu giữa năm ${year1} và ${year2}. Đối với các đơn vị đã được nâng cấp lên Chi nhánh độc lập, hệ thống sẽ tự động áp dụng bộ biểu mẫu MB01 (Kế hoạch MB01A, Báo cáo MB01B, Biên bản MB04 TD & PTD). Đối với các điểm PGDBĐ trực thuộc Bưu điện huyện/xã, tự động áp dụng bộ biểu mẫu MB02.`}
            type="info"
            showIcon
          />

          {/* Table list */}
          <Card
            title={
              <Space>
                <ApartmentOutlined />
                <span>Danh Sách Đơn Vị Có Biến Động Tổ Chức (Kỳ {year1} → Kỳ {year2})</span>
                <Badge count={data?.allDifferences?.length || 0} overflowCount={999} style={{ backgroundColor: '#108ee9' }} />
              </Space>
            }
            className="shadow-sm"
          >
            <Table
              dataSource={data?.allDifferences || []}
              columns={columns}
              rowKey={(r: any) => `${r.code}_${r.changeType}`}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Không có biến động cơ cấu nào giữa 2 kỳ được chọn' }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default UnitRestructuringComparisonTab;
