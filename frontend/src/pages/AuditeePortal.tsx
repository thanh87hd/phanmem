import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, Card, Typography, Tag, Button, Space, Progress, Modal, 
  Form, Input, InputNumber, Slider, message, Badge, Collapse, Empty, Spin,
  Descriptions, Timeline, Upload, Tooltip, Tabs, Row, Col, DatePicker, Select
} from 'antd';
import { 
  ClockCircleOutlined, CheckCircleOutlined, WarningOutlined, 
  UploadOutlined, SendOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined, PaperClipOutlined, FileTextOutlined,
  SolutionOutlined, HistoryOutlined, SafetyCertificateOutlined,
  SlidersOutlined, StarFilled, PlusOutlined, DownloadOutlined,
  LinkOutlined
} from '@ant-design/icons';
import api from '../services/api';
import EvidenceManager from '../components/EvidenceManager';
import dayjs from 'dayjs';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import { FindingResponseModal } from './auditee-portal/FindingResponseModal';
import { ActionPlanTrackerTab } from './auditee-portal/ActionPlanTrackerTab';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  NotStarted: { color: 'default', label: 'Chưa bắt đầu', icon: <ClockCircleOutlined /> },
  InProgress: { color: 'blue', label: 'Đang thực hiện', icon: <InfoCircleOutlined /> },
  Completed: { color: 'orange', label: 'Đã báo cáo xong', icon: <SendOutlined /> },
  Overdue: { color: 'red', label: 'Quá hạn', icon: <ExclamationCircleOutlined /> },
  Verified: { color: 'green', label: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
};

