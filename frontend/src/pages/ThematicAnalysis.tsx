import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tabs,
  Badge,
  Tooltip,
  Drawer,
  Alert,
  Statistic,
  Empty,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  BulbOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 12 chuẩn Lĩnh vực từ HSRR THUCTE 2026
const DOMAIN_OPTIONS = [
  { code: 'CNTT', label: 'Công nghệ thông tin (CNTT)', color: 'blue' },
  { code: 'NHBL', label: 'Ngân hàng bán lẻ (NHBL)', color: 'green' },
  { code: 'NHDN', label: 'Ngân hàng doanh nghiệp (NHDN)', color: 'cyan' },
  { code: 'TD_DVKD', label: 'Tín dụng ĐVKD (TD_DVKD)', color: 'volcano' },
  { code: 'TD_CLTD', label: 'Tín dụng & CLTD (TD_CLTD)', color: 'magenta' },
  { code: 'PGDBD', label: 'Phòng GD Bưu điện (PGDBD)', color: 'orange' },
  { code: 'PTD_DVKD', label: 'Phi tín dụng ĐVKD (PTD_DVKD)', color: 'purple' },
  { code: 'QTRR', label: 'Quản trị rủi ro & Tuân thủ (QTRR)', color: 'red' },
  { code: 'VH', label: 'Vận hành ngân hàng (VH)', color: 'gold' },
  { code: 'NS_DVNB', label: 'Nhân sự & DV nội bộ (NS_DVNB)', color: 'geekblue' },
  { code: 'VPQT', label: 'Văn phòng quản trị (VPQT)', color: 'lime' },
  { code: 'TT_TLAT_QTTC', label: 'Thanh toán & QTTC (TT_TLAT_QTTC)', color: 'default' },
];

