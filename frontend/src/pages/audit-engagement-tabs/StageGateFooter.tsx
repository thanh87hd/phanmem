import React from 'react';
import { Card, Button, Tag, Space, Typography } from 'antd';
import { 
  ArrowRightOutlined, 
  CheckCircleOutlined, 
  LockOutlined, 
  TeamOutlined, 
  SafetyCertificateOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

export interface StageGateFooterProps {
  currentPhaseKey: 'phase1' | 'phase2' | 'phase3' | 'phase4';
  engagementStatus: string;
  responsibleRole: string;
  assignedPersonnel: string;
  nextPhaseTitle: string;
  onTriggerNextGate: () => void;
  canProceed: boolean;
}

export const StageGateFooter: React.FC<StageGateFooterProps> = ({
  currentPhaseKey,
  engagementStatus,
  responsibleRole,
  assignedPersonnel,
  nextPhaseTitle,
  onTriggerNextGate,
  canProceed,
}) => {
  // Xác định trạng thái của giai đoạn này
  const isPhase1Done = engagementStatus === 'Fieldwork' || engagementStatus === 'Reporting' || engagementStatus === 'Completed';
  const isPhase2Done = engagementStatus === 'Reporting' || engagementStatus === 'Completed';
  const isPhase3Done = engagementStatus === 'Completed';
  
  let isCurrentDone = false;
  if (currentPhaseKey === 'phase1' && isPhase1Done) isCurrentDone = true;
  if (currentPhaseKey === 'phase2' && isPhase2Done) isCurrentDone = true;
  if (currentPhaseKey === 'phase3' && isPhase3Done) isCurrentDone = true;

  return (
    <div className="mt-8 pt-4 border-t border-slate-200">
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-blue-600 text-base" />
            <span className="font-bold text-slate-800 text-sm sm:text-base">
              Tiến trình Chuẩn mực IIA: {isCurrentDone ? 'Đã nghiệm thu hoàn thành' : 'Đang thực hiện giai đoạn này'}
            </span>
            {isCurrentDone ? (
              <Tag color="success" icon={<CheckCircleOutlined />} className="font-semibold">
                Đã hoàn tất
              </Tag>
            ) : (
              <Tag color="processing" className="font-semibold">
                Đang xử lý
              </Tag>
            )}
          </div>
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 pt-1">
            <span className="flex items-center gap-1">
              <TeamOutlined className="text-slate-400" />
              <strong>Nhân sự & Vai trò phụ trách:</strong> {responsibleRole}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-700 font-medium">
              {assignedPersonnel || 'Chưa phân công'}
            </span>
          </div>
        </div>

        <div>
          {isCurrentDone ? (
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2">
              <CheckCircleOutlined />
              Giai đoạn đã nghiệm thu. Dữ liệu đang được lưu trữ theo chuẩn IIA.
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={onTriggerNextGate}
              disabled={!canProceed}
              className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-md h-11 px-5 flex items-center gap-2"
            >
              Nghiệm thu & Chuyển tiếp: {nextPhaseTitle}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageGateFooter;
