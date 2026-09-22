import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Input,
  Select,
  Tag,
  Badge,
  Drawer,
  Descriptions,
  Divider,
  message,
  Space,
  Typography,
  Tooltip,
  Alert,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { LPBANK_BRAND_GOLD } from '../components/LPBankLogo';

const { Title, Text, Paragraph } = Typography;

interface ControlException {
  id: number;
  exceptionId: string;
  testId: string;
  sampleItemId: string;
  transactionDate: string;
  unitBranch: string;
  exceptionDescription: string;
  criteriaBreached: string;
  exceptionType: string;
  financialExposure: number;
  customerImpact: string;
  regulatoryImpact: string;
  managementExplanation: string;
  auditorValidation: string;
  rootCauseCode: string;
  riskImpact: string;
  validException: string;
  issueId: string;
  evidenceRef: string;
  reviewStatus: string;
}

interface TestOfControlItem {
  id: number;
  testId: string;
  engagementId: string;
  auditObjectId: string;
  riskId: string;
  rcmId: string;
  controlId: string;
  controlDescription: string;
  keyControl: string;
  controlOwner: string;
  controlFrequency: string;
  testPhase: string;
  testObjective: string;
  assertion: string;
  criteria: string;
  testMethod: string;
  dataSource: string;
  populationDefinition: string;
  populationSize: number;
  samplingMethod: string;
  itemsTested: number;
  validExceptions: number;
  exceptionRate: number;
  tolerableRate: number;
  materialException: string;
  suggestedResult: string;
  finalResult: string;
  exceptionSummary: string;
  rootCauseAssessment: string;
  riskImpactAssessment: string;
  issueRequired: string;
  issueId: string;
  preparedBy: string;
  testStatus: string;
  exceptions?: ControlException[];
}

