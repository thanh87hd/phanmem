import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Typography, Card, Button, Table, Modal, Form, Input, DatePicker, Select, Space, Tag, message, Row, Col, Avatar, Divider, Tabs, Alert, Steps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, ClockCircleOutlined, CloseOutlined, CheckCircleOutlined, SafetyOutlined, DownloadOutlined, FileExcelOutlined, FileTextOutlined, AuditOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import dayjs from 'dayjs';
import api from '../services/api';
import { hasPermission } from '../utils/permission';
import AuditMinutesTab from './AuditMinutesTab';
import EngagementChangeRequests from './EngagementChangeRequests';
import MasterSamplingTab from './MasterSamplingTab';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import { DataImportModal } from '../components/DataImportModal';
import ReportExportButton from '../components/ReportExportButton';
import OfficializeModal from '../components/OfficializeModal';
import EngagementDossierManager from '../components/EngagementDossierManager';
import Phase1PlanningTab from './audit-engagement-tabs/Phase1PlanningTab';
import Phase2FieldworkTab from './audit-engagement-tabs/Phase2FieldworkTab';
import Phase3ReportingTab from './audit-engagement-tabs/Phase3ReportingTab';
import Phase4ClosureTab from './audit-engagement-tabs/Phase4ClosureTab';
import AuditEngagementProcessBar from './audit-engagement-tabs/AuditEngagementProcessBar';
import StageGateModal from './audit-engagement-tabs/StageGateModal';
import { AuditEngagementForm } from './audit-engagement-tabs/AuditEngagementForm';
import { AuditWorkstreamModal } from './audit-engagement-tabs/AuditWorkstreamModal';
import { EngagementTaskModal } from './audit-engagements/EngagementTaskModal';
import { EngagementRcmModal } from './audit-engagements/EngagementRcmModal';
import { EngagementHeaderBanner } from './audit-engagements/EngagementHeaderBanner';
import { EngagementListTable } from './audit-engagements/EngagementListTable';
import type { AuditUniverse, AuditPlan, Department } from '../types';
import { useCurrentUser } from '../utils/useCurrentUser';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const STATUSES = ['Todo', 'InProgress', 'Review', 'Done'];


const STATUS_COLORS: Record<string, string> = {
  Todo: 'default',
  InProgress: 'processing',
  Review: 'warning',
  Done: 'success'
};

const PRIORITIES = ['Low', 'Medium', 'High'];

