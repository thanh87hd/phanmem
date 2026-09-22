import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, Row, Col, Typography, Button, Spin, Tag, List, Divider, 
  Form, Input, Select, Space, message, Popconfirm, Tabs, Table, 
  InputNumber, Tooltip 
} from 'antd';
import { 
  FormOutlined, 
  DownloadOutlined, 
  SafetyCertificateOutlined, 
  CodeOutlined, 
  BankOutlined, 
  CrownOutlined, 
  SecurityScanOutlined, 
  InteractionOutlined, 
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LeftOutlined,
  RobotOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  HourglassOutlined,
  SyncOutlined,
  FileTextOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCurrentUser } from '../utils/useCurrentUser';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AuditTemplates: React.FC = () => {
  const { t } = useTranslation();

  const currentUser = useCurrentUser();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<string>('library');
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Role checking logic (Trưởng đoàn or higher)
  const roleName = typeof currentUser.role === 'string' ? currentUser.role : (currentUser.role?.name || '');
  const roleLower = roleName.toLowerCase();
  const isLeader = roleLower.includes('admin') || 
                   roleLower.includes(t('auditTemplates.administration', 'quản trị')) || 
                   roleLower.includes(t('auditTemplates.headOfInternalAuditCommittee', 'trưởng ban ktnb')) || 
                   roleLower.includes(t('auditTemplates.ktnbLeader', 'lãnh đạo ktnb')) || 
                   roleLower.includes(t('auditTemplates.blockDirector', 'giám đốc khối')) || 
                   roleLower.includes(t('auditTemplates.delegationLeader', 'trưởng đoàn')) || 
                   roleLower.includes(t('auditTemplates.groupLeader', 'trưởng nhóm')) || 
                   roleLower.includes(t('auditTemplates.room', 'phòng')) || 
                   roleLower.includes('lead');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-templates');
      setTemplates(res.data || []);
    } catch (error) {
      console.error('Failed to load audit templates');
      message.error(t('auditTemplates.messages.loadError', 'Không thể tải danh sách mẫu nghiệp vụ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseTemplate = async (tpl: any) => {
    try {
      await api.post(`/audit-templates/${tpl.id}/use`);
    } catch (e) {
      console.error('Failed to log template usage', e);
    }
    navigate('/working-papers', { state: { applyTemplate: tpl } });
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      domain: 'Credit',
      version: '1.0',
      status: 'Published',
      estimatedHours: 40,
      checklist: [{ task: '' }]
    });
    setIsEditorVisible(true);
  };

  const handleEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    form.setFieldsValue({
      ...tpl,
      checklist: tpl.checklist && tpl.checklist.length > 0 
        ? tpl.checklist 
        : [{ task: '' }]
    });
    setIsEditorVisible(true);
  };

  const handleDuplicate = (tpl: any) => {
    setEditingTemplate(null); // Save as new template
    form.resetFields();
    form.setFieldsValue({
      title: `${tpl.title} (Sao chép)`,
      domain: tpl.domain,
      description: tpl.description,
      version: '1.0',
      status: 'Draft',
      targetDepartments: tpl.targetDepartments,
      estimatedHours: tpl.estimatedHours,
      iiaStandards: tpl.iiaStandards,
      checklist: tpl.checklist && tpl.checklist.length > 0 
        ? tpl.checklist.map((item: any) => ({ task: item.task })) 
        : [{ task: '' }]
    });
    setIsEditorVisible(true);
    message.info(t('auditTemplates.messages.duplicateSuccess', 'Đã sao chép cấu trúc mẫu biểu! Hãy chỉnh sửa và lưu thành mẫu mới.'));
  };

  const handleToggleStatus = async (tpl: any) => {
    const newStatus = tpl.status === 'Published' ? 'Archived' : 'Published';
    try {
      await api.patch(`/audit-templates/${tpl.id}`, { status: newStatus });
      message.success(`Đã chuyển trạng thái mẫu biểu thành: ${newStatus === 'Published' ? [t('auditTemplates.published', 'Đã ban hành')] : t('auditTemplates.archived', 'Lưu trữ')}`);
      fetchTemplates();
    } catch (error) {
      message.error(t('auditTemplates.messages.statusError', 'Không thể cập nhật trạng thái mẫu biểu'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/audit-templates/${id}`);
      message.success(t('auditTemplates.messages.deleteSuccess', 'Đã xóa mẫu nghiệp vụ thành công!'));
      fetchTemplates();
    } catch (error) {
      message.error(t('auditTemplates.messages.deleteError', 'Lỗi khi xóa mẫu nghiệp vụ'));
    }
  };

  const handleSave = () => {
    form.validateFields().then(async values => {
      const checklistPayload = (values.checklist || [])
        .filter((item: any) => item && item.task && item.task.trim() !== '')
        .map((item: any, index: number) => ({
          step: index + 1,
          task: item.task
        }));

      const payload = {
        title: values.title,
        domain: values.domain,
        description: values.description,
        checklist: checklistPayload,
        version: values.version || '1.0',
        status: values.status || 'Published',
        targetDepartments: values.targetDepartments || '',
        estimatedHours: values.estimatedHours || 40,
        iiaStandards: values.iiaStandards || '',
        createdBy: editingTemplate ? editingTemplate.createdBy : (currentUser.fullName || currentUser.username || t('auditTemplates.system', 'Hệ thống'))
      };

      try {
        if (editingTemplate) {
          await api.patch(`/audit-templates/${editingTemplate.id}`, payload);
          message.success(t('auditTemplates.messages.saveUpdateSuccess', 'Cập nhật mẫu nghiệp vụ thành công!'));
        } else {
          await api.post('/audit-templates', payload);
          message.success(t('auditTemplates.messages.saveCreateSuccess', 'Tạo mẫu nghiệp vụ mới thành công!'));
        }
        setIsEditorVisible(false);
        setEditingTemplate(null);
        fetchTemplates();
      } catch (error: any) {
        message.error(error.response?.data?.message || t('auditTemplates.messages.saveError', 'Lỗi khi lưu mẫu nghiệp vụ'));
      }
    }).catch(errorInfo => {
      console.log('Validation Failed:', errorInfo);
    });
  };

  const handleAISuggestSteps = () => {
    const title = form.getFieldValue('title');
    if (!title || title.trim().length < 5) {
      message.warning(t('auditTemplates.messages.aiWarning', 'Vui lòng nhập Tên Nghiệp vụ trước để AI gợi ý thông tin cấu trúc phù hợp'));
      return;
    }

    message.loading({ content: t('auditTemplates.messages.aiLoading', 'AI đang phân tích và soạn thảo cấu trúc mẫu biểu nghiệp vụ...'), key: 'ai_steps' });
    
    setTimeout(() => {
      const titleLower = title.toLowerCase();
      let steps = [
        { task: t('auditTemplates.collectInternalDocumentsAndRecordsRelated', 'Thu thập hồ sơ, văn bản nội bộ liên quan đến hoạt động nghiệp vụ') },
        { task: t('auditTemplates.performSampleSelectionAndCompareActual', 'Thực hiện chọn mẫu và đối chiếu chứng từ thực tế với ghi nhận sổ sách') },
        { task: t('auditTemplates.interviewOfficersInChargeOfImplementing', 'Phỏng vấn cán bộ chuyên trách về việc thực hiện chốt kiểm soát chéo') },
        { task: t('auditTemplates.prepareFieldRecordsAndSummarizeDetected', 'Lập biên bản thực địa và tổng hợp các lỗi phát hiện gửi trưởng nhóm') }
      ];
      let desc = `Mục tiêu: Đánh giá tính hữu hiệu và hiệu quả của hệ thống kiểm soát nội bộ đối với nghiệp vụ "${title}".\n\nRủi ro chính: Quy trình vận hành thiếu chốt kiểm soát, sai lệch số liệu ghi nhận hoặc vi phạm pháp quy ngân hàng.`;
      let estHours = 40;
      let targetDept=t('auditTemplates.departmentOfProfessionalOperations', 'Phòng nghiệp vụ chuyên môn');
      let iia=t('auditTemplates.iia1210ProfessionalismIia2200Planning', 'IIA 1210 (Tính chuyên nghiệp), IIA 2200 (Lập kế hoạch)');
      let domain = form.getFieldValue('domain') || 'Operations';

      if (titleLower.includes(t('auditFindings.credit', 'tín dụng')) || titleLower.includes('cho vay') || titleLower.includes(t('auditFindings.disbursement', 'giải ngân')) || titleLower.includes(t('auditFindings.asset', 'tài sản')) || titleLower.includes(t('auditFindings.mortgage', 'thế chấp')) || titleLower.includes(t('auditTemplates.warrant', 'bảo đảm'))) {
        steps = [
          { task: t('auditTemplates.checkLegalDocumentsOfMortgagedAssets', 'Kiểm tra hồ sơ pháp lý tài sản thế chấp và biên bản định giá thực địa') },
          { task: t('auditTemplates.compareTheCreditApprovalAuthoritySignature', 'Đối chiếu chữ ký thẩm quyền phê duyệt tín dụng với Quy chế phân quyền') },
          { task: t('auditTemplates.checkTheActualDisbursementStageAnd', 'Kiểm tra khâu giải ngân thực tế và giám sát sử dụng vốn sau cho vay') },
          { task: t('auditTemplates.reviewDebtRatingsProvisioningAndPeriodic', 'Rà soát xếp hạng nợ, trích lập dự phòng và kiểm tra sau cho vay định kỳ') }
        ];
        desc = `Mục tiêu: Rà soát và đánh giá tính tuân thủ quy trình cấp tín dụng, thẩm định tài sản bảo đảm và phân loại nợ nần đối với nghiệp vụ "${title}".\n\nRủi ro chính: Thẩm định sai giá trị tài sản bảo đảm, phê duyệt vượt thẩm quyền, giải ngân sai mục đích hoặc phân loại nợ không đúng dẫn đến gia tăng tỷ lệ nợ xấu và vi phạm quy định của NHNN.`;
        estHours = 80;
        targetDept=t('auditTemplates.creditRiskManagementDepartmentRetailDivision', 'Phòng Quản lý rủi ro Tín dụng, Khối Bán lẻ');
        iia=t('auditTemplates.iia2110RiskManagementIia2210', 'IIA 2110 (Quản trị rủi ro), IIA 2210 (Mục tiêu cuộc kiểm toán)');
        domain = 'Credit';
      } else if (titleLower.includes('core') || titleLower.includes('banking') || titleLower.includes(t('auditTemplates.security', 'bảo mật')) || titleLower.includes('it') || titleLower.includes(t('auditFindings.system', 'hệ thống')) || titleLower.includes(t('auditTemplates.network', 'mạng')) || titleLower.includes('downtime')) {
        steps = [
          { task: t('auditTemplates.reviewTheListOfAccessRights', 'Rà soát danh sách phân quyền truy cập hệ thống Core, đối chiếu cán bộ nghỉ việc') },
          { task: t('auditTemplates.checkAuditLogsOfPrivilegedAccounts', 'Kiểm tra nhật ký Audit Logs của các tài khoản đặc quyền (Superuser)') },
          { task: t('auditTemplates.evaluateAutomatedFailoverScenariosAndDisaster', 'Đánh giá kịch bản failover tự động và diễn tập phục hồi sau thảm họa (DR)') },
          { task: t('auditTemplates.reviewSecurityVulnerabilityPatchRecordsAnd', 'Rà soát biên bản vá lỗ hổng bảo mật và kết quả Pentest hệ thống di động') }
        ];
        desc = `Mục tiêu: Đánh giá tính an toàn bảo mật hệ thống thông tin, tính toàn vẹn dữ liệu và khả năng sẵn sàng hoạt động liên tục đối với nghiệp vụ "${title}".\n\nRủi ro chính: Phân quyền truy cập không chặt chẽ, rò rỉ dữ liệu khách hàng nhạy cảm, tấn công mạng gây downtime hệ thống Core banking và không thể phục hồi dữ liệu khi xảy ra thảm họa.`;
        estHours = 60;
        targetDept=t('auditTemplates.informationTechnologyDivisionInformationSecurityDepartment', 'Khối Công nghệ thông tin, Phòng An ninh thông tin');
        iia=t('auditTemplates.iia2130ControlIia1210Professionalism', 'IIA 2130 (Kiểm soát), IIA 1210 (Tính chuyên nghiệp)');
        domain = 'IT';
      } else if (titleLower.includes(t('auditTemplates.fund', 'quỹ')) || titleLower.includes(t('auditTemplates.cash', 'tiền mặt')) || titleLower.includes('kho') || titleLower.includes(t('auditTemplates.limit', 'hạn mức')) || titleLower.includes(t('auditTemplates.counter', 'quầy')) || titleLower.includes(t('auditTemplates.transaction', 'giao dịch'))) {
        steps = [
          { task: t('auditTemplates.carryOutUnexpectedCashFundInventory', 'Thực hiện kiểm kê quỹ tiền mặt đột xuất tại chi nhánh và đối chiếu sổ quỹ') },
          { task: t('auditTemplates.checkVaultSafetyLatchesDoorOpeningclosing', 'Kiểm tra chốt an toàn kho quỹ, quy trình mở/đóng cửa và bảo mật mã két') },
          { task: t('auditTemplates.compareTransactionLimitsTellerLimitsAnd', 'Đối chiếu hạn mức giao dịch (Teller limits) và báo cáo vượt hạn mức phê duyệt') },
          { task: t('auditTemplates.checkTheSeparationOfResponsibilitiesBetween', 'Kiểm tra tính phân tách trách nhiệm giữa thủ quỹ và kiểm soát viên kế toán') }
        ];
        desc = `Mục tiêu: Kiểm tra tính an toàn của kho quỹ tiền mặt, rà soát hạn mức giao dịch tại quầy và sự tuân thủ quy trình kế toán giao dịch đối với nghiệp vụ "${title}".\n\nRủi ro chính: Thất thoát tiền mặt tại kho quỹ do chốt kiểm soát vật lý yếu, giao dịch vượt hạn mức không được phê duyệt hoặc thông đồng giữa các vai trò gây rủi ro đạo đức.`;
        estHours = 24;
        targetDept=t('auditTemplates.operationsDivisionCustomerServiceDepartment', 'Khối Vận hành, Phòng Dịch vụ khách hàng');
        iia=t('auditTemplates.iia2200AuditPlanningIia2130', 'IIA 2200 (Lập kế hoạch cuộc kiểm toán), IIA 2130 (Kiểm soát)');
        domain = 'Operations';
      } else if (titleLower.includes(t('auditTemplates.moneyLaundering', 'rửa tiền')) || titleLower.includes('aml') || titleLower.includes('cft') || titleLower.includes(t('auditTemplates.suspiciousCustomers', 'khách hàng đáng ngờ'))) {
        steps = [
          { task: t('auditTemplates.checkKyccddProcessForHighriskCustomers', 'Kiểm tra quy trình KYC / CDD đối với KH rủi ro cao và xác minh chủ sở hữu hưởng lợi') },
          { task: t('auditTemplates.checkTheParametersSetOnThe', 'Kiểm tra tham số thiết lập trên hệ thống lọc giao dịch (Transaction Monitoring)') },
          { task: t('auditTemplates.checkTheProcessOfPreparingAnd', 'Kiểm tra quy trình lập và gửi báo cáo giao dịch đáng ngờ (STR) cho Cục PCRT') },
          { task: t('auditTemplates.evaluateTheReviewOfTheBlack', 'Đánh giá việc rà soát danh sách đen (Sanction list / PEP list) hàng ngày') }
        ];
        desc = `Mục tiêu: Kiểm tra tính tuân thủ pháp luật về phòng chống rửa tiền, tài trợ khủng bố và chất lượng báo cáo nội bộ đối với nghiệp vụ "${title}".\n\nRủi ro chính: Không nhận diện đúng khách hàng đáng ngờ, bỏ lọt giao dịch rửa tiền quy mô lớn, chậm trễ báo cáo STR dẫn đến việc ngân hàng bị xử phạt hành chính nghiêm trọng.`;
        estHours = 60;
        targetDept=t('auditTemplates.antimoneyLaunderingDepartmentComplianceLegalDepartment', 'Phòng Phòng chống rửa tiền, Khối Pháp chế tuân thủ');
        iia=t('auditTemplates.iia2110RiskManagementIia2130', 'IIA 2110 (Quản trị rủi ro), IIA 2130 (Kiểm soát)');
        domain = 'AML';
      }

      form.setFieldsValue({ 
        checklist: steps,
        description: desc,
        estimatedHours: estHours,
        targetDepartments: targetDept,
        iiaStandards: iia,
        domain: domain
      });
      message.success({ content: t('auditTemplates.messages.aiSuccess', 'Đã hoàn thành gợi ý các bước kiểm tra và cấu trúc nghiệp vụ chuẩn IIA từ AI!'), key: 'ai_steps' });
    }, 1200);
  };

  const getDomainIcon = (domain: string) => {
    if (domain === 'IT') return <CodeOutlined className="text-blue-500 text-2xl" />;
    if (domain === 'AML') return <SafetyCertificateOutlined className="text-green-500 text-2xl" />;
    if (domain === 'Credit') return <BankOutlined className="text-orange-500 text-2xl" />;
    if (domain === 'Operations') return <InteractionOutlined className="text-purple-500 text-2xl" />;
    if (domain === 'RiskManagement') return <SecurityScanOutlined className="text-cyan-500 text-2xl" />;
    if (domain === 'Governance') return <CrownOutlined className="text-red-500 text-2xl" />;
    if (domain === 'Finance') return <DollarOutlined className="text-yellow-600 text-2xl" />;
    return <FormOutlined className="text-gray-500 text-2xl" />;
  };

  const getDomainColor = (domain: string) => {
    if (domain === 'IT') return 'blue';
    if (domain === 'AML') return 'green';
    if (domain === 'Credit') return 'orange';
    if (domain === 'Operations') return 'purple';
    if (domain === 'RiskManagement') return 'cyan';
    if (domain === 'Governance') return 'red';
    if (domain === 'Finance') return 'gold';
    return 'default';
  };

  // Filter logic
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchText.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(searchText.toLowerCase())) ||
                          (t.iiaStandards && t.iiaStandards.toLowerCase().includes(searchText.toLowerCase())) ||
                          (t.targetDepartments && t.targetDepartments.toLowerCase().includes(searchText.toLowerCase()));
    const matchesDomain = selectedDomain === 'All' || t.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  // Dashboard calculations
  const totalCount = templates.length;
  const totalUsage = templates.reduce((acc, t) => acc + (t.usageCount || 0), 0);
  const draftCount = templates.filter(t => t.status === 'Draft').length;
  const avgHours = totalCount > 0 
    ? Math.round(templates.reduce((acc, t) => acc + (t.estimatedHours || 40), 0) / totalCount) 
    : 0;

  // Domain Chart Data
  const domains = ['Credit', 'IT', 'AML', 'Operations', 'RiskManagement', 'Governance', 'Finance'];
  const domainCounts = domains.reduce((acc, dom) => {
    acc[dom] = templates.filter(t => t.domain === dom).length;
    return acc;
  }, {} as Record<string, number>);
  const maxDomainCount = Math.max(...Object.values(domainCounts), 1);

  // Top used templates
  const topTemplates = [...templates]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5);

  // Status breakdown
  const statusCounts = {
    Published: templates.filter(t => t.status === 'Published').length,
    Draft: templates.filter(t => t.status === 'Draft').length,
    Archived: templates.filter(t => t.status === 'Archived').length
  };

  // Table columns for admin list
  const adminColumns = [
    {
      title: 'Tên nghiệp vụ',
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      ...getColumnSearchProps<any>('title', 'Tên nghiệp vụ'),
      sorter: getColumnSorter<any>('title', 'string'),
      render: (text: string, record: any) => (
        <div>
          <Text className="font-semibold block text-slate-800">{text}</Text>
          <Text type="secondary" className="text-xs">{record.iiaStandards ? `Chuẩn IIA: ${record.iiaStandards}` : 'Không áp dụng chuẩn IIA'}</Text>
        </div>
      )
    },
    {
      title: 'Lĩnh vực',
      dataIndex: 'domain',
      key: 'domain',
      width: '12%',
      ...getColumnSelectFilterProps<any>('domain', undefined, templates),
      render: (domain: string) => (
        <Space>
          {getDomainIcon(domain)}
          <Tag color={getDomainColor(domain)} className="font-medium">{domain}</Tag>
        </Space>
      )
    },
    {
      title: 'Phòng ban áp dụng',
      dataIndex: 'targetDepartments',
      key: 'targetDepartments',
      width: '18%',
      ...getColumnSearchProps<any>('targetDepartments', 'Phòng ban áp dụng'),
      render: (dept: string) => (
        <span className="text-slate-600 text-sm">
          <EnvironmentOutlined className="mr-1 text-slate-400" />
          {dept || 'Chưa định nghĩa'}
        </span>
      )
    },
    {
      title: 'Thời lượng',
      dataIndex: 'estimatedHours',
      key: 'estimatedHours',
      width: '10%',
      align: 'center' as const,
      sorter: getColumnSorter<any>('estimatedHours', 'number'),
      render: (hours: number) => (
        <Tag color="blue" className="font-semibold">⏳ {hours || 40} giờ</Tag>
      )
    },
    {
      title: 'Lượt dùng',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: '10%',
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.usageCount || 0) - (b.usageCount || 0),
      render: (count: number) => (
        <span className="font-extrabold text-amber-600 text-base">{count || 0}</span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      align: 'center' as const,
      ...getColumnSelectFilterProps<any>('status', undefined, templates),
      render: (status: string) => {
        if (status === 'Draft') return <Tag color="gold" icon={<SyncOutlined spin />}>Bản nháp</Tag>;
        if (status === 'Archived') return <Tag color="default" icon={<CloseCircleOutlined />}>{t('auditTemplates.archived', 'Lưu trữ')}</Tag>;
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đang dùng</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: '10%',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Tooltip title="Hiệu chỉnh">
            <Button 
              type="text" 
              icon={<EditOutlined className="text-amber-500" />} 
              onClick={() => handleEdit(record)} 
            />
          </Tooltip>
          <Tooltip title="Nhân bản (Tạo nhanh mẫu tương tự)">
            <Button 
              type="text" 
              icon={<CopyOutlined className="text-blue-500" />} 
              onClick={() => handleDuplicate(record)} 
            />
          </Tooltip>
          <Tooltip title={record.status === 'Published' ? 'Lưu trữ mẫu biểu' : 'Kích hoạt mẫu biểu'}>
            <Button 
              type="text" 
              icon={record.status === 'Published' ? <CloseCircleOutlined className="text-gray-400" /> : <CheckCircleOutlined className="text-green-500" />} 
              onClick={() => handleToggleStatus(record)} 
            />
          </Tooltip>
          <Popconfirm 
            title="Bạn có chắc chắn muốn xóa mẫu nghiệp vụ này?" 
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.btnDelete', 'Xóa')}
            cancelText={t('common.btnCancel', 'Hủy')}
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa mẫu biểu">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (isEditorVisible) {
    return (
      <div style={{ background: '#fcfcfc', minHeight: '100%', padding: '4px' }}>
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <Button 
            onClick={() => {
              setIsEditorVisible(false);
              setEditingTemplate(null);
            }}
            icon={<LeftOutlined />}
            style={{ borderColor: '#ea9105', color: '#ea9105', fontWeight: 600, borderRadius: 8 }}
          >
            ← Quay lại thư viện
          </Button>
          <Title level={4} className="!mb-0" style={{ color: '#0f172a', fontWeight: 800 }}>
            {editingTemplate ? 'HIỆU CHỈNH TEMPLATE NGHIỆP VỤ' : 'THIẾT LẬP TEMPLATE NGHIỆP VỤ MỚI'}
          </Title>
          <Space>
            <Button 
              onClick={() => {
                setIsEditorVisible(false);
                setEditingTemplate(null);
              }} 
              style={{ borderRadius: 8 }}
            >
              Hủy bỏ
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
            >
              Lưu cấu hình
            </Button>
          </Space>
        </div>

        {/* 2-Column Responsive Layout */}
        <Row gutter={[24, 24]}>
          {/* Left Column: Core Fields */}
          <Col xs={24} lg={13}>
            <Card variant="borderless" className="shadow-sm rounded-xl border border-gray-100" title={<span style={{ color: '#ea9105', fontWeight: 700 }}>Thông tin cấu trúc Nghiệp vụ</span>}>
              <Form form={form} layout="vertical">
                <Form.Item name="title" label={<span className="font-semibold text-slate-700">Tên nghiệp vụ kiểm toán (Chủ đề)</span>} rules={[{ required: true, message: 'Vui lòng nhập tên nghiệp vụ' }]}>
                  <Input placeholder="Ví dụ: Kiểm toán hồ sơ giải ngân chi nhánh..." style={{ borderRadius: 8 }} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="domain" label={<span className="font-semibold text-slate-700">Phân hệ / Lĩnh vực</span>} rules={[{ required: true, message: 'Chọn phân hệ' }]}>
                      <Select style={{ borderRadius: 8 }}>
                        <Option value="Credit">🏦 Credit (Tín dụng)</Option>
                        <Option value="IT">💻 IT (Hệ thống CNTT)</Option>
                        <Option value="AML">🛡️ AML (Phòng chống rửa tiền)</Option>
                        <Option value="Operations">⚙️ Operations (Vận hành)</Option>
                        <Option value="RiskManagement">📊 Risk (Quản trị rủi ro)</Option>
                        <Option value="Governance">👑 Governance (Quản trị)</Option>
                        <Option value="Finance">💰 Finance (Tài chính)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="version" label={<span className="font-semibold text-slate-700">Phiên bản biểu mẫu</span>} rules={[{ required: true, message: 'Nhập phiên bản' }]}>
                      <Input placeholder={t('auditTemplates.forExample1011', 'Ví dụ: 1.0, 1.1')} style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="status" label={<span className="font-semibold text-slate-700">Trạng thái phát hành</span>} rules={[{ required: true, message: 'Chọn trạng thái' }]}>
                      <Select style={{ borderRadius: 8 }}>
                        <Option value="Published">Đã ban hành (Published)</Option>
                        <Option value="Draft">Bản nháp (Draft)</Option>
                        <Option value="Archived">Lưu trữ (Archived)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="estimatedHours" label={<span className="font-semibold text-slate-700">Thời lượng kiểm thực tế (Giờ)</span>} rules={[{ required: true, message: 'Nhập số giờ dự kiến' }]}>
                      <InputNumber min={4} max={400} style={{ borderRadius: 8, width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="targetDepartments" label={<span className="font-semibold text-slate-700">Phòng ban/Đơn vị áp dụng</span>}>
                      <Input placeholder={t('auditTemplates.forExampleCreditDepartmentRetailDivision', 'Ví dụ: Phòng Tín dụng, Khối Bán lẻ')} style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="iiaStandards" label={<span className="font-semibold text-slate-700">Chuẩn mực IIA liên quan</span>}>
                      <Input placeholder={t('auditTemplates.forExampleIia1210Iia2210', 'Ví dụ: IIA 1210, IIA 2210')} style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label={<span className="font-semibold text-slate-700">Mô tả nội dung nghiệp vụ (Mục tiêu & Rủi ro)</span>} rules={[{ required: true, message: 'Nhập mô tả tóm tắt' }]}>
                  <TextArea rows={6} placeholder="Mô tả tóm tắt mục tiêu chính của nghiệp vụ, các rủi ro vận hành / tuân thủ và đối tượng kiểm soát chính..." style={{ borderRadius: 8 }} />
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Right Column: Audit Procedures (Checklist Builder) & AI Suggestions */}
          <Col xs={24} lg={11}>
            <Card 
              variant="borderless" 
              className="shadow-sm rounded-xl border border-gray-100 mb-6" 
              title={<span style={{ color: '#ea9105', fontWeight: 700 }}>Chương trình các bước kiểm tra thực địa</span>}
              extra={
                <Button 
                  size="small" 
                  type="primary" 
                  icon={<RobotOutlined />} 
                  onClick={handleAISuggestSteps}
                  style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', borderRadius: 6, fontSize: '11px' }}
                >
                  AI gợi ý cấu trúc
                </Button>
              }
            >
              <Form form={form} layout="vertical">
                <Form.List name="checklist">
                  {(fields, { add, remove }) => (
                    <div className="space-y-4">
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className="flex gap-2 items-start bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mt-1">
                            {index + 1}
                          </div>
                          <Form.Item
                            {...restField}
                            name={[name, 'task']}
                            rules={[{ required: true, message: 'Nhập nội dung bước kiểm tra' }]}
                            className="mb-0 flex-grow"
                          >
                            <TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder="Nhập mô tả hành động kiểm tra..." style={{ borderRadius: 6 }} />
                          </Form.Item>
                          {fields.length > 1 && (
                            <Button 
                              type="text" 
                              danger 
                              onClick={() => remove(name)} 
                              icon={<DeleteOutlined />} 
                              className="mt-1"
                            />
                          )}
                        </div>
                      ))}
                      <Button 
                        type="dashed" 
                        onClick={() => add()} 
                        block 
                        icon={<PlusOutlined />}
                        style={{ borderRadius: 8, height: '40px' }}
                      >
                        Thêm bước kiểm thử thực địa
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      {/* Header and Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1"><FormOutlined className="mr-2 text-amber-500" />Thư viện Template Nghiệp vụ</Title>
          <Text className="text-gray-500">Các biểu mẫu, quy trình kiểm toán chuẩn hóa cho Ngân hàng (Tín dụng, AML, IT, ...)</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Tìm kiếm mẫu nghiệp vụ..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          {isLeader && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAdd}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
            >
              Tạo Template mới
            </Button>
          )}
        </Space>
      </div>

      {/* Tabs Layout */}
      {isLeader ? (
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key)} 
          type="card"
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
        >
          {/* LIBRARY TAB */}
          <Tabs.TabPane tab={<span><FileTextOutlined /> Thư viện Mẫu biểu</span>} key="library">
            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-semibold text-sm">Lọc theo Phân hệ:</span>
              <Select 
                defaultValue="All" 
                style={{ width: 180 }} 
                onChange={(value) => setSelectedDomain(value)}
              >
                <Option value="All">🌐 Tất cả phân hệ</Option>
                <Option value="Credit">🏦 Credit (Tín dụng)</Option>
                <Option value="IT">💻 IT (Hệ thống CNTT)</Option>
                <Option value="AML">🛡️ AML (Rửa tiền)</Option>
                <Option value="Operations">⚙️ Operations (Vận hành)</Option>
                <Option value="RiskManagement">📊 Risk (Quản trị rủi ro)</Option>
                <Option value="Governance">👑 Governance (Quản trị)</Option>
                <Option value="Finance">💰 Finance (Tài chính)</Option>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-10"><Spin size="large" /></div>
            ) : (
              <Row gutter={[24, 24]}>
                {filteredTemplates.map(tpl => (
                  <Col xs={24} lg={12} xl={8} key={tpl.id}>
                    <Card 
                      hoverable 
                      className="h-full flex flex-col shadow-xs hover:shadow-md transition-all duration-300 border border-slate-200/80 rounded-xl"
                      styles={{ body: {} }}
                      actions={[
                        <Button 
                          type="link" 
                          icon={<FormOutlined />} 
                          onClick={() => handleUseTemplate(tpl)}
                          className="!font-semibold !text-amber-600 hover:!text-amber-700"
                        >
                          Sử dụng Mẫu
                        </Button>,
                        <Button 
                          type="link" 
                          icon={<CopyOutlined />} 
                          onClick={() => handleDuplicate(tpl)} 
                          className="!text-blue-500 hover:!text-blue-600"
                        >
                          Nhân bản
                        </Button>,
                        <Button 
                          type="link" 
                          icon={<EditOutlined />} 
                          onClick={() => handleEdit(tpl)} 
                          className="!text-amber-500 hover:!text-amber-600"
                        >
                          Sửa
                        </Button>
                      ]}
                    >
                      <div className="flex justify-between items-start mb-3">
                        {getDomainIcon(tpl.domain)}
                        <Space>
                          <Tag color="cyan">v{tpl.version || '1.0'}</Tag>
                          <Tag color={getDomainColor(tpl.domain)}>{tpl.domain}</Tag>
                        </Space>
                      </div>

                      <Title level={5} className="!mb-2 !mt-1 line-clamp-2 text-slate-800 font-bold">{tpl.title}</Title>
                      
                      {/* Meta Pills */}
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {tpl.targetDepartments && (
                          <Tag color="default" className="text-[10px] border-none bg-slate-100 text-slate-600">
                            🏢 {tpl.targetDepartments}
                          </Tag>
                        )}
                        <Tag color="blue" className="text-[10px] border-none bg-blue-50 text-blue-600">
                          ⏳ {tpl.estimatedHours || 40}h thực địa
                        </Tag>
                        {tpl.usageCount > 0 && (
                          <Tag color="orange" className="text-[10px] border-none bg-orange-50 text-orange-600">
                            📈 Đã dùng: {tpl.usageCount} lần
                          </Tag>
                        )}
                      </div>

                      <Paragraph className="text-gray-500 text-xs flex-grow line-clamp-3 mb-3">
                        {tpl.description}
                      </Paragraph>
                      
                      <Divider className="my-2" />
                      <div className="text-xs text-gray-400 font-semibold mb-2 uppercase text-[9px] tracking-wider">Thủ tục thực hiện chính:</div>
                      <List
                        size="small"
                        dataSource={(tpl.checklist || []).slice(0, 3)} 
                        renderItem={(item: any) => (
                          <List.Item className="!py-0.5 !px-0 text-[12px] text-gray-600 border-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2 inline-block"></span>
                            <span className="truncate">{item.task}</span>
                          </List.Item>
                        )}
                      />
                      {tpl.checklist?.length > 3 && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-1">+ {tpl.checklist.length - 3} bước kiểm tra khác...</div>
                      )}
                    </Card>
                  </Col>
                ))}
                {filteredTemplates.length === 0 && (
                  <Col span={24} className="text-center py-10">
                    <Text type="secondary">Không tìm thấy mẫu nghiệp vụ nào phù hợp</Text>
                  </Col>
                )}
              </Row>
            )}
          </Tabs.TabPane>

          {/* ADMIN DASHBOARD TAB */}
          <Tabs.TabPane tab={<span><DashboardOutlined /> Dashboard Quản trị</span>} key="admin_dashboard">
            {/* KPI Metrics Widgets */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={12} md={6}>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-4 rounded-xl shadow-xs text-white relative overflow-hidden">
                  <div className="text-[11px] text-orange-100 uppercase font-bold tracking-wider mb-1">Tổng số mẫu biểu</div>
                  <div className="text-3xl font-extrabold">{totalCount}</div>
                  <div className="text-[10px] text-orange-100 mt-2">Mẫu kiểm toán nghiệp vụ</div>
                  <div className="absolute right-3 bottom-1 text-5xl opacity-15">📋</div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-xs text-white relative overflow-hidden">
                  <div className="text-[11px] text-blue-100 uppercase font-bold tracking-wider mb-1">Tổng lượt áp dụng</div>
                  <div className="text-3xl font-extrabold">{totalUsage}</div>
                  <div className="text-[10px] text-blue-100 mt-2">Lượt lập Working Papers</div>
                  <div className="absolute right-3 bottom-1 text-5xl opacity-15">📈</div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-xl shadow-xs text-white relative overflow-hidden">
                  <div className="text-[11px] text-emerald-100 uppercase font-bold tracking-wider mb-1">Số mẫu nháp (Draft)</div>
                  <div className="text-3xl font-extrabold">{draftCount}</div>
                  <div className="text-[10px] text-emerald-100 mt-2">Chờ rà soát ban hành</div>
                  <div className="absolute right-3 bottom-1 text-5xl opacity-15">⏳</div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-xl shadow-xs text-white relative overflow-hidden">
                  <div className="text-[11px] text-purple-100 uppercase font-bold tracking-wider mb-1">Thời lượng TB / Mẫu</div>
                  <div className="text-3xl font-extrabold">{avgHours}h</div>
                  <div className="text-[10px] text-purple-100 mt-2">Giờ thực địa ước lượng</div>
                  <div className="absolute right-3 bottom-1 text-5xl opacity-15">⏱️</div>
                </div>
              </Col>
            </Row>

            {/* Visual Charts Row */}
            <Row gutter={[20, 20]} className="mb-6">
              {/* Domain breakdown chart */}
              <Col xs={24} lg={12}>
                <Card variant="borderless" className="shadow-xs border border-slate-100 rounded-xl h-full" title={<span className="font-bold text-slate-800">Phân bố Mẫu biểu theo Phân hệ</span>}>
                  <div className="space-y-4 py-2">
                    {domains.map(dom => {
                      const count = domainCounts[dom] || 0;
                      const pct = Math.round((count / maxDomainCount) * 100);
                      return (
                        <div key={dom} className="flex items-center">
                          <div className="w-28 truncate text-slate-600 text-xs font-semibold">{dom}</div>
                          <div className="flex-grow bg-slate-100 h-2.5 rounded-full overflow-hidden mx-3">
                            <div 
                              className={`h-full rounded-full transition-all duration-500`}
                              style={{ 
                                width: `${pct}%`,
                                backgroundColor: dom === 'Credit' ? '#f97316' : dom === 'IT' ? '#3b82f6' : dom === 'AML' ? '#10b981' : dom === 'Operations' ? '#a855f7' : dom === 'RiskManagement' ? '#06b6d4' : dom === 'Governance' ? '#ef4444' : '#eab308'
                              }}
                            />
                          </div>
                          <div className="w-8 text-right font-extrabold text-slate-800 text-xs">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Col>

              {/* Top used & Status breakdowns */}
              <Col xs={24} lg={12}>
                <Card variant="borderless" className="shadow-xs border border-slate-100 rounded-xl mb-4" title={<span className="font-bold text-slate-800">Top 5 Mẫu biểu sử dụng nhiều nhất</span>}>
                  <List
                    size="small"
                    dataSource={topTemplates}
                    renderItem={(tpl, idx) => (
                      <List.Item className="!py-2 border-slate-100">
                        <div className="flex items-center w-full">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${idx === 0 ? 'bg-orange-500 text-white' : idx === 1 ? 'bg-amber-500 text-white' : idx === 2 ? 'bg-yellow-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-grow truncate text-xs text-slate-700 font-medium">{tpl.title}</div>
                          <div className="text-amber-600 font-extrabold text-xs ml-2">{tpl.usageCount || 0} lượt</div>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>

                <Card variant="borderless" className="shadow-xs border border-slate-100 rounded-xl" title={<span className="font-bold text-slate-800">Tỷ lệ Trạng thái Mẫu biểu</span>}>
                  <div className="flex justify-between items-center py-2 px-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full border-4 border-green-500 flex items-center justify-center font-bold text-green-600 text-sm mx-auto mb-1">
                        {statusCounts.Published}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Đang áp dụng</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full border-4 border-amber-400 flex items-center justify-center font-bold text-amber-600 text-sm mx-auto mb-1">
                        {statusCounts.Draft}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Bản nháp</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full border-4 border-slate-300 flex items-center justify-center font-bold text-slate-500 text-sm mx-auto mb-1">
                        {statusCounts.Archived}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">{t('auditTemplates.archived', 'Lưu trữ')}</div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Admin Table for Template Management */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm">Danh sách Quản trị Mẫu biểu Nghiệp vụ</span>
                <span className="text-slate-400 text-xs font-semibold">Tạo mới, Sửa đổi, Lưu trữ hoặc Nhân bản nhanh mẫu biểu</span>
              </div>
              <Table 
                dataSource={filteredTemplates} 
                columns={adminColumns} 
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 8 }}
                size="middle"
              />
            </div>
          </Tabs.TabPane>
        </Tabs>
      ) : (
        /* Regular auditor view: Only shows library list without tabs */
        <div>
          <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <span className="text-slate-500 font-semibold text-sm">Lọc theo Phân hệ:</span>
            <Select 
              defaultValue="All" 
              style={{ width: 180 }} 
              onChange={(value) => setSelectedDomain(value)}
            >
              <Option value="All">🌐 Tất cả phân hệ</Option>
              <Option value="Credit">🏦 Credit (Tín dụng)</Option>
              <Option value="IT">💻 IT (Hệ thống CNTT)</Option>
              <Option value="AML">🛡️ AML (Rửa tiền)</Option>
              <Option value="Operations">⚙️ Operations (Vận hành)</Option>
              <Option value="RiskManagement">📊 Risk (Quản trị rủi ro)</Option>
              <Option value="Governance">👑 Governance (Quản trị)</Option>
              <Option value="Finance">💰 Finance (Tài chính)</Option>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-10"><Spin size="large" /></div>
          ) : (
            <Row gutter={[24, 24]}>
              {filteredTemplates.map(tpl => (
                <Col xs={24} lg={12} xl={8} key={tpl.id}>
                  <Card 
                    hoverable 
                    className="h-full flex flex-col shadow-xs hover:shadow-md transition-all duration-300 border border-slate-200/80 rounded-xl"
                    styles={{ body: {} }}
                    actions={[
                      <Button 
                        type="link" 
                        icon={<FormOutlined />} 
                        onClick={() => handleUseTemplate(tpl)}
                        className="!font-semibold !text-amber-600 hover:!text-amber-700"
                      >
                        Sử dụng Mẫu biểu
                      </Button>,
                      <Button 
                        type="link" 
                        icon={<DownloadOutlined />}
                        className="!text-slate-500 hover:!text-slate-600"
                      >
                        Tải PDF / Excel
                      </Button>
                    ]}
                  >
                    <div className="flex justify-between items-start mb-3">
                      {getDomainIcon(tpl.domain)}
                      <Space>
                        <Tag color="cyan">v{tpl.version || '1.0'}</Tag>
                        <Tag color={getDomainColor(tpl.domain)}>{tpl.domain}</Tag>
                      </Space>
                    </div>

                    <Title level={5} className="!mb-2 !mt-1 line-clamp-2 text-slate-800 font-bold">{tpl.title}</Title>
                    
                    {/* Meta Pills */}
                    <div className="flex flex-wrap gap-1.5 my-2">
                      {tpl.targetDepartments && (
                        <Tag color="default" className="text-[10px] border-none bg-slate-100 text-slate-600">
                          🏢 {tpl.targetDepartments}
                        </Tag>
                      )}
                      <Tag color="blue" className="text-[10px] border-none bg-blue-50 text-blue-600">
                        ⏳ {tpl.estimatedHours || 40}h thực địa
                      </Tag>
                      {tpl.iiaStandards && (
                        <Tag color="purple" className="text-[10px] border-none bg-purple-50 text-purple-600">
                          📋 {tpl.iiaStandards}
                        </Tag>
                      )}
                    </div>

                    <Paragraph className="text-gray-500 text-xs flex-grow line-clamp-3 mb-3">
                      {tpl.description}
                    </Paragraph>
                    
                    <Divider className="my-2" />
                    <div className="text-xs text-gray-400 font-semibold mb-2 uppercase text-[9px] tracking-wider">Thủ tục thực hiện chính:</div>
                    <List
                      size="small"
                      dataSource={(tpl.checklist || []).slice(0, 3)} 
                      renderItem={(item: any) => (
                        <List.Item className="!py-0.5 !px-0 text-[12px] text-gray-600 border-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2 inline-block"></span>
                          <span className="truncate">{item.task}</span>
                        </List.Item>
                      )}
                    />
                    {tpl.checklist?.length > 3 && (
                      <div className="text-[10px] text-amber-600 font-semibold mt-1">+ {tpl.checklist.length - 3} bước khác...</div>
                    )}
                  </Card>
                </Col>
              ))}
              {filteredTemplates.length === 0 && (
                <Col span={24} className="text-center py-10">
                  <Text type="secondary">Không tìm thấy mẫu nghiệp vụ nào phù hợp</Text>
                </Col>
              )}
            </Row>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditTemplates;
