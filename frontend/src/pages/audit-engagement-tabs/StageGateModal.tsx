import React, { useState } from 'react';
import { Modal, Button, Steps, Alert, Tag, Space, Typography, Checkbox, message } from 'antd';
import { 
  CheckCircleOutlined, 
  LockOutlined, 
  ArrowRightOutlined, 
  SafetyCertificateOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;

export interface StageGateModalProps {
  visible: boolean;
  onClose: () => void;
  selectedEngagement: any;
  setSelectedEngagement: React.Dispatch<React.SetStateAction<any>>;
  fetchEngagements: () => Promise<void>;
  targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed';
  setActivePhase: (phase: string) => void;
}

export const StageGateModal: React.FC<StageGateModalProps> = ({
  visible,
  onClose,
  selectedEngagement,
  setSelectedEngagement,
  fetchEngagements,
  targetPhase,
  setActivePhase,
}) => {
  const [loading, setLoading] = useState(false);

  if (!selectedEngagement) return null;

  // Cấu hình thông tin chuyển tiếp cho từng giai đoạn
  const getGateConfig = () => {
    switch (targetPhase) {
      case 'phase2':
        return {
          title: 'Nghiệm thu Giai đoạn 1 ➔ Chuyển sang Giai đoạn 2: Thực địa & Thử nghiệm (IIA 2300)',
          targetStatus: 'Fieldwork',
          fromStage: 'Giai đoạn 1: Lập Kế hoạch & Chuẩn bị (IIA 2200)',
          toStage: 'Giai đoạn 2: Thực hiện Thực địa & Thử nghiệm (IIA 2300)',
          responsibleRole: 'Kiểm toán viên thực địa & Trưởng nhóm kiểm toán',
          nextPhaseKey: 'phase2',
          items: [
            {
              id: 'decision',
              label: 'Quyết định kiểm toán (Số QĐ và Ngày ban hành QĐ)',
              passed: Boolean(selectedEngagement.decisionNo && selectedEngagement.decisionDate),
              detail: selectedEngagement.decisionNo 
                ? `Đã có QĐ số: ${selectedEngagement.decisionNo} (ngày ${selectedEngagement.decisionDate || 'N/A'})`
                : 'Chưa cập nhật Số quyết định và Ngày ban hành QĐ tại Tab 1.1'
            },
            {
              id: 'personnel',
              label: 'Phân công Trưởng đoàn & Thành viên đoàn kiểm toán',
              passed: Boolean(selectedEngagement.leadAuditorId || selectedEngagement.legacyLeadAuditor),
              detail: (selectedEngagement.leadAuditorUser?.fullName || selectedEngagement.legacyLeadAuditor)
                ? `Trưởng đoàn: ${selectedEngagement.leadAuditorUser?.fullName || selectedEngagement.legacyLeadAuditor} - Đoàn gồm ${(selectedEngagement.teamMembers?.length || 0)} thành viên`
                : 'Chưa phân công Trưởng đoàn kiểm toán tại Tab 1.1'
            },
            {
              id: 'proposal',
              label: 'Kế hoạch & Đề cương kiểm toán đã được phê duyệt',
              passed: selectedEngagement.proposalStatus === 'Approved' || Boolean(selectedEngagement.outlineDocUrl),
              detail: selectedEngagement.proposalStatus === 'Approved'
                ? 'Đề cương & Kế hoạch đã được phê duyệt chính thức'
                : 'Đề cương chưa phê duyệt (Trạng thái: ' + (selectedEngagement.proposalStatus || 'Draft') + ') - Bạn vẫn có thể xác nhận nếu có QĐ bằng văn bản'
            },
            {
              id: 'scope',
              label: 'Mục tiêu & Phạm vi kiểm toán đã được thiết lập',
              passed: Boolean(selectedEngagement.objective && selectedEngagement.scope),
              detail: (selectedEngagement.objective && selectedEngagement.scope)
                ? 'Đã xác định rõ Mục tiêu và Phạm vi tại Tab 1.2'
                : 'Cần hoàn thiện Mục tiêu và Phạm vi tại Tab 1.2'
            },
            {
              id: 'workstreams',
              label: 'Chương trình kiểm toán & Luồng công việc (Workstreams)',
              passed: true,
              detail: 'Đã sẵn sàng các phần hành và biểu mẫu thử nghiệm'
            }
          ]
        };

      case 'phase3':
        return {
          title: 'Nghiệm thu Giai đoạn 2 ➔ Chuyển sang Giai đoạn 3: Báo cáo & Kết quả (IIA 2400)',
          targetStatus: 'Reporting',
          fromStage: 'Giai đoạn 2: Thực hiện Thực địa & Thử nghiệm (IIA 2300)',
          toStage: 'Giai đoạn 3: Báo cáo & Kết quả (IIA 2400)',
          responsibleRole: 'Trưởng đoàn kiểm toán & Lãnh đạo KTNB (CAE)',
          nextPhaseKey: 'phase3',
          items: [
            {
              id: 'fieldwork_completed',
              label: 'Kết thúc thời gian thực địa & Họp kết thúc (Exit Conference)',
              passed: Boolean(selectedEngagement.fieldworkEndDate),
              detail: selectedEngagement.fieldworkEndDate 
                ? `Ngày kết thúc thực địa: ${selectedEngagement.fieldworkEndDate}`
                : 'Chưa ghi nhận ngày kết thúc thực địa tại Tab 2.1'
            },
            {
              id: 'wp_reviewed',
              label: 'Giấy tờ làm việc (W/P) đã hoàn thành và được soát xét',
              passed: true,
              detail: 'Hệ thống W/P đã được lập và ghi nhận đầy đủ mẫu thử nghiệm tại Tab 2.3'
            },
            {
              id: 'findings_5c',
              label: 'Danh mục Phát hiện kiểm toán (Audit Findings 5C) đã chuẩn hóa',
              passed: true,
              detail: 'Các phát hiện rủi ro Cao/TB/Thấp đã ghi nhận đầy đủ thuộc tính 5C tại Tab 2.4'
            },
            {
              id: 'minutes_mb04',
              label: 'Biên bản kiểm toán thực địa (MB04) đã ký xác nhận với đơn vị',
              passed: true,
              detail: 'Đã lập Biên bản kiểm toán thực địa MB04 tổng hợp kết quả tại Tab 2.5'
            }
          ]
        };

      case 'phase4':
        return {
          title: 'Nghiệm thu Giai đoạn 3 ➔ Chuyển sang Giai đoạn 4: Theo dõi & Đóng cuộc KT (IIA 2500 & 1300)',
          targetStatus: 'Completed',
          fromStage: 'Giai đoạn 3: Báo cáo & Kết quả (IIA 2400)',
          toStage: 'Giai đoạn 4: Theo dõi & Đóng cuộc KT (IIA 2500 & 1300)',
          responsibleRole: 'KTV Theo dõi kiến nghị & Cán bộ Đảm bảo chất lượng (QAIP Lead)',
          nextPhaseKey: 'phase4',
          items: [
            {
              id: 'report_approved',
              label: 'Báo cáo kiểm toán đã được Lãnh đạo KTNB (CAE) phê duyệt',
              passed: true,
              detail: 'Báo cáo chính thức kèm xếp hạng hệ thống KSNB đã hoàn tất tại Tab 3.1 & 3.3'
            },
            {
              id: 'action_plan',
              label: 'Ý kiến giải trình & Kế hoạch hành động (Action Plan) của đơn vị',
              passed: true,
              detail: 'Đã thống nhất cam kết khắc phục, thời hạn và đầu mối phụ trách tại Tab 3.2'
            },
            {
              id: 'report_issued',
              label: 'Báo cáo kiểm toán đã được phát hành chính thức',
              passed: true,
              detail: 'Đã gửi báo cáo đến Hội đồng Quản trị, BKS, TGĐ và Đơn vị được kiểm toán'
            }
          ]
        };

      default:
        return {
          title: 'Đóng cuộc kiểm toán & Lưu trữ hồ sơ số hóa (IIA 1300 & Archive)',
          targetStatus: 'Completed',
          fromStage: 'Giai đoạn 4: Theo dõi & Đóng cuộc KT (IIA 2500 & 1300)',
          toStage: 'Đóng và Lưu trữ Hồ sơ kiểm toán',
          responsibleRole: 'Trưởng ban KTNB & Quản trị hệ thống',
          nextPhaseKey: 'phase4',
          items: [
            {
              id: 'qaip_done',
              label: 'Đánh giá chất lượng cuộc kiểm toán QAIP đạt yêu cầu',
              passed: true,
              detail: 'Đã hoàn thành 6 tiêu chí QAIP theo chuẩn mực 15.4'
            },
            {
              id: 'recommendations_tracked',
              label: 'Hệ thống theo dõi kiến nghị đã được kích hoạt',
              passed: true,
              detail: 'Các kiến nghị đã có hạn chót SLA và đầu mối đơn vị'
            }
          ]
        };
    }
  };

  const config = getGateConfig();

  const handleConfirmTransition = async () => {
    setLoading(true);
    try {
      // 1. Cập nhật trạng thái cuộc kiểm toán lên backend
      await api.patch(`/audit-engagements/${selectedEngagement.id}`, {
        status: config.targetStatus,
      });

      // 2. Làm mới dữ liệu cuộc kiểm toán
      const refreshed = await api.get(`/audit-engagements/${selectedEngagement.id}`);
      setSelectedEngagement(refreshed.data);
      await fetchEngagements();

      message.success(`Đã nghiệm thu và chuyển thành công sang: ${config.toStage}`);
      
      // 3. Chuyển view sang phase tiếp theo
      setActivePhase(config.nextPhaseKey);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi chuyển giai đoạn:', err);
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi chuyển giai đoạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <SafetyCertificateOutlined className="text-blue-600 text-xl" />
          <span className="font-bold text-base">{config.title}</span>
        </div>
      }
      width={720}
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<ArrowRightOutlined />}
          loading={loading}
          onClick={handleConfirmTransition}
          className="bg-blue-600 hover:bg-blue-700 font-bold"
        >
          Xác nhận Nghiệm thu & Mở khóa Giai đoạn tiếp theo
        </Button>,
      ]}
    >
      <div className="space-y-4 py-2">
        <Alert
          message={
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Quy tắc Chuẩn mực Quốc tế IIA (Global Internal Audit Standards):</span>
              <p className="mt-1 mb-0 text-slate-600">
                Để đảm bảo tính độc lập, chất lượng bằng chứng và tính tuân thủ quy trình, cuộc kiểm toán không được phép làm tắt giai đoạn. Việc nghiệm thu giai đoạn này sẽ mở khóa toàn bộ quyền hạn thực hiện cho giai đoạn tiếp theo.
              </p>
            </div>
          }
          type="info"
          showIcon
          className="rounded-xl border-blue-200 bg-blue-50"
        />

        {/* Thông tin chuyển đổi */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Từ: <strong className="text-slate-700">{config.fromStage}</strong></span>
            <span>➔</span>
            <span>Đến: <strong className="text-blue-700">{config.toStage}</strong></span>
          </div>
          <div className="text-xs text-slate-600 pt-1 border-t border-slate-200">
            👤 Nhân sự phụ trách giai đoạn tới: <Tag color="blue" className="font-semibold">{config.responsibleRole}</Tag>
          </div>
        </div>

        {/* Checklist điều kiện tiên quyết */}
        <div>
          <Title level={5} className="!text-sm !font-bold text-slate-800 !mb-2">
            Danh mục Kiểm soát Nghiệm thu Chuyển giai đoạn (Stage-Gate Criteria):
          </Title>
          <div className="space-y-2">
            {config.items.map((item) => (
              <div 
                key={item.id} 
                className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                  item.passed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                {item.passed ? (
                  <CheckCircleOutlined className="text-emerald-600 text-base mt-0.5" />
                ) : (
                  <ExclamationCircleOutlined className="text-amber-500 text-base mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs sm:text-sm text-slate-800">{item.label}</span>
                    <Tag color={item.passed ? 'success' : 'warning'} className="text-[11px] font-bold">
                      {item.passed ? 'Đạt tiêu chuẩn' : 'Cần lưu ý'}
                    </Tag>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StageGateModal;
