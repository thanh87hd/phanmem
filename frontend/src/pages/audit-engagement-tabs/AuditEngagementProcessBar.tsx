import React from 'react';
import { Steps, Tag, Typography, Button, Modal, Space, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  LockOutlined, 
  LoadingOutlined, 
  UserOutlined, 
  ArrowRightOutlined, 
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

export interface AuditEngagementProcessBarProps {
  selectedEngagement: any;
  activePhase: string;
  setActivePhase: (phase: string) => void;
  currentUser: any;
  onOpenStageGateModal: (targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed') => void;
}

export const AuditEngagementProcessBar: React.FC<AuditEngagementProcessBarProps> = ({
  selectedEngagement,
  activePhase,
  setActivePhase,
  currentUser,
  onOpenStageGateModal,
}) => {
  const status = selectedEngagement?.status || 'Planning';
  const leadAuditorName = selectedEngagement?.leadAuditorUser?.fullName || selectedEngagement?.legacyLeadAuditor || 'Chưa phân công';
  const teamMembersCount = selectedEngagement?.teamMembers?.length || 0;

  // Xác định vai trò của người dùng hiện tại trong cuộc kiểm toán
  const currentUserId = currentUser?.userId || currentUser?.id;
  const isLeadAuditor = Boolean(currentUserId && selectedEngagement?.leadAuditorId === currentUserId);
  const roleStr = typeof currentUser?.role === 'string' ? currentUser.role : (currentUser?.role?.name || currentUser?.roleName || '');
  const isAdmin = roleStr.toLowerCase().includes('admin') || roleStr.toLowerCase().includes('quản trị');
  const isTeamMember = Boolean(
    currentUserId &&
    Array.isArray(selectedEngagement?.teamMembers) &&
    selectedEngagement.teamMembers.some((m: any) => (m.userId || m.id || m) === currentUserId)
  );
  
  let userRoleBadge = 'Người theo dõi';
  let userRoleColor = 'default';
  if (isAdmin) {
    userRoleBadge = 'Quản trị viên (Admin)';
    userRoleColor = 'red';
  } else if (isLeadAuditor) {
    userRoleBadge = 'Trưởng đoàn kiểm toán';
    userRoleColor = 'gold';
  } else if (isTeamMember) {
    userRoleBadge = 'Kiểm toán viên thành viên đoàn';
    userRoleColor = 'blue';
  }

  // Xác định tính hợp lệ của từng giai đoạn (0: Planning, 1: Fieldwork, 2: Reporting, 3: Closure)
  const isPhaseUnlocked = (phaseIndex: number): boolean => {
    if (isAdmin) return true; // Admin có thể xem tất cả nếu cần xử lý đặc biệt
    if (phaseIndex === 0) return true; // Giai đoạn 1 luôn mở hoặc xem lại
    if (phaseIndex === 1) return status === 'Fieldwork' || status === 'Reporting' || status === 'Completed';
    if (phaseIndex === 2) return status === 'Reporting' || status === 'Completed';
    if (phaseIndex === 3) return status === 'Completed';
    return false;
  };

  const getPhaseName = (index: number) => {
    switch (index) {
      case 0: return 'Giai đoạn 1: Lập Kế hoạch & Chuẩn bị (IIA 2200)';
      case 1: return 'Giai đoạn 2: Thực địa & Thử nghiệm (IIA 2300)';
      case 2: return 'Giai đoạn 3: Báo cáo & Kết quả (IIA 2400)';
      case 3: return 'Giai đoạn 4: Theo dõi & Đóng cuộc KT (IIA 2500 & 1300)';
      default: return '';
    }
  };

  const getCurrentStatusStageIndex = (): number => {
    if (status === 'Fieldwork') return 1;
    if (status === 'Reporting') return 2;
    if (status === 'Completed') return 3;
    return 0;
  };

  // Xử lý khi người dùng bấm vào Step
  const handleStepClick = (targetIndex: number) => {
    const phases = ['phase1', 'phase2', 'phase3', 'phase4'];
    const currentStageIndex = getCurrentStatusStageIndex();

    // Nếu giai đoạn mục tiêu đã được mở khóa
    if (isPhaseUnlocked(targetIndex)) {
      setActivePhase(phases[targetIndex]);
      return;
    }

    // Nếu giai đoạn bị KHÓA: Chặn và hiển thị giải thích rõ ràng không được làm tắt giai đoạn
    Modal.warning({
      title: (
        <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
          <ExclamationCircleOutlined />
          <span>Quy tắc IIA: Không Được Phép Làm Tắt Giai Đoạn!</span>
        </div>
      ),
      width: 580,
      content: (
        <div className="space-y-3 pt-2 text-slate-700 text-sm">
          <p>
            Bạn đang cố gắng truy cập vào <strong>{getPhaseName(targetIndex)}</strong>. Tuy nhiên, giai đoạn này hiện đang ở trạng thái <Tag color="error" className="font-bold">Đang khóa 🔒</Tag>.
          </p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div>
              • <strong>Giai đoạn hiện tại của cuộc KT:</strong> <span className="text-blue-700 font-semibold">{getPhaseName(currentStageIndex)}</span>
            </div>
            <div>
              • <strong>Chuẩn mực Quốc tế IIA quy định:</strong> Cuộc kiểm toán phải tuân thủ nghiêm ngặt tiến trình tuần tự, hoàn tất đầy đủ bằng chứng và thủ tục kiểm soát trước khi chuyển tiếp.
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">
            💡 <em>Hướng dẫn: Vui lòng hoàn thành giai đoạn hiện tại và nhấn nút <strong>"Nghiệm thu & Chuyển sang giai đoạn sau"</strong> tại cuối tab để mở khóa giai đoạn tiếp theo.</em>
          </p>
        </div>
      ),
      okText: 'Tôi đã hiểu',
      okButtonProps: { className: 'bg-blue-600 hover:bg-blue-700' },
    });
  };

  const currentStageIndex = getCurrentStatusStageIndex();
  const activePhaseIndex = activePhase === 'phase1' ? 0 : activePhase === 'phase2' ? 1 : activePhase === 'phase3' ? 2 : 3;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Header điều khiển tiến trình & Nhân sự */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quy Trình Kiểm Toán Chuẩn Quốc Tế IIA (Lifecycle & Sequential Gating)
            </span>
            <Tag 
              color={status === 'Completed' ? 'success' : status === 'Reporting' ? 'purple' : status === 'Fieldwork' ? 'blue' : 'orange'} 
              className="font-bold px-3 py-0.5 rounded-full text-xs"
            >
              Tiến độ: {status === 'Completed' ? 'GĐ 4 - Đóng & Theo dõi' : status === 'Reporting' ? 'GĐ 3 - Báo cáo' : status === 'Fieldwork' ? 'GĐ 2 - Thực địa' : 'GĐ 1 - Lập kế hoạch'}
            </Tag>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <UserOutlined />
            <span>Người dùng: <strong>{currentUser?.fullName || 'Kiểm toán viên'}</strong></span>
            <span>•</span>
            <Tag color={userRoleColor} className="text-[11px] font-semibold">{userRoleBadge}</Tag>
          </div>
        </div>

        {/* Nút hành động nhanh chuyển tiếp giai đoạn nếu được quyền */}
        <div className="flex items-center gap-2">
          {status === 'Planning' && (
            <Button
              type="primary"
              size="middle"
              icon={<ArrowRightOutlined />}
              onClick={() => onOpenStageGateModal('phase2')}
              className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-xs h-9"
            >
              Nghiệm thu GĐ 1 ➔ Sang Thực địa
            </Button>
          )}
          {status === 'Fieldwork' && (
            <Button
              type="primary"
              size="middle"
              icon={<ArrowRightOutlined />}
              onClick={() => onOpenStageGateModal('phase3')}
              className="bg-purple-600 hover:bg-purple-700 font-bold rounded-xl text-xs h-9"
            >
              Nghiệm thu GĐ 2 ➔ Sang Báo cáo
            </Button>
          )}
          {status === 'Reporting' && (
            <Button
              type="primary"
              size="middle"
              icon={<ArrowRightOutlined />}
              onClick={() => onOpenStageGateModal('phase4')}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-xs h-9"
            >
              Nghiệm thu GĐ 3 ➔ Sang Theo dõi & Đóng
            </Button>
          )}
        </div>
      </div>

      {/* Stepper trực quan 4 bước có hiển thị Nhân sự phụ trách */}
      <Steps
        current={activePhaseIndex}
        onChange={handleStepClick}
        className="audit-iia-steps cursor-pointer"
        items={[
          {
            title: (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">GĐ 1: Kế hoạch & Chuẩn bị</span>
                {status !== 'Planning' && <CheckCircleOutlined className="text-emerald-500 text-xs" />}
              </div>
            ),
            description: (
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                <div className="font-medium text-slate-700">IIA Standard 2200</div>
                <div className="text-amber-700 font-medium flex items-center gap-1">
                  <UserOutlined />
                  Trưởng đoàn: {leadAuditorName}
                </div>
                <div>
                  {status === 'Planning' ? (
                    <Tag color="processing" className="text-[10px] py-0 px-1.5">Đang làm</Tag>
                  ) : (
                    <Tag color="success" className="text-[10px] py-0 px-1.5">Đã hoàn thành</Tag>
                  )}
                </div>
              </div>
            ),
          },
          {
            title: (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">GĐ 2: Thực địa & Thử nghiệm</span>
                {isPhaseUnlocked(1) ? (
                  (status === 'Reporting' || status === 'Completed') && <CheckCircleOutlined className="text-emerald-500 text-xs" />
                ) : (
                  <LockOutlined className="text-slate-400 text-xs" />
                )}
              </div>
            ),
            description: (
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                <div className="font-medium text-slate-700">IIA Standard 2300</div>
                <div className="text-blue-700 font-medium flex items-center gap-1">
                  <TeamOutlined />
                  Đoàn KT: {teamMembersCount > 0 ? `${teamMembersCount} KTV` : 'KTV thực địa'}
                </div>
                <div>
                  {!isPhaseUnlocked(1) ? (
                    <Tag color="default" className="text-[10px] py-0 px-1.5">Khóa 🔒</Tag>
                  ) : status === 'Fieldwork' ? (
                    <Tag color="processing" className="text-[10px] py-0 px-1.5">Đang làm</Tag>
                  ) : (
                    <Tag color="success" className="text-[10px] py-0 px-1.5">Đã hoàn thành</Tag>
                  )}
                </div>
              </div>
            ),
          },
          {
            title: (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">GĐ 3: Báo cáo & Kết quả</span>
                {isPhaseUnlocked(2) ? (
                  status === 'Completed' && <CheckCircleOutlined className="text-emerald-500 text-xs" />
                ) : (
                  <LockOutlined className="text-slate-400 text-xs" />
                )}
              </div>
            ),
            description: (
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                <div className="font-medium text-slate-700">IIA Standard 2400</div>
                <div className="text-purple-700 font-medium flex items-center gap-1">
                  <SafetyCertificateOutlined />
                  Trưởng đoàn & CAE Lãnh đạo
                </div>
                <div>
                  {!isPhaseUnlocked(2) ? (
                    <Tag color="default" className="text-[10px] py-0 px-1.5">Khóa 🔒</Tag>
                  ) : status === 'Reporting' ? (
                    <Tag color="purple" className="text-[10px] py-0 px-1.5">Đang làm</Tag>
                  ) : (
                    <Tag color="success" className="text-[10px] py-0 px-1.5">Đã hoàn thành</Tag>
                  )}
                </div>
              </div>
            ),
          },
          {
            title: (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">GĐ 4: Theo dõi & Đóng cuộc KT</span>
                {!isPhaseUnlocked(3) && <LockOutlined className="text-slate-400 text-xs" />}
              </div>
            ),
            description: (
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                <div className="font-medium text-slate-700">IIA Standard 2500 & 1300</div>
                <div className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircleOutlined />
                  KTV Giám sát & QAIP Lead
                </div>
                <div>
                  {!isPhaseUnlocked(3) ? (
                    <Tag color="default" className="text-[10px] py-0 px-1.5">Khóa 🔒</Tag>
                  ) : (
                    <Tag color="success" className="text-[10px] py-0 px-1.5">Mở theo dõi</Tag>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AuditEngagementProcessBar;
