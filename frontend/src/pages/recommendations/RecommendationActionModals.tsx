import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Select, Button, Typography, Tag } from 'antd';
import type { FormInstance } from 'antd';
import {
  SafetyOutlined, WarningOutlined, InfoCircleOutlined,
  ClockCircleOutlined, SolutionOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface RecommendationActionModalsProps {
  selectedRec: any;
  // Verify modal
  isVerifyVisible: boolean;
  onCloseVerify: () => void;
  handleVerify: () => void;
  verifyForm: FormInstance;
  // Close modal
  isCloseVisible: boolean;
  onCloseClose: () => void;
  handleCloseConfirm: () => void;
  closeForm: FormInstance;
  // Self monitor modal
  isSelfMonitorVisible: boolean;
  onCloseSelfMonitor: () => void;
  handleSelfMonitorSave: () => void;
  selfMonitorForm: FormInstance;
  selfMonitorWatch: boolean;
  setSelfMonitorWatch: (val: boolean) => void;
  // Extension review modal
  isExtensionReviewVisible: boolean;
  onCloseExtensionReview: () => void;
  handleApproveExtension: (approved: boolean) => void;
  extensionReviewRec: any;
  extensionReviewForm: FormInstance;
  // Line 2 modal
  isLine2Visible: boolean;
  onCloseLine2: () => void;
  handleSubmitLine2Monitoring: () => void;
  line2Rec: any;
  line2Form: FormInstance;
  departments: any[];
}

export const RecommendationActionModals: React.FC<RecommendationActionModalsProps> = ({
  selectedRec,
  isVerifyVisible,
  onCloseVerify,
  handleVerify,
  verifyForm,
  isCloseVisible,
  onCloseClose,
  handleCloseConfirm,
  closeForm,
  isSelfMonitorVisible,
  onCloseSelfMonitor,
  handleSelfMonitorSave,
  selfMonitorForm,
  selfMonitorWatch,
  setSelfMonitorWatch,
  isExtensionReviewVisible,
  onCloseExtensionReview,
  handleApproveExtension,
  extensionReviewRec,
  extensionReviewForm,
  isLine2Visible,
  onCloseLine2,
  handleSubmitLine2Monitoring,
  line2Rec,
  line2Form,
  departments,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Verify Modal */}
      <Modal
        title={<><SafetyOutlined className="mr-2 text-purple-500" />Xác nhận Khắc phục (KTV Verify)</>}
        open={isVerifyVisible}
        onOk={handleVerify}
        onCancel={onCloseVerify}
        okText={t('common.btnConfirmVerified', 'Xác nhận Verified')}
        okButtonProps={{ className: 'bg-purple-500 border-purple-500' }}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={600}
      >
        {selectedRec && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>Kiến nghị: </Text>
            <Text>{selectedRec.recommendation}</Text>
            <br />
            <Text strong>Đơn vị: </Text>
            <Text>{selectedRec.department?.name || selectedRec.legacyDepartmentName}</Text>
            <br />
            <Text strong>Phản hồi ĐVĐKT: </Text>
            <Text className="text-blue-600">{selectedRec.response || t('auditPlan.drawer.noDate', 'Chưa có')}</Text>
          </div>
        )}
        <Form form={verifyForm} layout="vertical">
          <Form.Item name="notes" label="Ghi chú xác nhận của KTV" rules={[{ required: true, message: t('recommendations.pleaseEnterAConfirmationNote', 'Vui lòng nhập ghi chú xác nhận') }]}>
            <TextArea rows={4} placeholder={t('recommendations.recordResultsOfRemediationEvidenceOf', 'Ghi nhận kết quả khắc phục, bằng chứng đã kiểm tra...')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Close Modal */}
      <Modal
        title={<><WarningOutlined className="mr-2 text-red-500" />Xác nhận Đóng kiến nghị kiểm toán</>}
        open={isCloseVisible}
        onOk={handleCloseConfirm}
        onCancel={onCloseClose}
        okText={t('common.btnCloseRec', 'Đóng kiến nghị')}
        okButtonProps={{ danger: true }}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={600}
      >
        {selectedRec && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>Kiến nghị: </Text>
            <Text>{selectedRec.recommendation}</Text>
            <br />
            <Text strong>Đơn vị: </Text>
            <Text>{selectedRec.department?.name || selectedRec.legacyDepartmentName}</Text>
            <br />
            <Text strong>Ý kiến Trưởng đoàn: </Text>
            <Text className="text-orange-600">{selectedRec.teamLeadClosureOpinion || t('auditPlan.drawer.noDate', 'Chưa có')}</Text>
          </div>
        )}
        <Form form={closeForm} layout="vertical">
          <Form.Item name="closedReason" label={t('recommendations.ktnbAssessment.closureReason', 'Lý do đóng kiến nghị')} rules={[{ required: true, message: t('recommendations.pleaseEnterAReasonForClosing', 'Vui lòng nhập lý do đóng kiến nghị') }]}>
            <TextArea rows={4} placeholder={t('recommendations.enterTheReasonForClosingThe', 'Nhập lý do đóng kiến nghị (Ví dụ: Đã khắc phục triệt để / Biện pháp thay thế đã duyệt / Quy định thay đổi...)')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Self-monitor Modal */}
      <Modal
        title={<><InfoCircleOutlined className="mr-2 text-cyan-500" />Thiết lập chế độ Tự theo dõi</>}
        open={isSelfMonitorVisible}
        onOk={handleSelfMonitorSave}
        onCancel={onCloseSelfMonitor}
        okText={t('common.btnSaveSettings', 'Lưu thiết lập')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={500}
      >
        {selectedRec && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>Kiến nghị: </Text>
            <Text>{selectedRec.recommendation}</Text>
            <br />
            <Text strong>Đơn vị: </Text>
            <Text>{selectedRec.department?.name || selectedRec.legacyDepartmentName}</Text>
          </div>
        )}
        <Form form={selfMonitorForm} layout="vertical">
          <Form.Item name="selfMonitored" label="Chế độ Tự theo dõi" rules={[{ required: true }]}>
            <Select onChange={(val) => setSelfMonitorWatch(!!val)}>
              <Option value={true}>Bật tự theo dõi (Giao đơn vị tự giám sát)</Option>
              <Option value={false}>Tắt tự theo dõi (Theo dõi chuẩn SLA)</Option>
            </Select>
          </Form.Item>
          {selfMonitorWatch && (
            <Form.Item name="selfMonitorFrequency" label="Tần suất báo cáo tự theo dõi" rules={[{ required: true, message: t('recommendations.pleaseSelectReportingFrequency', 'Vui lòng chọn tần suất báo cáo') }]}>
              <Select placeholder={t('recommendations.selfMonitorModal.placeholderFrequency', 'Chọn tần suất...')}>
                <Option value="6thang">Định kỳ 6 tháng</Option>
                <Option value="quarterly">Định kỳ hằng quý</Option>
                <Option value="yearly">Định kỳ hằng năm</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal Phê duyệt Gia hạn Kiến nghị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-amber-600 font-bold">
            <ClockCircleOutlined /> Phê duyệt Đơn Đề xuất Gia hạn Kiến nghị
          </div>
        }
        open={isExtensionReviewVisible}
        onCancel={onCloseExtensionReview}
        footer={[
          <Button key="reject" danger onClick={() => handleApproveExtension(false)}>
            Từ chối Gia hạn
          </Button>,
          <Button key="approve" type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} onClick={() => handleApproveExtension(true)}>
            Phê duyệt Gia hạn
          </Button>,
        ]}
        width={600}
      >
        {extensionReviewRec && (
          <div className="space-y-3 mb-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="mb-1"><Text strong>Đơn vị đề xuất: </Text><Text>{extensionReviewRec.department?.name || extensionReviewRec.legacyDepartmentName}</Text></div>
              <div className="mb-1"><Text strong>Kiến nghị: </Text><Text>{extensionReviewRec.recommendation}</Text></div>
              <div className="mb-1"><Text strong>Hạn SLA cũ: </Text><Tag color="red">{extensionReviewRec.dueDate}</Tag></div>
              <div className="mb-1"><Text strong>Hạn mới đề xuất: </Text><Tag color="green">{extensionReviewRec.newTargetDate}</Tag></div>
              <div><Text strong>Lý do đề xuất: </Text><Text className="italic">"{extensionReviewRec.extensionReason}"</Text></div>
            </div>
            <Form form={extensionReviewForm} layout="vertical">
              <Form.Item name="notes" label={<span className="font-semibold text-slate-700">Ý kiến chỉ đạo của Trưởng Ban KTNB</span>}>
                <TextArea rows={3} placeholder="Ghi chú phê duyệt / yêu cầu bổ sung..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Modal Tuyến 2 (Khối NV Hội sở) cập nhật giám sát mẫu */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <SolutionOutlined /> Tuyến 2 (Khối NV Hội sở) Báo cáo Giám sát Mẫu Khắc phục
          </div>
        }
        open={isLine2Visible}
        onOk={handleSubmitLine2Monitoring}
        onCancel={onCloseLine2}
        okText={t('common.btnSaveMonitorOpinion', 'Lưu Ý kiến Giám sát')}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={600}
      >
        {line2Rec && (
          <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
            <div className="mb-1"><Text strong>Kiến nghị: </Text><Text>{line2Rec.recommendation}</Text></div>
            <div><Text strong>Đơn vị thực hiện: </Text><Text>{line2Rec.department?.name || line2Rec.legacyDepartmentName}</Text></div>
          </div>
        )}
        <Form form={line2Form} layout="vertical">
          <Form.Item name="line2Department" label={<span className="font-semibold text-slate-700">Khối / Phòng NV Hội sở giám sát</span>} rules={[{ required: true, message: 'Nhập tên Khối nghiệp vụ' }]}>
            <Select placeholder="Chọn Khối / Phòng NV Hội sở..." showSearch allowClear optionFilterProp="children">
              {departments.map((d: any) => (
                <Option key={d.id} value={d.name}>{d.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="line2MonitoringStatus" label={<span className="font-semibold text-slate-700">Đánh giá của Tuyến 2 về tiến độ khắc phục</span>} rules={[{ required: true }]}>
            <Select>
              <Option value="Monitoring">🔵 Đang theo dõi / Giám sát định kỳ</Option>
              <Option value="Satisfied">🟢 Đã đạt yêu cầu nghiệp vụ của Hội sở</Option>
              <Option value="NeedsAction">🔴 Chưa đạt yêu cầu / Cần đôn đốc xử lý gấp</Option>
            </Select>
          </Form.Item>
          <Form.Item name="line2Notes" label={<span className="font-semibold text-slate-700">Ý kiến đánh giá & Kết quả giám sát mẫu</span>} rules={[{ required: true, message: 'Nhập ý kiến đánh giá' }]}>
            <TextArea rows={4} placeholder="Nhập kết quả kiểm tra mẫu, đánh giá tính triệt để của biện pháp khắc phục..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
