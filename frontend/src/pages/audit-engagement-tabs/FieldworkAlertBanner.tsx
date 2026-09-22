import React, { useMemo } from 'react';
import { Alert, Tag, Space, Badge, Typography, Row, Col, Card, Progress, Tooltip } from 'antd';
import {
  SafetyOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface FieldworkAlertBannerProps {
  selectedEngagement: any;
  currentUser: any;
  workingPapers: any[];
  workstreams: any[];
  findings: any[];
}

const FieldworkAlertBanner: React.FC<FieldworkAlertBannerProps> = ({
  selectedEngagement,
  currentUser,
  workingPapers,
  workstreams,
  findings,
}) => {
  const currentUserId = currentUser?.userId || currentUser?.id;
  const roleStr = typeof currentUser?.role === 'string' ? currentUser.role : (currentUser?.role?.name || currentUser?.roleName || '');
  const isAdmin = roleStr.toLowerCase().includes('admin') || roleStr.toLowerCase().includes('quản trị');
  const isLeadAuditor = Boolean(currentUserId && selectedEngagement?.leadAuditorId === currentUserId);

  const metrics = useMemo(() => {
    const today = dayjs();

    // WPs waiting for review (for Team Lead)
    const wpPendingReview = workingPapers.filter(
      wp => wp.status === 'Submitted' || wp.status === 'PendingReview'
    );

    // WPs needing rework (for KTV)
    const wpRework = workingPapers.filter(
      wp => (wp.status === 'Rework' || wp.status === 'Rejected') &&
        ((wp.creatorId && wp.creatorId === currentUserId) ||
         (wp.workstream?.assignedAuditorId && wp.workstream.assignedAuditorId === currentUserId))
    );

    // My workstreams (for KTV)
    const myWorkstreams = workstreams.filter(
      ws => ws.assignedAuditorId === currentUserId
    );

    // Overdue workstreams
    const overdueWorkstreams = workstreams.filter(ws => {
      if (!ws.dueDate || ws.status === 'Reviewed' || ws.status === 'Completed') return false;
      return dayjs(ws.dueDate).isBefore(today, 'day');
    });

    // My overdue workstreams
    const myOverdueWs = overdueWorkstreams.filter(ws => ws.assignedAuditorId === currentUserId);

    // Workstreams due within 3 days
    const urgentWorkstreams = workstreams.filter(ws => {
      if (!ws.dueDate || ws.status === 'Reviewed' || ws.status === 'Completed') return false;
      const diff = dayjs(ws.dueDate).diff(today, 'day');
      return diff >= 0 && diff <= 3;
    });
    const myUrgentWs = urgentWorkstreams.filter(ws => ws.assignedAuditorId === currentUserId);

    // Findings without recommendations
    const findingsWithoutRec = findings.filter(f => !f.recommendation && f.status !== 'Closed');

    // Overall progress
    const totalWs = workstreams.length;
    const doneWs = workstreams.filter(ws => ws.status === 'Completed' || ws.status === 'Reviewed').length;
    const wsProgressPct = totalWs > 0 ? Math.round((doneWs / totalWs) * 100) : 0;

    const totalWp = workingPapers.length;
    const approvedWp = workingPapers.filter(wp => wp.status === 'Approved').length;
    const wpProgressPct = totalWp > 0 ? Math.round((approvedWp / totalWp) * 100) : 0;

    return {
      wpPendingReview,
      wpRework,
      myWorkstreams,
      overdueWorkstreams,
      myOverdueWs,
      urgentWorkstreams,
      myUrgentWs,
      findingsWithoutRec,
      wsProgressPct,
      wpProgressPct,
      totalWs,
      doneWs,
      totalWp,
      approvedWp,
    };
  }, [workingPapers, workstreams, findings, currentUserId]);

  // Determine alert type
  const hasUrgent = (isLeadAuditor || isAdmin)
    ? (metrics.wpPendingReview.length > 0 || metrics.overdueWorkstreams.length > 0)
    : (metrics.myOverdueWs.length > 0 || metrics.wpRework.length > 0);

  const hasWarning = (isLeadAuditor || isAdmin)
    ? metrics.urgentWorkstreams.length > 0
    : metrics.myUrgentWs.length > 0;

  if (!hasUrgent && !hasWarning && metrics.wsProgressPct < 100) {
    // Show a simple progress summary
    return (
      <Card size="small" className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <div className="flex items-center gap-2 mb-1">
              <TeamOutlined className="text-indigo-600 text-base" />
              <Text strong className="text-indigo-900 text-sm">
                {isLeadAuditor ? 'Tổng quan Đoàn kiểm toán của bạn' : 'Tiến độ công việc của bạn'}
              </Text>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <Text className="text-xs text-slate-500">Phân hành:</Text>
                <Progress percent={metrics.wsProgressPct} size="small" style={{ width: 120 }}
                  strokeColor={{ '0%': '#ea9105', '100%': '#52c41a' }} />
                <Text className="text-xs text-slate-600">{metrics.doneWs}/{metrics.totalWs}</Text>
              </div>
              <div className="flex items-center gap-2">
                <Text className="text-xs text-slate-500">W/P:</Text>
                <Progress percent={metrics.wpProgressPct} size="small" style={{ width: 120 }}
                  strokeColor={{ '0%': '#4f46e5', '100%': '#52c41a' }} />
                <Text className="text-xs text-slate-600">{metrics.approvedWp}/{metrics.totalWp}</Text>
              </div>
            </div>
          </Col>
          {metrics.wsProgressPct === 100 && metrics.wpProgressPct === 100 && (
            <Col>
              <Tag color="success" icon={<CheckCircleOutlined />} className="text-xs font-bold">
                Sẵn sàng chuyển giai đoạn
              </Tag>
            </Col>
          )}
        </Row>
      </Card>
    );
  }

  // Build alert items based on role
  const alertItems: React.ReactNode[] = [];

  if (isLeadAuditor || isAdmin) {
    // Team Lead view
    if (metrics.wpPendingReview.length > 0) {
      alertItems.push(
        <Tag key="wp-review" color="orange" icon={<SafetyOutlined />} className="text-xs font-semibold py-0.5 px-2">
          🔔 {metrics.wpPendingReview.length} W/P chờ soát xét (Four-Eyes)
        </Tag>
      );
    }
    if (metrics.overdueWorkstreams.length > 0) {
      alertItems.push(
        <Tag key="ws-overdue" color="red" icon={<ExclamationCircleOutlined />} className="text-xs font-semibold py-0.5 px-2">
          ⚠️ {metrics.overdueWorkstreams.length} phân hành quá hạn
        </Tag>
      );
    }
    if (metrics.urgentWorkstreams.length > 0) {
      alertItems.push(
        <Tag key="ws-urgent" color="gold" icon={<ClockCircleOutlined />} className="text-xs font-semibold py-0.5 px-2">
          ⏰ {metrics.urgentWorkstreams.length} phân hành sắp hết hạn (≤3 ngày)
        </Tag>
      );
    }
    if (metrics.findingsWithoutRec.length > 0) {
      alertItems.push(
        <Tag key="findings-norec" color="blue" icon={<FileTextOutlined />} className="text-xs font-semibold py-0.5 px-2">
          📋 {metrics.findingsWithoutRec.length} phát hiện chưa gắn kiến nghị
        </Tag>
      );
    }
  } else {
    // KTV view
    if (metrics.wpRework.length > 0) {
      alertItems.push(
        <Tag key="wp-rework" color="red" icon={<ExclamationCircleOutlined />} className="text-xs font-semibold py-0.5 px-2">
          ⚠️ {metrics.wpRework.length} W/P cần bạn chỉnh sửa lại
        </Tag>
      );
    }
    if (metrics.myOverdueWs.length > 0) {
      alertItems.push(
        <Tag key="my-overdue" color="red" icon={<WarningOutlined />} className="text-xs font-semibold py-0.5 px-2">
          🔴 {metrics.myOverdueWs.length} phân hành của bạn đã quá hạn!
        </Tag>
      );
    }
    if (metrics.myUrgentWs.length > 0) {
      alertItems.push(
        <Tag key="my-urgent" color="gold" icon={<ClockCircleOutlined />} className="text-xs font-semibold py-0.5 px-2">
          ⏰ {metrics.myUrgentWs.length} phân hành sắp hết hạn (≤3 ngày)
        </Tag>
      );
    }
    const myPendingWp = workingPapers.filter(
      wp => wp.status === 'Draft' &&
        ((wp.creatorId && wp.creatorId === currentUserId) ||
         (wp.workstream?.assignedAuditorId && wp.workstream.assignedAuditorId === currentUserId))
    );
    if (myPendingWp.length > 0) {
      alertItems.push(
        <Tag key="my-draft" color="blue" icon={<FileTextOutlined />} className="text-xs font-semibold py-0.5 px-2">
          📝 {myPendingWp.length} W/P bản nháp cần hoàn thiện & nộp
        </Tag>
      );
    }
  }

  if (alertItems.length === 0) return null;

  const alertType = hasUrgent ? 'warning' : 'info';

  return (
    <Alert
      type={alertType}
      showIcon
      className="mb-4 rounded-xl border-l-4"
      style={{ borderLeftColor: hasUrgent ? '#f59e0b' : '#3b82f6' }}
      message={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text strong className="text-sm">
            {isLeadAuditor || isAdmin ? '🏷️ Việc cần xử lý — Trưởng đoàn' : '📋 Việc cần làm hôm nay'}
          </Text>
          <div className="flex items-center gap-4">
            <Tooltip title={`Phân hành: ${metrics.doneWs}/${metrics.totalWs}`}>
              <Progress percent={metrics.wsProgressPct} size="small" style={{ width: 80 }}
                strokeColor={metrics.wsProgressPct === 100 ? '#52c41a' : '#ea9105'} />
            </Tooltip>
            <Tooltip title={`W/P: ${metrics.approvedWp}/${metrics.totalWp}`}>
              <Progress percent={metrics.wpProgressPct} size="small" style={{ width: 80 }}
                strokeColor={metrics.wpProgressPct === 100 ? '#52c41a' : '#4f46e5'} />
            </Tooltip>
          </div>
        </div>
      }
      description={
        <Space wrap size={[6, 6]} className="mt-1">
          {alertItems}
        </Space>
      }
    />
  );
};

export default FieldworkAlertBanner;
