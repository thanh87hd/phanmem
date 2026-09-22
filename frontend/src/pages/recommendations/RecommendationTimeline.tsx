import React, { useState } from 'react';
import { 
  Card, 
  Steps, 
  Tag, 
  Typography, 
  Alert, 
  Space, 
  Button, 
  Modal, 
  Input, 
  message 
} from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  CloudUploadOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  WarningOutlined,
  UndoOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Text } = Typography;

// ==================== Type Contracts ====================

export const CLOSURE_STATUS = {
  OPEN: 'Open',
  PENDING_KTNB_REVIEW: 'PendingKTNBReview',
  PENDING_TEAM_LEAD_OPINION: 'PendingTeamLeadOpinion',
  CLOSED: 'Closed',
} as const;

export const REC_STATUS = {
  NOT_STARTED: 'NotStarted',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  VERIFIED: 'Verified',
} as const;

export interface CurrentUserContext {
  id?: number;
  userId?: number;
  role?: string;
  fullName?: string;
  username?: string;
}

export interface RecommendationTimelineItem {
  id: number;
  status?: string;
  closureStatus?: string;
  progressPercent?: number;
  dueDate?: string;
  assignedToId?: number;
  ktnbReviewerId?: number;
  ktnbReviewerName?: string;
  remediationPlan?: string;
  auditeeTargetDate?: string;
  response?: string;
  verificationNotes?: string;
  ktnbReviewNotes?: string;
  ktnbReviewedAt?: string | Date;
  teamLeadClosureOpinion?: string;
  teamLeadClosureOpinionAt?: string | Date;
  teamLeadClosureOpinionByName?: string;
  closedReason?: string;
  closedAt?: string | Date;
  completedAt?: string | Date;
  createdAt?: string | Date;
  auditeeOwnerName?: string;
  auditeePoc?: string;
  [key: string]: any;
}

export interface RecommendationTimelineProps {
  recommendation: RecommendationTimelineItem;
  currentUser?: CurrentUserContext;
  onRefresh?: () => void;
  onOpenAuditeePlan?: (rec: RecommendationTimelineItem) => void;
  onOpenAuditeeProgress?: (rec: RecommendationTimelineItem) => void;
}

// ==================== Reusable Action Modal Component ====================

