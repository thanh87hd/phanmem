import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Modal, Form, Input,
  Tag, message, Tooltip, Switch, Row, Col, Divider, Alert, Badge
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, CloseOutlined,
  SearchOutlined, SafetyOutlined, CheckSquareOutlined, BorderOutlined,
  SafetyCertificateOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { getColumnSearchProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string; // comma-separated list
}

const RolesPage: React.FC = () => {
  const { t } = useTranslation();

  const PERM_OPTIONS = [
    // Hệ thống & Quản trị
    { key: 'dashboard', label: t('rolesPage.viewGeneralDashboard', 'Xem Dashboard Tổng quát'), group: t('rolesPage.administration', 'Quản trị') },
    { key: 'personnel', label: t('menu.personnel', 'Quản lý Nhân sự'), group: t('rolesPage.administration', 'Quản trị') },
    { key: 'roles', label: t('rolesPage.decentralizedManagement', 'Quản lý Phân quyền'), group: t('rolesPage.administration', 'Quản trị') },
    { key: 'audit_trail', label: t('rolesPage.viewSystemLog', 'Xem Nhật ký Hệ thống'), group: t('rolesPage.administration', 'Quản trị') },
    { key: 'departments', label: t('menu.departments', 'Cơ cấu tổ chức'), group: t('rolesPage.administration', 'Quản trị') },
    
    // Lập kế hoạch & Rủi ro
    { key: 'audit_universe', label: t('rolesPage.manageAuditUniverse', 'Quản lý Audit Universe'), group: t('auditEngagements.cols.planName', 'Kế hoạch') },
    { key: 'risk_assessment', label: t('rolesPage.performARiskAssessment', 'Thực hiện Đánh giá Rủi ro'), group: t('auditEngagements.cols.planName', 'Kế hoạch') },
    { key: 'audit_plan', label: t('rolesPage.prepareAnnualEconomicPlan', 'Lập Kế hoạch KT Năm'), group: t('auditEngagements.cols.planName', 'Kế hoạch') },
    { key: 'resource_calendar', label: t('rolesPage.ktvWorkSchedule', 'Lịch công tác KTV'), group: t('auditEngagements.cols.planName', 'Kế hoạch') },

    // Thực hiện Kiểm toán
    { key: 'execution_dashboard', label: t('rolesPage.viewImplementationDashboardStage3', 'Xem Dashboard Thực hiện (Gđ 3)'), group: t('rolesPage.perform', 'Thực hiện') },
    { key: 'audit_engagements', label: t('rolesPage.manageTheTechnicalTeamKanban', 'Quản lý Đoàn KT & Kanban'), group: t('rolesPage.perform', 'Thực hiện') },
    { key: 'working_papers', label: t('rolesPage.draftingWorkingPapers', 'Soạn thảo Giấy tờ làm việc'), group: t('rolesPage.perform', 'Thực hiện') },
    { key: 'audit_findings', label: t('rolesPage.recordKtDiscovery', 'Ghi nhận Phát hiện KT'), group: t('rolesPage.perform', 'Thực hiện') },
    { key: 'timesheet', label: t('rolesPage.recordTimesheet', 'Ghi nhận Timesheet'), group: t('rolesPage.perform', 'Thực hiện') },
    { key: 'data_analytics', label: t('menu.dataAnalytics', 'Phân tích & Lấy mẫu'), group: t('rolesPage.perform', 'Thực hiện') },
    { key: 'audit_templates', label: t('rolesPage.managingTopicalTemplates', 'Quản lý Mẫu Nghiệp vụ'), group: t('rolesPage.perform', 'Thực hiện') },

    // Báo cáo & Khắc phục
    { key: 'summary_reports', label: t('rolesPage.viewSummaryReport', 'Xem Báo cáo Tổng hợp'), group: t('auditEngagements.report', 'Báo cáo') },
    { key: 'audit_reports', label: t('rolesPage.prepareTechnicalReport', 'Lập Báo cáo KT'), group: t('auditEngagements.report', 'Báo cáo') },
    { key: 'sign_report', label: t('rolesPage.digitallySignTheReport', 'Ký số Báo cáo'), group: t('auditEngagements.report', 'Báo cáo') },

    // Giám sát & Chất lượng
    { key: 'recommendations', label: t('menu.tracking', 'Theo dõi Kiến nghị'), group: t('rolesPage.advanced', 'Nâng cao') },
    { key: 'auditee_portal', label: t('rolesPage.accessTheUnitPortal', 'Truy cập Portal Đơn vị'), group: t('rolesPage.advanced', 'Nâng cao') },
    { key: 'continuous_monitoring', label: t('rolesPage.continuousMonitoringEws', 'Giám sát Liên tục (EWS)'), group: t('rolesPage.advanced', 'Nâng cao') },
    { key: 'quality_control', label: t('rolesPage.qualityControlQa', 'Kiểm soát Chất lượng (QA)'), group: t('rolesPage.advanced', 'Nâng cao') },
    { key: 'audit_committee', label: 'Audit Committee Portal', group: t('rolesPage.advanced', 'Nâng cao') },
    { key: 'regulatory_exams', label: 'Regulatory Exam Tracker', group: t('rolesPage.advanced', 'Nâng cao') },

    // Tổng hợp & Nội bộ
    { key: 'general_tasks', label: t('rolesPage.generalWorkManagement', 'Quản lý Công việc Chung'), group: t('rolesPage.internal', 'Nội bộ') },
    { key: 'audit_expenses', label: t('menu.auditExpenses', 'Quản lý Chi phí KT'), group: t('rolesPage.internal', 'Nội bộ') },
    { key: 'training_cpe', label: t('rolesPage.cpeTrainingManagement', 'Quản lý Đào tạo CPE'), group: t('rolesPage.internal', 'Nội bộ') },
    { key: 'nhansu_tonghop', label: t('rolesPage.nhansuTonghop', 'Nhiệm vụ: Nhân sự Tổng hợp'), group: t('rolesPage.internal', 'Nội bộ') },
    { key: 'nhansu_khacphuc', label: t('rolesPage.nhansuKhacphuc', 'Nhiệm vụ: Nhân sự Khắc phục'), group: t('rolesPage.internal', 'Nội bộ') },
  ];

  const [data, setData] = useState<Role[]>([]);
  const [dynamicReports, setDynamicReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Role | null>(null);
  const [activePerms, setActivePerms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form] = Form.useForm();

  const dynamicReportPerms = dynamicReports.map(r => ({
    key: `view_report_${r.id}`,
    label: `Xem Báo cáo Động: ${r.name}`,
    group: 'Báo cáo Động'
  }));

  const ALL_PERMS = [...PERM_OPTIONS, ...dynamicReportPerms];

  const selectAllPerms = () => {
    setActivePerms(ALL_PERMS.map(opt => opt.key));
    message.success(t('rolesPage.allPowersSelected', 'Đã chọn tất cả quyền hạn!'));
  };

  const clearAllPerms = () => {
    setActivePerms([]);
    message.info(t('rolesPage.allPermissionsDeselected', 'Đã hủy chọn tất cả quyền hạn.'));
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'admin') {
      setActivePerms(ALL_PERMS.map(opt => opt.key));
      message.success(t('rolesPage.fullAdministratorConfigurationApplied', 'Đã áp dụng cấu hình Quản trị viên toàn quyền'));
    } else if (presetName === 'ktv') {
      const ktvPerms = ['dashboard', 'execution_dashboard', 'audit_universe', 'risk_assessment', 'resource_calendar', 'audit_engagements', 'working_papers', 'audit_findings', 'timesheet', 'data_analytics', 'audit_reports', 'recommendations'];
      setActivePerms(ktvPerms);
      message.success(t('rolesPage.standardAuditorConfigurationApplied', 'Đã áp dụng cấu hình Kiểm toán viên chuẩn'));
    } else if (presetName === 'auditee') {
      const auditeePerms = ['dashboard', 'auditee_portal', 'recommendations'];
      setActivePerms(auditeePerms);
      message.success(t('rolesPage.auditedEntityConfigurationApplied', 'Đã áp dụng cấu hình Đơn vị được kiểm toán'));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRoles, resReports] = await Promise.all([
        api.get('/roles'),
        api.get('/reports')
      ]);
      setData(resRoles.data);
      setDynamicReports(resReports.data);
    } catch {
      message.error(t('rolesPage.unableToLoadTitleList', 'Không thể tải danh sách chức danh'));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const openCreateModal = () => {
    setEditingRecord(null);
    setActivePerms([]);
    setSearchTerm('');
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record: Role) => {
    setEditingRecord(record);
    const perms = record.permissions ? record.permissions.split(',').filter(Boolean) : [];
    setActivePerms(perms);
    setSearchTerm('');
    form.setFieldsValue({ name: record.name, description: record.description });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, permissions: activePerms.join(',') };
      if (editingRecord) {
        await api.patch(`/roles/${editingRecord.id}`, payload);
        message.success(t('rolesPage.updatedTitleSuccessfully', 'Cập nhật chức danh thành công!'));
      } else {
        await api.post('/roles', payload);
        message.success(t('rolesPage.createASuccessfulTitle', 'Tạo chức danh thành công!'));
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(t('rolesPage.anErrorOccurred', 'Có lỗi xảy ra.'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/roles/${id}`);
      message.success(t('rolesPage.titleRemoved', 'Đã xóa chức danh'));
      fetchData();
    } catch {
      message.error(t('common.deleteFail', 'Xóa thất bại'));
    }
  };

  const togglePerm = (key: string) => {
    setActivePerms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const columns = [
    {
      title: t('rolesPage.cols.roleName', 'Tên Chức danh'),
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ...getColumnSearchProps<any>('name', 'Tên Chức danh'),
      sorter: getColumnSorter<any>('name', 'string'),
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    { 
      title: t('auditEngagements.describe', 'Mô tả'), 
      dataIndex: 'description', 
      key: 'description',
      width: 250,
      ...getColumnSearchProps<any>('description', 'Mô tả'),
      sorter: getColumnSorter<any>('description', 'string'),
    },
    {
      title: t('rolesPage.cols.permissions', 'Quyền hạn'),
      dataIndex: 'permissions',
      key: 'permissions',
      ...getColumnSearchProps<any>('permissions', 'Quyền hạn'),
      render: (perms: string) => {
        if (!perms) return <Tag color="default">{t('rolesPage.notConfiguredYet', 'Chưa cấu hình')}</Tag>;
        return perms.split(',').filter(Boolean).map(p => {
          const opt = ALL_PERMS.find(o => o.key === p);
          return <Tag key={p} color="blue" style={{ marginBottom: 4 }}>{opt?.label || p}</Tag>;
        });
      },
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 100,
      render: (_: any, record: Role) => (
        <Space>
          <Tooltip title={t('rolesPage.editPermissions', 'Chỉnh sửa quyền')}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title={t('auditTemplates.btnDelete', 'Xóa')}>
            <Button
              type="text" danger icon={<DeleteOutlined />}
              onClick={() => Modal.confirm({
                title: t('personnel.confirmDeletion', 'Xác nhận xóa'),
                content: `Xóa chức danh "${record.name}"?`,
                okText: t('auditTemplates.btnDelete', 'Xóa'), okType: 'danger', cancelText: t('findingKB.modal.cancelText', 'Hủy'),
                onOk: () => handleDelete(record.id),
              })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (isModalOpen) {
    // Filter perm options based on search term
    const filteredOptions = ALL_PERMS.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.group.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = [t('rolesPage.administration', 'Quản trị'), t('auditEngagements.cols.planName', 'Kế hoạch'), t('rolesPage.perform', 'Thực hiện'), t('auditEngagements.report', 'Báo cáo'), t('rolesPage.advanced', 'Nâng cao'), t('rolesPage.internal', 'Nội bộ'), 'Báo cáo Động'];

    return (
      <div className="animate-fadeIn p-2" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Premium Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 bg-transparent">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setIsModalOpen(false)} 
              className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-11"
              icon={<CloseOutlined />}
            >
              {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Title level={3} className="!mb-0 text-slate-800" style={{ margin: 0 }}>
                  {editingRecord ? `Cấu hình Chức danh: ${editingRecord.name}` : t('rolesPage.addNewSystemTitle', 'Thêm Chức danh Hệ thống Mới')}
                </Title>
                <Tag color={editingRecord ? 'orange' : 'green'} className="rounded-md font-semibold px-2 py-0.5 border-none shadow-2xs">
                  {editingRecord ? [t('rolesPage.editTitle', 'Hiệu chỉnh Chức danh')] : t('rolesPage.newInitialization', 'Khởi tạo mới')}
                </Tag>
              </div>
              <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
                {t('rolesPage.createAndConfigureDetailedPermissionsFor', 'Tạo và cấu hình phân quyền chi tiết cho chức danh, định vị chính xác phạm vi hoạt động của người dùng.')}
              </Text>
            </div>
          </div>
          <Space size="middle">
            <Button onClick={() => setIsModalOpen(false)} className="rounded-xl shadow-sm h-11 px-5 font-medium hover:bg-slate-50">
              {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave} 
              className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-11 px-7 text-white transition-all duration-200"
            >
              {editingRecord ? [t('rolesPage.updatePosition', 'Cập nhật Chức danh')] : t('rolesPage.saveInitialize', 'Lưu & Khởi tạo')}
            </Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* CỘT TRÁI: THÔNG TIN CHUNG */}
          <Col xs={24} lg={8} xl={7}>
            <div className="flex flex-col gap-6">
              {/* Card Form */}
              <Card 
                title={
                  <div className="flex items-center gap-2 text-slate-800 font-bold py-1">
                    <KeyOutlined className="text-[#ea9105]" />
                    <span>{t('rolesPage.jobTitleInformation', 'Thông tin Chức danh')}</span>
                  </div>
                }
                variant="borderless" 
                className="shadow-sm rounded-2xl bg-white border border-slate-100"
              >
                <Form form={form} layout="vertical" className="mt-2">
                  <Form.Item 
                    name="name" 
                    label={<span className="font-semibold text-slate-700 text-sm">{t('rolesPage.systemTitleName', 'Tên chức danh hệ thống')}</span>} 
                    rules={[{ required: true, message: t('rolesPage.pleaseEnterTheSystemTitleName', 'Vui lòng nhập tên chức danh hệ thống') }]}
                  >
                    <Input 
                      placeholder={t('rolesPage.forExampleHeadOfAuditCommittee', 'Ví dụ: Trưởng Ban Kiểm toán, Trưởng đoàn...')} 
                      className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] transition-all" 
                    />
                  </Form.Item>
                  <Form.Item 
                    name="description" 
                    label={<span className="font-semibold text-slate-700 text-sm">{t('rolesPage.describeRolesResponsibilities', 'Mô tả vai trò & trách nhiệm')}</span>}
                  >
                    <Input.TextArea 
                      rows={5} 
                      placeholder={t('rolesPage.briefDescriptionOfResponsibilitiesAndMain', 'Mô tả tóm tắt trách nhiệm, vai trò chính trong quy trình kiểm toán, kiểm soát rủi ro để hỗ trợ việc phân quyền chính xác hơn...')} 
                      className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] transition-all" 
                    />
                  </Form.Item>
                </Form>
              </Card>

              {/* Card Presets */}
              <Card 
                title={
                  <div className="flex items-center gap-2 text-slate-800 font-bold py-1">
                    <SafetyOutlined className="text-[#ea9105]" />
                    <span>{t('rolesPage.quickAuthorizationForm', 'Mẫu phân quyền nhanh')}</span>
                  </div>
                }
                variant="borderless" 
                className="shadow-sm rounded-2xl bg-white border border-slate-100"
              >
                <Text type="secondary" className="text-xs mb-4 block leading-relaxed">
                  {t('rolesPage.selectPresetSampleDecentralizationConfigurationsBased', 'Lựa chọn các cấu hình phân quyền mẫu được thiết lập sẵn dựa trên vai trò nghiệp vụ tiêu chuẩn quốc tế.')}
                </Text>
                <div className="flex flex-col gap-2.5">
                  <Button 
                    onClick={() => applyPreset('admin')} 
                    className="w-full text-left flex justify-between items-center h-11 px-4 rounded-xl border border-slate-200 hover:border-[#ea9105] hover:text-[#ea9105] bg-slate-50/50 transition-all font-medium"
                  >
                    <span>{t('rolesPage.administratorFullAuthority', '👑 Quản trị viên (Toàn quyền)')}</span>
                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">ALL</span>
                  </Button>
                  <Button 
                    onClick={() => applyPreset('ktv')} 
                    className="w-full text-left flex justify-between items-center h-11 px-4 rounded-xl border border-slate-200 hover:border-[#ea9105] hover:text-[#ea9105] bg-slate-50/50 transition-all font-medium"
                  >
                    <span>{t('rolesPage.standardAuditor', '🔍 Kiểm toán viên tiêu chuẩn')}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">KTV</span>
                  </Button>
                  <Button 
                    onClick={() => applyPreset('auditee')} 
                    className="w-full text-left flex justify-between items-center h-11 px-4 rounded-xl border border-slate-200 hover:border-[#ea9105] hover:text-[#ea9105] bg-slate-50/50 transition-all font-medium"
                  >
                    <span>{t('rolesPage.auditedUnit', '🏢 Đơn vị được kiểm toán')}</span>
                    <span className="text-[10px] bg-amber-50 text-[#ea9105] px-2 py-0.5 rounded-full font-bold">PORTAL</span>
                  </Button>
                </div>
              </Card>

              {/* Card Compliance / Security Guidance */}
              <Alert
                message={<span className="font-semibold text-slate-800 text-[13px]">{t('rolesPage.noteOnSecurityCompliance', 'Lưu ý về Tuân thủ Bảo mật')}</span>}
                description={
                  <div className="text-[12px] text-slate-600 leading-relaxed mt-1 flex flex-col gap-1.5">
                    <p>{t('rolesPage.apply', '• Áp dụng')} <strong>{t('rolesPage.leastPrivilegePrinciple', 'Nguyên tắc đặc quyền tối thiểu (Least Privilege)')}</strong> {t('rolesPage.onlyGrantPermissionsThatAreAbsolutely', '- chỉ cấp những quyền thực sự cần thiết để thực hiện công việc.')}</p>
                    <p>{t('rolesPage.allocationOfAdministrationSyslogPermissionGroups', '• Việc phân bổ các nhóm quyền Quản trị & Nhật ký hệ thống cần được phê duyệt bởi Trưởng ban Kiểm toán nội bộ.')}</p>
                    <p>{t('rolesPage.inAccordanceWithCircularNo832025ttnhnn', '• Phù hợp với thông tư số 83/2025/TT-NHNN của Ngân hàng Nhà nước Việt Nam về hệ thống kiểm soát nội bộ và kiểm toán nội bộ.')}</p>
                  </div>
                }
                type="warning"
                showIcon
                icon={<InfoCircleOutlined className="text-[#ea9105] text-lg" />}
                className="rounded-2xl border-amber-100 bg-amber-50/40 p-4"
              />
            </div>
          </Col>

          {/* CỘT PHẢI: CẤU HÌNH PHÂN QUYỀN TRUY CẬP CHỨC NĂNG */}
          <Col xs={24} lg={16} xl={17}>
            <Card 
              title={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full py-1">
                  <div className="flex items-center gap-2">
                    <SafetyCertificateOutlined className="text-emerald-500 text-lg" />
                    <div>
                      <span className="text-slate-800 font-bold block">{t('rolesPage.functionalAuthorityMatrix', 'Ma trận Quyền hạn Chức năng')}</span>
                      <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                        {t('rolesPage.selected', 'Đã chọn')} <strong className="text-[#ea9105]">{activePerms.length}</strong> {t('rolesPage.onTotal', 'trên tổng số')} <strong>{ALL_PERMS.length}</strong> {t('rolesPage.function', 'chức năng')}
                      </span>
                    </div>
                  </div>
                  {/* Search box & Bulk Actions */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <Input
                      placeholder={t('rolesPage.quicklyFindPermissions', 'Tìm nhanh quyền hạn...')}
                      prefix={<SearchOutlined className="text-slate-400" />}
                      className="rounded-xl h-10 w-full sm:w-48 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      allowClear
                    />
                    <Space size="small" className="flex-shrink-0">
                      <Button 
                        size="middle" 
                        icon={<CheckSquareOutlined />} 
                        onClick={selectAllPerms}
                        className="rounded-lg hover:text-[#ea9105] hover:border-[#ea9105] font-semibold h-10 text-xs"
                      >
                        {t('rolesPage.selectAll', 'Chọn hết')}
                      </Button>
                      <Button 
                        size="middle" 
                        icon={<BorderOutlined />} 
                        onClick={clearAllPerms}
                        className="rounded-lg hover:text-[#ea9105] hover:border-[#ea9105] font-semibold h-10 text-xs"
                      >
                        {t('rolesPage.deleteAll', 'Xóa hết')}
                      </Button>
                    </Space>
                  </div>
                </div>
              }
              variant="borderless" 
              className="shadow-sm rounded-2xl bg-white border border-slate-100"
            >
              {/* Grid or Scroll Container */}
              <div 
                style={{
                  maxHeight: '650px', 
                  overflowY: 'auto',
                  paddingRight: 8
                }}
                className="pr-1 custom-scrollbar"
              >
                {groups.map(groupName => {
                  const optsInGroup = ALL_PERMS.filter(o => o.group === groupName);
                  const filteredOptsInGroup = filteredOptions.filter(o => o.group === groupName);
                  
                  // Skip displaying the group if searching and no matches are found in it
                  if (searchTerm && filteredOptsInGroup.length === 0) return null;

                  // Count checked perms in this group
                  const checkedCount = optsInGroup.filter(o => activePerms.includes(o.key)).length;
                  const totalCount = optsInGroup.length;

                  return (
                    <div key={groupName} className="mb-6 last:mb-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-150">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-bold text-sm">📁 Nhóm chức năng: {groupName}</span>
                          <Badge 
                            count={`${checkedCount}/${totalCount}`} 
                            style={{ 
                              backgroundColor: checkedCount === totalCount ? '#10b981' : checkedCount > 0 ? '#ea9105' : '#94a3b8',
                              color: 'white',
                              boxShadow: 'none'
                            }} 
                            className="ml-1"
                          />
                        </div>
                        {optsInGroup.length > 0 && (
                          <Space size="middle">
                            <Button 
                              type="link" 
                              size="small" 
                              className="text-xs text-slate-500 hover:text-[#ea9105] p-0 font-medium"
                              onClick={() => {
                                const keys = optsInGroup.map(o => o.key);
                                setActivePerms(prev => [...new Set([...prev, ...keys])]);
                              }}
                            >
                              {t('rolesPage.selectAllGroups', 'Chọn tất cả nhóm')}
                            </Button>
                            <span className="text-slate-300">|</span>
                            <Button 
                              type="link" 
                              size="small" 
                              className="text-xs text-slate-500 hover:text-red-500 p-0 font-medium"
                              onClick={() => {
                                const keys = optsInGroup.map(o => o.key);
                                setActivePerms(prev => prev.filter(p => !keys.includes(p)));
                              }}
                            >
                              {t('rolesPage.deselectGroup', 'Bỏ chọn nhóm')}
                            </Button>
                          </Space>
                        )}
                      </div>

                      <Row gutter={[16, 12]}>
                        {filteredOptsInGroup.map(opt => {
                          const isChecked = activePerms.includes(opt.key);
                          return (
                            <Col span={24} sm={12} key={opt.key}>
                              <div 
                                onClick={() => togglePerm(opt.key)}
                                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 bg-white select-none ${
                                  isChecked 
                                    ? 'border-[#ea9105] bg-orange-50/10 shadow-3xs' 
                                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/30'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 max-w-[85%]">
                                  <SafetyCertificateOutlined className={`text-sm ${isChecked ? 'text-[#ea9105]' : 'text-slate-300'}`} />
                                  <Text 
                                    className="truncate text-[13px]" 
                                    style={{ 
                                      color: isChecked ? '#1e293b' : '#475569', 
                                      fontWeight: isChecked ? 600 : 500 
                                    }}
                                  >
                                    {opt.label}
                                  </Text>
                                </div>
                                <Switch
                                  size="small"
                                  checked={isChecked}
                                  onChange={(checked, e) => {
                                    e.stopPropagation(); // prevent card click handler double trigger
                                    togglePerm(opt.key);
                                  }}
                                  className={isChecked ? 'bg-[#ea9105]' : ''}
                                />
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  );
                })}

                {filteredOptions.length === 0 && (
                  <div className="text-center py-12">
                    <Text type="secondary" className="text-slate-400">Không tìm thấy quyền hạn nào trùng khớp với từ khóa "{searchTerm}"</Text>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Lower Action Row */}
        <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button onClick={() => setIsModalOpen(false)} className="rounded-xl px-6 h-11 font-medium hover:bg-slate-50 shadow-xs">
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button 
            type="primary" 
            onClick={handleSave} 
            className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-7 font-semibold h-11 text-white shadow-md transition-all duration-200"
          >
            {editingRecord ? [t('rolesPage.updatePosition', 'Cập nhật Chức danh')] : t('rolesPage.saveInitialize', 'Lưu & Khởi tạo')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <KeyOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            {t('rolesPage.title', 'Phân quyền — Chức danh Hệ thống')}
          </Title>
          <Text type="secondary">{t('rolesPage.subtitle', 'Tạo và cấu hình quyền hạn cho từng nhóm người dùng')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={openCreateModal}
          className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
        >
          {t('rolesPage.btnNew', 'Thêm Chức danh')}
        </Button>
      </div>

      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Thêm / Sửa đã được chuyển thành Inline Editor ở trên */}
    </div>
  );
};

export default RolesPage;