const AuditEngagements: React.FC = () => {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    Todo: t('auditEngagements.statusLabels.Todo', 'Cần làm'),
    InProgress: t('auditEngagements.statusLabels.InProgress', 'Đang thực hiện'),
    Review: t('auditEngagements.statusLabels.Review', 'Chờ duyệt'),
    Done: t('auditEngagements.statusLabels.Done', 'Hoàn thành')
  };

  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [auditPlans, setAuditPlans] = useState<any[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState<any | null>(null);
  const [activePhase, setActivePhase] = useState<string>('phase1');
  const [stageGateModalVisible, setStageGateModalVisible] = useState(false);
  const [stageGateTargetPhase, setStageGateTargetPhase] = useState<'phase2' | 'phase3' | 'phase4' | 'closed'>('phase2');

  const changeActivePhase = (targetPhase: string) => {
    setActivePhase(targetPhase);
    if (selectedEngagement?.id) {
      setSearchParams({ id: String(selectedEngagement.id), phase: targetPhase }, { replace: true });
    }
  };

  const handleOpenStageGateModal = (targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed') => {
    setStageGateTargetPhase(targetPhase);
    setStageGateModalVisible(true);
  };

  // Deep-linking: tự động chọn engagement & phase từ URL params nếu có
  useEffect(() => {
    const idParam = searchParams.get('id');
    const phaseParam = searchParams.get('phase');
    if (idParam && engagements.length > 0) {
      const numId = Number(idParam);
      const matched = engagements.find((e: any) => e.id === numId);
      if (matched && (!selectedEngagement || selectedEngagement.id !== numId)) {
        setSelectedEngagement(matched);
        if (phaseParam) {
          setActivePhase(phaseParam);
        }
        fetchTasks(matched.id);
        fetchWorkstreams(matched.id);
      }
    }
  }, [engagements, searchParams]);

  // Tự động mở đúng phase tương ứng khi chọn cuộc kiểm toán
  useEffect(() => {
    if (selectedEngagement?.status) {
      const phaseParam = searchParams.get('phase');
      if (phaseParam) {
        setActivePhase(phaseParam);
        return;
      }
      let defaultPhase = 'phase1';
      if (selectedEngagement.status === 'Completed') {
        defaultPhase = 'phase4';
      } else if (selectedEngagement.status === 'Reporting') {
        defaultPhase = 'phase3';
      } else if (selectedEngagement.status === 'Fieldwork') {
        defaultPhase = 'phase2';
      }
      setActivePhase(defaultPhase);
      setSearchParams({ id: String(selectedEngagement.id), phase: defaultPhase }, { replace: true });
    }
  }, [selectedEngagement?.id, selectedEngagement?.status]);

  // Nghiêm cấm làm tắt giai đoạn (Strict Sequential Gating)
  const handlePhaseTabChange = (targetPhase: string) => {
    const status = selectedEngagement?.status || 'Planning';
    const roleStr = typeof currentUser?.role === 'string' ? currentUser.role : (currentUser?.role?.name || currentUser?.roleName || '');
    const isAdmin = roleStr.toLowerCase().includes('admin') || roleStr.toLowerCase().includes('quản trị');
    
    if (isAdmin) {
      changeActivePhase(targetPhase);
      return;
    }

    const isAllowed = 
      targetPhase === 'phase1' ? true :
      targetPhase === 'phase2' ? (status === 'Fieldwork' || status === 'Reporting' || status === 'Completed') :
      targetPhase === 'phase3' ? (status === 'Reporting' || status === 'Completed') :
      targetPhase === 'phase4' ? (status === 'Completed') : false;

    if (isAllowed) {
      changeActivePhase(targetPhase);
    } else {
      const phaseNames: Record<string, string> = {
        phase1: 'Giai đoạn 1: Lập Kế hoạch & Chuẩn bị (IIA 2200)',
        phase2: 'Giai đoạn 2: Thực địa & Thử nghiệm (IIA 2300)',
        phase3: 'Giai đoạn 3: Báo cáo & Kết quả (IIA 2400)',
        phase4: 'Giai đoạn 4: Theo dõi & Đóng cuộc KT (IIA 2500 & 1300)',
      };
      Modal.warning({
        title: (
          <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
            <span>Quy tắc IIA: Không Được Phép Làm Tắt Giai Đoạn!</span>
          </div>
        ),
        width: 540,
        content: (
          <div className="space-y-3 pt-2 text-slate-700 text-sm">
            <p>
              Cuộc kiểm toán hiện đang ở tiến độ <strong>"{status === 'Fieldwork' ? 'GĐ 2 - Thực địa' : status === 'Reporting' ? 'GĐ 3 - Báo cáo' : 'GĐ 1 - Lập kế hoạch'}"</strong>.
            </p>
            <p>
              Theo Chuẩn mực Kiểm toán Nội bộ Quốc tế IIA, bạn cần hoàn thành nghiệm thu giai đoạn hiện tại trước khi có thể chuyển sang thực hiện <strong>{phaseNames[targetPhase] || targetPhase}</strong>.
            </p>
            <p className="text-xs text-slate-500 italic">
              💡 Vui lòng bấm nút <strong>"Nghiệm thu & Chuyển sang giai đoạn sau"</strong> tại cuối tab để mở khóa giai đoạn này.
            </p>
          </div>
        ),
        okText: 'Tôi đã hiểu',
        okButtonProps: { className: 'bg-blue-600 hover:bg-blue-700' },
      });
    }
  };
  const [tasks, setTasks] = useState<any[]>([]);
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [auditUniverseList, setAuditUniverseList] = useState<any[]>([]);
  const [customFieldsDef, setCustomFieldsDef] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEngagementModalVisible, setIsEngagementModalVisible] = useState(false);
  const [isOfficializeModalVisible, setIsOfficializeModalVisible] = useState(false);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isWorkstreamModalVisible, setIsWorkstreamModalVisible] = useState(false);
  const [isRcmModalVisible, setIsRcmModalVisible] = useState(false);
  const [rcmList, setRcmList] = useState<any[]>([]);
  const [selectedRcmRows, setSelectedRcmRows] = useState<any[]>([]);
  const [editingEngagement, setEditingEngagement] = useState<any | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editingWorkstream, setEditingWorkstream] = useState<any | null>(null);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [engagementForm] = Form.useForm();
  const [actualsForm] = Form.useForm();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(fieldName);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('linkedResource', 'audit_engagement');
    formData.append('linkedResourceId', editingEngagement?.id ? String(editingEngagement.id) : '0');
    formData.append('description', `Tài liệu ${fieldName} của đoàn kiểm toán`);

    try {
      const response = await api.post('/evidences/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const downloadUrl = `/api/evidences/${response.data.id}/download`;
      engagementForm.setFieldValue(fieldName, downloadUrl);
      message.success(`Tải lên tài liệu ${fieldName === 'proposalDocUrl' ? [t('auditEngagements.presentation', 'Tờ trình')] : fieldName === 'outlineDocUrl' ? [t('auditEngagements.outline', 'Đề cương')] : t('documentManager.types.decision', 'Quyết định')} thành công!`);
    } catch (err) {
      console.error(err);
      message.error(t('auditEngagements.errorUploadingDocument', 'Lỗi khi tải tài liệu lên'));
    } finally {
      setUploadingField(null);
    }
  };
  const [taskForm] = Form.useForm();
  const [workstreamForm] = Form.useForm();
  const [safetyWarnings, setSafetyWarnings] = useState<Record<string, string>>({});

  const checkAuditorSafety = async (userId: number, fieldKey: string, auditorName: string, departmentName: string) => {
    if (!userId || !departmentName) return;
    try {
      const res = await api.post('/independence/check-safety', {
        userId,
        auditorName,
        departmentName
      });
      if (res.data && res.data.safe === false) {
        setSafetyWarnings(prev => ({
          ...prev,
          [fieldKey]: res.data.reason
        }));
      } else {
        setSafetyWarnings(prev => {
          const next = { ...prev };
          delete next[fieldKey];
          return next;
        });
      }
    } catch (err) {
      console.error(t('auditEngagements.errorCheckingIndependence', 'Lỗi kiểm tra tính độc lập:'), err);
    }
  };

  const fetchEngagements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-engagements');
      setEngagements(res.data);
    } catch (error) {
      message.error(t('auditEngagements.errorLoadingAuditList', 'Lỗi tải danh sách cuộc kiểm toán'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error(t('auditEngagements.errorLoadingPersonnelList', 'Lỗi tải danh sách nhân sự:'), error);
    }
  };

  const fetchAuditUniverse = async () => {
    try {
      const res = await api.get('/audit-universe');
      setAuditUniverseList(res.data || []);
    } catch (error) {
      console.error(t('auditEngagements.errorLoadingAuditUniverseList', 'Lỗi tải danh sách Audit Universe:'), error);
    }
  };

  const fetchRcmList = async () => {
    try {
      const res = await api.get('/risk-control-matrix');
      setRcmList(res.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách RCM:', error);
    }
  };

  const fetchTasks = async (engagementId: number) => {
    try {
      const res = await api.get(`/audit-tasks?engagementId=${engagementId}`);
      setTasks(res.data);
    } catch (error) {
      message.error(t('auditEngagements.errorLoadingTaskList', 'Lỗi tải danh sách nhiệm vụ'));
    }
  };

  const fetchWorkstreams = async (engagementId: number) => {
    try {
      const res = await api.get(`/audit-engagements/${engagementId}/workstreams`);
      setWorkstreams(res.data || []);
    } catch {
      message.error(t('auditEngagements.errorLoadingListOfComponents', 'Lỗi tải danh sách phần hành'));
    }
  };

  const fetchCustomFieldsDef = async () => {
    try {
      const res = await api.get('/custom-fields?entityType=AuditEngagement');
      setCustomFieldsDef(res.data);
    // eslint-disable-next-line no-empty
    } catch (e) {}
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments?all=true');
      setDepartments(res.data || []);
    } catch (e) {
      console.error('Failed to load departments', e);
    }
  };

  const renderDepartmentSelectOptions = () => {
    const branches = departments.filter((d: any) => {
      const t = (d.unitType || '').toLowerCase();
      const n = (d.name || '').toLowerCase();
      return t === 'chinhanh' || t === 'branch' || n.includes('chi nhánh') || n.includes('đvkd');
    });

    const divisions = departments.filter((d: any) => {
      const t = (d.unitType || '').toLowerCase();
      const n = (d.name || '').toLowerCase();
      return (t === 'khoi' || t === 'division' || n.includes('khối')) && !branches.includes(d);
    });

    const deptsGroup = departments.filter((d: any) => {
      const t = (d.unitType || '').toLowerCase();
      const n = (d.name || '').toLowerCase();
      return (t === 'ban' || t === 'phong' || t === 'department' || n.includes('phòng') || n.includes('ban')) && !branches.includes(d) && !divisions.includes(d);
    });

    const others = departments.filter((d: any) => !branches.includes(d) && !divisions.includes(d) && !deptsGroup.includes(d));

    return (
      <>
        {branches.length > 0 && (
          <Select.OptGroup label={`🏢 Chi nhánh & Đơn vị kinh doanh (${branches.length})`}>
            {branches.map((d: any) => (
              <Option key={d.id} value={d.id} label={`${d.name} ${d.code || ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🏢 {d.name}</span>
                  {d.code && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{d.code}</Tag>}
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        )}

        {divisions.length > 0 && (
          <Select.OptGroup label={`🏛️ Khối nghiệp vụ Hội sở (${divisions.length})`}>
            {divisions.map((d: any) => (
              <Option key={d.id} value={d.id} label={`${d.name} ${d.code || ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🏛️ {d.name}</span>
                  {d.code && <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>{d.code}</Tag>}
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        )}

        {deptsGroup.length > 0 && (
          <Select.OptGroup label={`📂 Ban & Phòng ban chức năng (${deptsGroup.length})`}>
            {deptsGroup.map((d: any) => (
              <Option key={d.id} value={d.id} label={`${d.name} ${d.code || ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📂 {d.name}</span>
                  {d.code && <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>{d.code}</Tag>}
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        )}

        {others.length > 0 && (
          <Select.OptGroup label={`📍 Đơn vị trực thuộc khác (${others.length})`}>
            {others.map((d: any) => (
              <Option key={d.id} value={d.id} label={`${d.name} ${d.code || ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📍 {d.name}</span>
                  {d.code && <Tag style={{ fontSize: 10, margin: 0 }}>{d.code}</Tag>}
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        )}

        {departments.length === 0 && (
          <Option value={0} disabled>Đang tải danh mục cơ cấu tổ chức...</Option>
        )}
      </>
    );
  };

  const fetchAuditPlans = async () => {
    try {
      const res = await api.get('/audit-plans');
      setAuditPlans(res.data || []);
    } catch (e) {
      console.error('Failed to load audit plans', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEngagements();
    fetchUsers();
    fetchDepartments();
    fetchAuditUniverse();
    fetchCustomFieldsDef();
    fetchRcmList();
    fetchAuditPlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEngagementSelect = (record: any) => {
    setSelectedEngagement(record);
    const initialPhase = record.status === 'Completed' ? 'phase4' :
                         record.status === 'Reporting' ? 'phase3' :
                         record.status === 'Fieldwork' ? 'phase2' : 'phase1';
    setActivePhase(initialPhase);
    setSearchParams({ id: String(record.id), phase: initialPhase }, { replace: true });
    fetchTasks(record.id);
    fetchWorkstreams(record.id);
  };

  const handleCreateWorkstream = () => {
    if (!selectedEngagement) return;
    setEditingWorkstream(null);
    workstreamForm.resetFields();
    workstreamForm.setFieldsValue({ status: 'Draft', priority: 'Medium' });
    setIsWorkstreamModalVisible(true);
  };

  const handleEditWorkstream = (record: any) => {
    setEditingWorkstream(record);
    workstreamForm.setFieldsValue({
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    });
    setIsWorkstreamModalVisible(true);
  };

  const saveWorkstream = async () => {
    try {
      const values = await workstreamForm.validateFields();
      const assigned = users.find((u: any) => u.id === values.assignedAuditorId);
      const reviewer = users.find((u: any) => u.id === values.reviewerId);
      const payload = {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
        assignedAuditorName: assigned?.fullName || values.assignedAuditorName || '',
        reviewerName: reviewer?.fullName || values.reviewerName || '',
      };
      if (editingWorkstream) {
        await api.patch(`/audit-workstreams/${editingWorkstream.id}`, payload);
        message.success(t('auditEngagements.updatedTheSection', 'Đã cập nhật phần hành'));
      } else {
        await api.post(`/audit-engagements/${selectedEngagement.id}/workstreams`, payload);
        message.success(t('auditEngagements.createdTheOnionSection', 'Đã tạo phần hành'));
      }
      setIsWorkstreamModalVisible(false);
      fetchWorkstreams(selectedEngagement.id);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditEngagements.errorWhileSavingPart', 'Lỗi khi lưu phần hành'));
    }
  };

  const handleImportFromRcm = async () => {
    if (!selectedEngagement || selectedRcmRows.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 Rủi ro từ thư viện RCM');
      return;
    }
    try {
      message.loading({ content: 'Đang nhập từ RCM...', key: 'importRcm' });
      for (const rcm of selectedRcmRows) {
        const payload = {
          title: `[RCM] ${rcm.riskName}`,
          scope: rcm.testProcedure || rcm.riskDescription,
          riskArea: rcm.legacyProcessName || 'Chung',
          riskControlMatrixId: rcm.id,
          status: 'Draft',
        };
        await api.post(`/audit-engagements/${selectedEngagement.id}/workstreams`, payload);
      }
      message.success({ content: 'Đã nhập thành công Chương trình kiểm toán từ RCM', key: 'importRcm' });
      setIsRcmModalVisible(false);
      setSelectedRcmRows([]);
      fetchWorkstreams(selectedEngagement.id);
    } catch (error) {
      console.error(error);
      console.error(error);
      message.error({ content: 'Lỗi khi nhập từ RCM', key: 'importRcm' });
    }
  };

  const submitPlan = async () => {
    try {
      await api.post(`/audit-engagements/${selectedEngagement.id}/submit-plan`);
      message.success('Trình duyệt Kế hoạch thành công');
      fetchEngagements();
      setSelectedEngagement({ ...selectedEngagement, planApprovalStatus: 'Pending' });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi trình duyệt Kế hoạch');
    }
  };

  const approvePlan = async () => {
    try {
      await api.post(`/audit-engagements/${selectedEngagement.id}/approve-plan`);
      message.success('Phê duyệt Kế hoạch thành công');
      fetchEngagements();
      setSelectedEngagement({ ...selectedEngagement, planApprovalStatus: 'Approved' });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi phê duyệt Kế hoạch');
    }
  };

  const rejectPlan = async () => {
    try {
      const notes = prompt('Nhập lý do từ chối:');
      if (notes === null) return;
      await api.post(`/audit-engagements/${selectedEngagement.id}/reject-plan`, { notes });
      message.success('Đã từ chối Kế hoạch');
      fetchEngagements();
      setSelectedEngagement({ ...selectedEngagement, planApprovalStatus: 'Rejected', planApprovalNotes: notes });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi từ chối Kế hoạch');
    }
  };

  const completeWorkstream = async (id: number) => {
    try {
      await api.post(`/audit-workstreams/${id}/complete`);
      message.success(t('auditEngagements.theSectionHasBeenMarkedAs', 'Đã đánh dấu hoàn thành phần hành'));
      fetchWorkstreams(selectedEngagement.id);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditEngagements.unableToCompleteTheExecutionPart', 'Không thể hoàn thành phần hành'));
    }
  };

  const reviewWorkstream = async (id: number, status: 'Reviewed' | 'Rework') => {
    try {
      await api.post(`/audit-workstreams/${id}/review`, { status });
      message.success(status === 'Reviewed' ? [t('auditEngagements.reviewedTheOperatingPart', 'Đã review phần hành')] : t('auditEngagements.requestedToRedoTheOnionPart', 'Đã yêu cầu làm lại phần hành'));
      fetchWorkstreams(selectedEngagement.id);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditEngagements.cannotReviewTheOperatingPart', 'Không thể review phần hành'));
    }
  };

  const closeWorkspace = async () => {
    try {
      await api.post(`/audit-engagements/${selectedEngagement.id}/close`, { notes: t('auditEngagements.closeTheWorkspaceFromTheCtkt', 'Đóng workspace từ màn hình CTKT') });
      message.success(t('auditEngagements.closedCtktWorkspace', 'Đã đóng workspace CTKT'));
      fetchEngagements();
      const refreshed = await api.get(`/audit-engagements/${selectedEngagement.id}`);
      setSelectedEngagement(refreshed.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditEngagements.cannotCloseWorkspace', 'Không thể đóng workspace'));
    }
  };

  const handleCreateEngagement = () => {
    setEditingEngagement(null);
    engagementForm.resetFields();
    setSafetyWarnings({});
    setIsEngagementModalVisible(true);
  };

  const handleEditEngagement = (record: any) => {
    setSafetyWarnings({});
    setEditingEngagement(record);
    const matchedPlan = auditPlans.find((p: any) => p.id === record.planId || p.name === record.planName || p.name === record.legacyPlanName);
    engagementForm.setFieldsValue({
      ...record,
      planId: record.planId || (matchedPlan ? matchedPlan.id : undefined),
      planName: record.planName || record.legacyPlanName || (matchedPlan ? matchedPlan.name : ''),
      dates: [record.startDate ? dayjs(record.startDate) : null, record.endDate ? dayjs(record.endDate) : null],
      planningDates: [record.planningStartDate ? dayjs(record.planningStartDate) : null, record.planningEndDate ? dayjs(record.planningEndDate) : null],
      fieldworkDates: [record.fieldworkStartDate ? dayjs(record.fieldworkStartDate) : null, record.fieldworkEndDate ? dayjs(record.fieldworkEndDate) : null],
      auditedEntityList: (() => {
        if (!record.auditedEntityList) return [];
        if (Array.isArray(record.auditedEntityList)) return record.auditedEntityList;
        try { return JSON.parse(record.auditedEntityList); } catch { return [record.auditedEntityList]; }
      })(),
      decisionDate: record.decisionDate ? dayjs(record.decisionDate) : null,
      programValidity: record.programValidity ? dayjs(record.programValidity) : null,
      surveySentDate: record.surveySentDate ? dayjs(record.surveySentDate) : null,
      surveyReceivedDate: record.surveyReceivedDate ? dayjs(record.surveyReceivedDate) : null,
      handoverMinutesDate: record.handoverMinutesDate ? dayjs(record.handoverMinutesDate) : null,
      detailedMinutesDate: record.detailedMinutesDate ? dayjs(record.detailedMinutesDate) : null,
      summaryMinutesDate: record.summaryMinutesDate ? dayjs(record.summaryMinutesDate) : null,
      exitMeetingDate: record.exitMeetingDate ? dayjs(record.exitMeetingDate) : null,
      reportIssuedDate: record.reportIssuedDate ? dayjs(record.reportIssuedDate) : null,
    });
    
    // Kích hoạt kiểm tra độc lập và quay vòng cho dữ liệu có sẵn
    if (record.leadAuditorId && record.auditedDepartment) {
      const matchedUser = users.find((u: any) => u.id === record.leadAuditorId);
      if (matchedUser) {
        checkAuditorSafety(record.leadAuditorId, 'leadAuditor', matchedUser.fullName, record.auditedDepartment);
      }
    }
    if (record.teamMembers && record.auditedDepartment) {
      record.teamMembers.forEach((tm: any, index: number) => {
        if (tm.userId) {
          checkAuditorSafety(tm.userId, `teamMember_${index}`, tm.fullName, record.auditedDepartment);
        }
      });
    }
    
    setIsEngagementModalVisible(true);
  };

  const saveEngagement = async (isExpectedInfo: boolean = false) => {
    try {
      const values = await engagementForm.validateFields();
      if (values.planId && !values.planName) {
        const foundPlan = auditPlans.find((p: any) => p.id === values.planId);
        if (foundPlan) values.planName = foundPlan.name;
      }
      const payload = {
        ...values,
        startDate: values.dates ? values.dates[0].format('YYYY-MM-DD') : null,
        endDate: values.dates ? values.dates[1].format('YYYY-MM-DD') : null,
        planningStartDate: values.planningDates && values.planningDates[0] ? values.planningDates[0].format('YYYY-MM-DD') : null,
        planningEndDate: values.planningDates && values.planningDates[1] ? values.planningDates[1].format('YYYY-MM-DD') : null,
        fieldworkStartDate: values.fieldworkDates && values.fieldworkDates[0] ? values.fieldworkDates[0].format('YYYY-MM-DD') : null,
        fieldworkEndDate: values.fieldworkDates && values.fieldworkDates[1] ? values.fieldworkDates[1].format('YYYY-MM-DD') : null,
        auditedEntityList: Array.isArray(values.auditedEntityList) ? JSON.stringify(values.auditedEntityList) : values.auditedEntityList,
        decisionDate: values.decisionDate ? values.decisionDate.format('YYYY-MM-DD') : null,
        programValidity: values.programValidity ? values.programValidity.format('YYYY-MM-DD') : null,
        surveySentDate: values.surveySentDate ? dayjs(values.surveySentDate).format('YYYY-MM-DD') : null,
        surveyReceivedDate: values.surveyReceivedDate ? dayjs(values.surveyReceivedDate).format('YYYY-MM-DD') : null,
        handoverMinutesDate: values.handoverMinutesDate ? dayjs(values.handoverMinutesDate).format('YYYY-MM-DD') : null,
        detailedMinutesDate: values.detailedMinutesDate ? dayjs(values.detailedMinutesDate).format('YYYY-MM-DD') : null,
        summaryMinutesDate: values.summaryMinutesDate ? dayjs(values.summaryMinutesDate).format('YYYY-MM-DD') : null,
        exitMeetingDate: values.exitMeetingDate ? dayjs(values.exitMeetingDate).format('YYYY-MM-DD') : null,
        reportIssuedDate: values.reportIssuedDate ? dayjs(values.reportIssuedDate).format('YYYY-MM-DD') : null,
        customFields: extractCustomFields(values),
      };
      delete payload.dates;
      delete payload.planningDates;
      delete payload.fieldworkDates;

      // Resolve leadAuditor name
      if (payload.leadAuditorId) {
        const leadUser = users.find((u: any) => String(u.id) === String(payload.leadAuditorId));
        payload.leadAuditor = leadUser ? leadUser.fullName : '';
      } else {
        payload.leadAuditor = '';
      }

      // Resolve auditedDepartment name
      if (payload.auditedDepartmentId) {
        const dept = departments.find((d: any) => d.id === payload.auditedDepartmentId);
        payload.auditedDepartment = dept ? dept.name : (payload.auditedDepartment || '');
        payload.branchName = dept ? dept.name : (payload.branchName || '');
        payload.branchCode = dept?.code || payload.branchCode || '';
      }

      // Map team members JSON array with full names
      if (payload.teamMembers) {
        payload.teamMembers = payload.teamMembers.map((tm: any) => {
          const matchedUser = users.find((u: any) => u.id === tm.userId);
          return {
            userId: tm.userId,
            fullName: matchedUser ? matchedUser.fullName : '',
            role: tm.role
          };
        }).filter((tm: any) => tm.userId);
      } else {
        payload.teamMembers = [];
      }

      if (editingEngagement) {
        if (!payload.reason) {
          message.error('Vui lòng nhập lý do thay đổi!');
          return;
        }
        payload.isExpectedInfo = isExpectedInfo;
        await api.post(`/audit-engagements/${editingEngagement.id}/change-requests`, payload);
        message.success(t('auditEngagements.successfulChangeRequest', 'Đã gửi yêu cầu thay đổi thành công, đang chờ duyệt'));
      } else {
        payload.isExpectedInfo = isExpectedInfo;
        await api.post('/audit-engagements', payload);
        message.success(isExpectedInfo ? 'Đã lưu thông tin dự kiến thành công' : t('auditEngagements.createASuccessfulAudit', 'Tạo cuộc kiểm toán thành công'));
      }
      setIsEngagementModalVisible(false);
      fetchEngagements();
    } catch (error: any) {
      console.error('Error saving engagement:', error);
      if (error?.errorFields) {
        message.warning('Vui lòng kiểm tra lại các trường bắt buộc đang để trống.');
        return;
      }
      const msg = error.response?.data?.message;
      const displayMsg = Array.isArray(msg) ? msg.join(', ') : (msg || t('auditEngagements.errorWhenSavingAudit', 'Lỗi khi lưu cuộc kiểm toán'));
      message.error(displayMsg);
    }
  };

  const deleteEngagement = async (id: number) => {
    try {
      await api.delete(`/audit-engagements/${id}`);
      message.success(t('auditEngagements.auditRemoved', 'Đã xóa cuộc kiểm toán'));
      if (selectedEngagement?.id === id) {
        setSelectedEngagement(null);
        setTasks([]);
      }
      fetchEngagements();
    } catch (error) {
      message.error(t('auditEngagements.errorWhileDeleting', 'Lỗi khi xóa'));
    }
  };

  const handleExportPlan = async (id: number) => {
    try {
      message.loading({ content: 'Đang xuất Kế hoạch kiểm toán...', key: 'exportPlan' });
      const response = await api.get(`/audit-engagements/${id}/export/plan`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ke_hoach_kiem_toan_${id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success({ content: 'Đã tải Kế hoạch kiểm toán', key: 'exportPlan' });
    } catch (e) {
      console.error(e);
      message.error({ content: 'Lỗi khi xuất file', key: 'exportPlan' });
    }
  };

  const handleCreateTask = () => {
    if (!selectedEngagement) {
      message.warning(t('auditEngagements.pleaseSelectAnAuditFirst', 'Vui lòng chọn một cuộc kiểm toán trước'));
      return;
    }
    setEditingTask(null);
    taskForm.resetFields();
    taskForm.setFieldsValue({ status: 'Todo', priority: 'Medium' });
    setIsTaskModalVisible(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    taskForm.setFieldsValue({
      ...task,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null
    });
    setIsTaskModalVisible(true);
  };

  const saveTask = async () => {
    try {
      const values = await taskForm.validateFields();
      const payload = {
        ...values,
        engagementId: selectedEngagement.id,
        engagementName: selectedEngagement.name,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
      };

      if (editingTask) {
        await api.patch(`/audit-tasks/${editingTask.id}`, payload);
        message.success(t('auditEngagements.updatedQuest', 'Đã cập nhật nhiệm vụ'));
      } else {
        await api.post('/audit-tasks', payload);
        message.success(t('auditEngagements.taskCreated', 'Đã tạo nhiệm vụ'));
      }
      setIsTaskModalVisible(false);
      fetchTasks(selectedEngagement.id);
    } catch (error) {
      console.log('Validate Failed:', error);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await api.delete(`/audit-tasks/${id}`);
      message.success(t('auditEngagements.missionDeleted', 'Đã xóa nhiệm vụ'));
      fetchTasks(selectedEngagement!.id);
    } catch (error) {
      message.error(t('auditEngagements.errorWhileDeletingTask', 'Lỗi khi xóa nhiệm vụ'));
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic UI update
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      await api.patch(`/audit-tasks/${taskId}`, { status: newStatus });
    } catch (error) {
      message.error(t('auditEngagements.statusUpdateFailed', 'Cập nhật trạng thái thất bại'));
      fetchTasks(selectedEngagement!.id); // revert
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status);
  };

  const workstreamColumns = [
    { title: 'Phần hành', dataIndex: 'title', key: 'title', width: 220, ellipsis: true },
    { title: t('auditEngagements.workstreamCols.riskArea', 'Vùng rủi ro'), dataIndex: 'riskArea', key: 'riskArea', width: 150, ellipsis: true },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority: string) => {
        const p = priority || 'Medium';
        const color = p === 'Urgent' || p === 'High' ? 'red' : p === 'Medium' ? 'gold' : 'green';
        const label = p === 'High' ? 'Cao' : p === 'Medium' ? 'TB' : p === 'Low' ? 'Thấp' : p;
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Hạn hoàn thành',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (dueDate: string, record: any) => {
        if (!dueDate) return <span className="text-slate-400 text-xs">-</span>;
        const isDone = record.status === 'Completed' || record.status === 'Reviewed';
        const isOverdue = !isDone && dayjs(dueDate).isBefore(dayjs(), 'day');
        const daysLeft = dayjs(dueDate).diff(dayjs(), 'day');
        return (
          <Space orientation="vertical" size={2}>
            <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
              <ClockCircleOutlined className="mr-1" />
              {dayjs(dueDate).format('DD/MM/YYYY')}
            </span>
            {!isDone && (
              isOverdue ? (
                <Tag color="error" className="text-[10px] py-0 px-1 leading-none font-medium">Quá hạn {-daysLeft} ngày</Tag>
              ) : daysLeft <= 3 ? (
                <Tag color="warning" className="text-[10px] py-0 px-1 leading-none font-medium">Còn {daysLeft} ngày</Tag>
              ) : (
                <span className="text-[10px] text-slate-400">Còn {daysLeft} ngày</span>
              )
            )}
          </Space>
        );
      },
    },
    {
      title: 'Ngày công',
      dataIndex: 'estimatedDays',
      key: 'estimatedDays',
      width: 95,
      render: (days: number) => (days ? <span className="text-xs font-medium text-slate-600">{days} ngày</span> : <span className="text-slate-400 text-xs">-</span>),
    },
    { title: t('auditEngagements.workstreamCols.assigned', 'KTV phụ trách'), dataIndex: 'assignedAuditorName', key: 'assignedAuditorName', width: 150 },
    { title: 'Reviewer', dataIndex: 'reviewerName', key: 'reviewerName', width: 150 },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const color = status === 'Reviewed' ? 'green' : status === 'Completed' ? 'blue' : status === 'Rework' ? 'red' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditWorkstream(record)}>{t('auditTemplates.btnEdit', 'Sửa')}</Button>
          {record.status !== 'Reviewed' && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => completeWorkstream(record.id)}>Completed</Button>
          )}
          <Button size="small" type="primary" icon={<SafetyOutlined />} onClick={() => reviewWorkstream(record.id, 'Reviewed')}>Reviewed</Button>
          <Button size="small" danger onClick={() => reviewWorkstream(record.id, 'Rework')}>Rework</Button>
        </Space>
      ),
    },
  ];

  if (isEngagementModalVisible) {
    return (
      <AuditEngagementForm
        editingEngagement={editingEngagement}
        users={users}
        departments={departments}
        auditUniverseList={auditUniverseList}
        safetyWarnings={safetyWarnings}
        engagementForm={engagementForm}
        saveEngagement={saveEngagement}
        onCancel={() => setIsEngagementModalVisible(false)}
        checkAuditorSafety={checkAuditorSafety}
        renderDepartmentSelectOptions={renderDepartmentSelectOptions}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-0">Đoàn Kiểm toán & Kanban</Title>
          <Text type="secondary">Quản lý các cuộc kiểm toán và tiến độ công việc</Text>
        </div>
        <Space>
          {selectedEngagement && hasPermission(currentUser, 'wp:create') && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreateTask}
              className="shadow-md rounded-xl bg-blue-600 hover:bg-blue-700 border-none font-semibold h-10 flex items-center gap-1.5"
            >
              {t('auditEngagements.createTasks', 'Tạo nhiệm vụ')}
            </Button>
          )}
          {hasPermission(currentUser, 'plan:create') && (
            <>
              <Button 
                type="default" 
                icon={<FileExcelOutlined />} 
                onClick={() => setIsImportModalVisible(true)}
                className="shadow-sm rounded-xl border-green-600 text-green-600 hover:bg-green-50 font-semibold h-10 flex items-center gap-1.5"
              >
                Nhập Excel
              </Button>
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={handleCreateEngagement}
                className="shadow-sm rounded-xl border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold h-10 flex items-center gap-1.5"
              >
                {t('auditEngagements.createACall', 'Tạo cuộc KT')}
              </Button>
            </>
          )}
        </Space>
      </div>

      {!selectedEngagement ? (
        <Tabs
          items={[
            {
              key: 'list',
              label: 'Danh sách cuộc kiểm toán',
              children: (
                <EngagementListTable
                  engagements={engagements}
                  loading={loading}
                  currentUser={currentUser}
                  customFieldsDef={customFieldsDef}
                  users={users}
                  onSelectEngagement={handleEngagementSelect}
                  onEditEngagement={handleEditEngagement}
                  onDeleteEngagement={deleteEngagement}
                  onOfficializeClick={(record) => {
                    setSelectedEngagement(record);
                    setIsOfficializeModalVisible(true);
                  }}
                />
              )
            },
            ...(hasPermission(currentUser, 'plan:approve') ? [{
              key: 'change-requests',
              label: 'Duyệt yêu cầu thay đổi',
              children: (
                <Card variant="borderless" className="shadow-sm mt-4">
                  <EngagementChangeRequests />
                </Card>
              )
            }] : [])
          ]}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {selectedEngagement.planApprovalStatus && (
            <Alert
              message={
                selectedEngagement.planApprovalStatus === 'Pending' ? 'Kế hoạch đang chờ phê duyệt' :
                selectedEngagement.planApprovalStatus === 'Approved' ? 'Kế hoạch đã được phê duyệt' :
                selectedEngagement.planApprovalStatus === 'Rejected' ? `Kế hoạch bị từ chối (Lý do: ${selectedEngagement.planApprovalNotes || 'Không có'})` :
                'Kế hoạch đang ở trạng thái Nháp'
              }
              type={
                selectedEngagement.planApprovalStatus === 'Pending' ? 'warning' :
                selectedEngagement.planApprovalStatus === 'Approved' ? 'success' :
                selectedEngagement.planApprovalStatus === 'Rejected' ? 'error' :
                'info'
              }
              showIcon
              action={
                <Space>
                  {(selectedEngagement.planApprovalStatus === 'Draft' || selectedEngagement.planApprovalStatus === 'Rejected') && (
                    <Button size="small" type="primary" onClick={submitPlan}>{t('common.btnSubmit', 'Trình duyệt')}</Button>
                  )}
                  {selectedEngagement.planApprovalStatus === 'Pending' && hasPermission(currentUser, 'plan:approve') && (
                    <>
                      <Button size="small" type="primary" className="bg-green-600" onClick={approvePlan}>{t('common.btnApprove', 'Phê duyệt')}</Button>
                      <Button size="small" danger onClick={rejectPlan}>{t('common.btnReject', 'Từ chối')}</Button>
                    </>
                  )}
                </Space>
              }
            />
          )}

          <EngagementHeaderBanner
            selectedEngagement={selectedEngagement}
            onBack={() => {
              setSelectedEngagement(null);
              setSearchParams({}, { replace: true });
            }}
          />

          {/* Interactive IIA Process Bar & Role/Personnel Navigation with Sequential Gating */}
          <AuditEngagementProcessBar
            selectedEngagement={selectedEngagement}
            activePhase={activePhase}
            setActivePhase={changeActivePhase}
            currentUser={currentUser}
            onOpenStageGateModal={handleOpenStageGateModal}
          />

          {/* 4 Main IIA Phase Tabs */}
          <Tabs
            activeKey={activePhase}
            onChange={handlePhaseTabChange}
            className="audit-phases-tabs mt-2"
            items={[
              {
                key: 'phase1',
                label: <span className="font-bold text-sm sm:text-base px-2">GIAI ĐOẠN 1: LẬP KẾ HOẠCH & CHUẨN BỊ (IIA 2200)</span>,
                children: (
                  <Phase1PlanningTab
                    selectedEngagement={selectedEngagement}
                    setSelectedEngagement={setSelectedEngagement}
                    users={users}
                    actualsForm={actualsForm}
                    safetyWarnings={safetyWarnings}
                    setEngagements={setEngagements}
                    fetchEngagements={fetchEngagements}
                    workstreams={workstreams}
                    workstreamColumns={workstreamColumns}
                    handleCreateWorkstream={handleCreateWorkstream}
                    closeWorkspace={closeWorkspace}
                    setIsRcmModalVisible={setIsRcmModalVisible}
                    currentUser={currentUser}
                    onOpenStageGateModal={handleOpenStageGateModal}
                  />
                )
              },
              {
                key: 'phase2',
                label: <span className="font-bold text-sm sm:text-base px-2">GIAI ĐOẠN 2: THỰC ĐỊA & THỬ NGHIỆM (IIA 2300)</span>,
                children: (
                  <Phase2FieldworkTab
                    selectedEngagement={selectedEngagement}
                    setSelectedEngagement={setSelectedEngagement}
                    tasks={tasks}
                    setTasks={setTasks}
                    currentUser={currentUser}
                    fetchTasks={fetchTasks}
                    handleCreateTask={handleCreateTask}
                    handleEditTask={handleEditTask}
                    deleteTask={deleteTask}
                    onDragEnd={onDragEnd}
                    STATUSES={STATUSES}
                    STATUS_LABELS={STATUS_LABELS}
                    STATUS_COLORS={STATUS_COLORS}
                    onOpenStageGateModal={handleOpenStageGateModal}
                  />
                )
              },
              {
                key: 'phase3',
                label: <span className="font-bold text-sm sm:text-base px-2">GIAI ĐOẠN 3: BÁO CÁO & KẾT QUẢ (IIA 2400)</span>,
                children: (
                  <Phase3ReportingTab
                    selectedEngagement={selectedEngagement}
                    currentUser={currentUser}
                    onOpenStageGateModal={handleOpenStageGateModal}
                  />
                )
              },
              {
                key: 'phase4',
                label: <span className="font-bold text-sm sm:text-base px-2">GIAI ĐOẠN 4: THEO DÕI & ĐÓNG CUỘC KT (IIA 2500 & 1300)</span>,
                children: (
                  <Phase4ClosureTab
                    selectedEngagement={selectedEngagement}
                    setSelectedEngagement={setSelectedEngagement}
                    currentUser={currentUser}
                    workstreams={workstreams}
                    fetchEngagements={fetchEngagements}
                    onOpenStageGateModal={handleOpenStageGateModal}
                  />
                )
              }
            ]}
          />

          {/* Stage Gate Verification Modal */}
          <StageGateModal
            visible={stageGateModalVisible}
            onClose={() => setStageGateModalVisible(false)}
            selectedEngagement={selectedEngagement}
            setSelectedEngagement={setSelectedEngagement}
            fetchEngagements={fetchEngagements}
            targetPhase={stageGateTargetPhase}
            setActivePhase={changeActivePhase}
          />
        </div>
      )}

      {/* Workstream Modal */}
      <AuditWorkstreamModal
        open={isWorkstreamModalVisible}
        editingWorkstream={editingWorkstream}
        workstreamForm={workstreamForm}
        users={users}
        onOk={saveWorkstream}
        onCancel={() => setIsWorkstreamModalVisible(false)}
      />

      {/* Task Modal */}
      <EngagementTaskModal
        open={isTaskModalVisible}
        editingTask={editingTask}
        taskForm={taskForm}
        users={users}
        statuses={STATUSES}
        statusLabels={STATUS_LABELS}
        priorities={PRIORITIES}
        onOk={saveTask}
        onCancel={() => setIsTaskModalVisible(false)}
      />

      {/* RCM Modal */}
      <EngagementRcmModal
        open={isRcmModalVisible}
        rcmList={rcmList}
        onCancel={() => { setIsRcmModalVisible(false); setSelectedRcmRows([]); }}
        onOk={handleImportFromRcm}
        onSelectionChange={setSelectedRcmRows}
      />

      <DataImportModal
        visible={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        moduleName="audit-engagements"
        onSuccess={() => fetchEngagements()}
      />

      {/* 2-PHASE OFFICIALIZATION MODAL */}
      <OfficializeModal
        visible={isOfficializeModalVisible}
        engagement={selectedEngagement}
        onCancel={() => setIsOfficializeModalVisible(false)}
        onSuccess={() => {
          setIsOfficializeModalVisible(false);
          fetchEngagements();
        }}
        users={users}
      />
    </div>
  );
};

export default AuditEngagements;