interface TimelineActionModalProps {
  open: boolean;
  title: string;
  helperText: string;
  placeholder: string;
  okText: string;
  okButtonProps?: any;
  submitting: boolean;
  value: string;
  onChange: (val: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

const TimelineActionModal: React.FC<TimelineActionModalProps> = ({
  open,
  title,
  helperText,
  placeholder,
  okText,
  okButtonProps,
  submitting,
  value,
  onChange,
  onOk,
  onCancel,
}) => (
  <Modal
    title={title}
    open={open}
    onCancel={onCancel}
    onOk={onOk}
    confirmLoading={submitting}
    okText={okText}
    cancelText="Hủy"
    okButtonProps={okButtonProps}
  >
    <div className="space-y-3 py-2">
      <Text type="secondary" className="text-xs">
        {helperText}
      </Text>
      <Input.TextArea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  </Modal>
);

// ==================== Main Timeline Component ====================

export const RecommendationTimeline: React.FC<RecommendationTimelineProps> = ({
  recommendation,
  currentUser: _currentUser,
  onRefresh,
  onOpenAuditeePlan,
  onOpenAuditeeProgress,
}) => {
  if (!recommendation) return null;

  const rec = recommendation;
  const closureStatus = rec.closureStatus || CLOSURE_STATUS.OPEN;
  const status = rec.status || REC_STATUS.NOT_STARTED;
  const progressPercent = rec.progressPercent || 0;

  // Local state for interactive action modals
  const [isKtnbModalVisible, setIsKtnbModalVisible] = useState(false);
  const [ktnbNotes, setKtnbNotes] = useState('');
  const [isReworkModalVisible, setIsReworkModalVisible] = useState(false);
  const [reworkNotes, setReworkNotes] = useState('');
  const [isLeadOpinionModalVisible, setIsLeadOpinionModalVisible] = useState(false);
  const [leadOpinion, setLeadOpinion] = useState('');
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Xác định bước hiện tại (0 to 4)
  let currentStep = 0;
  if (closureStatus === CLOSURE_STATUS.CLOSED) {
    currentStep = 4;
  } else if (closureStatus === CLOSURE_STATUS.PENDING_TEAM_LEAD_OPINION) {
    currentStep = 3;
  } else if (closureStatus === CLOSURE_STATUS.PENDING_KTNB_REVIEW || (status === REC_STATUS.COMPLETED && !rec.ktnbReviewedAt)) {
    currentStep = 2;
  } else if (status === REC_STATUS.IN_PROGRESS || rec.remediationPlan || progressPercent > 0) {
    currentStep = 1;
  } else {
    currentStep = 0;
  }

  // Next action hint guide
  let nextActionGuide: { actor: string; action: string; tagColor: string } | null = null;
  if (closureStatus === CLOSURE_STATUS.CLOSED) {
    nextActionGuide = null;
  } else if (closureStatus === CLOSURE_STATUS.PENDING_TEAM_LEAD_OPINION) {
    nextActionGuide = {
      actor: 'Trưởng đoàn / Lãnh đạo KTNB',
      action: 'Cho ý kiến kết luận và phê duyệt đóng chính thức kiến nghị kiểm toán.',
      tagColor: 'orange',
    };
  } else if (closureStatus === CLOSURE_STATUS.PENDING_KTNB_REVIEW || (status === REC_STATUS.COMPLETED && !rec.ktnbReviewedAt)) {
    nextActionGuide = {
      actor: 'Kiểm toán viên phụ trách',
      action: 'Thẩm định hồ sơ minh chứng ĐVĐKT nộp, xác nhận đạt yêu cầu để chuyển Trưởng đoàn.',
      tagColor: 'purple',
    };
  } else if (status === REC_STATUS.IN_PROGRESS || rec.remediationPlan || progressPercent > 0) {
    nextActionGuide = {
      actor: 'Đơn vị được kiểm toán (ĐVĐKT)',
      action: 'Tiếp tục khắc phục, cập nhật tiến độ 100% kèm tài liệu bằng chứng minh chứng.',
      tagColor: 'blue',
    };
  } else {
    nextActionGuide = {
      actor: 'Đơn vị được kiểm toán (ĐVĐKT)',
      action: 'Lập Kế hoạch khắc phục cụ thể, xác định đầu mối phụ trách và ngày cam kết hoàn thành.',
      tagColor: 'cyan',
    };
  }

  // API Call Handlers
  const handleConfirmKtnbReview = async () => {
    setSubmitting(true);
    try {
      await api.post(`/recommendations/${rec.id}/ktnb-review`, {
        notes: ktnbNotes || 'KTNB thẩm định bằng chứng đạt yêu cầu.',
      });
      message.success('KTV đã xác nhận thẩm định đạt yêu cầu!');
      setIsKtnbModalVisible(false);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Lỗi xác nhận thẩm định KTNB');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRework = async () => {
    if (!reworkNotes.trim()) {
      message.warning('Vui lòng nhập lý do/nội dung yêu cầu giải trình bổ sung');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/recommendations/${rec.id}/progress`, {
        progressPercent: 80,
        notes: `[KTV YÊU CẦU GIẢI TRÌNH LẠI]: ${reworkNotes}`,
        response: reworkNotes,
      });
      message.warning('Đã gửi yêu cầu giải trình và bổ sung minh chứng cho ĐVĐKT!');
      setIsReworkModalVisible(false);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Lỗi gửi yêu cầu giải trình');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLeadOpinion = async () => {
    if (!leadOpinion.trim()) {
      message.warning('Vui lòng nhập ý kiến kết luận của Trưởng đoàn');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/recommendations/${rec.id}/team-lead-opinion`, {
        opinion: leadOpinion,
      });
      message.success('Đã lưu ý kiến kết luận của Trưởng đoàn!');
      setIsLeadOpinionModalVisible(false);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Lỗi lưu ý kiến Trưởng đoàn');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRecommendation = async () => {
    setSubmitting(true);
    try {
      await api.post(`/recommendations/${rec.id}/close`, {
        closedReason: closeReason || 'Đã khắc phục hoàn tất và nghiệm thu đạt chuẩn.',
      });
      message.success('Kiến nghị kiểm toán đã được phê duyệt đóng chính thức (Closed)!');
      setIsCloseModalVisible(false);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Lỗi phê duyệt đóng kiến nghị');
    } finally {
      setSubmitting(false);
    }
  };

  const items = [
    {
      title: <span className="font-semibold text-xs sm:text-sm">1. Ban hành</span>,
      subTitle: rec.createdAt ? dayjs(rec.createdAt).format('DD/MM/YYYY') : undefined,
      description: (
        <div className="text-[11px] text-slate-500 mt-0.5">
          <div><UserOutlined className="mr-1" /> Đoàn KT / CAE</div>
          <Tag color="geekblue" className="text-[10px] py-0 px-1 mt-1">Đã ban hành</Tag>
        </div>
      ),
      icon: <FileTextOutlined />,
    },
    {
      title: <span className="font-semibold text-xs sm:text-sm">2. Kế hoạch</span>,
      subTitle: rec.auditeeTargetDate ? `Hạn: ${rec.auditeeTargetDate}` : undefined,
      description: (
        <div className="text-[11px] text-slate-500 mt-0.5">
          <div><UserOutlined className="mr-1" /> {rec.auditeeOwnerName || rec.auditeePoc || 'ĐVĐKT'}</div>
          {currentStep > 1 || (currentStep === 1 && rec.remediationPlan) ? (
            <Tag color="blue" className="text-[10px] py-0 px-1 mt-1">Đã lập kế hoạch</Tag>
          ) : currentStep === 1 ? (
            <Tag color="processing" className="text-[10px] py-0 px-1 mt-1">Đang lập...</Tag>
          ) : (
            <Tag className="text-[10px] py-0 px-1 mt-1">Chờ thực hiện</Tag>
          )}
        </div>
      ),
      icon: <EditOutlined />,
    },
    {
      title: <span className="font-semibold text-xs sm:text-sm">3. Báo cáo 100%</span>,
      subTitle: rec.completedAt ? dayjs(rec.completedAt).format('DD/MM/YYYY') : undefined,
      description: (
        <div className="text-[11px] text-slate-500 mt-0.5">
          <div>Tiến độ: <strong className="text-slate-700">{progressPercent}%</strong></div>
          {currentStep >= 2 && (rec.completedAt || progressPercent === 100) ? (
            <Tag color="cyan" className="text-[10px] py-0 px-1 mt-1">Đã nộp minh chứng</Tag>
          ) : currentStep === 2 ? (
            <Tag color="warning" className="text-[10px] py-0 px-1 mt-1">Chờ nộp bằng chứng</Tag>
          ) : (
            <Tag className="text-[10px] py-0 px-1 mt-1">Chưa hoàn tất</Tag>
          )}
        </div>
      ),
      icon: <CloudUploadOutlined />,
    },
    {
      title: <span className="font-semibold text-xs sm:text-sm">4. Thẩm tra KTV</span>,
      subTitle: rec.ktnbReviewedAt ? dayjs(rec.ktnbReviewedAt).format('DD/MM/YYYY') : undefined,
      description: (
        <div className="text-[11px] text-slate-500 mt-0.5">
          <div><UserOutlined className="mr-1" /> {rec.ktnbReviewerName || 'KTV phụ trách'}</div>
          {currentStep > 3 || (currentStep === 3 && rec.ktnbReviewedAt) ? (
            <Tag color="purple" className="text-[10px] py-0 px-1 mt-1">KTV xác nhận đạt</Tag>
          ) : currentStep === 3 ? (
            <Tag color="orange" className="text-[10px] py-0 px-1 mt-1">Đang thẩm định</Tag>
          ) : (
            <Tag className="text-[10px] py-0 px-1 mt-1">Chờ thẩm tra</Tag>
          )}
        </div>
      ),
      icon: <AuditOutlined />,
    },
    {
      title: <span className="font-semibold text-xs sm:text-sm">5. Đóng hồ sơ</span>,
      subTitle: rec.closedAt ? dayjs(rec.closedAt).format('DD/MM/YYYY') : undefined,
      description: (
        <div className="text-[11px] text-slate-500 mt-0.5">
          <div><UserOutlined className="mr-1" /> {rec.teamLeadClosureOpinionByName || 'Trưởng đoàn / CAE'}</div>
          {closureStatus === CLOSURE_STATUS.CLOSED ? (
            <Tag color="success" className="text-[10px] py-0 px-1 mt-1 font-bold">Closed ✓</Tag>
          ) : (
            <Tag className="text-[10px] py-0 px-1 mt-1">Chưa đóng</Tag>
          )}
        </div>
      ),
      icon: <CheckCircleOutlined />,
    },
  ];

  // Render Action Buttons inside Next Action Alert
  const renderActionButtons = () => {
    // Action for Step 4 (KTV Review)
    if (closureStatus === CLOSURE_STATUS.PENDING_KTNB_REVIEW || (status === REC_STATUS.COMPLETED && !rec.ktnbReviewedAt)) {
      return (
        <Space wrap size="small">
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            className="bg-purple-600 hover:bg-purple-700 border-none text-xs font-semibold rounded-md shadow-xs"
            onClick={() => {
              setKtnbNotes('KTNB đã thẩm định hồ sơ minh chứng, xác nhận khắc phục đạt yêu cầu.');
              setIsKtnbModalVisible(true);
            }}
          >
            KTV Thẩm Định Đạt
          </Button>
          <Button
            size="small"
            danger
            icon={<UndoOutlined />}
            className="text-xs font-semibold rounded-md"
            onClick={() => {
              setReworkNotes('');
              setIsReworkModalVisible(true);
            }}
          >
            Yêu Cầu Giải Trình Thêm
          </Button>
        </Space>
      );
    }

    // Action for Step 5 (Team Lead Opinion & Closure)
    if (closureStatus === CLOSURE_STATUS.PENDING_TEAM_LEAD_OPINION) {
      return (
        <Space wrap size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            className="bg-orange-500 hover:bg-orange-600 border-none text-xs font-semibold rounded-md shadow-xs"
            onClick={() => {
              setLeadOpinion('Đồng ý với kết quả thẩm định của KTV. Đề xuất Lãnh đạo KTNB phê duyệt đóng hồ sơ.');
              setIsLeadOpinionModalVisible(true);
            }}
          >
            Ý Kiến Trưởng Đoàn
          </Button>
          <Button
            type="primary"
            size="small"
            danger
            icon={<CheckCircleOutlined />}
            className="bg-red-600 hover:bg-red-700 border-none text-xs font-semibold rounded-md shadow-xs"
            onClick={() => {
              setCloseReason('Đã hoàn tất đầy đủ các giải pháp khắc phục và được nghiệm thu độc lập.');
              setIsCloseModalVisible(true);
            }}
          >
            Phê Duyệt Đóng (Close)
          </Button>
        </Space>
      );
    }

    // Action for Auditee Portal (Step 2 & Step 3)
    if (onOpenAuditeePlan && (currentStep === 0 || (currentStep === 1 && !rec.remediationPlan))) {
      return (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          className="bg-blue-600 hover:bg-blue-700 border-none text-xs font-semibold rounded-md shadow-xs"
          onClick={() => onOpenAuditeePlan(rec)}
        >
          Lập Kế Hoạch Cam Kết
        </Button>
      );
    }

    if (onOpenAuditeeProgress && currentStep === 1 && progressPercent < 100) {
      return (
        <Button
          type="primary"
          size="small"
          icon={<CloudUploadOutlined />}
          className="bg-cyan-600 hover:bg-cyan-700 border-none text-xs font-semibold rounded-md shadow-xs"
          onClick={() => onOpenAuditeeProgress(rec)}
        >
          Báo Cáo Tiến Độ / 100%
        </Button>
      );
    }

    return null;
  };

  return (
    <Card
      size="small"
      className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50/70 via-white to-blue-50/40 shadow-sm"
      styles={{ body: { padding: '16px 20px' } }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <Space size="small">
          <Text strong className="text-sm text-slate-800">
            Chu trình Khắc phục Kiến nghị (Quy trình 5 bước IIA & LPBank)
          </Text>
          <Tag color={closureStatus === CLOSURE_STATUS.CLOSED ? 'green' : 'blue'} className="font-semibold text-xs">
            Trạng thái: {closureStatus === CLOSURE_STATUS.CLOSED ? 'Đã đóng hoàn tất' : closureStatus}
          </Tag>
        </Space>
        {rec.dueDate && (
          <Text type="secondary" className="text-xs flex items-center gap-1">
            <ClockCircleOutlined /> Hạn chót SLA: <span className="font-semibold text-slate-700">{rec.dueDate}</span>
          </Text>
        )}
      </div>

      <Steps
        current={currentStep}
        size="small"
        className="mb-3"
        items={items}
      />

      {nextActionGuide && (
        <Alert
          type="info"
          showIcon
          icon={<WarningOutlined className="text-blue-600 text-base" />}
          className="rounded-lg py-2 px-3 bg-blue-50/80 border-blue-200 text-xs"
          message={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">👉 Bước tiếp theo:</span>
                <Tag color={nextActionGuide.tagColor} className="text-xs font-semibold m-0">
                  {nextActionGuide.actor}
                </Tag>
                <span className="text-slate-700">{nextActionGuide.action}</span>
              </div>
              {renderActionButtons()}
            </div>
          }
        />
      )}

      {/* ═══ MODALS TÁI SỬ DỤNG CHO CÁC BƯỚC THAO TÁC ═══ */}

      {/* Modal 1: KTV Thẩm Định Đạt (Bước 4) */}
      <TimelineActionModal
        open={isKtnbModalVisible}
        title="Thẩm Định Bằng Chứng Khắc Phục (Bước 4 - KTV Phụ Trách)"
        helperText="Nhập ghi chú thẩm định hồ sơ, chứng từ thực tế của ĐVĐKT trước khi chuyển tiếp cho Trưởng đoàn:"
        placeholder="Nhập ghi chú thẩm định kết quả khắc phục..."
        okText="Xác nhận đạt"
        okButtonProps={{ className: "bg-purple-600 hover:bg-purple-700" }}
        submitting={submitting}
        value={ktnbNotes}
        onChange={setKtnbNotes}
        onOk={handleConfirmKtnbReview}
        onCancel={() => setIsKtnbModalVisible(false)}
      />

      {/* Modal 2: KTV Yêu Cầu Giải Trình Lại */}
      <TimelineActionModal
        open={isReworkModalVisible}
        title="Yêu Cầu ĐVĐKT Giải Trình Bổ Sung Bằng Chứng"
        helperText="Hồ sơ chưa đạt yêu cầu. Nhập rõ lý do từ chối hoặc bằng chứng cần bổ sung để ĐVĐKT thực hiện lại:"
        placeholder="Nêu rõ lý do từ chối / tài liệu chứng minh còn thiếu..."
        okText="Gửi yêu cầu"
        okButtonProps={{ danger: true }}
        submitting={submitting}
        value={reworkNotes}
        onChange={setReworkNotes}
        onOk={handleRequestRework}
        onCancel={() => setIsReworkModalVisible(false)}
      />

      {/* Modal 3: Ý Kiến Trưởng Đoàn (Bước 5) */}
      <TimelineActionModal
        open={isLeadOpinionModalVisible}
        title="Ý Kiến Kết Luận Của Trưởng Đoàn (Bước 5)"
        helperText="Trưởng đoàn thẩm định độc lập và ghi nhận ý kiến chỉ đạo đối với kiến nghị:"
        placeholder="Nhập ý kiến kết luận của Trưởng đoàn..."
        okText="Lưu ý kiến"
        okButtonProps={{ className: "bg-orange-500 hover:bg-orange-600" }}
        submitting={submitting}
        value={leadOpinion}
        onChange={setLeadOpinion}
        onOk={handleSubmitLeadOpinion}
        onCancel={() => setIsLeadOpinionModalVisible(false)}
      />

      {/* Modal 4: Phê Duyệt Đóng Kiến Nghị */}
      <TimelineActionModal
        open={isCloseModalVisible}
        title="Phê Duyệt Đóng Chính Thức Kiến Nghị Kiểm Toán (Closed)"
        helperText="Xác nhận kiến nghị đã được khắc phục triệt để và đủ điều kiện đóng hồ sơ chính thức:"
        placeholder="Nhập lý do / căn cứ đóng kiến nghị..."
        okText="Xác nhận đóng"
        okButtonProps={{ danger: true }}
        submitting={submitting}
        value={closeReason}
        onChange={setCloseReason}
        onOk={handleCloseRecommendation}
        onCancel={() => setIsCloseModalVisible(false)}
      />
    </Card>
  );
};

export default RecommendationTimeline;