export const ThematicAnalysis: React.FC = () => {
  const [themes, setThemes] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [autoDetectData, setAutoDetectData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('registry');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(undefined);
  const [selectedTrajectory, setSelectedTrajectory] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  // Modal / Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any>(null);
  const [detailTheme, setDetailTheme] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedDomain) params.domain = selectedDomain;
      if (selectedPriority) params.priority = selectedPriority;
      if (selectedTrajectory) params.trajectory = selectedTrajectory;
      if (selectedStatus) params.status = selectedStatus;
      if (search) params.search = search;

      const res = await api.get('/thematic-themes', { params });
      setThemes(res.data || []);
    } catch (err) {
      message.error('Không thể tải danh sách Chuyên đề Rủi ro');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/thematic-themes/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error fetching thematic dashboard:', err);
    }
  };

  const fetchAutoDetect = async () => {
    try {
      const res = await api.get('/thematic-themes/auto-detect');
      setAutoDetectData(res.data);
    } catch (err) {
      console.error('Error fetching auto detect themes:', err);
    }
  };

  useEffect(() => {
    fetchThemes();
    fetchDashboard();
  }, [selectedDomain, selectedPriority, selectedTrajectory, selectedStatus]);

  useEffect(() => {
    if (activeTab === 'autodetect') {
      fetchAutoDetect();
    }
  }, [activeTab]);

  // Handle Create / Edit
  const handleOpenModal = (theme?: any) => {
    setEditingTheme(theme || null);
    if (theme) {
      form.setFieldsValue({
        ...theme,
      });
    } else {
      const nextNum = (themes.length + 1).toString().padStart(3, '0');
      form.resetFields();
      form.setFieldsValue({
        themeId: `TH-2026-${nextNum}`,
        riskDomainCode: 'CNTT',
        analysisPeriod: '2025-2026',
        riskTrajectory: 'Stable',
        themePriority: 'Moderate',
        status: 'Draft',
        issueIds: [],
        riskIds: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveTheme = async () => {
    try {
      const values = await form.validateFields();
      if (editingTheme) {
        await api.patch(`/thematic-themes/${editingTheme.id}`, values);
        message.success('Đã cập nhật Chuyên đề Rủi ro');
      } else {
        await api.post('/thematic-themes', values);
        message.success('Đã tạo mới Chuyên đề Rủi ro');
      }
      setIsModalOpen(false);
      fetchThemes();
      fetchDashboard();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error('Lỗi khi lưu chuyên đề: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTheme = (id: number) => {
    Modal.confirm({
      title: 'Xác nhận xóa Chuyên đề Rủi ro?',
      content: 'Thao tác này sẽ xóa chuyên đề khỏi hệ thống.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.delete(`/thematic-themes/${id}`);
          message.success('Đã xóa chuyên đề');
          fetchThemes();
          fetchDashboard();
        } catch (err) {
          message.error('Không thể xóa chuyên đề');
        }
      },
    });
  };

  // Pre-fill modal from auto-detect cluster
  const handleCreateFromCluster = (cluster: any) => {
    form.resetFields();
    const nextNum = (themes.length + 1).toString().padStart(3, '0');
    form.setFieldsValue({
      themeId: `TH-2026-${nextNum}`,
      themeTitle: cluster.suggestedTitle,
      riskDomainCode: cluster.proposedDomain || 'CNTT',
      analysisPeriod: '2025-2026',
      affectedPopulation: `Bao gồm các đơn vị có phát sinh ${cluster.findingCount} phát hiện lặp lại`,
      issueIds: cluster.sampleFindingCodes || [],
      riskIds: [],
      riskTrajectory: cluster.riskTrajectory || 'Increasing',
      systemicRootCause: cluster.commonCauses?.join('; ') || 'Sai phạm mang tính lặp lại hoặc lỗi cấu hình hệ thống.',
      assuranceGap: 'Cần mở rộng phạm vi kiểm toán độc lập đối với các đơn vị liên quan.',
      recommendedResponse: `Tổ chức kiểm toán chuyên đề ${cluster.proposedDomain} và rà soát lại quy trình kiểm soát nội bộ.`,
      themePriority: cluster.proposedPriority || 'High',
      status: 'Draft',
    });
    setEditingTheme(null);
    setIsModalOpen(true);
  };

  // Trajectory renderers
  const renderTrajectoryTag = (traj: string) => {
    switch (traj) {
      case 'Increasing':
        return <Tag icon={<RiseOutlined />} color="red">Đang tăng (Increasing)</Tag>;
      case 'Emerging':
        return <Tag icon={<ThunderboltOutlined />} color="purple">Mới nổi (Emerging)</Tag>;
      case 'Stable':
        return <Tag icon={<MinusOutlined />} color="blue">Ổn định (Stable)</Tag>;
      case 'Decreasing':
        return <Tag icon={<FallOutlined />} color="green">Đang giảm (Decreasing)</Tag>;
      default:
        return <Tag>{traj}</Tag>;
    }
  };

  const renderPriorityTag = (p: string) => {
    switch (p) {
      case 'Critical':
        return <Tag color="#cf1322" style={{ fontWeight: 'bold' }}>Nghiêm trọng (Critical)</Tag>;
      case 'High':
        return <Tag color="#fa541c" style={{ fontWeight: 'bold' }}>Cao (High)</Tag>;
      case 'Moderate':
        return <Tag color="#faad14">Trung bình (Moderate)</Tag>;
      case 'Low':
        return <Tag color="#52c41a">Thấp (Low)</Tag>;
      default:
        return <Tag>{p}</Tag>;
    }
  };

  const renderStatusBadge = (s: string) => {
    switch (s) {
      case 'Approved':
        return <Badge status="success" text="Đã phê duyệt" />;
      case 'In_Progress':
        return <Badge status="processing" text="Đang xử lý" />;
      case 'Action_Taken':
        return <Badge status="warning" text="Đã có hành động" />;
      case 'Closed':
        return <Badge status="default" text="Đã đóng" />;
      default:
        return <Badge status="default" text="Dự thảo" />;
    }
  };

  // Columns for Registry Table
  const columns = [
    {
      title: 'Mã chuyên đề',
      dataIndex: 'themeId',
      key: 'themeId',
      width: 130,
      render: (id: string) => <Tag color="#0f172a" style={{ fontWeight: 'bold' }}>{id}</Tag>,
    },
    {
      title: 'Tên chuyên đề & Lĩnh vực',
      key: 'title',
      render: (_: any, r: any) => {
        const dom = DOMAIN_OPTIONS.find((d) => d.code === r.riskDomainCode);
        return (
          <div>
            <a
              style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}
              onClick={() => setDetailTheme(r)}
            >
              {r.themeTitle}
            </a>
            <div style={{ marginTop: 4 }}>
              <Tag color={dom?.color || 'default'}>{dom?.label || r.riskDomainCode}</Tag>
              {r.analysisPeriod && <Tag>{r.analysisPeriod}</Tag>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Xu hướng (Trajectory)',
      dataIndex: 'riskTrajectory',
      key: 'riskTrajectory',
      width: 170,
      render: (t: string) => renderTrajectoryTag(t),
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'themePriority',
      key: 'themePriority',
      width: 170,
      render: (p: string) => renderPriorityTag(p),
    },
    {
      title: 'Nguyên nhân hệ thống',
      dataIndex: 'systemicRootCause',
      key: 'systemicRootCause',
      ellipsis: true,
      render: (cause: string) => (
        <Tooltip title={cause}>
          <Text type="secondary">{cause || 'Chưa xác định'}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Liên kết',
      key: 'links',
      width: 150,
      render: (_: any, r: any) => (
        <Space orientation="vertical" size={2}>
          <Tag icon={<FileTextOutlined />} color="cyan">
            {r.issueIds?.length || 0} phát hiện
          </Tag>
          <Tag icon={<SafetyCertificateOutlined />} color="geekblue">
            {r.riskIds?.length || 0} rủi ro HSRR
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => renderStatusBadge(s),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, r: any) => (
        <Space orientation="horizontal" size="small">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: '#1677ff' }} />}
            onClick={() => setDetailTheme(r)}
          />
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#ea9105' }} />}
            onClick={() => handleOpenModal(r)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTheme(r.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '24px 32px',
          marginBottom: '24px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col xs={24} md={16}>
            <Space orientation="vertical" size={4}>
              <Tag color="#ea9105" style={{ fontWeight: 'bold' }}>
                THUCTE 2026 — Sheet 08_Thematic
              </Tag>
              <Title level={2} style={{ color: '#fff', margin: 0 }}>
                Phân tích Chuyên đề Rủi ro Hệ thống (Thematic Risk Analysis)
              </Title>
              <Paragraph style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
                Nhận diện mẫu hình rủi ro xuyên suốt các cuộc kiểm toán, phân tích nguyên nhân gốc rễ (RCA),
                khoảng trống bảo đảm (Assurance Gap) và định hướng kế hoạch kiểm toán chuyên đề toàn ngân hàng.
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right', marginTop: '12px' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                onClick={() => handleOpenModal()}
              >
                + Thêm mới Chuyên đề
              </Button>
              <Button
                icon={<ReloadOutlined />}
                style={{ backgroundColor: '#334155', color: '#fff', borderColor: '#475569' }}
                onClick={() => {
                  fetchThemes();
                  fetchDashboard();
                  message.info('Đã làm mới dữ liệu');
                }}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card variant="borderless" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text strong>Tổng số Chuyên đề</Text>}
              value={dashboardData?.totalThemes || themes.length}
              prefix={<ApartmentOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text strong>Xu hướng Đang tăng / Mới nổi</Text>}
              value={
                (dashboardData?.trajectoryCounts?.Increasing || 0) +
                (dashboardData?.trajectoryCounts?.Emerging || 0)
              }
              prefix={<RiseOutlined style={{ color: '#cf1322' }} />}
              valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text strong>Ưu tiên Nghiêm trọng / Cao</Text>}
              value={
                (dashboardData?.priorityCounts?.Critical || 0) +
                (dashboardData?.priorityCounts?.High || 0)
              }
              prefix={<WarningOutlined style={{ color: '#fa541c' }} />}
              valueStyle={{ color: '#fa541c', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<Text strong>Phát hiện & Rủi ro Bao phủ</Text>}
              value={
                (dashboardData?.totalLinkedIssues || 0) +
                (dashboardData?.totalLinkedRisks || 0)
              }
              prefix={<LinkOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px' }}
        items={[
          {
            key: 'registry',
            label: (
              <span>
                <FileTextOutlined /> Danh mục Chuyên đề ({themes.length})
              </span>
            ),
            children: (
              <>
                {/* Filter Toolbar */}
                <Card
                  size="small"
                  style={{ marginBottom: '16px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}
                >
                  <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={6}>
                      <Input
                        placeholder="Tìm theo Mã, Tên chuyên đề hoặc Nguyên nhân..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={fetchThemes}
                        allowClear
                      />
                    </Col>
                    <Col xs={12} sm={4}>
                      <Select
                        placeholder="Lĩnh vực rủi ro"
                        style={{ width: '100%' }}
                        allowClear
                        value={selectedDomain}
                        onChange={setSelectedDomain}
                      >
                        {DOMAIN_OPTIONS.map((d) => (
                          <Option key={d.code} value={d.code}>
                            {d.label}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Select
                        placeholder="Độ ưu tiên"
                        style={{ width: '100%' }}
                        allowClear
                        value={selectedPriority}
                        onChange={setSelectedPriority}
                      >
                        <Option value="Critical">Nghiêm trọng (Critical)</Option>
                        <Option value="High">Cao (High)</Option>
                        <Option value="Moderate">Trung bình (Moderate)</Option>
                        <Option value="Low">Thấp (Low)</Option>
                      </Select>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Select
                        placeholder="Xu hướng rủi ro"
                        style={{ width: '100%' }}
                        allowClear
                        value={selectedTrajectory}
                        onChange={setSelectedTrajectory}
                      >
                        <Option value="Increasing">Đang tăng (Increasing)</Option>
                        <Option value="Emerging">Mới nổi (Emerging)</Option>
                        <Option value="Stable">Ổn định (Stable)</Option>
                        <Option value="Decreasing">Đang giảm (Decreasing)</Option>
                      </Select>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Select
                        placeholder="Trạng thái"
                        style={{ width: '100%' }}
                        allowClear
                        value={selectedStatus}
                        onChange={setSelectedStatus}
                      >
                        <Option value="Draft">Dự thảo</Option>
                        <Option value="Approved">Đã phê duyệt</Option>
                        <Option value="In_Progress">Đang xử lý</Option>
                        <Option value="Action_Taken">Đã có hành động</Option>
                        <Option value="Closed">Đã đóng</Option>
                      </Select>
                    </Col>
                    <Col xs={12} sm={2}>
                      <Button
                        onClick={() => {
                          setSearch('');
                          setSelectedDomain(undefined);
                          setSelectedPriority(undefined);
                          setSelectedTrajectory(undefined);
                          setSelectedStatus(undefined);
                        }}
                      >
                        Xóa lọc
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Themes Table */}
                <Table
                  columns={columns}
                  dataSource={themes}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                />
              </>
            ),
          },
          {
            key: 'rootcauses',
            label: (
              <span>
                <ApartmentOutlined /> Bản đồ Xu hướng & Nguyên nhân Gốc rễ
              </span>
            ),
            children: (
              <div>
                <Alert
                  message="Phân tích Nguyên nhân Hệ thống & Khoảng trống Bảo đảm"
                  description="Tổng hợp các nguyên nhân cốt lõi mang tính hệ thống được phát hiện qua các kỳ kiểm toán. Căn cứ giúp Ban Kiểm soát và CAE phê duyệt kế hoạch bảo đảm chuyên sâu."
                  type="info"
                  showIcon
                  style={{ marginBottom: '20px' }}
                />

                <Row gutter={[16, 16]}>
                  {themes.map((t) => (
                    <Col xs={24} md={12} key={t.id}>
                      <Card
                        title={
                          <Space>
                            <Tag color="#0f172a">{t.themeId}</Tag>
                            <Text strong>{t.themeTitle}</Text>
                          </Space>
                        }
                        extra={renderTrajectoryTag(t.riskTrajectory)}
                        style={{
                          height: '100%',
                          borderLeft:
                            t.themePriority === 'Critical'
                              ? '4px solid #cf1322'
                              : t.themePriority === 'High'
                              ? '4px solid #fa541c'
                              : '4px solid #1677ff',
                        }}
                      >
                        <div style={{ marginBottom: '12px' }}>
                          <Text type="secondary">Lĩnh vực: </Text>
                          <Tag color="blue">{t.riskDomainCode}</Tag>
                          <Text type="secondary" style={{ marginLeft: '12px' }}>
                            Kỳ phân tích:{' '}
                          </Text>
                          <Tag>{t.analysisPeriod || 'N/A'}</Tag>
                          <Text type="secondary" style={{ marginLeft: '12px' }}>
                            Ưu tiên:{' '}
                          </Text>
                          {renderPriorityTag(t.themePriority)}
                        </div>

                        <Divider style={{ margin: '8px 0' }} />

                        <div style={{ marginBottom: '10px' }}>
                          <Text strong style={{ color: '#0f172a' }}>
                            🔍 Nguyên nhân gốc rễ hệ thống (Systemic Root Cause):
                          </Text>
                          <Paragraph style={{ marginTop: '4px', color: '#475569', fontSize: '13px' }}>
                            {t.systemicRootCause || 'Chưa cập nhật'}
                          </Paragraph>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <Text strong style={{ color: '#0f172a' }}>
                            ⚠️ Khoảng trống bảo đảm (Assurance Gap):
                          </Text>
                          <Paragraph style={{ marginTop: '4px', color: '#b91c1c', fontSize: '13px' }}>
                            {t.assuranceGap || 'Chưa ghi nhận khoảng trống bảo đảm'}
                          </Paragraph>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <Text strong style={{ color: '#0f172a' }}>
                            🎯 Hành động khuyến nghị cấp hệ thống:
                          </Text>
                          <Paragraph style={{ marginTop: '4px', color: '#047857', fontSize: '13px' }}>
                            {t.recommendedResponse || 'Chưa đề xuất'}
                          </Paragraph>
                        </div>

                        <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Text type="secondary">Phê duyệt: </Text>
                              <Tag color="purple">{t.approvalRef || 'Chờ phê duyệt'}</Tag>
                            </Col>
                            <Col>
                              <Space>
                                <Tag color="cyan">{t.issueIds?.length || 0} phát hiện</Tag>
                                <Tag color="geekblue">{t.riskIds?.length || 0} rủi ro</Tag>
                              </Space>
                            </Col>
                          </Row>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
          {
            key: 'autodetect',
            label: (
              <span>
                <BulbOutlined /> Công cụ Nhận diện Cụm Rủi ro Tự động
              </span>
            ),
            children: (
              <div>
                <Alert
                  message="Công cụ Khai phá Mẫu hình Rủi ro từ Kho Phát hiện Kiểm toán"
                  description="Engine tự động quét toàn bộ cơ sở dữ liệu phát hiện kiểm toán (audit_findings), nhận diện các lỗi có tính chất lặp lại (repeatCount > 1), lỗi hệ thống hoặc các cụm sai phạm cùng bản chất để đề xuất thành lập Chuyên đề Rủi ro mới."
                  type="success"
                  showIcon
                  style={{ marginBottom: '20px' }}
                />

                <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                  <Col span={24}>
                    <Card
                      title={
                        <Space>
                          <ThunderboltOutlined style={{ color: '#ea9105' }} />
                          <Text strong>
                            Kết quả quét tự động: Tìm thấy {autoDetectData?.totalSystemicFindings || 0} phát hiện mang tính hệ thống/lặp lại
                          </Text>
                        </Space>
                      }
                      extra={
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={fetchAutoDetect}
                          loading={loading}
                        >
                          Quét lại dữ liệu
                        </Button>
                      }
                    >
                      {autoDetectData?.clusters && autoDetectData.clusters.length > 0 ? (
                        <Row gutter={[16, 16]}>
                          {autoDetectData.clusters.map((cluster: any, idx: number) => (
                            <Col xs={24} md={12} key={idx}>
                              <Card
                                type="inner"
                                title={
                                  <Space>
                                    <Tag color="orange">{cluster.proposedDomain}</Tag>
                                    <Text strong>{cluster.suggestedTitle}</Text>
                                  </Space>
                                }
                                extra={
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                                    onClick={() => handleCreateFromCluster(cluster)}
                                  >
                                    Tạo Chuyên đề từ Cụm này
                                  </Button>
                                }
                              >
                                <Paragraph>
                                  <Text strong>Số phát hiện vi phạm: </Text>
                                  <Badge count={cluster.findingCount} style={{ backgroundColor: '#52c41a' }} />
                                </Paragraph>
                                <Paragraph>
                                  <Text strong>Mã phát hiện tiêu biểu: </Text>
                                  {cluster.sampleFindingCodes?.map((c: string) => (
                                    <Tag key={c} color="blue">
                                      {c}
                                    </Tag>
                                  ))}
                                </Paragraph>
                                <Paragraph>
                                  <Text strong>Nguyên nhân thường gặp: </Text>
                                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                    {cluster.commonCauses?.map((c: string, ci: number) => (
                                      <li key={ci}>{c}</li>
                                    ))}
                                  </ul>
                                </Paragraph>
                                <div>
                                  <Text type="secondary">Xu hướng đề xuất: </Text>
                                  {renderTrajectoryTag(cluster.riskTrajectory)}
                                  <Text type="secondary" style={{ marginLeft: '12px' }}>
                                    Ưu tiên đề xuất:{' '}
                                  </Text>
                                  {renderPriorityTag(cluster.proposedPriority)}
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      ) : (
                        <Empty description="Không tìm thấy cụm rủi ro bất thường chưa được phân tích." />
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />

      {/* Create / Edit Modal */}
      <Modal
        title={
          <Text strong style={{ fontSize: '16px' }}>
            {editingTheme ? '✏️ Cập nhật Chuyên đề Rủi ro' : '➕ Thêm mới Chuyên đề Rủi ro Hệ thống'}
          </Text>
        }
        open={isModalOpen}
        onOk={handleSaveTheme}
        onCancel={() => setIsModalOpen(false)}
        width={800}
        okText="Lưu chuyên đề"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="themeId"
                label="Mã chuyên đề (Theme ID)"
                rules={[{ required: true, message: 'Vui lòng nhập mã chuyên đề' }]}
              >
                <Input placeholder="TH-2026-001" disabled={!!editingTheme} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="themeTitle"
                label="Tên chuyên đề rủi ro xuyên suốt"
                rules={[{ required: true, message: 'Vui lòng nhập tên chuyên đề' }]}
              >
                <Input placeholder="VD: Quản trị phân quyền và kiểm soát truy cập đặc quyền (PAM)..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="riskDomainCode"
                label="Lĩnh vực rủi ro"
                rules={[{ required: true, message: 'Chọn lĩnh vực' }]}
              >
                <Select placeholder="Chọn lĩnh vực">
                  {DOMAIN_OPTIONS.map((d) => (
                    <Option key={d.code} value={d.code}>
                      {d.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="analysisPeriod" label="Kỳ dữ liệu phân tích">
                <Input placeholder="2025-2026 hoặc 2024-2026H1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="riskTrajectory" label="Xu hướng rủi ro (Trajectory)">
                <Select>
                  <Option value="Increasing">Đang tăng (Increasing)</Option>
                  <Option value="Emerging">Mới nổi (Emerging)</Option>
                  <Option value="Stable">Ổn định (Stable)</Option>
                  <Option value="Decreasing">Đang giảm (Decreasing)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="themePriority" label="Mức độ ưu tiên">
                <Select>
                  <Option value="Critical">Nghiêm trọng (Critical)</Option>
                  <Option value="High">Cao (High)</Option>
                  <Option value="Moderate">Trung bình (Moderate)</Option>
                  <Option value="Low">Thấp (Low)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select>
                  <Option value="Draft">Dự thảo (Draft)</Option>
                  <Option value="Approved">Đã phê duyệt (Approved)</Option>
                  <Option value="In_Progress">Đang xử lý (In_Progress)</Option>
                  <Option value="Action_Taken">Đã có hành động (Action_Taken)</Option>
                  <Option value="Closed">Đã đóng (Closed)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="approvalRef" label="Quyết định / Văn bản phê duyệt">
                <Input placeholder="CAE/BKS-QĐ-08/2026..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="affectedPopulation" label="Phạm vi & Đơn vị bị ảnh hưởng (Affected Population)">
            <Input placeholder="VD: 12 Chi nhánh trọng điểm, Khối CNTT và Khối Vận hành..." />
          </Form.Item>

          <Form.Item
            name="systemicRootCause"
            label="Nguyên nhân gốc rễ mang tính hệ thống (Systemic Root Cause)"
            rules={[{ required: true, message: 'Vui lòng nhập nguyên nhân hệ thống' }]}
          >
            <TextArea
              rows={3}
              placeholder="Phân tích vì sao rủi ro này xảy ra diện rộng hoặc lặp lại nhiều lần..."
            />
          </Form.Item>

          <Form.Item name="assuranceGap" label="Khoảng trống bảo đảm (Assurance Gap)">
            <TextArea
              rows={2}
              placeholder="Những quy trình, đơn vị hoặc rủi ro con chưa được kiểm toán bao phủ..."
            />
          </Form.Item>

          <Form.Item
            name="recommendedResponse"
            label="Hành động cấp hệ thống / Kế hoạch kiểm toán chuyên đề (Recommended Response)"
            rules={[{ required: true, message: 'Vui lòng nhập khuyến nghị' }]}
          >
            <TextArea
              rows={3}
              placeholder="VD: CAE ban hành yêu cầu kiểm toán chuyên đề; Ban TGĐ yêu cầu nâng cấp hệ thống..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Theme Detail Drawer */}
      <Drawer
        title={
          <Space>
            <Tag color="#0f172a">{detailTheme?.themeId}</Tag>
            <Text strong>{detailTheme?.themeTitle}</Text>
          </Space>
        }
        placement="right"
        width={650}
        onClose={() => setDetailTheme(null)}
        open={!!detailTheme}
      >
        {detailTheme && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Text type="secondary">Lĩnh vực: </Text>
                  <Tag color="blue">{detailTheme.riskDomainCode}</Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Kỳ phân tích: </Text>
                  <Tag>{detailTheme.analysisPeriod || 'N/A'}</Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Xu hướng: </Text>
                  {renderTrajectoryTag(detailTheme.riskTrajectory)}
                </Col>
                <Col span={12}>
                  <Text type="secondary">Ưu tiên: </Text>
                  {renderPriorityTag(detailTheme.themePriority)}
                </Col>
                <Col span={12}>
                  <Text type="secondary">Trạng thái: </Text>
                  {renderStatusBadge(detailTheme.status)}
                </Col>
                <Col span={12}>
                  <Text type="secondary">Phê duyệt: </Text>
                  <Tag color="purple">{detailTheme.approvalRef || 'Chưa phê duyệt'}</Tag>
                </Col>
              </Row>
            </div>

            <Divider />

            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: '#0f172a', fontSize: '14px' }}>
                Phạm vi & Đơn vị ảnh hưởng:
              </Text>
              <Paragraph style={{ marginTop: '4px', color: '#475569' }}>
                {detailTheme.affectedPopulation || 'Chưa cập nhật'}
              </Paragraph>
            </div>

            <div style={{ marginBottom: '16px', background: '#fef2f2', padding: '12px', borderRadius: '6px' }}>
              <Text strong style={{ color: '#991b1b', fontSize: '14px' }}>
                🔍 Nguyên nhân gốc rễ mang tính hệ thống (Systemic RCA):
              </Text>
              <Paragraph style={{ marginTop: '4px', color: '#7f1d1d' }}>
                {detailTheme.systemicRootCause}
              </Paragraph>
            </div>

            <div style={{ marginBottom: '16px', background: '#fffbeb', padding: '12px', borderRadius: '6px' }}>
              <Text strong style={{ color: '#92400e', fontSize: '14px' }}>
                ⚠️ Khoảng trống bảo đảm (Assurance Gap):
              </Text>
              <Paragraph style={{ marginTop: '4px', color: '#78350f' }}>
                {detailTheme.assuranceGap || 'Không có khoảng trống được ghi nhận.'}
              </Paragraph>
            </div>

            <div style={{ marginBottom: '16px', background: '#f0fdf4', padding: '12px', borderRadius: '6px' }}>
              <Text strong style={{ color: '#166534', fontSize: '14px' }}>
                🎯 Hành động khuyến nghị cấp hệ thống:
              </Text>
              <Paragraph style={{ marginTop: '4px', color: '#14532d' }}>
                {detailTheme.recommendedResponse}
              </Paragraph>
            </div>

            <Divider />

            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ fontSize: '14px' }}>
                🔗 Danh sách Phát hiện Kiểm toán liên kết ({detailTheme.issueIds?.length || 0}):
              </Text>
              <div style={{ marginTop: '8px' }}>
                {detailTheme.issueIds && detailTheme.issueIds.length > 0 ? (
                  detailTheme.issueIds.map((code: string) => (
                    <Tag key={code} color="cyan" style={{ marginBottom: '4px' }}>
                      {code}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">Chưa liên kết phát hiện cụ thể</Text>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ fontSize: '14px' }}>
                🛡️ Danh sách Rủi ro HSRR liên kết ({detailTheme.riskIds?.length || 0}):
              </Text>
              <div style={{ marginTop: '8px' }}>
                {detailTheme.riskIds && detailTheme.riskIds.length > 0 ? (
                  detailTheme.riskIds.map((code: string) => (
                    <Tag key={code} color="geekblue" style={{ marginBottom: '4px' }}>
                      {code}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">Chưa liên kết rủi ro cụ thể</Text>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ThematicAnalysis;
