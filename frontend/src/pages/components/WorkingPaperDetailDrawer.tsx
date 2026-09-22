import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Tabs, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Alert, 
  Form, 
  Input, 
  Select, 
  Table, 
  Timeline, 
  Modal, 
  message, 
  Progress, 
  Divider, 
  Row, 
  Col,
  Card,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  EditOutlined, 
  SendOutlined, 
  SafetyOutlined, 
  FileTextOutlined, 
  CloudUploadOutlined, 
  DownloadOutlined, 
  UndoOutlined, 
  ExclamationCircleOutlined, 
  BugOutlined,
  SaveOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  BankOutlined,
  CalendarOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  AuditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { AttachmentManager } from '../../components/AttachmentManager';
import { CreditWorkingPaperGrid } from './CreditWorkingPaperGrid';
import { PTDRemediationGrid } from './PTDRemediationGrid';
import DetailedSamplingGrid from '../DetailedSamplingGrid';
import { WORKING_PAPER_TEMPLATES } from '../WorkingPapersTemplates';
import { hasPermission } from '../../utils/permission';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface WorkingPaperDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  workingPaper: any;
  selectedEngagement?: any;
  currentUser: any;
  onSaved: () => void;
  workstreams?: any[];
  auditPlans?: any[];
}

export const WorkingPaperDetailDrawer: React.FC<WorkingPaperDetailDrawerProps> = ({
  visible,
  onClose,
  workingPaper,
  selectedEngagement,
  currentUser,
  onSaved,
  workstreams = [],
  auditPlans = [],
}) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [reworkForm] = Form.useForm();

  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [reworkModalVisible, setReworkModalVisible] = useState(false);
  const [reworkLoading, setReworkLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [controlAssessments, setControlAssessments] = useState<any[]>([]);
  const [localWorkstreams, setLocalWorkstreams] = useState<any[]>(workstreams || []);

  // Effective engagement determination
  const effectiveEngagement = selectedEngagement || 
    (workingPaper?.engagementId ? auditPlans.find(p => p.id === workingPaper.engagementId) : null) ||
    (workingPaper?.planName ? auditPlans.find(p => p.name === workingPaper.planName) : null);

  // User roles & Permissions (VSA 220 / IIA GIAS Four-Eyes Principle)
  const userRole = ((typeof currentUser?.role === 'object' ? currentUser?.role?.name : currentUser?.role) || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || currentUser?.username === 'admin';
  const isLead = isAdmin || 
    effectiveEngagement?.leadAuditorId === currentUser?.id || 
    workingPaper?.reviewerId === currentUser?.id ||
    userRole.includes('trưởng đoàn') || 
    userRole.includes('trưởng ban') ||
    userRole.includes('supervisor');

  const creatorId = workingPaper?.creatorUserId || workingPaper?.creatorId;
  const isSelfCreated = Boolean(creatorId && currentUser?.id && creatorId === currentUser?.id);
  const isCreator = isSelfCreated || 
    workingPaper?.workstream?.assignedAuditorId === currentUser?.id ||
    (!workingPaper?.id);

  const canEdit = isCreator && (workingPaper?.status === 'Draft' || workingPaper?.status === 'Rework' || !workingPaper?.id);
  const canSubmit = isCreator && (workingPaper?.status === 'Draft' || workingPaper?.status === 'Rework') && Boolean(workingPaper?.id);
  
  // Four-Eyes Principle (VSA 220 / ISA 220): Creator CANNOT approve their own working paper!
  const canReview = isLead && workingPaper?.status === 'Submitted' && !isSelfCreated;

  const fetchWorkstreamsForEngagement = async (engId: number) => {
    if (!engId) {
      setLocalWorkstreams([]);
      return;
    }
    try {
      const res = await api.get(`/audit-engagements/${engId}/workstreams`);
      setLocalWorkstreams(res.data || []);
    } catch {
      setLocalWorkstreams([]);
    }
  };

  const workstreamsLength = workstreams?.length || 0;
  useEffect(() => {
    if (workstreams && workstreams.length > 0) {
      setLocalWorkstreams(workstreams);
    }
  }, [workstreamsLength]);

  useEffect(() => {
    if (!visible) return;

    if (workingPaper) {
      form.setFieldsValue({
        referenceCode: workingPaper.referenceCode || `WP-${Date.now().toString().slice(-6)}`,
        title: workingPaper.title,
        engagementId: workingPaper.engagementId || selectedEngagement?.id,
        workstreamId: workingPaper.workstreamId,
        domain: workingPaper.domain || 'credit',
        objectives: workingPaper.objectives || workingPaper.workstream?.scope || effectiveEngagement?.objective || '',
        riskDescription: workingPaper.riskDescription || workingPaper.workstream?.riskArea || '',
        methodology: workingPaper.methodology || '',
        procedures: workingPaper.procedures || '',
        sampleSelection: workingPaper.sampleSelection || '',
        conclusion: workingPaper.conclusion || '',
      });
      setAttachments(workingPaper.attachments || []);
      setControlAssessments(workingPaper.controlAssessments || []);

      const engId = workingPaper.engagementId || selectedEngagement?.id;
      if (engId && (!workstreams || workstreams.length === 0)) {
        fetchWorkstreamsForEngagement(engId);
      }
    } else {
      form.resetFields();
      const defaultEngId = selectedEngagement?.id || (auditPlans && auditPlans.length > 0 ? auditPlans[0].id : undefined);
      form.setFieldsValue({
        referenceCode: `WP-${Date.now().toString().slice(-6)}`,
        domain: 'credit',
        engagementId: defaultEngId,
        objectives: selectedEngagement?.objective || '',
        riskDescription: '',
      });
      setAttachments([]);
      setControlAssessments([]);

      if (defaultEngId && (!workstreams || workstreams.length === 0)) {
        fetchWorkstreamsForEngagement(defaultEngId);
      }
    }
  }, [visible, workingPaper?.id, selectedEngagement?.id]);

  // Apply predefined audit thematic templates (IIA Standard 2240)
  const handleApplyTemplate = (templateKey: string) => {
    const tpl = WORKING_PAPER_TEMPLATES[templateKey];
    if (!tpl) return;

    form.setFieldsValue({
      title: form.getFieldValue('title') || tpl.title,
      domain: templateKey === 'credit' ? 'credit' : templateKey === 'op' ? 'ptd' : 'general',
      objectives: tpl.objectives,
      riskDescription: tpl.riskDescription,
      methodology: tpl.methodology,
      sampleSelection: tpl.sampleSelection,
      procedures: tpl.procedures,
      conclusion: tpl.conclusion,
      referenceCode: `WP-${tpl.domainPrefix || 'GEN'}-${Date.now().toString().slice(-6)}`,
    });

    if (templateKey === 'credit') {
      setControlAssessments([
        { controlId: 'CTRL-CRED-01', controlDescription: 'Kiểm tra hồ sơ pháp lý và điều kiện cấp tín dụng của khách hàng', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
        { controlId: 'CTRL-CRED-02', controlDescription: 'Kiểm tra phê duyệt tín dụng đúng thẩm quyền quy định', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
        { controlId: 'CTRL-CRED-03', controlDescription: 'Kiểm tra đăng ký giao dịch bảo đảm đối với tài sản thế chấp', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
      ]);
    } else if (templateKey === 'op') {
      setControlAssessments([
        { controlId: 'CTRL-CASH-01', controlDescription: 'Thủ tục kiểm kê tồn quỹ tiền mặt cuối ngày chéo giữa thủ quỹ và kiểm soát viên', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
        { controlId: 'CTRL-CASH-02', controlDescription: 'Chốt kiểm soát hạn mức tồn quỹ tiền mặt tối đa tại chi nhánh', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
      ]);
    } else if (templateKey === 'it') {
      setControlAssessments([
        { controlId: 'CTRL-IT-01', controlDescription: 'Quản trị tài khoản đặc quyền Superuser và phê duyệt truy cập Core Banking', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
        { controlId: 'CTRL-IT-02', controlDescription: 'Ghi nhật ký và rà soát định kỳ Audit Log trên hệ thống Core', designEffectiveness: 'Đạt', operatingEffectiveness: 'Đạt', testConclusion: 'Vận hành tốt' },
      ]);
    }
    message.success(`Đã nạp thành công Mẫu nghiệp vụ: ${tpl.title}`);
  };

  const handleAddControl = () => {
    const newCtrl = {
      controlId: `CTRL-${Date.now().toString().slice(-4)}`,
      controlDescription: '',
      designEffectiveness: 'Đạt',
      operatingEffectiveness: 'Đạt',
      testConclusion: 'Vận hành tốt'
    };
    setControlAssessments(prev => [...prev, newCtrl]);
  };

  const handleUpdateControl = (index: number, field: string, value: string) => {
    setControlAssessments(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const handleRemoveControl = (index: number) => {
    setControlAssessments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const currentEngId = values.engagementId || selectedEngagement?.id;
      const matchedPlan = auditPlans.find(p => p.id === currentEngId) || selectedEngagement;

      const payload = {
        ...values,
        engagementId: currentEngId,
        planName: matchedPlan?.name || matchedPlan?.title || workingPaper?.planName || 'Cuộc kiểm toán',
        attachments,
        controlAssessments,
        creatorId: workingPaper?.creatorId || currentUser?.id,
        creator: workingPaper?.creator || currentUser?.fullName || currentUser?.username || 'KTV Kiểm toán',
        type: 'WP',
      };

      if (workingPaper?.id) {
        await api.patch(`/working-papers/${workingPaper.id}`, payload);
        message.success('Đã lưu nội dung Giấy tờ làm việc thành công');
      } else {
        await api.post('/working-papers', payload);
        message.success('Đã tạo mới Giấy tờ làm việc thành công');
      }
      onSaved();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi lưu dữ liệu WP');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!workingPaper?.id) {
      message.warning('Vui lòng bấm "Lưu nháp" để tạo hồ sơ trước khi nộp duyệt');
      return;
    }

    // Completion Gate Check (VSA 230 / VSA 530 / IIA Standard 2340)
    const stats = workingPaper.sampleStats;
    if (stats && stats.total > 0 && stats.untested > 0) {
      Modal.confirm({
        title: 'Chưa hoàn thành 100% mẫu kiểm tra (Completion Gate)',
        icon: <ExclamationCircleOutlined className="text-amber-500" />,
        content: `Còn ${stats.untested}/${stats.total} mẫu chưa được đánh giá kết quả kiểm thử. Chuẩn mực IIA 2340 yêu cầu kiểm toán viên hoàn tất kiểm thử toàn bộ mẫu chọn trước khi gửi soát xét.`,
        okText: 'Đã hiểu',
        cancelButtonProps: { style: { display: 'none' } }
      });
      return;
    }

    Modal.confirm({
      title: 'Nộp Giấy tờ làm việc cho Trưởng đoàn soát xét?',
      icon: <SendOutlined className="text-blue-500" />,
      content: 'Sau khi nộp, hồ sơ sẽ chuyển sang trạng thái "Chờ duyệt" và tạm thời khóa chỉnh sửa cho đến khi có ý kiến phản hồi của Trưởng đoàn theo nguyên tắc 4 mắt (Four-Eyes Principle).',
      okText: 'Xác nhận nộp',
      cancelText: 'Hủy',
      onOk: async () => {
        setSubmitLoading(true);
        try {
          const values = form.getFieldsValue();
          await api.patch(`/working-papers/${workingPaper.id}`, { ...values, attachments, controlAssessments });
          await api.post(`/working-papers/${workingPaper.id}/submit`);
          message.success('Đã nộp Giấy tờ làm việc cho Trưởng đoàn soát xét thành công!');
          onSaved();
          onClose();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Lỗi khi nộp duyệt');
        } finally {
          setSubmitLoading(false);
        }
      }
    });
  };

  const handleApprove = async () => {
    if (!workingPaper?.id) return;

    if (isSelfCreated) {
      message.error('Nguyên tắc 4 mắt (VSA 220): Người lập không được tự phê duyệt Giấy tờ làm việc của chính mình!');
      return;
    }

    Modal.confirm({
      title: 'Phê duyệt Giấy tờ làm việc này?',
      icon: <CheckCircleOutlined className="text-emerald-500" />,
      content: 'Giấy tờ làm việc sẽ được chính thức công nhận, khóa vĩnh viễn và tự động kết chuyển các phát hiện/sai sót vào Biên bản kiểm toán thực địa (MB04).',
      okText: 'Phê duyệt chính thức',
      cancelText: 'Xem lại',
      okButtonProps: { className: 'bg-emerald-600 hover:bg-emerald-700 font-semibold' },
      onOk: async () => {
        setApproveLoading(true);
        try {
          await api.post(`/working-papers/${workingPaper.id}/approve`, {
            notes: 'Đã phê duyệt đạt chuẩn kiểm toán IIA & VSA 230',
          });
          message.success('Phê duyệt Giấy tờ làm việc thành công!');
          onSaved();
          onClose();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Lỗi khi phê duyệt');
        } finally {
          setApproveLoading(false);
        }
      }
    });
  };

  const handleOpenReworkModal = () => {
    reworkForm.resetFields();
    setReworkModalVisible(true);
  };

  const handleConfirmRework = async () => {
    try {
      const { notes } = await reworkForm.validateFields();
      setReworkLoading(true);
      await api.post(`/working-papers/${workingPaper.id}/rework`, { notes });
      message.success('Đã gửi yêu cầu chỉnh sửa và trả lại hồ sơ cho KTV!');
      setReworkModalVisible(false);
      onSaved();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi yêu cầu sửa đổi');
    } finally {
      setReworkLoading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('linkedResource', 'working_paper');
    formData.append('linkedResourceId', workingPaper?.id ? String(workingPaper.id) : '0');
    formData.append('description', 'Bằng chứng kiểm toán đính kèm W/P (VSA 500)');

    try {
      message.loading({ content: 'Đang tải file lên...', key: 'wp_upload' });
      const res = await api.post('/evidences/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newAtt = {
        name: file.name,
        fileUrl: `/api/evidences/${res.data.id}/download`,
        uploadedBy: currentUser?.fullName || currentUser?.username || 'KTV',
        uploadedAt: new Date().toISOString()
      };
      setAttachments(prev => [...prev, newAtt]);
      message.success({ content: 'Tải tài liệu đính kèm thành công!', key: 'wp_upload' });
    } catch {
      message.error({ content: 'Lỗi khi tải file', key: 'wp_upload' });
    }
  };

  const handleCreateFinding = () => {
    navigate('/audit-findings', {
      state: {
        autoCreate: true,
        engagementId: effectiveEngagement?.id || form.getFieldValue('engagementId'),
        workstreamId: workingPaper?.workstreamId || form.getFieldValue('workstreamId'),
        condition: workingPaper?.conclusion || form.getFieldValue('conclusion') || '',
        title: `Phát hiện kiểm toán từ WP: ${workingPaper?.title || form.getFieldValue('title')}`
      }
    });
  };

  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Tag color="success" className="font-bold px-3 py-1 text-sm rounded-lg">✓ Đã phê duyệt</Tag>;
      case 'Submitted':
      case 'PendingReview':
        return <Tag color="warning" className="font-bold px-3 py-1 text-sm rounded-lg">⏳ Chờ Trưởng đoàn duyệt</Tag>;
      case 'Rework':
      case 'Rejected':
        return <Tag color="error" className="font-bold px-3 py-1 text-sm rounded-lg">↩ Yêu cầu chỉnh sửa</Tag>;
      default:
        return <Tag color="default" className="font-bold px-3 py-1 text-sm rounded-lg">📝 Bản nháp</Tag>;
    }
  };

  const stats = workingPaper?.sampleStats;
  const currentDomain = form.getFieldValue('domain') || workingPaper?.domain || 'credit';

  return (
    <Drawer
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📑</span>
            <div>
              <div className="flex items-center gap-2">
                <Title level={4} className="!mb-0 text-slate-800">
                  {workingPaper?.title || 'Tạo mới Giấy tờ làm việc (Working Paper)'}
                </Title>
                <Tag color="blue" className="font-mono text-xs font-semibold">
                  {workingPaper?.referenceCode || form.getFieldValue('referenceCode') || 'WP-NEW'}
                </Tag>
              </div>
              <Text type="secondary" className="text-xs">
                Chuẩn mực VSA 230 / IIA GIAS 2024 - Hồ sơ kiểm toán & Quản trị bằng chứng
              </Text>
            </div>
          </div>
          <div>{renderStatusTag(workingPaper?.status || 'Draft')}</div>
        </div>
      }
      placement="right"
      width="92%"
      onClose={onClose}
      open={visible}
      destroyOnClose
      styles={{ body: { paddingBottom: 80, backgroundColor: '#f8fafc' } }}
      extra={
        <Space wrap>
          {canEdit && (
            <Button 
              type="default" 
              icon={<SaveOutlined />} 
              onClick={handleSaveDraft} 
              loading={saving}
              className="rounded-xl font-semibold border-slate-300 hover:border-blue-500"
            >
              Lưu nháp
            </Button>
          )}
          {canSubmit && (
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSubmitForReview} 
              loading={submitLoading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm"
            >
              Nộp Trưởng đoàn duyệt
            </Button>
          )}
          {canReview && (
            <>
              <Button 
                danger 
                icon={<UndoOutlined />} 
                onClick={handleOpenReworkModal}
                className="rounded-xl font-semibold"
              >
                Yêu cầu chỉnh sửa
              </Button>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handleApprove} 
                loading={approveLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm"
              >
                Phê duyệt W/P
              </Button>
            </>
          )}
          {isSelfCreated && workingPaper?.status === 'Submitted' && (
            <Tag color="orange" className="font-medium p-1.5 rounded-lg">
              🛡️ Đang chờ Trưởng đoàn soát xét (Nguyên tắc 4 mắt)
            </Tag>
          )}
        </Space>
      }
    >
      {/* 1. Header Kế thừa Ngữ cảnh (Context Inheritance Bar) */}
      <Card variant="borderless" className="shadow-sm rounded-2xl mb-4 bg-white border border-slate-200">
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={6}>
            <div className="flex items-center gap-2">
              <BankOutlined className="text-blue-600 text-lg" />
              <div>
                <Text type="secondary" className="text-xs uppercase block font-medium">Cuộc kiểm toán</Text>
                <Text strong className="text-sm text-slate-800">
                  {effectiveEngagement?.name || effectiveEngagement?.title || workingPaper?.planName || 'Chưa liên kết'}
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <div>
                <Text type="secondary" className="text-xs uppercase block font-medium">Đơn vị / Chi nhánh</Text>
                <Text strong className="text-sm text-slate-800">
                  {effectiveEngagement?.branchName || effectiveEngagement?.legacyAuditedDepartment || 'Hội sở'}
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <div className="flex items-center gap-2">
              <UserOutlined className="text-emerald-600 text-lg" />
              <div>
                <Text type="secondary" className="text-xs uppercase block font-medium">KTV Phụ trách</Text>
                <Text strong className="text-sm text-slate-800">
                  {workingPaper?.creatorUser?.fullName || workingPaper?.creator || currentUser?.fullName || 'Kiểm toán viên'}
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <div className="flex items-center gap-2">
              <SafetyOutlined className="text-purple-600 text-lg" />
              <div>
                <Text type="secondary" className="text-xs uppercase block font-medium">Trưởng đoàn Duyệt</Text>
                <Text strong className="text-sm text-slate-800">
                  {workingPaper?.reviewerUser?.fullName || effectiveEngagement?.leadAuditorUser?.fullName || 'Trưởng đoàn kiểm toán'}
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 2. Rework Banner Alert (khi bị Trưởng đoàn trả lại yêu cầu sửa) */}
      {(workingPaper?.status === 'Rework' || workingPaper?.status === 'Rejected') && (
        <Alert
          type="error"
          showIcon
          icon={<UndoOutlined className="text-xl" />}
          className="rounded-2xl mb-4 border border-rose-300 bg-rose-50 shadow-sm p-4"
          message={
            <div className="flex justify-between items-center">
              <span className="font-bold text-rose-800 text-base">⚠️ Trưởng đoàn yêu cầu chỉnh sửa lại Giấy tờ làm việc</span>
              {workingPaper.reviewedAt && (
                <Text type="secondary" className="text-xs">
                  {dayjs(workingPaper.reviewedAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              )}
            </div>
          }
          description={
            <div className="mt-2 text-rose-900 bg-white/80 p-3 rounded-xl border border-rose-200">
              <span className="font-semibold block mb-1">Ý kiến chỉ đạo & Nội dung cần khắc phục:</span>
              <p className="mb-0 whitespace-pre-wrap">{workingPaper.reviewNotes || 'Vui lòng bổ sung bằng chứng và kiểm tra lại 100% mẫu kiểm thử.'}</p>
            </div>
          }
        />
      )}

      {/* 3. Tiến độ hoàn thành mẫu kiểm tra (Completion Gate Bar) */}
      {stats && stats.total > 0 && (
        <Card variant="borderless" className="shadow-sm rounded-2xl mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              📊 Tiến độ kiểm thử mẫu chọn (Completion Gate - IIA 2340):
            </span>
            <Tag color={stats.untested === 0 ? 'success' : 'processing'} className="font-bold">
              {stats.tested}/{stats.total} mẫu đã đánh giá ({stats.completionRate}%)
            </Tag>
          </div>
          <Progress 
            percent={stats.completionRate} 
            status={stats.untested === 0 ? 'success' : 'active'}
            strokeColor={{ '0%': '#108ee9', '100%': '#10b981' }}
            strokeWidth={9}
            className="mb-1"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Đạt: <strong className="text-emerald-600">{stats.passed}</strong> | Có lỗi/Ngoại lệ: <strong className="text-rose-600">{stats.failed}</strong></span>
            <span>Chưa kiểm tra: <strong className="text-amber-600 font-semibold">{stats.untested}</strong> mẫu {stats.untested > 0 ? '(Chặn nộp duyệt)' : '(Đủ điều kiện nộp duyệt)'}</span>
          </div>
        </Card>
      )}

      {/* 4. Form 5 Tab Chuẩn mực Quốc tế & Việt Nam */}
      <Form form={form} layout="vertical" disabled={!canEdit}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200"
          items={[
            // Tab 1: Tổng quan & Định danh
            {
              key: 'overview',
              label: <span className="font-semibold">🏢 1. Tổng quan & Định danh</span>,
              children: (
                <div className="space-y-4 pt-2">
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item 
                        name="engagementId" 
                        label={<span className="font-semibold text-slate-700">Cuộc kiểm toán (Engagement)</span>}
                        rules={[{ required: true, message: 'Vui lòng chọn cuộc kiểm toán' }]}
                      >
                        {selectedEngagement ? (
                          <Input disabled value={selectedEngagement.name} className="h-10 rounded-xl" />
                        ) : (
                          <Select 
                            placeholder="Chọn cuộc kiểm toán..." 
                            className="h-10 rounded-xl"
                            showSearch
                            optionFilterProp="children"
                            onChange={(engId) => fetchWorkstreamsForEngagement(engId)}
                          >
                            {auditPlans.map(p => (
                              <Option key={p.id} value={p.id}>{p.name || p.title}</Option>
                            ))}
                          </Select>
                        )}
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item 
                        name="workstreamId" 
                        label={<span className="font-semibold text-slate-700">Phần hành liên kết trong ĐKT</span>}
                      >
                        <Select 
                          placeholder="Chọn phần hành kiểm toán..." 
                          className="h-10 rounded-xl"
                          allowClear
                          onChange={(wsId) => {
                            const ws = localWorkstreams.find(w => w.id === wsId);
                            if (ws) {
                              if (ws.scope && !form.getFieldValue('objectives')) form.setFieldValue('objectives', ws.scope);
                              if (ws.riskArea && !form.getFieldValue('riskDescription')) form.setFieldValue('riskDescription', ws.riskArea);
                            }
                          }}
                        >
                          {localWorkstreams.map(ws => (
                            <Option key={ws.id} value={ws.id}>
                              {ws.title} {ws.assignedAuditorName ? `(${ws.assignedAuditorName})` : ''}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item 
                        name="referenceCode" 
                        label={<span className="font-semibold text-slate-700">Mã Giấy tờ làm việc (WP Reference Code)</span>}
                        rules={[{ required: true, message: 'Bắt buộc nhập mã WP' }]}
                      >
                        <Input placeholder="Ví dụ: WP-CREDIT-001" className="h-10 rounded-xl font-mono font-medium" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item 
                        name="domain" 
                        label={<span className="font-semibold text-slate-700">Phân hệ & Loại Ma trận Kiểm thử</span>}
                        rules={[{ required: true }]}
                      >
                        <Select className="h-10 rounded-xl">
                          <Option value="credit">💳 Tín dụng (Ma trận 40 Cột Thực tế)</Option>
                          <Option value="ptd">📑 Phi tín dụng / Theo dõi Khắc phục (20 Cột)</Option>
                          <Option value="general">📋 Mẫu kiểm tra chung / Kiểm toán hệ thống</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item 
                    name="title" 
                    label={<span className="font-semibold text-slate-700">Tiêu đề Giấy tờ làm việc (W/P Title)</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập tiêu đề Giấy tờ làm việc' }]}
                  >
                    <Input placeholder="Ví dụ: Kiểm tra quy trình thẩm định cấp tín dụng khách hàng doanh nghiệp..." className="h-10 rounded-xl font-medium" />
                  </Form.Item>

                  {/* Predefined Template Quick Loader */}
                  {canEdit && (
                    <Card size="small" className="bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <ThunderboltOutlined className="text-amber-500 text-lg" />
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">Thư viện Nghiệp vụ Mẫu chuẩn (Auditboy & IIA Standard):</span>
                            <Text type="secondary" className="text-xs block">Tự động điền mục tiêu, rủi ro, phương pháp kiểm tra và danh mục chốt kiểm soát chuẩn ngân hàng</Text>
                          </div>
                        </div>
                        <Space wrap>
                          <Button size="small" onClick={() => handleApplyTemplate('credit')} className="rounded-lg font-medium text-blue-600 border-blue-300 hover:bg-blue-50">
                            💳 Nghiệp vụ Tín dụng & TSBĐ
                          </Button>
                          <Button size="small" onClick={() => handleApplyTemplate('op')} className="rounded-lg font-medium text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                            🏢 Quản lý Quỹ & Tiền mặt
                          </Button>
                          <Button size="small" onClick={() => handleApplyTemplate('it')} className="rounded-lg font-medium text-purple-600 border-purple-300 hover:bg-purple-50">
                            💻 Core Banking & An toàn CNTT
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  )}
                </div>
              )
            },

            // Tab 2: Rủi ro & Chốt kiểm soát
            {
              key: 'risks_controls',
              label: <span className="font-semibold">🛡️ 2. Rủi ro & Chốt kiểm soát ({controlAssessments.length})</span>,
              children: (
                <div className="space-y-4 pt-2">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item 
                        name="objectives" 
                        label={<span className="font-bold text-slate-700 text-xs uppercase">Mục tiêu kiểm toán (Audit Objectives - IIA 2200)</span>}
                      >
                        <TextArea rows={4} placeholder="Mục tiêu đánh giá tính tuân thủ quy chế, quản trị rủi ro và hiệu lực chốt kiểm soát..." className="rounded-xl text-sm" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item 
                        name="riskDescription" 
                        label={<span className="font-bold text-slate-700 text-xs uppercase">Bối cảnh & Mô tả rủi ro (Risk Context)</span>}
                      >
                        <TextArea rows={4} placeholder="Rủi ro thất thoát vốn, sai lệch số liệu tài chính, vi phạm quy định pháp luật/NHNN..." className="rounded-xl text-sm" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider className="my-2" />

                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <Title level={5} className="!mb-0 text-slate-800">
                        Bảng Đánh giá Hiệu lực Chốt kiểm soát Nội bộ (TOD & TOE)
                      </Title>
                      <Text type="secondary" className="text-xs">
                        Đánh giá Thiết kế kiểm soát (Test of Design - TOD) và Vận hành thực tế (Test of Operating Effectiveness - TOE)
                      </Text>
                    </div>
                    {canEdit && (
                      <Button 
                        type="primary" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        onClick={handleAddControl}
                        className="bg-emerald-600 hover:bg-emerald-700 font-semibold rounded-lg"
                      >
                        Thêm chốt kiểm soát
                      </Button>
                    )}
                  </div>

                  <Table 
                    size="small"
                    dataSource={controlAssessments}
                    rowKey={(r, idx) => r.controlId + idx}
                    pagination={false}
                    scroll={{ x: 900 }}
                    columns={[
                      {
                        title: 'Mã chốt kiểm soát',
                        dataIndex: 'controlId',
                        width: 140,
                        render: (val, _, idx) => (
                          <Input 
                            value={val} 
                            disabled={!canEdit}
                            onChange={(e) => handleUpdateControl(idx, 'controlId', e.target.value)}
                            size="small" 
                            className="font-mono text-xs rounded-md font-semibold"
                          />
                        )
                      },
                      {
                        title: 'Mô tả chốt kiểm soát',
                        dataIndex: 'controlDescription',
                        width: 320,
                        render: (val, _, idx) => (
                          <Input.TextArea 
                            value={val} 
                            disabled={!canEdit}
                            onChange={(e) => handleUpdateControl(idx, 'controlDescription', e.target.value)}
                            size="small" 
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            className="text-xs rounded-md"
                          />
                        )
                      },
                      {
                        title: 'Thiết kế (TOD)',
                        dataIndex: 'designEffectiveness',
                        width: 130,
                        render: (val, _, idx) => (
                          <Select 
                            value={val || 'Đạt'} 
                            disabled={!canEdit}
                            onChange={(v) => handleUpdateControl(idx, 'designEffectiveness', v)}
                            size="small" 
                            className="w-full text-xs"
                          >
                            <Option value="Đạt"><Tag color="success">Đạt</Tag></Option>
                            <Option value="Không đạt"><Tag color="error">Không đạt</Tag></Option>
                            <Option value="Chưa kiểm tra"><Tag color="default">Chưa kiểm tra</Tag></Option>
                          </Select>
                        )
                      },
                      {
                        title: 'Vận hành (TOE)',
                        dataIndex: 'operatingEffectiveness',
                        width: 130,
                        render: (val, _, idx) => (
                          <Select 
                            value={val || 'Đạt'} 
                            disabled={!canEdit}
                            onChange={(v) => handleUpdateControl(idx, 'operatingEffectiveness', v)}
                            size="small" 
                            className="w-full text-xs"
                          >
                            <Option value="Đạt"><Tag color="success">Đạt</Tag></Option>
                            <Option value="Không đạt"><Tag color="error">Không đạt</Tag></Option>
                            <Option value="Không áp dụng"><Tag color="default">Không áp dụng</Tag></Option>
                          </Select>
                        )
                      },
                      {
                        title: 'Kết luận kiểm thử',
                        dataIndex: 'testConclusion',
                        width: 180,
                        render: (val, _, idx) => (
                          <Input 
                            value={val} 
                            disabled={!canEdit}
                            onChange={(e) => handleUpdateControl(idx, 'testConclusion', e.target.value)}
                            size="small" 
                            className="text-xs rounded-md"
                          />
                        )
                      },
                      {
                        title: '',
                        width: 50,
                        render: (_, __, idx) => canEdit && (
                          <Button 
                            type="text" 
                            danger 
                            size="small" 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleRemoveControl(idx)}
                          />
                        )
                      }
                    ]}
                  />
                </div>
              )
            },

            // Tab 3: Thủ tục & Ma trận Mẫu
            {
              key: 'sampling_matrix',
              label: <span className="font-semibold">📊 3. Ma trận Kiểm thử Mẫu & Thủ tục</span>,
              children: (
                <div className="space-y-4 pt-2">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item 
                        name="methodology" 
                        label={<span className="font-bold text-slate-700 text-xs uppercase">Phương pháp kiểm thử (Testing Methodology)</span>}
                      >
                        <TextArea rows={3} placeholder="Kiểm tra chứng từ (Vouching), Đối chiếu chéo (Reconciliation), Phỏng vấn (Inquiry)..." className="rounded-xl text-sm" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item 
                        name="sampleSelection" 
                        label={<span className="font-bold text-slate-700 text-xs uppercase">Cơ sở & Quy mô chọn mẫu (Sampling Method - VSA 530)</span>}
                      >
                        <TextArea rows={3} placeholder="Chọn mẫu ngẫu nhiên hệ thống, chọn mẫu phán đoán theo dư nợ lớn hoặc giao dịch rủi ro cao..." className="rounded-xl text-sm" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider className="my-2" />

                  {/* Direct Embedded Testing Matrix */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <Title level={5} className="!mb-0 text-slate-800">
                          {currentDomain === 'credit' ? '💳 Ma trận Kiểm toán Cấp tín dụng thực tế (40 Cột)' :
                           currentDomain === 'ptd' || currentDomain === 'op' ? '📑 Ma trận Khắc phục & Phi tín dụng (20 Cột)' :
                           '📋 Danh sách mẫu kiểm toán thực địa'}
                        </Title>
                        <Text type="secondary" className="text-xs">
                          Thao tác trực tiếp trên ma trận, tự động lưu vết và kích hoạt Completion Gate trước khi nộp duyệt
                        </Text>
                      </div>
                    </div>

                    {workingPaper?.id ? (
                      currentDomain === 'credit' ? (
                        <CreditWorkingPaperGrid workingPaperId={workingPaper.id} readOnly={!canEdit} />
                      ) : currentDomain === 'ptd' || currentDomain === 'op' ? (
                        <PTDRemediationGrid workingPaperId={workingPaper.id} readOnly={!canEdit} />
                      ) : (
                        <DetailedSamplingGrid workingPaperId={workingPaper.id} engagementId={effectiveEngagement?.id || form.getFieldValue('engagementId')} />
                      )
                    ) : (
                      <Alert 
                        message="Vui lòng bấm 'Lưu nháp' để khởi tạo Giấy tờ làm việc trước khi nhập liệu Ma trận mẫu kiểm tra." 
                        type="info" 
                        showIcon 
                        action={
                          <Button size="small" type="primary" onClick={handleSaveDraft} loading={saving}>
                            Lưu nháp ngay
                          </Button>
                        }
                      />
                    )}
                  </div>

                  <Divider className="my-3" />

                  <Form.Item 
                    name="procedures" 
                    label={<span className="font-bold text-slate-700 text-xs uppercase">Nhật ký thực địa & Chi tiết các bước thực hiện (Procedures & Fieldwork Log)</span>}
                  >
                    <TextArea rows={5} placeholder="Ghi nhận diễn biến kiểm tra thực tế, các cuộc phỏng vấn cán bộ, kiểm tra đối chiếu vết dữ liệu Core banking..." className="rounded-xl font-mono text-sm" />
                  </Form.Item>
                </div>
              )
            },

            // Tab 4: Bằng chứng, Kết luận & Phát hiện
            {
              key: 'conclusion_findings',
              label: <span className="font-semibold">📎 4. Bằng chứng & Phát hiện ({attachments.length})</span>,
              children: (
                <div className="space-y-4 pt-2">
                  {workingPaper?.id ? (
                    <AttachmentManager
                      ownerType="WorkingPaper"
                      ownerId={workingPaper.id}
                      relationType="evidence"
                      title="HỒ SƠ, CHỨNG TỪ KIỂM TOÁN ĐÍNH KÈM (VSA 500 / IIA 2330)"
                      readOnly={!canEdit}
                      canVerify={true}
                    />
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <Title level={5} className="!mb-1">Hồ sơ, chứng từ kiểm toán đính kèm (VSA 500 / IIA 2330)</Title>
                          <Text type="secondary" className="text-xs">Đính kèm biên bản đối chiếu, sao kê tài khoản, hợp đồng tín dụng hoặc ảnh chụp thực địa.</Text>
                        </div>
                        {canEdit && (
                          <div>
                            <input 
                              type="file" 
                              id="wp-drawer-file-upload" 
                              style={{ display: 'none' }} 
                              onChange={handleAttachmentUpload} 
                            />
                            <Button 
                              type="dashed" 
                              icon={<CloudUploadOutlined />}
                              onClick={() => document.getElementById('wp-drawer-file-upload')?.click()}
                              className="rounded-xl"
                            >
                              Tải file bằng chứng lên
                            </Button>
                          </div>
                        )}
                      </div>

                      <Table 
                        size="small"
                        dataSource={attachments}
                        rowKey={(r, i) => r.fileUrl + i}
                        pagination={false}
                        columns={[
                          { title: 'Tên tài liệu', dataIndex: 'name', key: 'name', render: (val) => <span className="font-semibold">{val}</span> },
                          { title: 'Người tải', dataIndex: 'uploadedBy', key: 'uploadedBy', width: '20%' },
                          { title: 'Thời gian', dataIndex: 'uploadedAt', key: 'uploadedAt', width: '20%', render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '-' },
                          {
                            title: 'Thao tác',
                            key: 'action',
                            width: '15%',
                            render: (_, r, idx) => (
                              <Space size="small">
                                <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => window.open(r.fileUrl)}>Tải</Button>
                                {canEdit && (
                                  <Button type="text" danger size="small" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>Xóa</Button>
                                )}
                              </Space>
                            )
                          }
                        ]}
                      />
                    </>
                  )}

                  <Divider className="my-2" />

                  <Form.Item 
                    name="conclusion" 
                    label={<span className="font-bold text-slate-700 text-xs uppercase">Kết luận về tính hữu hiệu của Kiểm soát nội bộ (Audit Conclusion)</span>}
                  >
                    <TextArea 
                      rows={5} 
                      placeholder="1. Đánh giá hiệu lực KSNB: [Hiệu quả / Hiệu quả một phần / Không hiệu quả]&#10;2. Tóm tắt các sai phạm hoặc bất cập phát hiện trong quá trình kiểm tra..." 
                      className="rounded-xl text-sm" 
                    />
                  </Form.Item>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="font-bold text-amber-800 block text-sm">Chuyển hóa sai sót thành Phát hiện Kiểm toán 5C (Audit Findings)</span>
                      <Text type="secondary" className="text-xs text-amber-700">
                        Nếu phát hiện sai phạm trọng yếu hoặc lặp lại, bấm nút để tự động trích xuất thông tin sang Phân hệ Phát hiện kiểm toán.
                      </Text>
                    </div>
                    <Button 
                      type="primary" 
                      icon={<BugOutlined />} 
                      onClick={handleCreateFinding}
                      className="bg-amber-600 hover:bg-amber-700 rounded-xl font-semibold text-white shadow-sm"
                    >
                      Tạo Phát hiện 5C
                    </Button>
                  </div>
                </div>
              )
            },

            // Tab 5: Lịch sử Soát xét & Phê duyệt
            {
              key: 'review_history',
              label: <span className="font-semibold">⏱️ 5. Soát xét & Phê duyệt ({workingPaper?.reviewHistory?.length || 0})</span>,
              children: (
                <div className="p-2 space-y-4">
                  {/* Four-Eyes Principle Status Banner */}
                  {isSelfCreated && (
                    <Alert
                      type="info"
                      showIcon
                      icon={<InfoCircleOutlined />}
                      className="rounded-xl"
                      message="Nguyên tắc 4 mắt (Four-Eyes Principle - VSA 220 / IIA GIAS Standard 12.1)"
                      description="Bạn là người lập Giấy tờ làm việc này. Theo chuẩn mực kiểm toán, người lập không được tự phê duyệt hồ sơ của mình. Vui lòng bấm 'Nộp Trưởng đoàn duyệt' để chuyển hồ sơ cho cấp có thẩm quyền độc lập."
                    />
                  )}

                  <div className="flex justify-between items-center">
                    <Title level={5} className="!mb-0 text-slate-800">
                      Dòng thời gian Soát xét & Phê duyệt (Review Audit Trail)
                    </Title>
                    {canReview && (
                      <Space>
                        <Button danger icon={<UndoOutlined />} onClick={handleOpenReworkModal}>
                          Yêu cầu sửa đổi
                        </Button>
                        <Button type="primary" icon={<CheckOutlined />} onClick={handleApprove} loading={approveLoading} className="bg-emerald-600 hover:bg-emerald-700">
                          Phê duyệt W/P
                        </Button>
                      </Space>
                    )}
                  </div>

                  {workingPaper?.reviewHistory && workingPaper.reviewHistory.length > 0 ? (
                    <Timeline
                      className="mt-4"
                      items={workingPaper.reviewHistory.map((item: any) => {
                        const isApprove = item.action === 'APPROVE';
                        const isRework = item.action === 'REWORK';
                        const color = isApprove ? 'green' : isRework ? 'red' : 'blue';
                        const actionLabel = isApprove ? 'Đã Phê Duyệt' : isRework ? 'Yêu Cầu Chỉnh Sửa' : 'Nộp Soát Xét';

                        return {
                          color,
                          children: (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 mb-2 shadow-3xs">
                              <div className="flex justify-between items-center mb-1">
                                <Space>
                                  <Tag color={color} className="font-bold">{actionLabel}</Tag>
                                  <span className="font-semibold text-slate-800">{item.actorName}</span>
                                  <Text type="secondary" className="text-xs">({item.role})</Text>
                                </Space>
                                <Text type="secondary" className="text-xs">
                                  {dayjs(item.timestamp).format('DD/MM/YYYY HH:mm')}
                                </Text>
                              </div>
                              {item.notes && (
                                <p className="mb-0 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 italic">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                          )
                        };
                      })}
                    />
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                      Chưa có lịch sử soát xét nào. Toàn bộ chu kỳ phê duyệt, ý kiến chỉ đạo và yêu cầu chỉnh sửa sẽ được lưu vết bất biến tại đây.
                    </div>
                  )}
                </div>
              )
            }
          ]}
        />
      </Form>

      {/* Rework Reason Modal */}
      <Modal
        title={<span className="text-rose-600 font-bold">↩ Nhập Ý Kiến Yêu Cầu Chỉnh Sửa (Rework Notes)</span>}
        open={reworkModalVisible}
        onOk={handleConfirmRework}
        confirmLoading={reworkLoading}
        onCancel={() => setReworkModalVisible(false)}
        okText="Gửi yêu cầu sửa đổi"
        cancelText="Hủy"
        okButtonProps={{ danger: true, className: 'font-semibold' }}
      >
        <Paragraph type="secondary" className="text-xs">
          Vui lòng nêu rõ các điểm chưa đạt yêu cầu (ví dụ: mẫu kiểm tra thiếu bằng chứng, kết luận chưa logic, thiếu đối chiếu chứng từ) để KTV nắm rõ và khắc phục theo chuẩn mực IIA.
        </Paragraph>
        <Form form={reworkForm} layout="vertical">
          <Form.Item 
            name="notes" 
            label={<span className="font-semibold text-slate-700">Ý kiến chỉ đạo của Trưởng đoàn</span>}
            rules={[{ required: true, message: 'Bắt buộc nhập lý do yêu cầu chỉnh sửa' }]}
          >
            <TextArea rows={5} placeholder="Nhập chi tiết nội dung cần bổ sung / sửa đổi..." className="rounded-xl text-sm" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};
export default WorkingPaperDetailDrawer;