export const TestOfControl: React.FC = () => {
  const [items, setItems] = useState<TestOfControlItem[]>([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    passCount: 0,
    failCount: 0,
    passRate: 0,
    totalExceptions: 0,
    validExceptions: 0,
    totalFinancialExposure: 0,
  });
  const [loading, setLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTest, setSelectedTest] = useState<TestOfControlItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resList, resStats] = await Promise.all([
        api.get('/test-of-control', {
          params: {
            search: searchTerm || undefined,
            result: resultFilter || undefined,
            status: statusFilter || undefined,
          },
        }),
        api.get('/test-of-control/stats'),
      ]);
      setItems(resList.data.items || []);
      setStats(resStats.data);
    } catch (err: any) {
      console.error('Failed to load TOC data', err);
      message.error('Không thể tải dữ liệu Kiểm thử kiểm soát');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, resultFilter, statusFilter]);

  const openDetail = async (testId: string) => {
    setDrawerLoading(true);
    setDrawerOpen(true);
    try {
      const res = await api.get(`/test-of-control/${testId}`);
      setSelectedTest(res.data);
    } catch (err: any) {
      console.error('Failed to load TOC detail', err);
      message.error('Không thể tải chi tiết kiểm thử: ' + (err.response?.data?.message || err.message));
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleGenerateFinding = async (exceptionId: string) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/test-of-control/exceptions/${exceptionId}/generate-finding`);
      message.success(`Đã tự động tạo phát hiện kiểm toán [${res.data.findingCode || res.data.code || 'Thành công'}]!`);
      if (selectedTest) {
        await openDetail(selectedTest.testId);
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tạo phát hiện kiểm toán: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<TestOfControlItem> = [
    {
      title: 'MÃ TEST',
      dataIndex: 'testId',
      key: 'testId',
      width: 140,
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d97706' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'KIỂM SOÁT / RCM',
      dataIndex: 'controlDescription',
      key: 'controlDescription',
      ellipsis: true,
      render: (val: string, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }} ellipsis={{ tooltip: val }}>
            {val}
          </Text>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
            <span style={{ fontFamily: 'monospace' }}>{r.controlId}</span> • <span style={{ fontFamily: 'monospace' }}>{r.rcmId}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'GIAI ĐOẠN & LOẠI',
      key: 'phase',
      width: 130,
      render: (_, r) => (
        <Space size={4}>
          <Tag color="blue">{r.testPhase || 'Both'}</Tag>
          {r.keyControl === 'Y' && <Tag color="gold">KEY</Tag>}
        </Space>
      ),
    },
    {
      title: 'ĐƠN VỊ OWNER',
      dataIndex: 'controlOwner',
      key: 'controlOwner',
      width: 130,
      ellipsis: true,
      render: (val) => <Text style={{ fontSize: 12 }}>{val || '—'}</Text>,
    },
    {
      title: 'MẪU / TỔNG THỂ',
      key: 'sampling',
      width: 130,
      align: 'center',
      render: (_, r) => (
        <div>
          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.itemsTested}</span>
          <span style={{ color: '#8c8c8c' }}> / {r.populationSize}</span>
          <div style={{ fontSize: 10, color: '#8c8c8c', textTransform: 'capitalize' }}>{r.samplingMethod}</div>
        </div>
      ),
    },
    {
      title: 'NGOẠI LỆ',
      dataIndex: 'validExceptions',
      key: 'validExceptions',
      width: 90,
      align: 'center',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: val > 0 ? '#ff4d4f' : '#52c41a', fontSize: 14 }}>
          {val}
        </span>
      ),
    },
    {
      title: 'TỶ LỆ / NGƯỠNG',
      key: 'rate',
      width: 120,
      align: 'center',
      render: (_, r) => {
        const isBreached = r.exceptionRate > r.tolerableRate;
        return (
          <div>
            <span style={{ fontWeight: 700, color: isBreached ? '#ff4d4f' : '#262626', fontFamily: 'monospace' }}>
              {(Number(r.exceptionRate || 0) * 100).toFixed(1)}%
            </span>
            <div style={{ fontSize: 10, color: '#8c8c8c' }}>
              Ngưỡng: {(Number(r.tolerableRate || 0) * 100).toFixed(0)}%
            </div>
          </div>
        );
      },
    },
    {
      title: 'KẾT LUẬN',
      dataIndex: 'finalResult',
      key: 'finalResult',
      width: 100,
      align: 'center',
      render: (val: string) => (
        val === 'Fail' ? (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Fail
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Pass
          </Tag>
        )
      ),
    },
    {
      title: 'LIÊN KẾT ISSUE',
      dataIndex: 'issueId',
      key: 'issueId',
      width: 130,
      align: 'center',
      render: (val: string, r) => {
        if (val) {
          return <Tag color="purple" style={{ fontFamily: 'monospace' }}>{val}</Tag>;
        }
        if (r.validExceptions > 0) {
          return <Tag color="warning" icon={<WarningOutlined />}>Cần lập</Tag>;
        }
        return <span style={{ color: '#bfbfbf' }}>—</span>;
      },
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          style={{ backgroundColor: '#f59e0b', borderColor: '#d97706', fontWeight: 600 }}
          onClick={(e) => {
            e.stopPropagation();
            openDetail(r.testId);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '4px 0 24px 0' }}>
      {/* 🏛️ Header Panel */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: '1px solid #fde68a',
          background: 'linear-gradient(90deg, #fffbeb 0%, #ffffff 100%)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Space size={8} style={{ marginBottom: 4 }}>
              <Tag color="#ea9105" style={{ color: '#ffffff', fontWeight: 700 }}>
                Phương pháp luận KTNB Lộc Phát
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Sheet 03_Test_of_Control
              </Text>
            </Space>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
              <SafetyCertificateOutlined style={{ color: '#ea9105' }} />
              Kiểm Thử Kiểm Soát (Test of Control - TOC)
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Thiết kế, thực hiện kiểm thử quy mô mẫu, tỷ lệ ngoại lệ (Exception Rate) và kết luận hiệu lực kiểm soát
            </Text>
          </div>

          <Space orientation="horizontal" size={8}>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Space>
        </div>
      </Card>

      {/* 📊 Metric Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6} lg={4} xl={4}>
          <Card variant="outlined" size="small" style={{ borderRadius: 10, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#64748b' }}>Tổng số Kiểm thử</span>}
              value={stats.totalTests}
              valueStyle={{ fontWeight: 700, color: '#1e293b' }}
              suffix={<span style={{ fontSize: 11, color: '#94a3b8' }}>mẫu</span>}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={5} xl={5}>
          <Card variant="outlined" size="small" style={{ borderRadius: 10, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#166534' }}>Tỷ lệ Đạt (Pass)</span>}
              value={stats.passRate}
              precision={1}
              valueStyle={{ fontWeight: 700, color: '#16a34a' }}
              suffix={`% (${stats.passCount} đạt)`}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={5} xl={5}>
          <Card variant="outlined" size="small" style={{ borderRadius: 10, borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#991b1b' }}>Không đạt (Fail)</span>}
              value={stats.failCount}
              valueStyle={{ fontWeight: 700, color: '#dc2626' }}
              suffix={<span style={{ fontSize: 11, color: '#dc2626' }}>cần lập Issue</span>}
              prefix={<CloseCircleOutlined style={{ color: '#dc2626' }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={5} xl={5}>
          <Card variant="outlined" size="small" style={{ borderRadius: 10, borderColor: '#fed7aa', backgroundColor: '#fff7ed' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#9a3412' }}>Ngoại lệ hợp lệ</span>}
              value={stats.validExceptions}
              valueStyle={{ fontWeight: 700, color: '#ea580c' }}
              suffix={`/ ${stats.totalExceptions} lỗi`}
              prefix={<WarningOutlined style={{ color: '#ea580c' }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={5} xl={5}>
          <Card variant="outlined" size="small" style={{ borderRadius: 10, borderColor: '#e9d5ff', backgroundColor: '#faf5ff' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#6b21a8' }}>Phơi nhiễm ngoại lệ</span>}
              value={
                stats.totalFinancialExposure > 1e9
                  ? `${(stats.totalFinancialExposure / 1e9).toFixed(1)} tỷ`
                  : `${(stats.totalFinancialExposure / 1e6).toFixed(0)} tr`
              }
              valueStyle={{ fontWeight: 700, color: '#7e22ce' }}
              prefix={<DollarOutlined style={{ color: '#7e22ce' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 🔍 Filter & Search Bar */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 10, borderColor: '#e2e8f0' }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12} lg={10}>
            <Input
              placeholder="Tìm kiếm theo mã Test, mô tả kiểm soát, Owner, RCM..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={12} md={6} lg={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="-- Kết quả --"
              value={resultFilter || undefined}
              onChange={(val) => setResultFilter(val || '')}
              allowClear
            >
              <Select.Option value="Pass">Pass (Đạt)</Select.Option>
              <Select.Option value="Fail">Fail (Không đạt)</Select.Option>
            </Select>
          </Col>

          <Col xs={12} md={6} lg={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="-- Trạng thái --"
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              allowClear
            >
              <Select.Option value="Draft">Dự thảo</Select.Option>
              <Select.Option value="Reviewed">Đã soát xét</Select.Option>
              <Select.Option value="Approved">Đã phê duyệt</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 📋 Data Table */}
      <Card variant="outlined" style={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={items}
          rowKey="testId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} kiểm thử kiểm soát`,
          }}
          onRow={(record) => ({
            onClick: () => openDetail(record.testId),
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 1100 }}
          size="middle"
        />
      </Card>

      {/* 📖 Ant Design Drawer Detail */}
      <Drawer
        title={
          selectedTest ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Space>
                <Tag color="#ea9105" style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                  {selectedTest.testId}
                </Tag>
                <Tag
                  color={selectedTest.finalResult === 'Fail' ? 'error' : 'success'}
                  icon={selectedTest.finalResult === 'Fail' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                  style={{ fontWeight: 600 }}
                >
                  Kết luận: {selectedTest.finalResult}
                </Tag>
              </Space>
            </div>
          ) : (
            'Chi tiết Kiểm Thử Kiểm Soát'
          )
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={760}
        destroyOnClose
        styles={{
          header: { backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a' },
          body: { padding: '20px 24px' },
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              KTV thực hiện: <strong>{selectedTest?.preparedBy || 'KTV'}</strong>
            </Text>
            <Button onClick={() => setDrawerOpen(false)}>Đóng</Button>
          </div>
        }
      >
        {drawerLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Đang tải dữ liệu chi tiết...</div>
        ) : selectedTest ? (
          <div>
            {/* Header info */}
            <Title level={5} style={{ marginBottom: 16, color: '#1e293b' }}>
              {selectedTest.controlDescription}
            </Title>

            {/* Objective & Criteria */}
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mục tiêu kiểm thử" span={2}>
                {selectedTest.testObjective || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn đánh giá" span={2}>
                {selectedTest.criteria || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Mã Kiểm soát">{selectedTest.controlId}</Descriptions.Item>
              <Descriptions.Item label="Mã RCM">{selectedTest.rcmId}</Descriptions.Item>
              <Descriptions.Item label="Đơn vị chịu trách nhiệm">{selectedTest.controlOwner || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tần suất kiểm soát">{selectedTest.controlFrequency || '—'}</Descriptions.Item>
              <Descriptions.Item label="Cơ sở (Assertion)">{selectedTest.assertion || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp kiểm thử">{selectedTest.testMethod || '—'}</Descriptions.Item>
            </Descriptions>

            {/* Sampling Stats */}
            <Card
              size="small"
              title={<span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>TỔNG THỂ & MẪU KIỂM THỬ</span>}
              style={{ marginBottom: 16, borderRadius: 8, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}
            >
              <Row gutter={12} style={{ textAlign: 'center', marginBottom: 8 }}>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Quy mô tổng thể</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedTest.populationSize}</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Mẫu kiểm tra</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedTest.itemsTested}</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Ngoại lệ hợp lệ</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{selectedTest.validExceptions}</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Tỷ lệ ngoại lệ</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: selectedTest.exceptionRate > selectedTest.tolerableRate ? '#dc2626' : '#d97706' }}>
                      {(Number(selectedTest.exceptionRate || 0) * 100).toFixed(1)}%
                    </div>
                  </Card>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>Định nghĩa tổng thể:</strong> {selectedTest.populationDefinition || 'Toàn bộ hồ sơ phát sinh trong kỳ'}
              </Text>
            </Card>

            {/* Exception Log */}
            <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
              <Space>
                <WarningOutlined style={{ color: '#ea580c' }} />
                <span style={{ fontWeight: 700 }}>Danh sách Ngoại lệ (Exception Log) ({selectedTest.exceptions?.length || 0})</span>
              </Space>
            </Divider>

            {(!selectedTest.exceptions || selectedTest.exceptions.length === 0) ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không ghi nhận ngoại lệ nào cho kiểm thử này"
              />
            ) : (
              <Space orientation="vertical" style={{ width: '100%' }} size={12}>
                {selectedTest.exceptions.map((exc) => (
                  <Card
                    key={exc.id}
                    size="small"
                    style={{
                      borderRadius: 8,
                      borderColor: '#fecaca',
                      backgroundColor: '#fff5f5',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Space>
                        <Tag color="error" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {exc.exceptionId}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>({exc.unitBranch || 'Hội sở'})</Text>
                      </Space>
                      {Number(exc.financialExposure) > 0 && (
                        <Tag color="purple">
                          Phơi nhiễm: {(Number(exc.financialExposure) / 1e6).toLocaleString()} triệu VNĐ
                        </Tag>
                      )}
                    </div>

                    <Paragraph style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 500 }}>
                      {exc.exceptionDescription}
                    </Paragraph>

                    <div style={{ backgroundColor: '#ffffff', padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 8, border: '1px solid #fee2e2' }}>
                      <div><strong>Giải trình đơn vị:</strong> {exc.managementExplanation || 'Chưa ghi nhận'}</div>
                      <div style={{ marginTop: 4 }}><strong>Thẩm định KTV:</strong> {exc.auditorValidation || 'Đã kiểm tra đối soát hồ sơ gốc'}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Vi phạm: {exc.criteriaBreached || 'Quy định nội bộ'}
                      </Text>

                      {exc.issueId ? (
                        <Tag color="purple" icon={<FileDoneOutlined />} style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          Đã sinh Issue: {exc.issueId}
                        </Tag>
                      ) : (
                        <Button
                          type="primary"
                          size="small"
                          icon={<ThunderboltOutlined />}
                          loading={actionLoading}
                          style={{ backgroundColor: '#ea9105', borderColor: '#d97706' }}
                          onClick={() => handleGenerateFinding(exc.exceptionId)}
                        >
                          Tạo phát hiện kiểm toán (1-click)
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default TestOfControl;
