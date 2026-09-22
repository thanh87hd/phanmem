import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  DatePicker, 
  Row, 
  Col, 
  Space, 
  Button, 
  Typography, 
  Tag, 
  Table, 
  Avatar, 
  message, 
  Modal, 
  Divider, 
  Radio, 
  Statistic, 
  Tooltip, 
  Badge,
  Select,
  Alert 
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined, 
  ClockCircleOutlined, 
  FileTextOutlined, 
  BugOutlined, 
  CheckCircleOutlined, 
  AuditOutlined, 
  TeamOutlined,
  FilterOutlined,
  EyeOutlined,
  UndoOutlined,
  SendOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import dayjs from 'dayjs';
import api from '../../services/api';
import { hasPermission } from '../../utils/permission';
import AuditMinutesTab from '../AuditMinutesTab';
import StageGateFooter from './StageGateFooter';
import { WorkingPaperDetailDrawer } from '../components/WorkingPaperDetailDrawer';
import FieldworkAlertBanner from './FieldworkAlertBanner';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Phase2FieldworkTabProps {
  selectedEngagement: any;
  setSelectedEngagement: React.Dispatch<React.SetStateAction<any>>;
  tasks: any[];
  setTasks: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: any;
  fetchTasks: (engagementId: number) => Promise<void>;
  handleCreateTask: () => void;
  handleEditTask: (task: any) => void;
  deleteTask: (id: number) => Promise<void>;
  onDragEnd: (result: DropResult) => Promise<void>;
  STATUSES: string[];
  STATUS_LABELS: Record<string, string>;
  STATUS_COLORS: Record<string, string>;
  onOpenStageGateModal?: (targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed') => void;
}

export const Phase2FieldworkTab: React.FC<Phase2FieldworkTabProps> = ({
  selectedEngagement,
  setSelectedEngagement,
  tasks,
  setTasks,
  currentUser,
  fetchTasks,
  handleCreateTask,
  handleEditTask,
  deleteTask,
  onDragEnd,
  STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  onOpenStageGateModal,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Local state for Entry meeting form
  const [entryForm] = Form.useForm();
  const [savingEntry, setSavingEntry] = useState(false);

  // Local state for Working Papers & Findings
  const [workingPapers, setWorkingPapers] = useState<any[]>([]);
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [loadingWp, setLoadingWp] = useState(false);
  const [findings, setFindings] = useState<any[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);

  // Drawer state for modern Working Paper details & review
  const [selectedWpForDrawer, setSelectedWpForDrawer] = useState<any | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [viewFilter, setViewFilter] = useState<'my' | 'all'>('my');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [wsViewFilter, setWsViewFilter] = useState<'my' | 'all'>('all');
  const [activeSubTab, setActiveSubTab] = useState<string>('entry-meeting');
  const [guideOpen, setGuideOpen] = useState<boolean>(true);

  // Modal state for Workstream 4-Eyes Review
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedWsForReview, setSelectedWsForReview] = useState<any | null>(null);
  const [reviewTargetStatus, setReviewTargetStatus] = useState<'Reviewed' | 'Rework'>('Reviewed');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingWs, setReviewingWs] = useState(false);

  const fetchWorkingPapers = async () => {
    if (!selectedEngagement?.id) return;
    setLoadingWp(true);
    try {
      const res = await api.get(`/working-papers?engagementId=${selectedEngagement.id}`);
      setWorkingPapers(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách W/P:', err);
    } finally {
      setLoadingWp(false);
    }
  };

  const fetchFindings = async () => {
    if (!selectedEngagement?.id) return;
    setLoadingFindings(true);
    try {
      const res = await api.get(`/audit-findings?engagementId=${selectedEngagement.id}`);
      setFindings(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách Phát hiện:', err);
    } finally {
      setLoadingFindings(false);
    }
  };

  const fetchWorkstreams = async () => {
    if (!selectedEngagement?.id) return;
    try {
      const res = await api.get(`/audit-engagements/${selectedEngagement.id}/workstreams`);
      setWorkstreams(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách phân hệ kiểm toán:', err);
    }
  };

  const completeWorkstream = async (id: number) => {
    try {
      await api.post(`/audit-workstreams/${id}/complete`);
      message.success('Đã đánh dấu hoàn thành phân hành kiểm toán');
      fetchWorkstreams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể hoàn thành phân hành');
    }
  };

  const handleOpenWsReview = (ws: any, target: 'Reviewed' | 'Rework') => {
    setSelectedWsForReview(ws);
    setReviewTargetStatus(target);
    setReviewNotes(target === 'Reviewed' ? 'Phân hành đã được soát xét độc lập, đạt chuẩn mực kiểm toán.' : '');
    setReviewModalVisible(true);
  };

  const handleConfirmWsReview = async () => {
    if (!selectedWsForReview) return;
    if (reviewTargetStatus === 'Rework' && !reviewNotes.trim()) {
      message.warning('Vui lòng nhập lý do / chỉ đạo yêu cầu hoàn thiện lại phân hành');
      return;
    }
    setReviewingWs(true);
    try {
      await api.post(`/audit-workstreams/${selectedWsForReview.id}/review`, {
        status: reviewTargetStatus,
        reviewNotes: reviewNotes.trim(),
      });
      message.success(
        reviewTargetStatus === 'Reviewed'
          ? 'Đã duyệt soát xét phân hành (Reviewed)'
          : 'Đã yêu cầu KTV hoàn thiện lại phân hành (Rework)'
      );
      setReviewModalVisible(false);
      fetchWorkstreams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái phân hành');
    } finally {
      setReviewingWs(false);
    }
  };

  useEffect(() => {
    if (selectedEngagement?.id) {
      fetchWorkingPapers();
      fetchFindings();
      fetchWorkstreams();
    }
  }, [selectedEngagement?.id]);

  const handleSaveEntryMeeting = async (values: any) => {
    setSavingEntry(true);
    try {
      await api.patch(`/audit-engagements/${selectedEngagement.id}`, {
        fieldworkStartDate: values.fieldworkDates?.[0] ? values.fieldworkDates[0].format('YYYY-MM-DD') : null,
        fieldworkEndDate: values.fieldworkDates?.[1] ? values.fieldworkDates[1].format('YYYY-MM-DD') : null,
        postalRepresentative: values.postalRepresentative,
        recipientList: values.recipientList,
      });
      message.success('Đã lưu thông tin Họp mở đầu & Kế hoạch thực địa');
      const res = await api.get(`/audit-engagements/${selectedEngagement.id}`);
      setSelectedEngagement(res.data);
    } catch (err) {
      message.error('Lỗi lưu thông tin họp mở đầu');
    } finally {
      setSavingEntry(false);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status);
  };

  const handleOpenDrawer = (wp: any = null) => {
    setSelectedWpForDrawer(wp);
    setIsDrawerVisible(true);
  };

  // Check if current user is Lead Auditor of this engagement
  const isLead = selectedEngagement?.leadAuditorId === currentUser?.id || 
                 currentUser?.role === 'admin' || 
                 currentUser?.role === 'audit_director';

  // Filter Working Papers based on Role & Assignment
  const filteredWorkingPapers = workingPapers.filter(wp => {
    if (viewFilter === 'my') {
      const isMine = (wp.creatorId && currentUser?.id && wp.creatorId === currentUser.id) ||
                     (wp.workstream?.assignedAuditorId && currentUser?.id && wp.workstream.assignedAuditorId === currentUser.id) ||
                     (wp.creator && currentUser?.fullName && wp.creator.toLowerCase().includes(currentUser.fullName.toLowerCase())) ||
                     (wp.creatorUser?.id && currentUser?.id && wp.creatorUser.id === currentUser.id);
      if (!isMine) return false;
    }
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Draft' && wp.status && wp.status !== 'Draft') return false;
      if (statusFilter === 'Submitted' && wp.status !== 'Submitted' && wp.status !== 'PendingReview') return false;
      if (statusFilter === 'Rework' && wp.status !== 'Rework' && wp.status !== 'Rejected') return false;
      if (statusFilter === 'Approved' && wp.status !== 'Approved') return false;
    }
    return true;
  });

  const myWpCount = workingPapers.filter(wp => 
    (wp.creatorId && currentUser?.id && wp.creatorId === currentUser.id) ||
    (wp.workstream?.assignedAuditorId && currentUser?.id && wp.workstream.assignedAuditorId === currentUser.id) ||
    (wp.creator && currentUser?.fullName && wp.creator.toLowerCase().includes(currentUser.fullName.toLowerCase())) ||
    (wp.creatorUser?.id && currentUser?.id && wp.creatorUser.id === currentUser.id)
  ).length;

  const currentUserId = currentUser?.userId || currentUser?.id;
  const filteredWorkstreams = workstreams.filter(ws => {
    if (wsViewFilter === 'my') {
      const isAssigned = (ws.assignedAuditorId && ws.assignedAuditorId === currentUserId) ||
                         (ws.reviewerId && ws.reviewerId === currentUserId) ||
                         (ws.assignedAuditorName && currentUser?.fullName && ws.assignedAuditorName.toLowerCase().includes(currentUser.fullName.toLowerCase()));
      if (!isAssigned) return false;
    }
    if (wsStatusFilter !== 'ALL') {
      if (wsStatusFilter === 'Overdue') {
        const isDone = ws.status === 'Completed' || ws.status === 'Reviewed';
        if (isDone || !ws.dueDate || !dayjs(ws.dueDate).isBefore(dayjs(), 'day')) return false;
      } else if (ws.status !== wsStatusFilter) {
        return false;
      }
    }
    return true;
  });

  const wsColumnsInPhase2 = [
    {
      title: 'Phân hành kiểm toán',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (val: string, r: any) => (
        <div>
          <div className="font-semibold text-slate-800">{val}</div>
          {r.scope && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.scope}</div>}
        </div>
      ),
    },
    {
      title: 'Vùng rủi ro',
      dataIndex: 'riskArea',
      key: 'riskArea',
      width: 150,
      render: (area: string) => <Tag color="blue">{area || 'Nghiệp vụ chung'}</Tag>,
    },
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
      width: 170,
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
    {
      title: 'KTV phụ trách',
      dataIndex: 'assignedAuditorName',
      key: 'assignedAuditorName',
      width: 150,
      render: (name: string) => (
        <Space size="small">
          <Avatar size="small" icon={<UserOutlined />} className="bg-indigo-100 text-indigo-600" />
          <span className="text-xs font-medium text-slate-700">{name || 'Chưa gắn'}</span>
        </Space>
      ),
    },
    {
      title: 'W/P liên kết',
      key: 'wpCount',
      width: 110,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const count = workingPapers.filter(wp => wp.workstreamId === record.id || wp.workstream?.id === record.id).length;
        return <Badge count={count} showZero style={{ backgroundColor: count > 0 ? '#4f46e5' : '#94a3b8' }} />;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (st: string, record: any) => {
        const color = st === 'Reviewed' ? 'green' : st === 'Completed' ? 'blue' : st === 'Rework' ? 'red' : 'default';
        return (
          <div>
            <Tag color={color} className="font-semibold">{st || 'Draft'}</Tag>
            {st === 'Rework' && record.reviewNotes && (
              <div className="text-[11px] text-rose-600 mt-1 italic line-clamp-2" title={record.reviewNotes}>
                Y/c: {record.reviewNotes}
              </div>
            )}
            {st === 'Reviewed' && record.reviewNotes && (
              <div className="text-[11px] text-emerald-600 mt-1 italic line-clamp-1" title={record.reviewNotes}>
                ✓ {record.reviewNotes}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space wrap size={4}>
          {record.status !== 'Reviewed' && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => completeWorkstream(record.id)}>
              Xong
            </Button>
          )}
          {(isLead || hasPermission(currentUser, 'wp:approve')) && (
            <>
              <Button size="small" type="primary" icon={<SafetyOutlined />} onClick={() => handleOpenWsReview(record, 'Reviewed')}>
                Duyệt
              </Button>
              <Button size="small" danger onClick={() => handleOpenWsReview(record, 'Rework')}>
                Làm lại
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const wpColumns = [
    { 
      title: 'Mã W/P', 
      dataIndex: 'paperCode', 
      key: 'paperCode', 
      width: 120,
      render: (val: string, r: any) => (
        <Tag color="geekblue" className="font-mono font-semibold">
          {r.referenceCode || val || `WP-${r.id}`}
        </Tag>
      )
    },
    { 
      title: 'Tiêu đề Giấy tờ làm việc', 
      dataIndex: 'title', 
      key: 'title', 
      render: (val: string, r: any) => (
        <div>
          <div className="font-semibold text-slate-800 hover:text-indigo-600 cursor-pointer" onClick={() => handleOpenDrawer(r)}>
            {val}
          </div>
          {r.workstream && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Phân hệ: <span className="text-slate-700 font-medium">{r.workstream.scope || r.workstream.title || r.workstream.riskArea}</span>
            </div>
          )}
        </div>
      )
    },
    { 
      title: 'Loại mẫu', 
      dataIndex: 'type', 
      key: 'type', 
      width: 140,
      render: (val: string, r: any) => {
        const domain = r.domain || val;
        const color = domain === 'credit' ? 'geekblue' : domain === 'ptd' ? 'purple' : 'default';
        const label = domain === 'credit' ? '💳 40 Cột Tín dụng' : domain === 'ptd' ? '📑 20 Cột PTD' : '📋 Chuẩn IIA';
        return <Tag color={color} className="font-medium text-xs">{label}</Tag>;
      }
    },
    { 
      title: 'KTV phụ trách', 
      dataIndex: ['creatorUser', 'fullName'], 
      key: 'creator', 
      width: 160,
      render: (val: string, r: any) => {
        const name = val || r.creator || 'KTV';
        const isMe = (r.creatorId && r.creatorId === currentUser?.id) || 
                     (currentUser?.fullName && name.toLowerCase().includes(currentUser.fullName.toLowerCase()));
        return (
          <Space size={4}>
            <Avatar size="small" icon={<UserOutlined />} className={isMe ? "bg-amber-500 text-white" : "bg-blue-100 text-blue-600"} />
            <div>
              <span className={`text-xs font-semibold ${isMe ? 'text-amber-700' : 'text-slate-700'}`}>{name}</span>
              {isMe && <Tag color="gold" className="text-[9px] px-1 py-0 ml-1">Tôi</Tag>}
            </div>
          </Space>
        );
      }
    },
    { 
      title: 'Trưởng đoàn soát xét', 
      dataIndex: ['reviewerUser', 'fullName'], 
      key: 'reviewer', 
      width: 160,
      render: (val: string, r: any) => {
        const revName = val || r.reviewer || selectedEngagement?.leadAuditor?.fullName || '-';
        return <span className="text-xs text-slate-600 font-medium">{revName}</span>;
      }
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      width: 130,
      render: (st: string) => {
        const isApproved = st === 'Approved';
        const isSubmitted = st === 'Submitted' || st === 'PendingReview';
        const isRework = st === 'Rework' || st === 'Rejected';
        const color = isApproved ? 'success' : isSubmitted ? 'processing' : isRework ? 'error' : 'default';
        const label = isApproved ? '✓ Đã duyệt' : isSubmitted ? '⏳ Chờ duyệt' : isRework ? '⚠️ Yêu cầu sửa' : '✏️ Bản nháp';
        return <Tag color={color} className="font-semibold text-xs">{label}</Tag>;
      }
    },
    {
      title: 'Mẫu kiểm tra',
      key: 'samples',
      width: 140,
      render: (_: any, r: any) => {
        const stats = r.sampleStats;
        if (!stats || stats.total === 0) return <Text type="secondary" className="text-xs italic">Không áp dụng</Text>;
        const isDone = stats.untested === 0;
        return (
          <div className="text-xs">
            <span className={isDone ? "text-emerald-600 font-bold" : "text-amber-600 font-semibold"}>
              {stats.tested}/{stats.total} ({stats.completionRate || Math.round((stats.tested / stats.total) * 100)}%)
            </span>
            {isDone ? (
              <span className="block text-[10px] text-emerald-600">✓ 100% Hoàn thành</span>
            ) : (
              <span className="block text-[10px] text-amber-600">Còn {stats.untested} mẫu</span>
            )}
          </div>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_: any, r: any) => {
        const isSubmitted = r.status === 'Submitted' || r.status === 'PendingReview';
        const isRework = r.status === 'Rework' || r.status === 'Rejected';
        return (
          <Space size="small">
            <Button 
              type="primary" 
              size="small" 
              icon={isLead && isSubmitted ? <SafetyOutlined /> : <EditOutlined />} 
              onClick={() => handleOpenDrawer(r)}
              className={isLead && isSubmitted ? "bg-amber-600 hover:bg-amber-700 text-xs font-semibold" : "bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"}
            >
              {isLead && isSubmitted ? 'Soát xét' : isRework ? 'Sửa lại' : 'Chi tiết'}
            </Button>
          </Space>
        );
      }
    }
  ];

  const findingColumns = [
    { title: 'Mã phát hiện', dataIndex: 'findingCode', key: 'findingCode', width: 120, render: (val: string) => <Tag color="orange" className="font-bold">{val || 'Finding'}</Tag> },
    { title: 'Tiêu đề phát hiện (5C Condition)', dataIndex: 'findingTitle', key: 'findingTitle', width: 240, ellipsis: true, render: (val: string) => <span className="font-semibold text-slate-800">{val}</span> },
    { 
      title: 'Mức độ rủi ro', 
      dataIndex: 'riskLevel', 
      key: 'riskLevel',
      width: 130,
      render: (level: string) => {
        const color = level === 'Critical' ? 'magenta' : level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'green';
        return <Tag color={color} className="font-bold">{level || 'Low'}</Tag>;
      }
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      width: 120,
      render: (st: string) => <Tag color={st === 'Confirmed' ? 'green' : st === 'Open' ? 'blue' : 'default'}>{st || 'Open'}</Tag>
    },
    { title: 'Hậu quả (Consequence)', dataIndex: 'consequence', key: 'consequence', width: 220, ellipsis: true },
    { title: 'Khuyến nghị (Recommendation)', dataIndex: 'recommendation', key: 'recommendation', width: 220, ellipsis: true },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: () => (
        <Button type="link" onClick={() => navigate('/audit-findings')}>
          Xem chi tiết
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <FieldworkAlertBanner
        selectedEngagement={selectedEngagement}
        currentUser={currentUser}
        workingPapers={workingPapers}
        workstreams={workstreams}
        findings={findings}
      />
      {/* ═══ GUIDED FIELDWORK WORKFLOW (4 BƯỚC CHUẨN IIA) ═══ */}
      <Card 
        size="small" 
        className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-slate-50 shadow-sm rounded-xl mb-1"
        title={
          <div className="flex items-center justify-between">
            <Space className="text-indigo-900 font-bold text-xs sm:text-sm">
              <AuditOutlined className="text-indigo-600 text-base" />
              <span>Quy Trình Kiểm Toán Thực Địa Chuẩn LPBank (4 Bước Chuẩn IIA)</span>
            </Space>
            <Button 
              type="link" 
              size="small" 
              className="text-indigo-700 font-semibold text-xs p-0"
              onClick={() => setGuideOpen(!guideOpen)}
            >
              {guideOpen ? 'Thu gọn ▲' : 'Xem chỉ dẫn ▼'}
            </Button>
          </div>
        }
      >
        {guideOpen && (
          <Row gutter={[10, 10]} className="pt-1">
            {/* Step 1 */}
            <Col xs={24} sm={12} lg={6}>
              <div 
                onClick={() => setActiveSubTab('workstreams')}
                className={`p-3 rounded-lg border cursor-pointer transition-all h-full flex flex-col justify-between ${
                  activeSubTab === 'workstreams' 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300' 
                    : 'bg-white hover:border-blue-400 border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${activeSubTab === 'workstreams' ? 'text-blue-100' : 'text-blue-600'}`}>
                    1. Phân Hành & Hạn Chót
                  </div>
                  <div className={`text-xs font-semibold ${activeSubTab === 'workstreams' ? 'text-white' : 'text-slate-800'}`}>
                    Nhận phân công rủi ro & deadline
                  </div>
                  <div className={`text-[11px] mt-1 ${activeSubTab === 'workstreams' ? 'text-blue-100' : 'text-slate-500'}`}>
                    {workstreams.length} phân hành đã phân giao
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className={`text-[11px] font-semibold underline ${activeSubTab === 'workstreams' ? 'text-white' : 'text-blue-600'}`}>
                    Chuyển đến Tab 2.2 →
                  </span>
                </div>
              </div>
            </Col>

            {/* Step 2 */}
            <Col xs={24} sm={12} lg={6}>
              <div 
                onClick={() => setActiveSubTab('entry-meeting')}
                className={`p-3 rounded-lg border cursor-pointer transition-all h-full flex flex-col justify-between ${
                  activeSubTab === 'entry-meeting' 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300' 
                    : 'bg-white hover:border-blue-400 border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${activeSubTab === 'entry-meeting' ? 'text-blue-100' : 'text-blue-600'}`}>
                    2. Khảo Sát & Lấy Mẫu
                  </div>
                  <div className={`text-xs font-semibold ${activeSubTab === 'entry-meeting' ? 'text-white' : 'text-slate-800'}`}>
                    Họp mở đầu & Chọn mẫu kiểm tra
                  </div>
                  <div className={`text-[11px] mt-1 ${activeSubTab === 'entry-meeting' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Tín dụng, phi tín dụng & tự động
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className={`text-[11px] font-semibold underline ${activeSubTab === 'entry-meeting' ? 'text-white' : 'text-blue-600'}`}>
                    Chuyển đến Tab 2.1 →
                  </span>
                </div>
              </div>
            </Col>

            {/* Step 3 */}
            <Col xs={24} sm={12} lg={6}>
              <div 
                onClick={() => setActiveSubTab('working-papers')}
                className={`p-3 rounded-lg border cursor-pointer transition-all h-full flex flex-col justify-between ${
                  activeSubTab === 'working-papers' || activeSubTab === 'findings' 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300' 
                    : 'bg-white hover:border-blue-400 border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${activeSubTab === 'working-papers' || activeSubTab === 'findings' ? 'text-blue-100' : 'text-blue-600'}`}>
                    3. Lập W/P & Ghi Phát Hiện
                  </div>
                  <div className={`text-xs font-semibold ${activeSubTab === 'working-papers' || activeSubTab === 'findings' ? 'text-white' : 'text-slate-800'}`}>
                    Đánh giá kiểm soát & Ghi Finding 5C
                  </div>
                  <div className={`text-[11px] mt-1 ${activeSubTab === 'working-papers' || activeSubTab === 'findings' ? 'text-blue-100' : 'text-slate-500'}`}>
                    {workingPapers.length} W/P • {findings.length} Phát hiện
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className={`text-[11px] font-semibold underline ${activeSubTab === 'working-papers' || activeSubTab === 'findings' ? 'text-white' : 'text-blue-600'}`}>
                    Chuyển đến Tab 2.4/2.5 →
                  </span>
                </div>
              </div>
            </Col>

            {/* Step 4 */}
            <Col xs={24} sm={12} lg={6}>
              <div 
                onClick={() => {
                  setActiveSubTab('working-papers');
                  setViewFilter('my');
                  setStatusFilter('Submitted');
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all h-full flex flex-col justify-between ${
                  statusFilter === 'Submitted' && activeSubTab === 'working-papers' 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300' 
                    : 'bg-white hover:border-blue-400 border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${statusFilter === 'Submitted' && activeSubTab === 'working-papers' ? 'text-blue-100' : 'text-blue-600'}`}>
                    4. Soát Xét 4 Mắt
                  </div>
                  <div className={`text-xs font-semibold ${statusFilter === 'Submitted' && activeSubTab === 'working-papers' ? 'text-white' : 'text-slate-800'}`}>
                    Nộp duyệt & Thẩm định độc lập
                  </div>
                  <div className={`text-[11px] mt-1 ${statusFilter === 'Submitted' && activeSubTab === 'working-papers' ? 'text-blue-100' : 'text-slate-500'}`}>
                    {workingPapers.filter(w => w.status === 'Submitted' || w.status === 'PendingReview').length} W/P chờ soát xét
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className={`text-[11px] font-semibold underline ${statusFilter === 'Submitted' && activeSubTab === 'working-papers' ? 'text-white' : 'text-blue-600'}`}>
                    Lọc W/P 4 mắt →
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Card>
      <Tabs
        type="card"
        className="mt-2"
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={[
        {
          key: 'entry-meeting',
          label: <span className="font-medium">2.1. Họp mở đầu & Kế hoạch thực địa (Entry Conference)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="mb-4">
                <Title level={5} className="!mb-1">Họp mở đầu với Đơn vị được kiểm toán (IIA Standard 13.1)</Title>
                <Text type="secondary">Công bố Quyết định kiểm toán, thành phần đoàn, thống nhất lịch trình làm việc và đầu mối cung cấp hồ sơ/tài liệu.</Text>
              </div>
              <Divider />
              <Form
                form={entryForm}
                layout="vertical"
                initialValues={{
                  fieldworkDates: [
                    selectedEngagement.fieldworkStartDate ? dayjs(selectedEngagement.fieldworkStartDate) : null,
                    selectedEngagement.fieldworkEndDate ? dayjs(selectedEngagement.fieldworkEndDate) : null,
                  ],
                  postalRepresentative: selectedEngagement.postalRepresentative,
                  recipientList: selectedEngagement.recipientList,
                }}
                onFinish={handleSaveEntryMeeting}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="fieldworkDates" label={<span className="font-semibold">Thời gian làm việc tại Thực địa (Fieldwork Period)</span>}>
                      <DatePicker.RangePicker className="w-full h-10 rounded-lg" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="postalRepresentative" label={<span className="font-semibold">Đại diện Đơn vị được kiểm toán / Đầu mối phối hợp</span>}>
                      <Input placeholder="Họ tên, chức vụ, số điện thoại đầu mối..." className="h-10 rounded-lg" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="recipientList" label={<span className="font-semibold">Nội dung thống nhất tại cuộc Họp mở đầu</span>}>
                      <TextArea rows={4} placeholder="Ghi chép các nội dung thống nhất về cách thức làm việc, phương thức trích xuất dữ liệu, phòng làm việc thực địa..." />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" loading={savingEntry} className="h-10 px-6 rounded-xl bg-blue-600 font-semibold">
                  Lưu thông tin Họp mở đầu
                </Button>
              </Form>
            </Card>
          )
        },
        {
          key: 'workstreams',
          label: (
            <span className="font-medium flex items-center gap-1.5">
              <span>2.2. Phân hành kiểm toán & Hạn hoàn thành</span>
              <Badge count={workstreams.length} overflowCount={99} style={{ backgroundColor: '#0284c7' }} />
            </span>
          ),
          children: (
            <div className="space-y-4">
              {/* Header Stats */}
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Card size="small" className="rounded-xl border border-slate-200">
                    <Statistic
                      title={<span className="text-xs font-semibold text-slate-500">TỔNG PHÂN HÀNH</span>}
                      value={workstreams.length}
                      prefix={<TeamOutlined className="text-blue-600 mr-1" />}
                      valueStyle={{ color: '#1e293b', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-slate-400 font-normal">phần hành</span>}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" className="rounded-xl border border-slate-200">
                    <Statistic
                      title={<span className="text-xs font-semibold text-slate-500">ĐÃ HOÀN THÀNH / SOÁT XÉT</span>}
                      value={workstreams.filter(w => w.status === 'Completed' || w.status === 'Reviewed').length}
                      prefix={<CheckCircleOutlined className="text-green-600 mr-1" />}
                      valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-slate-400 font-normal">phần hành</span>}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" className="rounded-xl border border-slate-200">
                    <Statistic
                      title={<span className="text-xs font-semibold text-slate-500">ĐANG THỰC HIỆN</span>}
                      value={workstreams.filter(w => w.status === 'Draft' || w.status === 'InProgress').length}
                      prefix={<ClockCircleOutlined className="text-amber-500 mr-1" />}
                      valueStyle={{ color: '#ea9105', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-slate-400 font-normal">phần hành</span>}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" className="rounded-xl border border-slate-200">
                    <Statistic
                      title={<span className="text-xs font-semibold text-slate-500">QUÁ HẠN KIỂM TOÁN</span>}
                      value={workstreams.filter(w => {
                        const isDone = w.status === 'Completed' || w.status === 'Reviewed';
                        return !isDone && w.dueDate && dayjs(w.dueDate).isBefore(dayjs(), 'day');
                      }).length}
                      prefix={<ExclamationCircleOutlined className="text-red-600 mr-1" />}
                      valueStyle={{ color: '#dc2626', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-slate-400 font-normal">phần hành</span>}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Filter Row & Table */}
              <Card size="small" className="rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                  <Space size="middle">
                    <Radio.Group
                      value={wsViewFilter}
                      onChange={e => setWsViewFilter(e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      size="middle"
                    >
                      <Radio.Button value="all">Tất cả ({workstreams.length})</Radio.Button>
                      <Radio.Button value="my">Phân hành của tôi ({
                        workstreams.filter(ws => (ws.assignedAuditorId && ws.assignedAuditorId === currentUserId) || (ws.reviewerId && ws.reviewerId === currentUserId)).length
                      })</Radio.Button>
                    </Radio.Group>

                    <Select
                      value={wsStatusFilter}
                      onChange={setWsStatusFilter}
                      style={{ width: 170 }}
                      placeholder="Lọc trạng thái"
                    >
                      <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
                      <Select.Option value="Draft">Nháp (Draft)</Select.Option>
                      <Select.Option value="Completed">Hoàn thành (Completed)</Select.Option>
                      <Select.Option value="Reviewed">Đã soát xét (Reviewed)</Select.Option>
                      <Select.Option value="Rework">Cần làm lại (Rework)</Select.Option>
                      <Select.Option value="Overdue">⚠️ Quá hạn</Select.Option>
                    </Select>
                  </Space>

                  <Text type="secondary" className="text-xs">
                    Kiểm soát tiến độ theo phân hành, giao hạn chi tiết cho từng KTV (IIA Standard 2240).
                  </Text>
                </div>

                <Table
                  columns={wsColumnsInPhase2}
                  dataSource={filteredWorkstreams}
                  rowKey="id"
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 1200 }}
                  className="rounded-lg overflow-hidden"
                />
              </Card>
            </div>
          )
        },
        {
          key: 'tasks',
          label: <span className="font-medium">2.3. Bảng Kanban Nhiệm vụ & Phân công</span>,
          children: (
            <div className="pt-2">
              <div className="flex justify-between items-center mb-3">
                <Text type="secondary">Quản lý và giám sát tiến độ công việc hàng ngày của từng thành viên trong đoàn (IIA Standard 14.6).</Text>
                {hasPermission(currentUser, 'wp:create') && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTask} className="rounded-lg">
                    Tạo nhiệm vụ mới
                  </Button>
                )}
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-420px)]">
                  {STATUSES.map(status => (
                    <div key={status} className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4 flex flex-col border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <Title level={5} className="!mb-0">{STATUS_LABELS[status]}</Title>
                        <Tag color={STATUS_COLORS[status]} className="!mr-0 rounded-full font-bold">{getTasksByStatus(status).length}</Tag>
                      </div>
                      <Droppable droppableId={status}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto transition-colors rounded-md p-1 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}>
                            {getTasksByStatus(status).map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <Card ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} size="small" className={`mb-3 shadow-sm cursor-grab active:cursor-grabbing border-l-4 ${task.priority === 'High' ? 'border-l-red-500' : task.priority === 'Medium' ? 'border-l-orange-500' : 'border-l-green-500'} ${snapshot.isDragging ? 'opacity-80 rotate-2' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                      <Text strong className="line-clamp-2">{task.title}</Text>
                                      <Space>
                                        {hasPermission(currentUser, 'wp:create') && <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditTask(task)} className="p-0" />}
                                        {hasPermission(currentUser, 'wp:delete') && <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteTask(task.id)} className="p-0" />}
                                      </Space>
                                    </div>
                                    {task.description && <Text type="secondary" className="block text-xs mb-3 line-clamp-2">{task.description}</Text>}
                                    <div className="flex justify-between items-center">
                                      <Space size="small">
                                        <Avatar size="small" icon={<UserOutlined />} className="bg-blue-100 text-blue-600" />
                                        <Text className="text-xs">{task.assignedTo || 'Unassigned'}</Text>
                                      </Space>
                                      {task.dueDate && <Tag className="!mr-0 text-xs flex items-center gap-1" color={dayjs(task.dueDate).isBefore(dayjs()) && task.status !== 'Done' ? 'error' : 'default'}><ClockCircleOutlined /> {dayjs(task.dueDate).format('DD/MM')}</Tag>}
                                    </div>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            </div>
          )
        },
        {
          key: 'working-papers',
          label: (
            <span className="font-medium flex items-center gap-1.5">
              <span>2.4. Giấy tờ làm việc W/P</span>
              <Badge count={workingPapers.length} overflowCount={99} style={{ backgroundColor: '#4f46e5' }} />
            </span>
          ),
          children: (
            <div className="space-y-4">
              {/* Personnel Workload & Progress Cards */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="rounded-xl shadow-sm border border-slate-200 bg-white">
                    <Statistic
                      title={<span className="text-xs text-slate-500 font-semibold">TỔNG W/P CUỘC KIỂM TOÁN</span>}
                      value={workingPapers.length}
                      prefix={<FileTextOutlined className="text-indigo-600 mr-1" />}
                      valueStyle={{ color: '#1e293b', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-slate-400 font-normal">hồ sơ</span>}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">
                      {workstreams.length} phân hệ kiểm toán được lập
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
                    <Statistic
                      title={<span className="text-xs text-amber-800 font-semibold">W/P PHÂN CÔNG CHO TÔI</span>}
                      value={myWpCount}
                      prefix={<UserOutlined className="text-amber-600 mr-1" />}
                      valueStyle={{ color: '#d97706', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-amber-600 font-normal">W/P</span>}
                    />
                    <div className="mt-1 text-[11px] text-amber-700">
                      {workingPapers.filter(w => ((w.creatorId === currentUser?.id) || (w.workstream?.assignedAuditorId === currentUser?.id)) && w.status === 'Approved').length} / {myWpCount} đã hoàn thành
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="rounded-xl shadow-sm border border-blue-200 bg-blue-50/30">
                    <Statistic
                      title={<span className="text-xs text-blue-800 font-semibold">CHỜ SOÁT XÉT / YÊU CẦU SỬA</span>}
                      value={workingPapers.filter(w => w.status === 'Submitted' || w.status === 'PendingReview' || w.status === 'Rework' || w.status === 'Rejected').length}
                      prefix={<ExclamationCircleOutlined className="text-blue-600 mr-1" />}
                      valueStyle={{ color: '#2563eb', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-blue-600 font-normal">W/P</span>}
                    />
                    <div className="mt-1 text-[11px] text-blue-700">
                      {workingPapers.filter(w => w.status === 'Rework' || w.status === 'Rejected').length} W/P cần KTV chỉnh sửa lại
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/30">
                    <Statistic
                      title={<span className="text-xs text-emerald-800 font-semibold">ĐÃ PHÊ DUYỆT (HOÀN THÀNH)</span>}
                      value={workingPapers.filter(w => w.status === 'Approved').length}
                      prefix={<CheckCircleOutlined className="text-emerald-600 mr-1" />}
                      valueStyle={{ color: '#059669', fontWeight: 700, fontSize: 20 }}
                      suffix={<span className="text-xs text-emerald-600 font-normal">W/P</span>}
                    />
                    <div className="mt-1 text-[11px] text-emerald-700">
                      Đã đồng bộ số liệu vào Biên bản MB04
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Main Card with Filter Bar & Table */}
              <Card variant="borderless" className="shadow-sm rounded-xl">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Role / Assignment toggle */}
                    <Radio.Group 
                      value={viewFilter} 
                      onChange={(e) => setViewFilter(e.target.value)}
                      buttonStyle="solid"
                      size="middle"
                    >
                      <Radio.Button value="my">
                        <span className="font-semibold text-xs">📌 Việc của tôi ({myWpCount})</span>
                      </Radio.Button>
                      <Radio.Button value="all">
                        <span className="font-semibold text-xs">🌐 Toàn đoàn ({workingPapers.length})</span>
                      </Radio.Button>
                    </Radio.Group>

                    {/* Status filter pills */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-slate-400 font-medium">Lọc:</span>
                      {[
                        { key: 'ALL', label: 'Tất cả' },
                        { key: 'Draft', label: 'Bản nháp' },
                        { key: 'Submitted', label: 'Chờ duyệt' },
                        { key: 'Rework', label: 'Yêu cầu sửa' },
                        { key: 'Approved', label: 'Đã duyệt' }
                      ].map(st => (
                        <Tag.CheckableTag
                          key={st.key}
                          checked={statusFilter === st.key}
                          onChange={() => setStatusFilter(st.key)}
                          className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                            statusFilter === st.key ? '!bg-indigo-600 !text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st.label}
                        </Tag.CheckableTag>
                      ))}
                    </div>
                  </div>

                  <Space wrap>
                    {hasPermission(currentUser, 'wp:create') && (
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        className="bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs h-9 rounded-lg"
                        onClick={() => handleOpenDrawer(null)}
                      >
                        Thêm Giấy tờ làm việc
                      </Button>
                    )}
                    <Button 
                      type="default" 
                      icon={<FileTextOutlined />} 
                      className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs h-9 rounded-lg"
                      onClick={() => navigate('/working-papers', { state: { engagementId: selectedEngagement.id, engagementName: selectedEngagement.name } })}
                    >
                      Bàn làm việc mở rộng
                    </Button>
                  </Space>
                </div>

                <Table 
                  columns={wpColumns} 
                  dataSource={filteredWorkingPapers} 
                  rowKey="id" 
                  loading={loadingWp} 
                  pagination={{ pageSize: 6 }} 
                  scroll={{ x: 1210 }}
                  className="rounded-lg overflow-hidden"
                />
              </Card>
            </div>
          )
        },
        {
          key: 'findings',
          label: <span className="font-medium">2.5. Phát hiện kiểm toán 5C ({findings.length})</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Title level={5} className="!mb-1">Phát hiện Kiểm toán chuẩn 5C (IIA Standard 2320 / Standard 14.3)</Title>
                  <Text type="secondary">Chuẩn hóa theo 5 yếu tố: Hiện trạng (Condition), Tiêu chuẩn (Criteria), Nguyên nhân (Cause), Hậu quả (Consequence), Khuyến nghị (Recommendation).</Text>
                </div>
                <Button 
                  type="primary" 
                  icon={<BugOutlined />} 
                  onClick={() => navigate('/audit-findings')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Quản lý Phát hiện
                </Button>
              </div>
              <Table 
                columns={findingColumns} 
                dataSource={findings} 
                rowKey="id" 
                loading={loadingFindings} 
                pagination={{ pageSize: 6 }} 
                scroll={{ x: 1170 }}
              />
            </Card>
          )
        },
        {
          key: 'minutes',
          label: <span className="font-medium">2.6. Biên bản kiểm toán thực địa MB04 (Exit Meeting)</span>,
          children: (
            <AuditMinutesTab engagementId={selectedEngagement.id} />
          )
        }
      ]}
    />
    <StageGateFooter
      currentPhaseKey="phase2"
      engagementStatus={selectedEngagement?.status || 'Planning'}
      responsibleRole="Kiểm toán viên thành viên đoàn & Trưởng nhóm soát xét"
      assignedPersonnel={selectedEngagement?.teamMembers?.length > 0 ? `${selectedEngagement.teamMembers.length} KTV đoàn kiểm toán` : 'Chưa phân công KTV'}
      nextPhaseTitle="Giai đoạn 3: Báo cáo & Kết quả (IIA 2400)"
      onTriggerNextGate={() => onOpenStageGateModal?.('phase3')}
      canProceed={true}
    />

    {/* Modal Soát Xét Phân Hành Kiểm Toán (Four-Eyes Gate) */}
    <Modal
      title={
        <Space>
          <SafetyOutlined className={reviewTargetStatus === 'Reviewed' ? 'text-emerald-500' : 'text-rose-500'} />
          <span className="font-semibold text-slate-800">
            {reviewTargetStatus === 'Reviewed' ? 'Phê Duyệt Soát Xét Phân Hành (Reviewed)' : 'Yêu Cầu Hoàn Thiện Lại Phân Hành (Rework)'}
          </span>
        </Space>
      }
      open={reviewModalVisible}
      onOk={handleConfirmWsReview}
      onCancel={() => setReviewModalVisible(false)}
      confirmLoading={reviewingWs}
      okText={reviewTargetStatus === 'Reviewed' ? 'Xác nhận duyệt' : 'Gửi yêu cầu Rework'}
      okButtonProps={{ danger: reviewTargetStatus === 'Rework' }}
      destroyOnClose
    >
      <div className="py-2 space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Phân hành kiểm toán:</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">
            {selectedWsForReview?.title || selectedWsForReview?.scope || selectedWsForReview?.riskArea}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            KTV thực hiện: <span className="font-medium text-slate-700">{selectedWsForReview?.assignedAuditorName || 'Chưa phân công'}</span>
          </div>
        </div>

        {reviewTargetStatus === 'Rework' ? (
          <Alert
            type="warning"
            showIcon
            message="Yêu cầu KTV hoàn thiện bổ sung"
            description="Phân hành sẽ chuyển sang trạng thái 'Rework'. Kiểm toán viên phụ trách cần rà soát lại hồ sơ và bằng chứng trước khi trình soát xét lại."
            className="text-xs"
          />
        ) : (
          <Alert
            type="success"
            showIcon
            message="Chuẩn hóa kiểm soát chất lượng (Four-Eyes)"
            description="Xác nhận phân hành đã được Trưởng đoàn/Trưởng nhóm soát xét độc lập đầy đủ về phương pháp và bằng chứng kiểm toán."
            className="text-xs"
          />
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ý kiến soát xét & Chỉ đạo của Trưởng đoàn / Trưởng nhóm <span className="text-rose-500">*</span>
          </label>
          <Input.TextArea
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={
              reviewTargetStatus === 'Rework'
                ? 'Ghi rõ các nội dung hồ sơ/thủ tục KTV cần chỉnh sửa, bổ sung bằng chứng...'
                : 'Ý kiến kết luận soát xét hồ sơ phân hành...'
            }
          />
        </div>
      </div>
    </Modal>

    {/* Modern Working Paper Detail & 4-Eyes Review Drawer */}
    <WorkingPaperDetailDrawer
      visible={isDrawerVisible}
      onClose={() => {
        setIsDrawerVisible(false);
        setSelectedWpForDrawer(null);
      }}
      workingPaper={selectedWpForDrawer}
      selectedEngagement={selectedEngagement}
      currentUser={currentUser}
      onSaved={() => {
        fetchWorkingPapers();
        fetchFindings();
      }}
      workstreams={workstreams}
    />
  </div>
  );
};
export default Phase2FieldworkTab;
