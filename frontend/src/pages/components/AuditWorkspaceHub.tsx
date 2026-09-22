import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Typography, 
  Tag, 
  Progress, 
  Button, 
  Space, 
  Table, 
  Avatar, 
  Badge, 
  Tooltip, 
  Empty, 
  Spin, 
  Select,
  Segmented,
  Alert
} from 'antd';
import { 
  ProjectOutlined, 
  FileDoneOutlined, 
  BugOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  ArrowRightOutlined, 
  FilePdfOutlined, 
  AlertOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SafetyOutlined,
  UndoOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useCurrentUser } from '../../utils/useCurrentUser';

const { Title, Text, Paragraph } = Typography;

export const AuditWorkspaceHub: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [workingPapers, setWorkingPapers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dossierMap, setDossierMap] = useState<Record<number, any[]>>({});
  const [selectedEngagementId, setSelectedEngagementId] = useState<number | null>(null);
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [loadingWorkstreams, setLoadingWorkstreams] = useState(false);

  // Phase C: KTV Personal Workspace states
  const [hubMode, setHubMode] = useState<'my' | 'all'>('my');
  const [wpStatusTab, setWpStatusTab] = useState<'all' | 'rework' | 'draft' | 'submitted' | 'approved'>('all');
  const [pendingVerificationRecs, setPendingVerificationRecs] = useState<any[]>([]);
  const [allAssignedWorkstreams, setAllAssignedWorkstreams] = useState<any[]>([]);

  const userRole = ((typeof currentUser?.role === 'object' ? currentUser?.role?.name : currentUser?.role) || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || currentUser?.username === 'admin';
  const isLead = isAdmin || userRole.includes('trưởng đoàn') || userRole.includes('trưởng ban') || userRole.includes('lãnh đạo');
  const currentUserId = currentUser?.userId || currentUser?.id;
  const currentFullName = currentUser?.fullName || currentUser?.username || '';

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      setLoading(true);
      try {
        const [engRes, wpRes, taskRes, recRes] = await Promise.all([
          api.get('/audit-engagements').catch(() => ({ data: [] })),
          api.get('/working-papers').catch(() => ({ data: [] })),
          api.get('/audit-tasks').catch(() => ({ data: [] })),
          api.get('/recommendations?closureStatus=PendingKTNBReview').catch(() => ({ data: [] })),
        ]);

        const engData = Array.isArray(engRes.data) ? engRes.data : [];
        const wpData = Array.isArray(wpRes.data) ? wpRes.data : [];
        const taskData = Array.isArray(taskRes.data) ? taskRes.data : [];
        const recData = Array.isArray(recRes.data) ? recRes.data : [];

        setEngagements(engData);
        setWorkingPapers(wpData);
        setTasks(taskData);
        setPendingVerificationRecs(recData);

        // Fetch dossier documents & workstreams for active engagements
        const activeEngs = engData.slice(0, 6);
        const map: Record<number, any[]> = {};
        const wsCollector: any[] = [];

        await Promise.all(
          activeEngs.map(async (eng: any) => {
            try {
              const [dRes, wsRes] = await Promise.all([
                api.get(`/documents?linkedResource=engagement&linkedResourceId=${eng.id}`).catch(() => ({ data: [] })),
                api.get(`/audit-engagements/${eng.id}/workstreams`).catch(() => ({ data: [] })),
              ]);
              map[eng.id] = Array.isArray(dRes.data) ? dRes.data : [];
              if (Array.isArray(wsRes.data)) {
                wsRes.data.forEach((ws: any) => {
                  wsCollector.push({ ...ws, engagementName: eng.name, engagementId: eng.id });
                });
              }
            } catch {
              map[eng.id] = [];
            }
          })
        );
        setDossierMap(map);
        setAllAssignedWorkstreams(wsCollector);
      } catch (err) {
        console.error('Error loading audit workspace data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, []);

  // Filter engagements where user is member or lead
  const assignedEngagements = engagements.filter((eng: any) => {
    if (isLead && hubMode === 'all') return true;
    const isLeadOfEng = eng.leadAuditorId === currentUserId || eng.leadAuditor === currentFullName;
    const isMember = (eng.teamMembers || []).some(
      (m: any) => m.userId === currentUserId || m.fullName === currentFullName
    );
    return isLeadOfEng || isMember;
  });
  const myEngagements = (isLead && hubMode === 'all') ? engagements : (assignedEngagements.length > 0 ? assignedEngagements : engagements);

  // Filter WPs
  const assignedWps = workingPapers.filter((wp: any) => {
    if (isLead && hubMode === 'all') return true;
    return (
      wp.assignedToId === currentUserId ||
      wp.creatorId === currentUserId ||
      wp.auditorName === currentFullName ||
      (wp.creator && currentFullName && wp.creator.toLowerCase().includes(currentFullName.toLowerCase()))
    );
  });
  const myWps = (hubMode === 'my') ? assignedWps : workingPapers;

  const reworkWps = myWps.filter((wp: any) => wp.status === 'Rework' || wp.status === 'Rejected');
  const draftWps = myWps.filter((wp: any) => wp.status === 'Draft' || wp.status === 'InProgress' || wp.status === 'Todo');
  const submittedWps = myWps.filter((wp: any) => wp.status === 'Submitted' || wp.status === 'Review' || wp.status === 'PendingReview');
  const approvedWps = myWps.filter((wp: any) => wp.status === 'Approved' || wp.status === 'Completed' || wp.status === 'Reviewed');

  const todoWps = [...reworkWps, ...draftWps];
  const reviewWps = submittedWps;
  const doneWps = approvedWps;

  // Filtered WPs for current status tab in Table
  const displayedWps = wpStatusTab === 'rework' ? reworkWps :
                       wpStatusTab === 'draft' ? draftWps :
                       wpStatusTab === 'submitted' ? submittedWps :
                       wpStatusTab === 'approved' ? approvedWps :
                       myWps;

  // My Workstreams across all engagements
  const myWorkstreams = allAssignedWorkstreams.filter((ws: any) => {
    if (hubMode === 'all' && isLead) return true;
    return (
      (ws.assignedAuditorId && ws.assignedAuditorId === currentUserId) ||
      (ws.reviewerId && ws.reviewerId === currentUserId) ||
      (ws.assignedAuditorName && currentFullName && ws.assignedAuditorName.toLowerCase().includes(currentFullName.toLowerCase()))
    );
  }).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return dayjs(a.dueDate).diff(dayjs(b.dueDate));
  });

  // Recommendations waiting for KTV step 4 verification
  const myVerificationRecs = pendingVerificationRecs.filter((rec: any) => {
    if (isLead || hubMode === 'all') return true;
    return rec.assignedToId === currentUserId || rec.auditorId === currentUserId || !rec.assignedToId;
  });

  // Default selected engagement once engagements are loaded
  useEffect(() => {
    if (myEngagements.length > 0 && !selectedEngagementId) {
      const active = myEngagements.find((e: any) => e.status === 'Fieldwork') || myEngagements[0];
      setSelectedEngagementId(active.id);
    }
  }, [myEngagements, selectedEngagementId]);

  // Fetch workstreams dynamically whenever selected engagement changes
  useEffect(() => {
    if (!selectedEngagementId) {
      setWorkstreams([]);
      return;
    }
    let isCancelled = false;
    const fetchWorkstreams = async () => {
      setLoadingWorkstreams(true);
      try {
        const res = await api.get(`/audit-engagements/${selectedEngagementId}/workstreams`);
        if (!isCancelled) {
          setWorkstreams(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error('Failed to load workstreams:', err);
        if (!isCancelled) setWorkstreams([]);
      } finally {
        if (!isCancelled) setLoadingWorkstreams(false);
      }
    };
    fetchWorkstreams();
    return () => {
      isCancelled = true;
    };
  }, [selectedEngagementId]);

  // Helper to calculate dynamic workstream progress based on linked WPs or status
  const getWorkstreamProgress = (ws: any) => {
    const wsWps = workingPapers.filter(
      (wp: any) => wp.workstreamId === ws.id || (wp.engagementId === ws.engagementId && wp.title?.toLowerCase().includes(ws.title?.toLowerCase()))
    );

    if (wsWps.length > 0) {
      const doneItems = wsWps.filter((wp: any) => ['Approved', 'Completed', 'Reviewed'].includes(wp.status));
      const pct = Math.round((doneItems.length / wsWps.length) * 100);
      return {
        percent: pct,
        doneCount: doneItems.length,
        totalCount: wsWps.length,
        source: 'wp',
      };
    }

    let pct = 0;
    if (ws.status === 'Reviewed') pct = 100;
    else if (ws.status === 'Completed') pct = 90;
    else if (ws.status === 'InProgress') pct = 60;
    else if (ws.status === 'Rework') pct = 40;
    else if (ws.status === 'Draft') pct = 15;

    return {
      percent: pct,
      doneCount: pct >= 90 ? 1 : 0,
      totalCount: 1,
      source: 'status',
    };
  };

  const getDueBadge = (dueDate?: string) => {
    if (!dueDate) return <span className="text-slate-400 text-xs">---</span>;
    const diff = dayjs(dueDate).diff(dayjs(), 'day');
    if (diff < 0) {
      return <Tag color="error" className="font-bold text-[10px]">Quá hạn {Math.abs(diff)} ngày</Tag>;
    } else if (diff === 0) {
      return <Tag color="warning" className="font-bold text-[10px]">Hôm nay</Tag>;
    } else if (diff <= 3) {
      return <Tag color="orange" className="font-semibold text-[10px]">Còn {diff} ngày</Tag>;
    }
    return <Tag color="default" className="text-[10px]">Còn {diff} ngày</Tag>;
  };

  // Greeting based on time
  const hour = dayjs().hour();
  const greetingTime = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Spin size="large" />
        <Text type="secondary" className="mt-4 font-medium">Đang tải bàn làm việc kiểm toán...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ 1. HERO COMMAND BANNER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">👋</span>
              <Title level={3} className="!text-white !mb-0 font-bold">
                {greetingTime}, {currentUser?.fullName || currentUser?.username || 'Kiểm toán viên'}!
              </Title>
              <Tag color="gold" className="font-semibold px-2.5 py-0.5 rounded-full border-none">
                {currentUser?.role?.name || currentUser?.role || 'Kiểm toán viên'}
              </Tag>
            </div>
            <Paragraph className="!text-blue-100 text-sm md:text-base max-w-3xl !mb-0">
              Chào mừng bạn đến với <b>Bàn làm việc Kiểm toán (KTV Workspace)</b>. Bạn đang tham gia{' '}
              <span className="text-amber-300 font-semibold">{myEngagements.length} Cuộc kiểm toán</span> | Có{' '}
              <span className="text-amber-300 font-semibold">{todoWps.length} Giấy tờ làm việc (W/P)</span> cần hoàn thiện{' '}
              {reworkWps.length > 0 && (
                <>| <span className="text-red-400 font-bold underline">{reworkWps.length} W/P cần sửa lại</span></>
              )}
              {reviewWps.length > 0 && (
                <> | <span className="text-emerald-300 font-semibold">{reviewWps.length} W/P</span> chờ soát xét</>
              )}.
            </Paragraph>
          </div>

          {/* Quick Action Buttons */}
          <Space wrap className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/15">
            <Button 
              type="primary" 
              icon={<ProjectOutlined />}
              className="bg-amber-500 hover:bg-amber-600 border-none font-semibold h-10 px-4 rounded-lg shadow"
              onClick={() => navigate('/audit-engagements')}
            >
              Đoàn Kiểm toán
            </Button>
            <Button 
              icon={<FileDoneOutlined />}
              className="bg-white text-slate-800 hover:text-blue-600 font-semibold h-10 px-4 rounded-lg shadow border-none"
              onClick={() => navigate('/working-papers')}
            >
              Giấy tờ W/P
            </Button>
            <Button 
              icon={<FilePdfOutlined />}
              className="bg-white/15 text-white hover:bg-white/25 font-semibold h-10 px-4 rounded-lg border-white/20"
              onClick={() => navigate('/audit-reports')}
            >
              Báo cáo KT
            </Button>
            <Button 
              icon={<PlusOutlined />}
              className="bg-white/15 text-white hover:bg-white/25 font-semibold h-10 px-4 rounded-lg border-white/20"
              onClick={() => navigate('/audit-findings')}
            >
              + Ghi Phát hiện
            </Button>
          </Space>
        </div>

        {/* Decorative Background Pattern */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ═══ 2. VIEW MODE SELECTOR (MY WORK VS ALL TEAM) ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <ThunderboltOutlined className="text-amber-500 text-lg" />
          <span className="font-bold text-slate-800 text-sm">Chế độ hiển thị:</span>
          <Segmented
            value={hubMode}
            onChange={(val) => setHubMode(val as any)}
            options={[
              { label: <span className="font-semibold px-2 py-0.5">👤 Công việc của tôi (My Work)</span>, value: 'my' },
              { label: <span className="font-semibold px-2 py-0.5">🌐 Toàn bộ Đoàn kiểm toán</span>, value: 'all' },
            ]}
            className="bg-slate-100 p-1 rounded-xl"
          />
        </div>
        <div className="text-xs text-slate-500">
          {hubMode === 'my' ? (
            <span>Tập trung vào W/P, phân hành & kiến nghị phụ trách bởi <b>{currentFullName || 'bạn'}</b></span>
          ) : (
            <span>Hiển thị tổng thể toàn bộ các cuộc kiểm toán trong phạm vi quyền hạn</span>
          )}
        </div>
      </div>

      {/* Dynamic Alerts: Rework Notice & Step 4 Verification */}
      {reworkWps.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<UndoOutlined className="text-red-500 text-base" />}
          message={
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>
                <b>Cảnh báo yêu cầu sửa lại (Rework):</b> Bạn có <b>{reworkWps.length}</b> Giấy tờ làm việc bị Trưởng đoàn từ chối duyệt và yêu cầu hoàn thiện lại.
              </span>
              <Button 
                size="small" 
                danger 
                type="primary" 
                className="text-xs font-semibold rounded-lg"
                onClick={() => {
                  setHubMode('my');
                  setWpStatusTab('rework');
                }}
              >
                Xem W/P cần sửa ({reworkWps.length})
              </Button>
            </div>
          }
          className="rounded-xl border-red-200 bg-red-50/80"
        />
      )}

      {myVerificationRecs.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<SafetyOutlined className="text-blue-500 text-base" />}
          message={
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>
                <b>Thẩm tra khắc phục (Bước 4):</b> Có <b>{myVerificationRecs.length}</b> kiến nghị ĐVĐKT đã báo cáo hoàn thành 100% đang chờ KTV thẩm định bằng chứng.
              </span>
              <Button 
                size="small" 
                type="primary" 
                className="bg-blue-600 text-xs font-semibold rounded-lg"
                onClick={() => navigate('/recommendations', { state: { closureStatus: 'PendingKTNBReview' } })}
              >
                Mở Cổng Thẩm Tra Kiến Nghị →
              </Button>
            </div>
          }
          className="rounded-xl border-blue-200 bg-blue-50/80"
        />
      )}

      {/* ═══ 3. KEY EXECUTION KPI CARDS ═══ */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                  {hubMode === 'my' ? 'Đoàn KT của tôi' : 'Tất cả cuộc KT'}
                </Text>
                <Title level={3} className="!mb-0 !mt-1 text-slate-800">{myEngagements.length}</Title>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold">
                <ProjectOutlined />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-600">{myEngagements.filter(e => e.status === 'Fieldwork').length}</span> đang thực địa • 
              <span className="font-semibold text-amber-600">{myEngagements.filter(e => e.status === 'Reporting').length}</span> đang lập BC
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase font-semibold tracking-wider text-slate-400">Giấy tờ W/P cần làm</Text>
                <Title level={3} className="!mb-0 !mt-1 text-amber-600">{todoWps.length}</Title>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-bold">
                <FileDoneOutlined />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              {reworkWps.length > 0 && (
                <span className="font-bold text-red-600">{reworkWps.length} cần sửa • </span>
              )}
              <span className="font-semibold text-emerald-600">{doneWps.length}</span> đã duyệt • 
              <span className="font-semibold text-blue-600">{reviewWps.length}</span> chờ duyệt
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                  {hubMode === 'my' ? 'Phân hành của tôi' : 'Nhiệm vụ kiểm tra'}
                </Text>
                <Title level={3} className="!mb-0 !mt-1 text-slate-800">
                  {hubMode === 'my' ? myWorkstreams.length : tasks.length}
                </Title>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-bold">
                <CheckCircleOutlined />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              {hubMode === 'my' ? (
                <>
                  <span className="font-semibold text-emerald-600">{myWorkstreams.filter(w => w.status === 'Reviewed' || w.status === 'Completed').length}</span> hoàn thành • 
                  <span className="font-semibold text-blue-600">{myWorkstreams.filter(w => w.status === 'InProgress' || w.status === 'Draft').length}</span> đang làm
                </>
              ) : (
                <>
                  <span className="font-semibold text-emerald-600">{tasks.filter(t => t.status === 'Done').length}</span> đã xong • 
                  <span className="font-semibold text-slate-600">{tasks.filter(t => t.status !== 'Done').length}</span> đang làm
                </>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                  {hubMode === 'my' ? 'Kiến nghị cần thẩm tra' : 'Hồ sơ pháp lý đoàn'}
                </Text>
                <Title level={3} className="!mb-0 !mt-1 text-indigo-600">
                  {hubMode === 'my' ? (
                    myVerificationRecs.length
                  ) : (
                    <>{Object.values(dossierMap).reduce((acc, docs) => acc + docs.length, 0)} <span className="text-sm font-normal text-slate-400">tệp</span></>
                  )}
                </Title>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold">
                {hubMode === 'my' ? <SafetyOutlined /> : <FolderOpenOutlined />}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              {hubMode === 'my' ? (
                <span>ĐVĐKT báo cáo 100% chờ KTV xác nhận</span>
              ) : (
                <span>Được lưu trữ theo bộ theo từng đoàn kiểm toán</span>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ═══ 4. ACTIVE ENGAGEMENTS CARDS ═══ */}
      <Card 
        variant="borderless" 
        className="shadow-sm rounded-2xl border border-slate-100"
        title={
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <ProjectOutlined />
              </div>
              <div>
                <Title level={4} className="!mb-0 text-slate-800 font-bold">
                  {hubMode === 'my' ? 'Cuộc Kiểm toán Bạn Đang Tham gia' : 'Các Cuộc Kiểm toán Đang Triển khai'}
                </Title>
                <Text type="secondary" className="text-xs">Theo dõi tiến độ fieldwork, giấy tờ làm việc W/P và bộ hồ sơ pháp lý</Text>
              </div>
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/audit-engagements')}
              className="flex items-center gap-1 font-semibold text-blue-600 p-0"
            >
              Xem tất cả đoàn kiểm toán <ArrowRightOutlined />
            </Button>
          </div>
        }
      >
        {myEngagements.length === 0 ? (
          <Empty description="Hiện chưa có cuộc kiểm toán nào được phân công" className="py-12" />
        ) : (
          <Row gutter={[16, 16]}>
            {myEngagements.slice(0, 4).map((eng: any) => {
              const engWps = workingPapers.filter((w: any) => w.engagementId === eng.id);
              const totalWp = engWps.length;
              const doneWp = engWps.filter((w: any) => w.status === 'Approved' || w.status === 'Completed' || w.status === 'Reviewed').length;
              const wpPercent = totalWp > 0 ? Math.round((doneWp / totalWp) * 100) : (eng.progress || 0);

              const docs = dossierMap[eng.id] || [];
              const requiredTypes = ['DECISION', 'PROPOSAL', 'OUTLINE', 'SAMPLING_PLAN'];
              const completedRequired = requiredTypes.filter(t => docs.some((d: any) => d.documentType === t)).length;

              return (
                <Col xs={24} md={12} key={eng.id}>
                  <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-5 transition-all duration-200 flex flex-col justify-between h-full">
                    <div>
                      {/* Header of Card */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <Tag color={eng.status === 'Completed' ? 'green' : eng.status === 'Fieldwork' ? 'blue' : eng.status === 'Reporting' ? 'purple' : 'orange'} className="font-semibold rounded-md uppercase text-xs">
                          {eng.status === 'Fieldwork' ? 'Đang thực địa' : eng.status === 'Reporting' ? 'Đang lập Báo cáo' : eng.status || 'Planning'}
                        </Tag>
                        <Text type="secondary" className="text-xs flex items-center gap-1">
                          <CalendarOutlined /> {eng.startDate ? dayjs(eng.startDate).format('DD/MM/YYYY') : '---'}
                        </Text>
                      </div>

                      <Title level={5} className="!mb-2 text-slate-800 font-bold hover:text-blue-600 cursor-pointer" onClick={() => navigate('/audit-engagements')}>
                        {eng.name}
                      </Title>

                      <div className="mb-4 space-y-1 text-xs text-slate-600">
                        <div>
                          🏢 <b>Đơn vị được KT:</b> <span className="text-blue-700 font-medium">{eng.auditedDepartment || 'Chi nhánh / Phòng ban'}</span>
                        </div>
                        <div>
                          👤 <b>Trưởng đoàn:</b> <span>{eng.leadAuditor || 'Chưa phân công'}</span>
                        </div>
                      </div>

                      {/* Progress Metrics */}
                      <div className="space-y-3 mb-5 bg-white p-3.5 rounded-lg border border-slate-200/60">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500 font-medium">Tiến độ W/P:</span>
                            <span className="font-bold text-slate-700">{doneWp}/{totalWp || 0} ({wpPercent}%)</span>
                          </div>
                          <Progress percent={wpPercent} size="small" strokeColor="#ea9105" />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500 font-medium">Bộ hồ sơ pháp lý (Dossier):</span>
                            <span className="font-bold text-indigo-700">{completedRequired}/4 ({Math.round((completedRequired / 4) * 100)}%)</span>
                          </div>
                          <Progress 
                            percent={Math.round((completedRequired / 4) * 100)} 
                            size="small" 
                            strokeColor={completedRequired === 4 ? '#52c41a' : '#faad14'} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <Button 
                        size="small" 
                        type="primary" 
                        icon={<FileDoneOutlined />}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs"
                        onClick={() => navigate('/working-papers', { state: { engagementId: eng.id, engagementName: eng.name } })}
                      >
                        Vào W/P
                      </Button>
                      <Button 
                        size="small" 
                        icon={<BugOutlined />}
                        className="text-xs rounded-lg"
                        onClick={() => navigate('/audit-findings', { state: { engagementId: eng.id } })}
                      >
                        Biên bản/Phát hiện
                      </Button>
                      <Button 
                        size="small" 
                        icon={<FolderOpenOutlined />}
                        className="text-xs rounded-lg"
                        onClick={() => navigate('/audit-engagements')}
                      >
                        Hồ sơ pháp lý
                      </Button>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* ═══ 5. TWO-COLUMN WORKSPACE: MY W/P ACTION QUEUE & WORKSTREAM PROGRESS ═══ */}
      <Row gutter={[16, 16]}>
        {/* Left Column: My Action Items (W/P Queue) */}
        <Col xs={24} lg={14}>
          <Card 
            variant="borderless" 
            className="shadow-sm rounded-2xl border border-slate-100 h-full"
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-amber-500 text-lg" />
                  <Title level={5} className="!mb-0 text-slate-800">
                    {hubMode === 'my' ? 'Giấy tờ làm việc (W/P) Cần Xử lý' : 'Hàng đợi W/P Toàn Đoàn'}
                  </Title>
                </div>
                <Button type="link" size="small" onClick={() => navigate('/working-papers')} className="font-semibold text-blue-600 p-0">
                  Mở phân hệ W/P →
                </Button>
              </div>
            }
          >
            {/* Filter Tabs for WPs */}
            <div className="mb-4">
              <Segmented
                size="small"
                value={wpStatusTab}
                onChange={(val) => setWpStatusTab(val as any)}
                options={[
                  { label: `Tất cả (${myWps.length})`, value: 'all' },
                  { 
                    label: (
                      <span className={reworkWps.length > 0 ? 'text-red-600 font-bold' : ''}>
                        🔴 Cần sửa ({reworkWps.length})
                      </span>
                    ), 
                    value: 'rework' 
                  },
                  { label: `🟡 Bản thảo (${draftWps.length})`, value: 'draft' },
                  { label: `🔵 Chờ duyệt (${submittedWps.length})`, value: 'submitted' },
                  { label: `🟢 Đã duyệt (${approvedWps.length})`, value: 'approved' },
                ]}
              />
            </div>

            {displayedWps.length === 0 ? (
              <Empty 
                description={
                  wpStatusTab === 'rework' 
                    ? 'Tuyệt vời! Không có W/P nào bị yêu cầu sửa lại.'
                    : 'Không có giấy tờ làm việc nào trong danh mục này'
                } 
                className="py-8" 
              />
            ) : (
              <Table 
                dataSource={displayedWps.slice(0, 6)}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Mã & Tên W/P',
                    key: 'title',
                    render: (_, record) => {
                      const isRework = record.status === 'Rework' || record.status === 'Rejected';
                      return (
                        <div>
                          <div 
                            className={`font-semibold text-xs cursor-pointer hover:text-blue-600 ${isRework ? 'text-red-600' : 'text-slate-800'}`} 
                            onClick={() => navigate('/working-papers')}
                          >
                            {record.refNo ? `[${record.refNo}] ` : ''}{record.title || record.name}
                          </div>
                          <Text type="secondary" className="text-[11px] block line-clamp-1">
                            {record.objective || record.engagementName || 'Cuộc kiểm toán'}
                          </Text>
                          {isRework && record.reviewNotes && (
                            <div className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded mt-1 border border-red-200">
                              💬 <b>Ý kiến Trưởng đoàn:</b> {record.reviewNotes}
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    key: 'status',
                    width: 110,
                    render: (status: string) => {
                      const isRework = status === 'Rework' || status === 'Rejected';
                      const color = status === 'Approved' || status === 'Reviewed' ? 'green' : 
                                    status === 'Review' || status === 'Submitted' || status === 'PendingReview' ? 'blue' : 
                                    isRework ? 'error' : 'warning';
                      const text = isRework ? 'Cần sửa' : 
                                   status === 'Review' || status === 'Submitted' || status === 'PendingReview' ? 'Chờ duyệt' : 
                                   status === 'InProgress' ? 'Đang làm' : 
                                   status === 'Draft' ? 'Bản thảo' : status;
                      return <Tag color={color} className="text-xs font-semibold">{text}</Tag>;
                    }
                  },
                  {
                    title: 'Hạn chót',
                    dataIndex: 'dueDate',
                    key: 'dueDate',
                    width: 115,
                    render: (d: any) => getDueBadge(d)
                  },
                  {
                    title: 'Thao tác',
                    key: 'action',
                    width: 90,
                    render: (_, record) => (
                      <Button 
                        size="small" 
                        type="link" 
                        className="text-xs p-0 text-blue-600 font-semibold"
                        onClick={() => navigate('/working-papers', { state: { wpId: record.id } })}
                      >
                        {record.status === 'Rework' ? 'Sửa ngay →' : 'Thực hiện →'}
                      </Button>
                    )
                  }
                ]}
              />
            )}
          </Card>
        </Col>

        {/* Right Column: Workstreams Overview (Dynamic) */}
        <Col xs={24} lg={10}>
          <Card 
            variant="borderless" 
            className="shadow-sm rounded-2xl border border-slate-100 h-full"
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                  <ClockCircleOutlined className="text-blue-500 text-lg" />
                  <Title level={5} className="!mb-0 text-slate-800">
                    {hubMode === 'my' ? 'Phân hành của tôi & Hạn chót' : 'Tiến độ Phân hành Kiểm toán'}
                  </Title>
                </div>
                {hubMode === 'all' && myEngagements.length > 0 && (
                  <Select
                    size="small"
                    value={selectedEngagementId}
                    onChange={setSelectedEngagementId}
                    className="min-w-[190px] max-w-full sm:max-w-[240px] text-xs font-normal"
                    placeholder="Chọn đoàn kiểm toán..."
                    options={myEngagements.map((eng: any) => ({
                      value: eng.id,
                      label: eng.name || eng.title || `Đoàn KT #${eng.id}`,
                    }))}
                  />
                )}
              </div>
            }
          >
            {hubMode === 'my' ? (
              /* MY WORKSTREAMS VIEW */
              myWorkstreams.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description={
                      <span className="text-xs text-slate-500">
                        Bạn chưa được phân công phụ trách phân hành nào
                      </span>
                    } 
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {myWorkstreams.map((ws: any) => {
                    const prog = getWorkstreamProgress(ws);
                    return (
                      <div 
                        key={ws.id}
                        className="p-3 rounded-xl hover:bg-slate-50/90 transition-all border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex justify-between items-start text-xs mb-1.5 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-xs line-clamp-1" title={ws.title}>
                              {ws.title}
                            </div>
                            <div className="text-[11px] text-blue-700 font-medium truncate mt-0.5">
                              🏢 {ws.engagementName || 'Cuộc kiểm toán'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {ws.priority && (
                                <Tag 
                                  color={ws.priority === 'High' ? 'red' : ws.priority === 'Medium' ? 'orange' : 'blue'}
                                  className="text-[10px] leading-4 px-1.5 py-0 rounded font-semibold"
                                >
                                  {ws.priority === 'High' ? 'Ưu tiên Cao' : ws.priority === 'Medium' ? 'Ưu tiên TB' : 'Ưu tiên Thấp'}
                                </Tag>
                              )}
                              {getDueBadge(ws.dueDate)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold text-sm ${prog.percent >= 80 ? 'text-emerald-600' : prog.percent >= 50 ? 'text-amber-600' : 'text-blue-600'}`}>
                              {prog.percent}%
                            </span>
                            <div className="mt-1">
                              <Button 
                                size="small" 
                                type="primary" 
                                ghost 
                                className="text-[11px] h-6 px-2 rounded"
                                onClick={() => navigate('/audit-engagements', { state: { engagementId: ws.engagementId, defaultTab: 'phase2' } })}
                              >
                                Vào Phase 2 →
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Progress 
                          percent={prog.percent} 
                          strokeColor={prog.percent >= 80 ? '#52c41a' : prog.percent >= 50 ? '#ea9105' : '#1677ff'} 
                          size="small" 
                          showInfo={false}
                        />
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ALL WORKSTREAMS BY SELECTED ENGAGEMENT VIEW */
              loadingWorkstreams ? (
                <div className="py-10 text-center">
                  <Spin size="small" />
                  <div className="text-xs text-slate-400 mt-2">Đang tải tiến độ phần hành...</div>
                </div>
              ) : workstreams.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description={
                      <span className="text-xs text-slate-500">
                        Đoàn kiểm toán này chưa có phần hành được phân công
                      </span>
                    } 
                  >
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<PlusOutlined />}
                      className="bg-blue-600 text-xs rounded-lg shadow-sm font-medium"
                      onClick={() => navigate('/audit-engagements')}
                    >
                      Tạo phần hành kiểm toán
                    </Button>
                  </Empty>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {workstreams.map((ws: any, idx: number) => {
                    const prog = getWorkstreamProgress(ws);
                    return (
                      <div 
                        key={ws.id} 
                        className="p-3 rounded-xl hover:bg-slate-50/90 transition-all border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex justify-between items-start text-xs mb-1.5 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-xs line-clamp-1" title={ws.title}>
                              {idx + 1}. {ws.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Tag 
                                color={
                                  ws.status === 'Reviewed' ? 'success' :
                                  ws.status === 'Completed' ? 'cyan' :
                                  ws.status === 'InProgress' ? 'processing' :
                                  ws.status === 'Rework' ? 'error' : 'default'
                                }
                                className="text-[10px] leading-4 px-1.5 py-0 rounded-md border-none font-medium"
                              >
                                {ws.status === 'Reviewed' ? 'Đã duyệt' :
                                 ws.status === 'Completed' ? 'Hoàn thành' :
                                 ws.status === 'InProgress' ? 'Đang thực hiện' :
                                 ws.status === 'Rework' ? 'Cần làm lại' : 'Dự thảo'}
                              </Tag>
                              {ws.assignedAuditorName && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <UserOutlined className="text-[10px]" /> KTV: {ws.assignedAuditorName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold text-sm ${prog.percent >= 80 ? 'text-emerald-600' : prog.percent >= 50 ? 'text-amber-600' : 'text-blue-600'}`}>
                              {prog.percent}%
                            </span>
                            {prog.source === 'wp' && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                ({prog.doneCount}/{prog.totalCount} W/P)
                              </div>
                            )}
                          </div>
                        </div>
                        <Progress 
                          percent={prog.percent} 
                          strokeColor={prog.percent >= 80 ? '#52c41a' : prog.percent >= 50 ? '#ea9105' : '#1677ff'} 
                          size="small" 
                          showInfo={false}
                        />
                      </div>
                    );
                  })}

                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 mt-3">
                    💡 <b>Mẹo nghiệp vụ:</b> Các phát hiện và bằng chứng kiểm toán được liên kết trực tiếp giữa Ma trận rủi ro kiểm tra và Giấy tờ làm việc (W/P). Hãy đảm bảo hoàn tất các mẫu phân giao trước khi nộp QA Review.
                  </div>
                </div>
              )
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AuditWorkspaceHub;