const AuditeePortal: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [planModal, setPlanModal] = useState<{ open: boolean; record: any }>({ open: false, record: null });
  const [progressModal, setProgressModal] = useState<{ open: boolean; record: any }>({ open: false, record: null });
  const [planForm] = Form.useForm();
  const [progressForm] = Form.useForm();
  const [extensionForm] = Form.useForm();

  const planFeasibility = Form.useWatch('remediationFeasibility', planForm);
  const progressFeasibility = Form.useWatch('remediationFeasibility', progressForm);

  // Findings State
  const [findingsList, setFindingsList] = useState<any[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [isOpinionModalOpen, setIsOpinionModalOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [searchFinding, setSearchFinding] = useState('');

  // RCSA State
  const [portalActiveTab, setPortalActiveTab] = useState('recommendations');
  const [rcsaList, setRcsaList] = useState<any[]>([]);
  const [rcsaLoading, setRcsaLoading] = useState(false);
  const [isRcsaModalOpen, setIsRcsaModalOpen] = useState(false);
  const [rcsaForm] = Form.useForm();
  const [auditUniverseList, setAuditUniverseList] = useState<any[]>([]);
  const [searchRcsa, setSearchRcsa] = useState('');

  // QT 3002: Modal đề xuất gia hạn kiến nghị (Điều 9.1)
  const [extensionModal, setExtensionModal] = useState<{ open: boolean; record: any }>({ open: false, record: null });

  const fetchRcsaData = async () => {
    setRcsaLoading(true);
    try {
      const res = await api.get('/risk-assessments/rcsa');
      setRcsaList(res.data || []);
    } catch {
      message.error('Không thể tải danh sách tự đánh giá RCSA');
    } finally {
      setRcsaLoading(false);
    }
  };

  const fetchAuditUniverse = async () => {
    try {
      const res = await api.get('/audit-universe');
      setAuditUniverseList(res.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách Audit Universe:', error);
    }
  };

  const handleCreateRcsa = async () => {
    try {
      const values = await rcsaForm.validateFields();
      const payload = {
        ...values,
        departmentName: userDept || 'Chi nhánh Hà Nội',
        assessedByUsername: currentUser.username || 'admin',
        assessmentYear: new Date().getFullYear()
      };
      await api.post('/risk-assessments/rcsa', payload);
      message.success('Đã gửi tự đánh giá RCSA Tuyến 1 thành công!');
      setIsRcsaModalOpen(false);
      rcsaForm.resetFields();
      fetchRcsaData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Không thể lưu tự đánh giá RCSA');
    }
  };

  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : {};
  const userDept = currentUser.department || '';

  const fetchData = async () => {
    setLoading(true);
    setFindingsLoading(true);
    try {
      const [recsRes, findingsRes] = await Promise.all([
        api.get('/recommendations', { params: { dept: userDept } }),
        api.get('/audit-findings')
      ]);
      setData(recsRes.data || []);
      setFindingsList(findingsRes.data || []);
    } catch {
      message.error('Lỗi khi tải dữ liệu từ máy chủ');
    } finally {
      setLoading(false);
      setFindingsLoading(false);
    }
  };

  const handleOpenOpinion = (record: any) => {
    setSelectedFinding(record);
    setIsOpinionModalOpen(true);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    fetchRcsaData();
    fetchAuditUniverse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenPlan = (record: any) => {
    setPlanModal({ open: true, record });
    planForm.setFieldsValue({
      plan: record.remediationPlan || '',
      targetDate: record.auditeeTargetDate ? dayjs(record.auditeeTargetDate) : null,
      remediationFeasibility: record.remediationFeasibility !== undefined ? record.remediationFeasibility : true,
      remediationUnfeasibleReason: record.remediationUnfeasibleReason || '',
      auditeeProposal: record.auditeeProposal || '',
      monitoringCycle: record.monitoringCycle || dayjs().format('MM/YYYY'),
      auditeeUnitHead: record.auditeeUnitHead || '',
      auditeePoc: record.auditeePoc || currentUser.fullName || '',
    });
  };

  const handleOpenProgress = (record: any) => {
    setProgressModal({ open: true, record });
    progressForm.setFieldsValue({
      progressPercent: record.progressPercent || 0,
      response: record.response || '',
      notes: record.auditeeNotes || '',
      remediationFeasibility: record.remediationFeasibility !== undefined ? record.remediationFeasibility : true,
      remediationUnfeasibleReason: record.remediationUnfeasibleReason || '',
      auditeeProposal: record.auditeeProposal || '',
      monitoringCycle: record.monitoringCycle || dayjs().format('MM/YYYY'),
      auditeeUnitHead: record.auditeeUnitHead || '',
      auditeePoc: record.auditeePoc || record.auditeePoc || currentUser.fullName || '',
      evidenceLink: record.evidenceLink || '',
    });
  };

  const handleSubmitPlan = async () => {
    try {
      const values = await planForm.validateFields();
      await api.post(`/recommendations/${planModal.record.id}/submit-plan`, {
        plan: values.plan,
        targetDate: values.targetDate?.format('YYYY-MM-DD'),
        remediationFeasibility: values.remediationFeasibility,
        remediationUnfeasibleReason: values.remediationUnfeasibleReason,
        auditeeProposal: values.auditeeProposal,
        monitoringCycle: values.monitoringCycle,
        auditeeUnitHead: values.auditeeUnitHead,
        auditeePoc: values.auditeePoc,
      });
      message.success('Đã gửi kế hoạch khắc phục thành công!');
      setPlanModal({ open: false, record: null });
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi gửi kế hoạch');
    }
  };

  const handleSubmitProgress = async () => {
    try {
      const values = await progressForm.validateFields();
      await api.post(`/recommendations/${progressModal.record.id}/progress`, {
        progressPercent: values.progressPercent,
        response: values.response,
        notes: values.notes,
        remediationFeasibility: values.remediationFeasibility,
        remediationUnfeasibleReason: values.remediationUnfeasibleReason,
        auditeeProposal: values.auditeeProposal,
        monitoringCycle: values.monitoringCycle,
        auditeeUnitHead: values.auditeeUnitHead,
        auditeePoc: values.auditeePoc,
        evidenceLink: values.evidenceLink,
      });
      message.success('Đã cập nhật tiến độ khắc phục thành công!');
      setProgressModal({ open: false, record: null });
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    }
  };

  const handleOpenExtension = (record: any) => {
    setExtensionModal({ open: true, record });
    extensionForm.resetFields();
    extensionForm.setFieldsValue({
      newTargetDate: record.dueDate ? dayjs(record.dueDate).add(1, 'month') : dayjs().add(1, 'month'),
      reason: record.extensionReason || '',
    });
  };

  const handleSubmitExtension = async () => {
    try {
      const values = await extensionForm.validateFields();
      await api.post(`/recommendations/${extensionModal.record.id}/request-extension`, {
        newTargetDate: values.newTargetDate ? dayjs(values.newTargetDate).format('YYYY-MM-DD') : undefined,
        reason: values.reason,
      });
      message.success('Đã gửi văn bản đề xuất gia hạn đến Trưởng Ban KTNB thành công!');
      setExtensionModal({ open: false, record: null });
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi gửi yêu cầu gia hạn');
    }
  };

  const filteredRcsa = rcsaList.filter((item: any) => filterRecursive(item, searchRcsa));

  return (
    <div className="max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <SafetyCertificateOutlined style={{ color: '#ea9105', marginRight: 8 }} />
            Portal Tương tác & Tự đánh giá Rủi ro (Tuyến 1)
          </Title>
          <Text type="secondary">
            Bản dành cho Đơn vị vận hành: <Text strong style={{ color: '#ea9105' }}>{userDept || 'Chi nhánh Hà Nội'}</Text>
          </Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Cập nhật lần cuối: {dayjs().format('DD/MM/YYYY HH:mm')}</Text>
        </div>
      </div>

      <Tabs
        activeKey={portalActiveTab}
        onChange={setPortalActiveTab}
        type="card"
        style={{ marginBottom: 24 }}
        items={[
          {
            key: 'recommendations',
            label: (
              <span>
                <SolutionOutlined style={{ marginRight: 6 }} />
                Khắc phục Kiến nghị Kiểm toán
              </span>
            ),
            children: (
              <ActionPlanTrackerTab
                data={data}
                loading={loading}
                onOpenPlan={handleOpenPlan}
                onOpenProgress={handleOpenProgress}
                onOpenExtension={handleOpenExtension}
                statusConfig={statusConfig}
              />
            ),
          },
          {
            key: 'findings',
            label: (
              <span>
                <FileTextOutlined style={{ marginRight: 6, color: '#f5222d' }} />
                Phản hồi Ý kiến Phát hiện
              </span>
            ),
            children: (
              <div>
                {/* Findings Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <Title level={4} style={{ margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                      <FileTextOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                      Danh sách Phát hiện & Ý kiến giải trình từ Đơn vị
                    </Title>
                    <Text type="secondary">Đơn vị ghi nhận và gửi ý kiến giải trình chính thức cho từng phát hiện kiểm toán khi phát hành báo cáo</Text>
                  </div>
                  <Space>
                    <Input.Search
                      placeholder="Tìm phát hiện..."
                      allowClear
                      size="small"
                      onChange={(e) => setSearchFinding(e.target.value)}
                      style={{ width: 220 }}
                    />
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => exportToExcel(findingsList.filter(f => filterRecursive(f, searchFinding)), [
                        { title: 'Mã phát hiện', dataIndex: 'findingCode', key: 'findingCode' },
                        { title: 'Tiêu đề phát hiện', dataIndex: 'findingTitle', key: 'findingTitle' },
                        { title: 'Mức rủi ro', dataIndex: 'riskLevel', key: 'riskLevel' },
                        { title: 'Trạng thái', dataIndex: 'status', key: 'status' },
                        { title: 'Ý kiến phản hồi đơn vị', dataIndex: 'auditeeResponse', key: 'auditeeResponse' },
                      ], 'Phat_hien_giai_trinh')}
                      disabled={findingsList.length === 0}
                    >
                      Tải Excel
                    </Button>
                  </Space>
                </div>

                {/* Findings Table */}
                <Card variant="borderless" className="shadow-sm">
                  <Table
                    loading={findingsLoading}
                    dataSource={findingsList.filter(f => filterRecursive(f, searchFinding))}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Mã & Tiêu đề Phát hiện',
                        key: 'findingInfo',
                        width: '35%',
                        ...getColumnSearchProps<any>('findingTitle', 'Phát hiện', (r) => `${r.findingTitle || ''} ${r.findingCode || ''} ${r.wpTitle || ''}`),
                        sorter: getColumnSorter<any>('findingTitle', 'string'),
                        render: (_, record) => (
                          <div>
                            <Text strong style={{ display: 'block' }}>{record.findingTitle}</Text>
                            <Text type="secondary" className="text-xs">
                              Mã: <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{record.findingCode || `FD-${record.id}`}</Tag> | Thuộc WP: {record.wpTitle || 'Chưa liên kết'}
                            </Text>
                          </div>
                        )
                      },
                      {
                        title: 'Mức rủi ro',
                        dataIndex: 'riskLevel',
                        key: 'riskLevel',
                        width: 120,
                        ...getColumnSelectFilterProps<any>('riskLevel', [
                          { text: 'Critical', value: 'Critical' },
                          { text: 'High', value: 'High' },
                          { text: 'Medium', value: 'Medium' },
                          { text: 'Low', value: 'Low' },
                        ]),
                        sorter: getColumnSorter<any>('riskLevel', 'string'),
                        render: (level) => {
                          const getRiskColor = (l: string) => {
                            if (l === 'Critical') return '#cf1322';
                            if (l === 'High') return '#f5222d';
                            if (l === 'Medium') return '#faad14';
                            return '#52c41a';
                          };
                          return <Tag color={getRiskColor(level)} className="font-semibold">{level}</Tag>;
                        }
                      },
                      {
                        title: 'Ý kiến giải trình của Đơn vị',
                        dataIndex: 'auditeeResponse',
                        key: 'auditeeResponse',
                        width: '35%',
                        ...getColumnSearchProps<any>('auditeeResponse', 'Ý kiến giải trình'),
                        render: (text) => text ? <Text className="text-sm text-gray-700">{text}</Text> : <Text type="secondary" italic className="text-xs">Chưa có ý kiến giải trình chính thức</Text>
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 150,
                        align: 'right' as const,
                        render: (_, record) => (
                          <Button 
                            type="primary" 
                            size="small" 
                            ghost
                            icon={<SendOutlined />}
                            onClick={() => handleOpenOpinion(record)}
                          >
                            Phản hồi ý kiến
                          </Button>
                        )
                      }
                    ]}
                    expandable={{
                      expandedRowRender: (record) => (
                        <div className="p-4 bg-gray-50 rounded border border-gray-100 text-xs">
                          <Row gutter={24}>
                            <Col span={12}>
                              <div className="mb-2"><Text strong>Hiện trạng (Condition):</Text></div>
                              <Paragraph>{record.condition || '-'}</Paragraph>
                              <div className="mb-2"><Text strong>Hậu quả (Consequence):</Text></div>
                              <Paragraph>{record.consequence || '-'}</Paragraph>
                            </Col>
                            <Col span={12}>
                              <div className="mb-2"><Text strong>Nguyên nhân trực tiếp (Cause):</Text></div>
                              <Paragraph>{record.cause || '-'}</Paragraph>
                              <div className="mb-2"><Text strong>Khuyến nghị khắc phục (Recommendation):</Text></div>
                              <Paragraph>{record.recommendation || '-'}</Paragraph>
                              {record.criteria && (
                                <div className="mt-2">
                                  <Text strong>Căn cứ pháp lý / Quy định vi phạm:</Text>
                                  <Paragraph style={{ whiteSpace: 'pre-wrap', color: '#8c8c8c' }}>{record.criteria}</Paragraph>
                                </div>
                              )}
                            </Col>
                          </Row>
                        </div>
                      )
                    }}
                    pagination={{ pageSize: 5 }}
                  />
                </Card>
              </div>
            )
          },
          {
            key: 'rcsa',
            label: (
              <span>
                <SlidersOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                Tự đánh giá Rủi ro & Kiểm soát (RCSA)
              </span>
            ),
            children: (
              <div>
                {/* RCSA Statistics Row */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card variant="borderless" style={{ borderBottom: '3px solid #ea9105', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ textTransform: 'uppercase', fontSize: 11, color: '#8c8c8c', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>Tổng số chốt tự đánh giá</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SafetyCertificateOutlined style={{ color: '#ea9105', fontSize: 20 }} />
                        <span style={{ fontSize: 24, fontWeight: 700 }}>{rcsaList.length}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card variant="borderless" style={{ borderBottom: '3px solid #52c41a', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ textTransform: 'uppercase', fontSize: 11, color: '#8c8c8c', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>Chốt kiểm soát Hiệu quả (Green)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                        <span style={{ fontSize: 24, fontWeight: 700 }}>{rcsaList.filter(r => r.controlEffectiveness === 'Effective').length}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card variant="borderless" style={{ borderBottom: '3px solid #faad14', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ textTransform: 'uppercase', fontSize: 11, color: '#8c8c8c', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>Hiệu quả một phần (Yellow)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
                        <span style={{ fontSize: 24, fontWeight: 700 }}>{rcsaList.filter(r => r.controlEffectiveness === 'Partially Effective').length}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card variant="borderless" style={{ borderBottom: '3px solid #ff4d4f', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ textTransform: 'uppercase', fontSize: 11, color: '#8c8c8c', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>Không hiệu quả / Rủi ro cao (Red)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                        <span style={{ fontSize: 24, fontWeight: 700 }}>{rcsaList.filter(r => r.controlEffectiveness === 'Ineffective' || r.residualRisk >= 4).length}</span>
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* RCSA Header controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Outfit, sans-serif' }}>
                      <SlidersOutlined style={{ color: '#ea9105' }} />
                      Nhật ký Tự đánh giá Rủi ro & Chốt kiểm soát RCSA
                    </Title>
                    <Text type="secondary">Tuyến 1 thực hiện đánh giá chốt kiểm soát vận hành trước khi gửi Tuyến 2 rà soát & Tuyến 3 kiểm toán</Text>
                  </div>
                  <Space>
                    <Input.Search
                      placeholder="Tìm chốt kiểm soát..."
                      allowClear
                      size="small"
                      onChange={(e) => setSearchRcsa(e.target.value)}
                      style={{ width: 210 }}
                    />
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => exportToExcel(filteredRcsa, [
                        { title: 'Quy trình nghiệp vụ', dataIndex: 'processName', key: 'processName' },
                        { title: 'Năm đánh giá', dataIndex: 'assessmentYear', key: 'assessmentYear' },
                        { title: 'Mô tả rủi ro', dataIndex: 'riskDescription', key: 'riskDescription' },
                        { title: 'Chốt kiểm soát', dataIndex: 'controlName', key: 'controlName' },
                        { title: 'Hiệu quả', dataIndex: 'controlEffectiveness', key: 'controlEffectiveness' },
                        { title: 'Rủi ro tiềm ẩn', dataIndex: 'inherentRisk', key: 'inherentRisk' },
                        { title: 'Rủi ro còn lại', dataIndex: 'residualRisk', key: 'residualRisk' },
                      ], 'Tu_danh_gia_RCSA')}
                      disabled={filteredRcsa.length === 0}
                    >
                      Tải Excel
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }} onClick={() => setIsRcsaModalOpen(true)}>
                      Tạo Tự Đánh Giá (RCSA)
                    </Button>
                  </Space>
                </div>

                {/* RCSA Table */}
                <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <Table
                    loading={rcsaLoading}
                    dataSource={filteredRcsa}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Quy trình nghiệp vụ',
                        dataIndex: 'processName',
                        key: 'processName',
                        ...getColumnSearchProps<any>('processName', 'Quy trình nghiệp vụ'),
                        sorter: getColumnSorter<any>('processName', 'string'),
                        render: (text, record) => (
                          <div>
                            <div style={{ fontWeight: 600 }}>{text}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Năm đánh giá: {record.assessmentYear}</div>
                          </div>
                        )
                      },
                      {
                        title: 'Mô tả rủi ro tiềm ẩn (Tuyến 1)',
                        dataIndex: 'riskDescription',
                        key: 'riskDescription',
                        width: '25%',
                        ...getColumnSearchProps<any>('riskDescription', 'Mô tả rủi ro'),
                      },
                      {
                        title: 'Chốt kiểm soát áp dụng',
                        dataIndex: 'controlName',
                        key: 'controlName',
                        width: '25%',
                        ...getColumnSearchProps<any>('controlName', 'Chốt kiểm soát'),
                      },
                      {
                        title: 'Đánh giá chốt kiểm soát',
                        dataIndex: 'controlEffectiveness',
                        key: 'controlEffectiveness',
                        ...getColumnSelectFilterProps<any>('controlEffectiveness', [
                          { text: 'Hiệu quả (Effective)', value: 'Effective' },
                          { text: 'Hiệu quả một phần', value: 'Partially Effective' },
                          { text: 'Không hiệu quả', value: 'Ineffective' },
                        ]),
                        sorter: getColumnSorter<any>('controlEffectiveness', 'string'),
                        render: (eff) => (
                          <Tag color={eff === 'Effective' ? 'green' : eff === 'Partially Effective' ? 'orange' : 'red'}>
                            {eff === 'Effective' ? 'Hiệu quả (Effective)' : eff === 'Partially Effective' ? 'Hiệu quả một phần' : 'Không hiệu quả'}
                          </Tag>
                        )
                      },
                      {
                        title: 'Điểm rủi ro (Tiềm ẩn -> Còn lại)',
                        key: 'riskScores',
                        render: (_, record) => (
                          <div>
                            <div>Tiềm ẩn: <Tag color="red">{record.inherentRisk}/5</Tag></div>
                            <div style={{ marginTop: 4 }}>Còn lại: <Tag color={record.residualRisk <= 2 ? 'green' : record.residualRisk <= 3 ? 'orange' : 'red'}>{record.residualRisk}/5</Tag></div>
                          </div>
                        )
                      },
                      {
                        title: 'Kế hoạch hành động giảm thiểu',
                        dataIndex: 'actionPlan',
                        key: 'actionPlan',
                        render: (plan) => plan ? <Text type="secondary" style={{ fontSize: 13 }}>{plan}</Text> : <Text type="secondary" italic>Chưa cần lập</Text>
                      }
                    ]}
                    pagination={{ pageSize: 5 }}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />

      {/* Modal Lập kế hoạch */}
      <Modal
        forceRender
        title={<><SolutionOutlined className="mr-2 text-blue-600" />Lập kế hoạch khắc phục</>}
        open={planModal.open}
        onOk={handleSubmitPlan}
        onCancel={() => setPlanModal({ open: false, record: null })}
        okText={t('common.btnSendPlan', 'Gửi kế hoạch')}
        width={650}
      >
        <Form form={planForm} layout="vertical" className="mt-4">
          <Alert message="Lưu ý: Sau khi gửi kế hoạch, trạng thái sẽ chuyển sang 'Đang thực hiện'." type="info" showIcon className="mb-4" />
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="remediationFeasibility" label={<span className="font-semibold text-gray-700">Khả năng khắc phục</span>} rules={[{ required: true }]}>
                <Select placeholder="Chọn khả năng khắc phục...">
                  <Select.Option value={true}>Có thể khắc phục</Select.Option>
                  <Select.Option value={false}>Không thể khắc phục</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monitoringCycle" label={<span className="font-semibold text-gray-700">Kỳ theo dõi (Tháng)</span>} rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: Tháng 05/2026" />
              </Form.Item>
            </Col>
          </Row>

          {planFeasibility === false && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="remediationUnfeasibleReason" label={<span className="font-semibold text-red-600">Lý do không thể khắc phục</span>} rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
                  <TextArea rows={2} placeholder="Nêu rõ lý do khách quan/chủ quan (Ví dụ: khách hàng đã xuất cảnh, hồ sơ thất lạc do thiên tai...)" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="auditeeProposal" label={<span className="font-semibold text-orange-600">Đề xuất giải pháp thay thế của Đơn vị</span>} rules={[{ required: true, message: 'Vui lòng nhập đề xuất' }]}>
                  <TextArea rows={2} placeholder="Kiến nghị khoanh nợ, chấp nhận rủi ro hoặc giải pháp khắc phục chéo khác..." />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="plan" label={<span className="font-semibold text-gray-700">Nội dung kế hoạch khắc phục</span>} rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Mô tả cụ thể các bước sẽ thực hiện để khắc phục kiến nghị..." />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditeeUnitHead" label={<span className="font-semibold text-gray-700">Trưởng Đơn vị chịu trách nhiệm</span>} rules={[{ required: true, message: 'Nhập tên Trưởng đơn vị' }]}>
                <Input placeholder="Ví dụ: Nguyễn Văn A - Giám đốc CN" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auditeePoc" label={<span className="font-semibold text-gray-700">Nhân sự đầu mối của Đơn vị</span>} rules={[{ required: true, message: 'Nhập tên nhân sự đầu mối' }]}>
                <Input placeholder="Ví dụ: Trần Thị B - Trưởng phòng KH" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="targetDate" label={<span className="font-semibold text-gray-700">Ngày cam kết hoàn thành (Auditee Target Date)</span>} rules={[{ required: true }]}>
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Cập nhật tiến độ */}
      <Modal
        forceRender
        title={<><SendOutlined className="mr-2 text-blue-600" />Báo cáo tiến độ / Hoàn thành</>}
        open={progressModal.open}
        onOk={handleSubmitProgress}
        onCancel={() => setProgressModal({ open: false, record: null })}
        okText={t('common.btnUpdate', 'Cập nhật')}
        width={700}
      >
        <Form form={progressForm} layout="vertical" className="mt-4">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="progressPercent" label={<span className="font-semibold text-gray-700">Tiến độ thực tế (%)</span>}>
                <Slider marks={{ 0: '0', 50: '50', 100: '100' }} step={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                <InfoCircleOutlined className="mr-1" /> Kéo lên 100% để báo cáo hoàn thành kiến nghị. KTV sẽ nhận được thông báo để vào xác nhận (Verify).
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="remediationFeasibility" label={<span className="font-semibold text-gray-700">Khả năng khắc phục</span>} rules={[{ required: true }]}>
                <Select placeholder="Chọn khả năng khắc phục...">
                  <Select.Option value={true}>Có thể khắc phục</Select.Option>
                  <Select.Option value={false}>Không thể khắc phục</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monitoringCycle" label={<span className="font-semibold text-gray-700">Kỳ theo dõi (Tháng)</span>} rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: Tháng 05/2026" />
              </Form.Item>
            </Col>
          </Row>

          {progressFeasibility === false && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="remediationUnfeasibleReason" label={<span className="font-semibold text-red-600">Lý do không thể khắc phục</span>} rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
                  <TextArea rows={2} placeholder="Nêu rõ lý do khách quan/chủ quan (Ví dụ: khách hàng đã xuất cảnh, hồ sơ thất lạc do thiên tai...)" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="auditeeProposal" label={<span className="font-semibold text-orange-600">Đề xuất giải pháp thay thế của Đơn vị</span>} rules={[{ required: true, message: 'Vui lòng nhập đề xuất' }]}>
                  <TextArea rows={2} placeholder="Kiến nghị khoanh nợ, chấp nhận rủi ro hoặc giải pháp khắc phục chéo khác..." />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="response" label={<span className="font-semibold text-gray-700">Giải trình kết quả khắc phục (Nội dung khắc phục)</span>} rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Mô tả cụ thể kết quả đã đạt được, các văn bản đã ban hành..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditeeUnitHead" label={<span className="font-semibold text-gray-700">Trưởng Đơn vị</span>} rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: Nguyễn Văn A - Giám đốc CN" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auditeePoc" label={<span className="font-semibold text-gray-700">Nhân sự đầu mối phụ trách</span>} rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: Trần Thị B - Trưởng phòng KH" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            name="evidenceLink" 
            label={<span className="font-semibold text-gray-700">Đường dẫn (URL) scan bằng chứng nhanh (Google Drive / Sharepoint / Cloud Link)</span>}
            rules={[{ type: 'url', message: 'Vui lòng nhập một đường dẫn URL hợp lệ!' }]}
          >
            <Input prefix={<LinkOutlined className="text-gray-400" />} placeholder="Nhập liên kết tới file scan bằng chứng thực tế..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="notes" label={<span className="font-semibold text-gray-700">Ghi chú nội bộ / Phản hồi thêm (Ghi chú chung)</span>}>
            <TextArea rows={2} placeholder="Các khó khăn hoặc lưu ý khác (nếu có)..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Tạo Tự Đánh Giá RCSA */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#ea9105', fontSize: 20 }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Tạo mới Bản tự đánh giá Rủi ro & Chốt kiểm soát (RCSA)</span>
          </div>
        }
        open={isRcsaModalOpen}
        onOk={handleCreateRcsa}
        onCancel={() => setIsRcsaModalOpen(false)}
        okText={t('common.btnSaveAndSendLine2', 'Lưu & Gửi Tuyến 2')}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={650}
        okButtonProps={{ style: { backgroundColor: '#ea9105', borderColor: '#ea9105' } }}
      >
        <Form form={rcsaForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="processName" label="Quy trình nghiệp vụ Tuyến 1 tự đánh giá" rules={[{ required: true, message: 'Vui lòng chọn quy trình nghiệp vụ' }]}>
            <Select placeholder="Chọn quy trình nghiệp vụ" showSearch optionFilterProp="children">
              {auditUniverseList.map((u: any) => (
                <Select.Option key={u.id} value={u.name}>{u.name} ({u.auditCategory || u.category || 'Vũ trụ'})</Select.Option>
              ))}
              {auditUniverseList.length === 0 && (
                <>
                  <Select.Option value="Giải ngân tín dụng bán lẻ">Giải ngân tín dụng bán lẻ</Select.Option>
                  <Select.Option value="Vận hành kho quỹ & Quản lý tiền mặt">Vận hành kho quỹ & Quản lý tiền mặt</Select.Option>
                  <Select.Option value="Mở tài khoản thanh toán trực tuyến (eKYC)">Mở tài khoản thanh toán trực tuyến (eKYC)</Select.Option>
                  <Select.Option value="Phát hành thẻ ATM vật lý">Phát hành thẻ ATM vật lý</Select.Option>
                  <Select.Option value="Kiểm soát giao dịch chuyển tiền quốc tế">Kiểm soát giao dịch chuyển tiền quốc tế</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          <Form.Item name="riskDescription" label="Mô tả rủi ro tiềm ẩn (Inherent Risk Description)" rules={[{ required: true, message: 'Vui lòng nhập mô tả rủi ro' }]}>
            <TextArea rows={3} placeholder="Mô tả cụ thể rủi ro (Ví dụ: Sai sót hạch toán, Giả mạo giấy tờ...)" />
          </Form.Item>

          <Form.Item name="controlName" label="Chốt kiểm soát đang áp dụng hiện tại" rules={[{ required: true, message: 'Vui lòng nhập chốt kiểm soát' }]}>
            <Input placeholder="Ví dụ: Đối chiếu kép cuối ngày, Camera giám sát 24/7, Phê duyệt 2 cấp..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="inherentRisk" label="Điểm rủi ro tiềm ẩn (Inherent Risk: 1 - 5)" rules={[{ required: true }]} initialValue={3}>
                <Slider min={1} max={5} marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="residualRisk" label="Điểm rủi ro còn lại (Residual Risk: 1 - 5)" rules={[{ required: true }]} initialValue={2}>
                <Slider min={1} max={5} marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="controlEffectiveness" label="Đánh giá hiệu quả của chốt kiểm soát" rules={[{ required: true }]} initialValue="Effective">
            <Select>
              <Select.Option value="Effective">Hiệu quả hoàn toàn (Effective)</Select.Option>
              <Select.Option value="Partially Effective">Hiệu quả một phần (Partially Effective)</Select.Option>
              <Select.Option value="Ineffective">Không hiệu quả (Ineffective)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="actionPlan" label="Kế hoạch hành động bổ sung (Nếu chốt kiểm soát yếu hoặc rủi ro còn lại cao)">
            <TextArea rows={2} placeholder="Mô tả kế hoạch giảm thiểu rủi ro, thời hạn hoàn thành..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Phản hồi ý kiến giải trình cho Finding */}
      <FindingResponseModal
        open={isOpinionModalOpen}
        finding={selectedFinding}
        onClose={() => setIsOpinionModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* QT 3002: Modal đề xuất gia hạn kiến nghị (Điều 9.1) */}
      <Modal
        forceRender
        title={
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <ClockCircleOutlined /> Đề xuất Gia hạn Thời gian Khắc phục Kiến nghị
          </div>
        }
        open={extensionModal.open}
        onOk={handleSubmitExtension}
        onCancel={() => setExtensionModal({ open: false, record: null })}
        okText={t('common.btnSendExtension', 'Gửi Đề xuất Gia hạn')}
        okButtonProps={{ className: 'bg-[#ea9105] border-[#ea9105]' }}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={600}
      >
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <strong className="block text-amber-950 mb-1">⚖️ Quy định Điều 9.1 Quy trình 3002 (BKS 30/06/2026):</strong>
          Văn bản đề nghị gia hạn thời hạn hoàn thành kiến nghị phải gửi cho <strong>Trưởng Ban KTNB</strong> trước thời hạn quy định <strong>tối thiểu 05 ngày làm việc</strong>, nêu rõ nguyên nhân khách quan và giải pháp khắc phục.
        </div>

        {extensionModal.record && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
            <div className="mb-1"><Text strong>Kiến nghị: </Text><Text>{extensionModal.record.recommendation}</Text></div>
            <div><Text strong>Hạn SLA hiện tại: </Text><Tag color="red">{extensionModal.record.dueDate || 'Chưa xác định'}</Tag></div>
          </div>
        )}

        <Form form={extensionForm} layout="vertical">
          <Form.Item
            name="newTargetDate"
            label={<span className="font-semibold text-slate-700">Thời hạn mới đề xuất hoàn thành</span>}
            rules={[{ required: true, message: 'Vui lòng chọn thời hạn mới' }]}
          >
            <DatePicker className="w-full rounded-lg" format="DD/MM/YYYY" placeholder="Chọn ngày hết hạn mới..." />
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span className="font-semibold text-slate-700">Lý do & Khó khăn khách quan đề xuất gia hạn</span>}
            rules={[{ required: true, message: 'Vui lòng nêu rõ lý do xin gia hạn' }]}
          >
            <TextArea
              rows={4}
              placeholder="Nêu rõ lý do khách quan (VD: Cần đối tác phần mềm nâng cấp, chờ quy chế nội bộ phê duyệt,...) và cam kết mốc thời gian hoàn thành mới..."
              className="rounded-lg text-xs"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Statistic = ({ title, value, prefix }: any) => (
  <div>
    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</div>
    <div className="flex items-center gap-2">
      <span className="text-xl">{prefix}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  </div>
);

const Alert = ({ message, type, showIcon, className }: any) => (
  <div className={`flex items-center gap-2 p-3 rounded text-sm ${type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-100' : ''} ${className}`}>
    {showIcon && <InfoCircleOutlined />}
    {message}
  </div>
);

export default AuditeePortal;

