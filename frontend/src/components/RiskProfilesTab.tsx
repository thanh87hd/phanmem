import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Select,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Input,
  Tooltip,
  Badge,
  Alert,
  Button,
  Modal,
  Drawer,
  Form,
  Upload,
  message,
  Tabs,
  Timeline,
  Divider,
  Popconfirm,
} from 'antd';
import {
  SafetyCertificateOutlined,
  AlertOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  FireOutlined,
  FolderOpenOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  HistoryOutlined,
  AuditOutlined,
  PlusOutlined,
  FileExcelOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const DOMAIN_CONFIGS: Record<string, { label: string; color: string; entity: string }> = {
  HS01_HSRR_CNTT: { label: 'HS01. CNTT & An ninh mạng', color: '#ea9105', entity: 'Hội sở / CNTT' },
  HS02_HSRR_TT_TLAT_QTTC: { label: 'HS02. Thị trường & Nguồn vốn', color: '#722ed1', entity: 'Hội sở / Nguồn vốn' },
  HS03_HSRR_QTRR: { label: 'HS03. Quản trị rủi ro & CAMELS', color: '#eb2f96', entity: 'Hội sở / QTRR' },
  HS04_HSRR_VH: { label: 'HS04. Hoạt động Khối Vận hành', color: '#fa8c16', entity: 'Hội sở / Vận hành' },
  HS05_HSRR_NS_DVNB: { label: 'HS05. Nhân sự & Dịch vụ nội bộ', color: '#13c2c2', entity: 'Hội sở / QTNL' },
  HS06_HSRR_VPQT: { label: 'HS06. Văn phòng Quản trị & Pháp chế', color: '#faad14', entity: 'Hội sở / VP HĐQT' },
  HS07_HSRR_TD_CLTD: { label: 'HS07. Chính sách & CL Tín dụng', color: '#52c41a', entity: 'Hội sở / QLRR TD' },
  HS08_HSRR_PGDBD: { label: 'HS08. Mạng lưới PGDBĐ (TKBĐ)', color: '#f5222d', entity: 'ĐVKD / PGDBĐ' },
  HS09_HSRR_PTD_ĐVKD: { label: 'HS09. Phi tín dụng & Kho quỹ ĐVKD', color: '#fa541c', entity: 'ĐVKD / Chi nhánh' },
  HS10_HSRR_TD_ĐVKD: { label: 'HS10. Tín dụng & Khách hàng ĐVKD', color: '#a0d911', entity: 'ĐVKD / Chi nhánh' },
  HS11_HSRR_NHDN: { label: 'HS11. Ngân hàng Doanh nghiệp (SME)', color: '#d97706', entity: 'Hội sở & ĐVKD' },
  HS12_HSRR_NHBL: { label: 'HS12. Ngân hàng Bán lẻ & Bancas', color: '#c41d7f', entity: 'Hội sở & ĐVKD' },
};

const RiskProfilesTab: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');

  // Modals & Drawers state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryProfile, setSelectedHistoryProfile] = useState<any>(null);
  const [histories, setHistories] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Approval Drawer state
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState(false);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState<Record<number, string>>({});
  const [defectCodes, setDefectCodes] = useState<any[]>([]);

  const [form] = Form.useForm();
  const [importForm] = Form.useForm();

  const fetchDefectCodes = async () => {
    try {
      const res = await api.get('/ai/defect-codes');
      setDefectCodes(res.data || []);
    } catch (e) {
      console.error('Failed to load defect codes', e);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        api.get('/risk-assessments/profiles', {
          params: { profileCode: selectedDomain === 'ALL' ? undefined : selectedDomain },
        }),
        api.get('/risk-assessments/profiles/summary'),
      ]);
      setProfiles(listRes.data);
      setSummary(sumRes.data);
    } catch (error) {
      console.error('Failed to load risk profiles', error);
      message.error('Không thể tải danh sách hồ sơ rủi ro');
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    setApprovalLoading(true);
    try {
      const res = await api.get('/risk-assessments/profiles/change-requests');
      setChangeRequests(res.data);
    } catch (error) {
      console.error('Failed to load change requests', error);
    } finally {
      setApprovalLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [selectedDomain]);

  useEffect(() => {
    fetchChangeRequests();
    fetchDefectCodes();
  }, []);

  const pendingRequestsCount = changeRequests.filter(
    (cr) => cr.status === 'PendingL1' || cr.status === 'PendingL2',
  ).length;

  // 1. Export Excel Handler
  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Đang kết xuất file Excel chuẩn hóa...', key: 'export' });
      const res = await api.get('/risk-assessments/profiles/export-excel', {
        params: { profileCode: selectedDomain },
      });

      const { base64, filename } = res.data;
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      link.download = filename || `Bo_Ho_So_Rui_Ro_KTNB_${selectedDomain}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success({ content: 'Kết xuất file Excel thành công!', key: 'export' });
    } catch (error) {
      console.error('Export error', error);
      message.error({ content: 'Lỗi khi kết xuất file Excel', key: 'export' });
    }
  };

  // 2. Download Template Excel Handler
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/risk-assessments/profiles/template-excel');
      const { base64, filename } = res.data;
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      link.download = filename || 'Mau_Nhap_HSRR_KTNB_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Đã tải file Excel mẫu!');
    } catch (error) {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  // 3. Edit Profile (Create Change Request)
  const handleOpenEdit = (record: any) => {
    setEditingProfile(record);
    const existingCodes = Array.isArray(record.mappedDefectCodes)
      ? record.mappedDefectCodes
      : (typeof record.mappedDefectCodes === 'string' && record.mappedDefectCodes
        ? record.mappedDefectCodes.split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean)
        : []);
    form.setFieldsValue({
      domainName: record.domainName,
      riskCategory: record.riskCategory,
      riskL1: record.riskL1,
      riskL2: record.riskL2,
      controlMeasures: record.controlMeasures,
      inherentRiskLevel: record.inherentRiskLevel,
      controlOperatingEffectiveness: record.controlOperatingEffectiveness,
      residualRiskLevel: record.residualRiskLevel,
      targetEntity: record.targetEntity,
      mappedDefectCodes: existingCodes,
      reason: '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (values: any) => {
    try {
      const mappedDefectCodes = Array.isArray(values.mappedDefectCodes)
        ? values.mappedDefectCodes
        : (values.mappedDefectCodes
          ? values.mappedDefectCodes.split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean)
          : []);

      const updatedData = {
        domainName: values.domainName,
        riskCategory: values.riskCategory,
        riskL1: values.riskL1,
        riskL2: values.riskL2,
        controlMeasures: values.controlMeasures,
        inherentRiskLevel: values.inherentRiskLevel,
        controlOperatingEffectiveness: values.controlOperatingEffectiveness,
        residualRiskLevel: values.residualRiskLevel,
        targetEntity: values.targetEntity,
        mappedDefectCodes,
      };

      await api.post('/risk-assessments/profiles/change-request', {
        title: `Điều chỉnh rủi ro: ${editingProfile.riskL1} - ${editingProfile.riskL2.substring(0, 40)}...`,
        domainCode: editingProfile.profileCode,
        reason: values.reason || 'Cập nhật định kỳ tham số hồ sơ rủi ro',
        changes: [
          {
            type: 'UPDATE',
            profileId: editingProfile.id,
            oldData: editingProfile,
            newData: updatedData,
          },
        ],
      });

      message.success('Đã tạo đề xuất điều chỉnh rủi ro và chuyển sang luồng Phê duyệt 2 cấp (Phòng & Khối)!');
      setIsEditModalOpen(false);
      fetchChangeRequests();
    } catch (error) {
      console.error(error);
      message.error('Không thể tạo đề xuất điều chỉnh');
    }
  };

  // 4. View History Handler
  const handleOpenHistory = async (record: any) => {
    setSelectedHistoryProfile(record);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/risk-assessments/profiles/${record.id}/histories`);
      setHistories(res.data);
    } catch (error) {
      message.error('Lỗi khi tải lịch sử chỉnh sửa');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 5. Review L1 & Approve L2 Actions
  const handleReviewL1 = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.patch(`/risk-assessments/profiles/change-requests/${requestId}/review-l1`, {
        action,
        notes: approvalNotes[requestId] || (action === 'APPROVE' ? 'Đồng ý cấp Phòng' : 'Từ chối cấp Phòng'),
      });
      message.success(action === 'APPROVE' ? 'Lãnh đạo Phòng đã duyệt (L1). Chuyển tiếp cấp Khối!' : 'Đã từ chối đề xuất.');
      fetchChangeRequests();
      fetchProfiles();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi duyệt cấp Phòng');
    }
  };

  const handleApproveL2 = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.patch(`/risk-assessments/profiles/change-requests/${requestId}/approve-l2`, {
        action,
        notes: approvalNotes[requestId] || (action === 'APPROVE' ? 'Lãnh đạo Khối KTNB phê duyệt ban hành' : 'Khối KTNB từ chối'),
      });
      message.success(
        action === 'APPROVE'
          ? '🎉 Lãnh đạo Khối KTNB đã phê duyệt ban hành (L2)! Dữ liệu đã chính thức cập nhật vào Bộ Hồ Sơ Rủi Ro.'
          : 'Đã từ chối đề xuất.',
      );
      fetchChangeRequests();
      fetchProfiles();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi duyệt cấp Khối');
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const s = searchText.toLowerCase();
    return (
      (p.riskL1 && p.riskL1.toLowerCase().includes(s)) ||
      (p.riskL2 && p.riskL2.toLowerCase().includes(s)) ||
      (p.domainName && p.domainName.toLowerCase().includes(s)) ||
      (p.riskCategory && p.riskCategory.toLowerCase().includes(s))
    );
  });

  const columns = [
    {
      title: 'Mã Hồ sơ / Mảng',
      dataIndex: 'profileCode',
      key: 'profileCode',
      width: 160,
      render: (code: string, record: any) => {
        const conf = DOMAIN_CONFIGS[code] || { label: code, color: '#666', entity: record.targetEntity };
        return (
          <div>
            <Tag color={conf.color} className="font-semibold text-xs mb-1">
              {code.replace('HS', 'HSRR-').replace('_HSRR_', '-')}
            </Tag>
            <div className="text-[11px] text-slate-500 font-medium">{record.domainName}</div>
          </div>
        );
      },
    },
    {
      title: 'Nhóm & Rủi ro Cấp 1 (L1)',
      dataIndex: 'riskL1',
      key: 'riskL1',
      width: 220,
      render: (text: string, record: any) => (
        <div>
          {record.riskCategory && (
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
              [{record.riskCategory}]
            </span>
          )}
          <span className="font-semibold text-slate-800 text-xs">{text}</span>
        </div>
      ),
    },
    {
      title: 'Rủi ro Cấp 2 / Nguy cơ tác nghiệp (L2)',
      dataIndex: 'riskL2',
      key: 'riskL2',
      render: (text: string, record: any) => (
        <div>
          <div className="text-xs text-slate-700 leading-relaxed font-normal">{text}</div>
          {record.controlMeasures && (
            <div className="mt-1.5 p-1.5 bg-sky-50/80 rounded border border-sky-100/80 text-[11px] text-sky-900 leading-tight">
              <span className="font-medium text-sky-700 mr-1">🛡️ Kiểm soát cần có:</span>
              {record.controlMeasures}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Rủi ro Cố hữu (Inherent)',
      dataIndex: 'inherentRiskLevel',
      key: 'inherentRiskLevel',
      width: 110,
      render: (val: string) => {
        const color = val === 'Cao' ? '#cf1322' : val === 'Trung bình' ? '#d46b08' : '#389e0d';
        return (
          <div className="text-center">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white shadow-xs" style={{ backgroundColor: color }}>
              {val || 'Trung bình'}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Rủi ro Còn lại (Residual)',
      dataIndex: 'residualRiskLevel',
      key: 'residualRiskLevel',
      width: 110,
      render: (val: string) => {
        const color = val === 'Cao' ? '#cf1322' : val === 'Trung bình' ? '#d46b08' : '#389e0d';
        return (
          <div className="text-center">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white shadow-xs" style={{ backgroundColor: color }}>
              {val || 'Trung bình'}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Mã Lỗi Thực Tế',
      dataIndex: 'mappedDefectCodes',
      key: 'mappedDefectCodes',
      width: 140,
      render: (codes: string[]) => {
        if (!codes || codes.length === 0) {
          return <span className="text-slate-400 text-xs italic">Tự động</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {codes.slice(0, 2).map((c, i) => (
              <Tag key={i} color="geekblue" className="text-[10px] !mr-0">
                {c}
              </Tag>
            ))}
            {codes.length > 2 && (
              <Tooltip title={codes.join(', ')}>
                <Tag color="default" className="text-[10px] !mr-0">
                  +{codes.length - 2}
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      render: (_: any, record: any) => (
        <Space orientation="horizontal" size="small">
          <Tooltip title="Chỉnh sửa rủi ro (Gửi phê duyệt 2 mức)">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined className="text-blue-600" />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Xem lịch sử thay đổi & phiên bản">
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined className="text-indigo-600" />}
              onClick={() => handleOpenHistory(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* METHODOLOGY NOTICE */}
      <Alert
        message="Phương Pháp Luận Tương Quan Chuẩn Mực KTNB (IIA Global & TT 66/NHNN)"
        description={
          <div className="text-xs space-y-1">
            <div>
              • <b>Hồ sơ Rủi ro (Risk Profile)</b>: Xác lập 819 rủi ro cố hữu & rủi ro còn lại thuộc 12 mảng nghiệp vụ toàn hệ thống.
            </div>
            <div>
              • <b>Quy trình Quản trị & Điều chỉnh 2 mức</b>: Mọi thay đổi dữ liệu (nhập Excel hoặc sửa trực tiếp) đều được kiểm soát nghiêm ngặt qua <b>Phê duyệt Cấp Phòng (L1)</b> và <b>Phê duyệt Cấp Khối KTNB (L2 - CAE)</b> trước khi ban hành chính thức.
            </div>
          </div>
        }
        type="info"
        showIcon
      />

      {/* STATS OVERVIEW */}
      <Row gutter={16}>
        <Col span={6}>
          <Card variant="borderless" className="shadow-xs bg-gradient-to-r from-blue-50 to-indigo-50">
            <Statistic
              title="Tổng số Hồ sơ Rủi ro Chuẩn (HSRR)"
              value={summary?.totalProfiles || profiles.length || 819}
              prefix={<DatabaseOutlined className="text-blue-500" />}
              suffix="rủi ro"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-xs bg-gradient-to-r from-amber-50 to-orange-50">
            <Statistic
              title="Số Mảng Nghiệp vụ Toàn hàng"
              value={12}
              prefix={<FolderOpenOutlined className="text-amber-500" />}
              suffix="mảng"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-xs bg-gradient-to-r from-rose-50 to-red-50">
            <Statistic
              title="Rủi ro Cố hữu Mức Cao"
              value={summary?.highInherentRisks || 234}
              valueStyle={{ color: '#cf1322' }}
              prefix={<FireOutlined className="text-rose-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-xs bg-gradient-to-r from-emerald-50 to-teal-50">
            <Statistic
              title="Đề Xuất Chờ Phê Duyệt 2 Mức"
              value={pendingRequestsCount}
              valueStyle={{ color: pendingRequestsCount > 0 ? '#d46b08' : '#389e0d' }}
              prefix={<AuditOutlined className="text-emerald-500" />}
              suffix="đề xuất"
            />
          </Card>
        </Col>
      </Row>

      {/* FILTER & TOOLBAR */}
      <Card
        title={
          <div className="flex justify-between items-center flex-wrap gap-2">
            <Space>
              <SafetyCertificateOutlined className="text-indigo-600 text-lg" />
              <span className="font-bold text-slate-800 text-base">
                Bộ Hồ Sơ Rủi Ro KTNB Hợp Nhất 12 Lĩnh Vực ({profiles.length} Rủi ro)
              </span>
            </Space>

            <Space wrap>
              <Select
                value={selectedDomain}
                onChange={setSelectedDomain}
                style={{ width: 280 }}
                placeholder="Lọc theo mảng nghiệp vụ..."
              >
                <Option value="ALL">Tất cả 12 mảng nghiệp vụ ({profiles.length})</Option>
                {Object.entries(DOMAIN_CONFIGS).map(([key, val]) => (
                  <Option key={key} value={key}>
                    {val.label}
                  </Option>
                ))}
              </Select>

              <Input
                placeholder="Tìm kiếm rủi ro, khâu nghiệp vụ..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 220 }}
                allowClear
              />

              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                className="bg-emerald-600 text-white hover:!bg-emerald-700 hover:!text-white border-none font-medium"
              >
                Kết Xuất Excel
              </Button>

              <Button
                icon={<UploadOutlined />}
                onClick={() => setIsImportModalOpen(true)}
                className="bg-sky-600 text-white hover:!bg-sky-700 hover:!text-white border-none font-medium"
              >
                Nhập Excel
              </Button>

              <Badge count={pendingRequestsCount} offset={[-5, 5]}>
                <Button
                  icon={<AuditOutlined />}
                  onClick={() => setIsApprovalDrawerOpen(true)}
                  type="primary"
                  className="font-medium"
                >
                  Phê Duyệt 2 Mức
                </Button>
              </Badge>
            </Space>
          </div>
        }
        className="shadow-xs"
      >
        <Table
          columns={columns}
          dataSource={filteredProfiles}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ['12', '25', '50', '100'] }}
        />
      </Card>

      {/* 1. MODAL CHỈNH SỬA THÔNG TIN RỦI RO */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined className="text-blue-600" />
            <span>Đề Xuất Điều Chỉnh Hồ Sơ Rủi Ro (Trình Phê Duyệt 2 Cấp)</span>
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        width={750}
        destroyOnClose
      >
        <Alert
          message="Lưu ý cơ chế Four-Eyes Principle:"
          description="Thông tin chỉnh sửa sẽ không thay đổi trực tiếp ngay mà được ghi nhận thành Đề xuất thay đổi để Lãnh đạo Phòng (L1) và Lãnh đạo Khối KTNB (L2) phê duyệt."
          type="warning"
          showIcon
          className="mb-4"
        />

        <Form form={form} layout="vertical" onFinish={handleSaveEdit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="domainName" label="Tên Mảng Nghiệp Vụ" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="riskCategory" label="Nhóm Rủi Ro Lớn (Category)">
                <Input placeholder="VD: HẠ TẦNG & AN NINH..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="riskL1" label="Rủi Ro Cấp 1 (L1)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="riskL2" label="Rủi Ro Cấp 2 / Nguy Cơ Tác Nghiệp (L2)" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="controlMeasures" label="Biện Pháp Kiểm Soát Cần Có">
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="inherentRiskLevel" label="Rủi Ro Cố Hữu">
                <Select>
                  <Option value="Cao">Cao</Option>
                  <Option value="Trung bình">Trung bình</Option>
                  <Option value="Thấp">Thấp</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="controlOperatingEffectiveness" label="Hiệu Quả Kiểm Soát">
                <Select>
                  <Option value="Cao">Cao (Tốt)</Option>
                  <Option value="Trung bình">Trung bình</Option>
                  <Option value="Thấp">Thấp (Yếu)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="residualRiskLevel" label="Rủi Ro Còn Lại">
                <Select>
                  <Option value="Cao">Cao</Option>
                  <Option value="Trung bình">Trung bình</Option>
                  <Option value="Thấp">Thấp</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetEntity" label="Đơn Vị Mục Tiêu">
                <Select>
                  <Option value="ĐVKD">ĐVKD (Chi nhánh & PGD)</Option>
                  <Option value="ChiNhanh">Chi nhánh</Option>
                  <Option value="PGD">PGD</Option>
                  <Option value="HoiSo">Hội sở</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mappedDefectCodes" label="Mã Lỗi Thực Tế Liên Kết">
                <Select
                  mode="multiple"
                  placeholder="Chọn các mã lỗi vi phạm liên kết..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={defectCodes.map((d: any) => ({
                    label: `[${d.code}] ${d.name || d.description || ''}`,
                    value: d.code,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Lý Do Điều Chỉnh (Bắt buộc để Lãnh đạo xem xét)"
            rules={[{ required: true, message: 'Vui lòng nêu rõ lý do điều chỉnh' }]}
          >
            <TextArea rows={2} placeholder="Nêu căn cứ thay đổi, quy định mới hoặc phát hiện thực tế kiểm toán..." />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</Button>
            <Button type="primary" htmlType="submit">
              Gửi Trình Phê Duyệt
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 2. MODAL NHẬP FILE EXCEL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileExcelOutlined className="text-emerald-600" />
            <span>Nhập File Excel Cập Nhật Bộ Hồ Sơ Rủi Ro</span>
          </div>
        }
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
        width={550}
        destroyOnClose
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded flex justify-between items-center">
            <div>
              <div className="font-semibold text-blue-900 text-xs">File Excel Mẫu Chuẩn</div>
              <div className="text-[11px] text-blue-700">Tải file mẫu để điền thông tin đúng định dạng cột</div>
            </div>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Tải Mẫu
            </Button>
          </div>

          <Form
            form={importForm}
            layout="vertical"
            onFinish={async (values) => {
              const file = values.file?.[0]?.originFileObj;
              if (!file) {
                message.error('Vui lòng chọn file Excel');
                return;
              }

              const formData = new FormData();
              formData.append('file', file);
              formData.append('reason', values.reason || 'Nhập file Excel cập nhật hàng loạt');

              try {
                message.loading({ content: 'Đang xử lý và kiểm tra file Excel...', key: 'import' });
                await api.post('/risk-assessments/profiles/import-excel', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                message.success({
                  content: 'Tải file Excel thành công! Đã tạo đề xuất và chuyển đến Luồng phê duyệt 2 cấp.',
                  key: 'import',
                });
                setIsImportModalOpen(false);
                importForm.resetFields();
                fetchChangeRequests();
              } catch (error: any) {
                message.error({
                  content: error.response?.data?.message || 'Lỗi khi nhập file Excel',
                  key: 'import',
                });
              }
            }}
          >
            <Form.Item
              name="file"
              label="Chọn file Excel (.xlsx, .xls)"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
              rules={[{ required: true, message: 'Vui lòng chọn file' }]}
            >
              <Upload maxCount={1} beforeUpload={() => false} accept=".xlsx,.xls">
                <Button icon={<UploadOutlined />}>Chọn File Excel từ máy tính</Button>
              </Upload>
            </Form.Item>

            <Form.Item name="reason" label="Ghi chú / Lý do cập nhật đợt này">
              <TextArea rows={2} placeholder="VD: Cập nhật rủi ro mảng CNTT theo Thông tư mới..." />
            </Form.Item>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button onClick={() => setIsImportModalOpen(false)}>Đóng</Button>
              <Button type="primary" htmlType="submit">
                Tải Lên & Gửi Duyệt
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* 3. MODAL XEM LỊCH SỬ THAY ĐỔI (AUDIT TRAIL) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-indigo-600" />
            <span>
              Lịch Sử Chỉnh Sửa & Phiên Bản ({selectedHistoryProfile?.riskL1} - ID: {selectedHistoryProfile?.id})
            </span>
          </div>
        }
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {historyLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải lịch sử...</div>
        ) : histories.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic">
            Chưa có lịch sử chỉnh sửa nào được ghi nhận cho rủi ro này (Đang ở phiên bản gốc).
          </div>
        ) : (
          <Timeline
            className="mt-4"
            items={histories.map((h) => ({
              color: h.action === 'CREATE' || h.action === 'IMPORT' ? 'green' : 'blue',
              children: (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Tag color="blue">Phiên bản v{h.version}</Tag>
                    <Tag color="geekblue">{h.action}</Tag>
                    <span className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <b>Người sửa:</b> {h.changedByName || 'Cán bộ KTV'}
                  </div>
                  {h.approvedByL1Name && (
                    <div className="text-xs text-emerald-700">
                      <b>Duyệt cấp Phòng (L1):</b> {h.approvedByL1Name}
                    </div>
                  )}
                  {h.approvedByL2Name && (
                    <div className="text-xs text-indigo-700">
                      <b>Phê duyệt cấp Khối (L2):</b> {h.approvedByL2Name}
                    </div>
                  )}
                  {h.reason && (
                    <div className="text-xs text-slate-500 italic bg-slate-50 p-1.5 rounded">
                      Lý do: {h.reason}
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Modal>

      {/* 4. DRAWER QUẢN LÝ PHÊ DUYỆT 2 MỨC (FOUR-EYES PRINCIPLE) */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <AuditOutlined className="text-indigo-600 text-lg" />
            <span className="font-bold">Quản Lý Phê Duyệt 2 Mức (Hồ Sơ Rủi Ro KTNB)</span>
          </div>
        }
        open={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        width={850}
      >
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: `Chờ Duyệt (${pendingRequestsCount})`,
              children: (
                <div className="space-y-4">
                  {changeRequests
                    .filter((cr) => cr.status === 'PendingL1' || cr.status === 'PendingL2')
                    .map((cr) => (
                      <Card
                        key={cr.id}
                        size="small"
                        className="shadow-xs border-indigo-100"
                        title={
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">{cr.title}</span>
                            <Tag
                              color={
                                cr.status === 'PendingL1' ? 'orange' : cr.status === 'PendingL2' ? 'purple' : 'green'
                              }
                            >
                              {cr.status === 'PendingL1'
                                ? '⏳ Chờ Lãnh đạo Phòng duyệt (L1)'
                                : '⏳ Chờ Lãnh đạo Khối KTNB duyệt (L2)'}
                            </Tag>
                          </div>
                        }
                      >
                        <div className="text-xs space-y-2">
                          <Row gutter={16}>
                            <Col span={12}>
                              <div className="text-slate-500">
                                <b>Người đề xuất:</b> {cr.createdByName || 'Cán bộ KTV'}
                              </div>
                              <div className="text-slate-500">
                                <b>Thời gian:</b> {new Date(cr.createdAt).toLocaleString('vi-VN')}
                              </div>
                            </Col>
                            <Col span={12}>
                              <div className="text-slate-500">
                                <b>Loại đề xuất:</b> {cr.requestType} ({cr.changes?.length || 0} rủi ro)
                              </div>
                              {cr.reviewerL1Name && (
                                <div className="text-emerald-700">
                                  <b>Phòng đã duyệt (L1):</b> {cr.reviewerL1Name}
                                </div>
                              )}
                            </Col>
                          </Row>

                          <div className="p-2 bg-slate-50 rounded text-slate-700">
                            <b>Lý do điều chỉnh:</b> {cr.reason}
                          </div>

                          {/* Detail changes preview */}
                          <div className="max-h-48 overflow-y-auto border rounded p-2 bg-white space-y-1">
                            <div className="font-semibold text-[11px] text-slate-500 uppercase">Chi tiết các mục thay đổi:</div>
                            {cr.changes?.slice(0, 5).map((c: any, idx: number) => (
                              <div key={idx} className="text-[11px] border-b pb-1">
                                • <b>{c.newData?.riskL1}</b>: {c.newData?.riskL2?.substring(0, 80)}...
                                <span className="ml-2 text-rose-600">[{c.newData?.inherentRiskLevel || 'Trung bình'}]</span>
                              </div>
                            ))}
                            {cr.changes?.length > 5 && (
                              <div className="text-[11px] text-slate-400 italic">
                                ...và {cr.changes.length - 5} rủi ro khác trong đề xuất này.
                              </div>
                            )}
                          </div>

                          {/* Approval Actions */}
                          <div className="pt-2 border-t flex flex-col gap-2">
                            <Input
                              placeholder="Nhập ý kiến / ghi chú phê duyệt..."
                              size="small"
                              value={approvalNotes[cr.id] || ''}
                              onChange={(e) =>
                                setApprovalNotes({ ...approvalNotes, [cr.id]: e.target.value })
                              }
                            />

                            <div className="flex justify-end gap-2">
                              {cr.status === 'PendingL1' && (
                                <>
                                  <Popconfirm
                                    title="Từ chối đề xuất này?"
                                    onConfirm={() => handleReviewL1(cr.id, 'REJECT')}
                                  >
                                    <Button size="small" danger icon={<CloseOutlined />}>
                                      Từ Chối (Cấp Phòng)
                                    </Button>
                                  </Popconfirm>
                                  <Button
                                    size="small"
                                    type="primary"
                                    className="bg-amber-600 hover:!bg-amber-700"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleReviewL1(cr.id, 'APPROVE')}
                                  >
                                    Duyệt Cấp Phòng (Chuyển Cấp Khối)
                                  </Button>
                                </>
                              )}

                              {cr.status === 'PendingL2' && (
                                <>
                                  <Popconfirm
                                    title="Từ chối đề xuất này?"
                                    onConfirm={() => handleApproveL2(cr.id, 'REJECT')}
                                  >
                                    <Button size="small" danger icon={<CloseOutlined />}>
                                      Từ Chối (Cấp Khối)
                                    </Button>
                                  </Popconfirm>
                                  <Button
                                    size="small"
                                    type="primary"
                                    className="bg-emerald-600 hover:!bg-emerald-700"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleApproveL2(cr.id, 'APPROVE')}
                                  >
                                    Phê Duyệt Ban Hành (Cấp Khối KTNB)
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              ),
            },
            {
              key: '2',
              label: 'Lịch Sử Đã Phê Duyệt',
              children: (
                <div className="space-y-3">
                  {changeRequests
                    .filter((cr) => cr.status === 'Approved' || cr.status === 'Rejected')
                    .map((cr) => (
                      <Card key={cr.id} size="small" className="shadow-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs text-slate-800">{cr.title}</span>
                          <Tag color={cr.status === 'Approved' ? 'green' : 'red'}>
                            {cr.status === 'Approved' ? '✅ Đã Ban Hành (Khối duyệt)' : '❌ Đã Từ Chối'}
                          </Tag>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Người tạo: {cr.createdByName} | Phòng duyệt: {cr.reviewerL1Name || '---'} | Khối duyệt:{' '}
                          {cr.approverL2Name || '---'}
                        </div>
                      </Card>
                    ))}
                </div>
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
};

export default RiskProfilesTab;
