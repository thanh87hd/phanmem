import React from 'react';
import { Modal, Form, Input, Row, Col, Select, DatePicker, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

export interface AuditWorkstreamModalProps {
  open: boolean;
  editingWorkstream: any;
  workstreamForm: any;
  users: any[];
  onOk: () => void;
  onCancel: () => void;
}

export const AuditWorkstreamModal: React.FC<AuditWorkstreamModalProps> = ({
  open,
  editingWorkstream,
  workstreamForm,
  users,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={editingWorkstream ? [t('auditEngagements.updateTheSection', 'Cập nhật phần hành')] : t('auditEngagements.createTheOnionSection', 'Tạo phần hành')}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={editingWorkstream ? [t('auditEngagements.update', 'Cập nhật')] : t('auditEngagements.create', 'Tạo')}
      cancelText={t('findingKB.modal.cancelText', 'Hủy')}
      width={720}
    >
      <Form form={workstreamForm} layout="vertical">
        <Form.Item name="title" label={t('auditEngagements.nameOfTheSection', 'Tên phần hành')} rules={[{ required: true, message: t('auditEngagements.enterTheSectionName', 'Nhập tên phần hành') }]}>
          <Input placeholder={t('auditEngagements.exampleCheckRetailCreditRecords', 'Ví dụ: Kiểm tra hồ sơ tín dụng bán lẻ')} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="riskArea" label={t('auditEngagements.workstreamCols.riskArea', 'Vùng rủi ro')} rules={[{ required: true, message: 'Vui lòng chọn vùng rủi ro' }]}>
              <Select placeholder="Chọn vùng rủi ro..." showSearch allowClear>
                <Option value="Tín dụng">💳 Tín dụng (Credit Risk)</Option>
                <Option value="Vận hành & Tác nghiệp">⚙️ Vận hành & Tác nghiệp (Operational Risk)</Option>
                <Option value="Công nghệ thông tin & An ninh mạng">💻 Công nghệ thông tin & An ninh mạng (IT Risk)</Option>
                <Option value="Kế toán, Tài chính & Kho quỹ">💰 Kế toán, Tài chính & Kho quỹ (Treasury & Accounting)</Option>
                <Option value="Tiết kiệm bưu điện (PGDBĐ)">📮 Tiết kiệm bưu điện (PGDBĐ / Postal)</Option>
                <Option value="Tuân thủ & Pháp chế">⚖️ Tuân thủ & Pháp chế (Compliance & Legal)</Option>
                <Option value="Thị trường & Thanh khoản">📊 Thị trường & Thanh khoản (Market & Liquidity)</Option>
                <Option value="Chung / Tổng hợp">📑 Chung / Tổng hợp</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="Mức ưu tiên" initialValue="Medium">
              <Select>
                <Option value="High">🔴 Cao (High)</Option>
                <Option value="Medium">🟡 Trung bình (Medium)</Option>
                <Option value="Low">🟢 Thấp (Low)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="startDate" label="Ngày bắt đầu">
              <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dueDate" label={<span className="font-semibold text-amber-700">⏰ Hạn hoàn thành</span>}>
              <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn hạn" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="estimatedDays" label="Ngày công dự kiến">
              <InputNumber min={0} max={365} className="w-full" placeholder="VD: 5" addonAfter="ngày" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="assignedAuditorId" label={t('auditEngagements.workstreamCols.assigned', 'KTV phụ trách')} rules={[{ required: true, message: t('auditEngagements.selectTheKtvInCharge', 'Chọn KTV phụ trách') }]}>
              <Select showSearch optionFilterProp="children" placeholder={t('auditEngagements.chooseKtv', 'Chọn KTV')}>
                {users.map(u => <Option key={u.id} value={u.id}>{u.fullName} ({u.username})</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="reviewerId" label={t('auditEngagements.reviewer', 'Người review')}>
              <Select showSearch optionFilterProp="children" placeholder={t('auditEngagements.selectReviewer', 'Chọn reviewer')} allowClear>
                {users.map(u => <Option key={u.id} value={u.id}>{u.fullName} ({u.username})</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="status" label={t('auditTemplates.cols.status', 'Trạng thái')}>
              <Select>
                <Option value="Draft">Draft</Option>
                <Option value="InProgress">InProgress</Option>
                <Option value="Completed">Completed</Option>
                <Option value="Reviewed">Reviewed</Option>
                <Option value="Rework">Rework</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="scope" label={t('auditEngagements.expectedScopeprocedures', 'Phạm vi/thủ tục dự kiến')}>
          <Input.TextArea rows={4} placeholder={t('auditEngagements.enterTheScopeProcedureOrAudit', 'Nhập phạm vi, thủ tục hoặc kỳ kiểm toán cho phần hành')} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
