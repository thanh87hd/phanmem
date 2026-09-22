import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, Descriptions, Tag, Form, Input, Select, Button, Space, message, Typography, Divider, Alert } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface Props {
  auditCase: any;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const CmcaAuditCaseDrawer: React.FC<Props> = ({ auditCase, open, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  if (!auditCase) return null;

  const deadline = dayjs(auditCase.slaDeadline);
  const now = dayjs();
  const hoursLeft = deadline.diff(now, 'hour');
  const isOverdue = hoursLeft < 0;

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      await api.patch(`/continuous-monitoring/audit-cases/${auditCase.id}`, values);
      message.success('Đã cập nhật Hồ sơ Kiểm toán');
      onUpdated();
      onClose();
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING_EXPLANATION: 'warning', EXPLAINED: 'processing', APPROVED: 'success', REJECTED: 'error'
  };
  const statusLabels: Record<string, string> = {
    PENDING_EXPLANATION: 'Chờ giải trình', EXPLAINED: 'Đã giải trình', APPROVED: 'Chấp nhận', REJECTED: 'Từ chối'
  };

  return (
    <Drawer
      title={`Hồ sơ Kiểm toán: ${auditCase.caseId}`}
      open={open}
      onClose={onClose}
      width={680}
      extra={
        <Space>
          <Button onClick={onClose}>{t('common.btnClose', 'Đóng')}</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>{t('common.btnSaveUpdate', 'Lưu cập nhật')}</Button>
        </Space>
      }
    >
      {/* SLA Status Alert */}
      {isOverdue ? (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={`Quá hạn SLA: ${Math.abs(hoursLeft)} giờ`}
          description={`Deadline: ${deadline.format('DD/MM/YYYY HH:mm')}`}
          style={{ marginBottom: 16 }}
        />
      ) : hoursLeft < 8 ? (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          message={`SLA sắp hết hạn: còn ${hoursLeft} giờ`}
          description={`Deadline: ${deadline.format('DD/MM/YYYY HH:mm')}`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={`Trong SLA: còn ${hoursLeft} giờ`}
          description={`Deadline: ${deadline.format('DD/MM/YYYY HH:mm')}`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Case Details */}
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Mã Case">{auditCase.caseId}</Descriptions.Item>
        <Descriptions.Item label="Chi nhánh">{auditCase.branchCode}</Descriptions.Item>
        <Descriptions.Item label="Risk Score"><Tag color={auditCase.riskScore >= 80 ? 'red' : 'warning'}>{auditCase.riskScore}</Tag></Descriptions.Item>
        <Descriptions.Item label="Trạng thái"><Tag color={statusColors[auditCase.explanationStatus] || 'default'}>{statusLabels[auditCase.explanationStatus] || auditCase.explanationStatus}</Tag></Descriptions.Item>
        <Descriptions.Item label="Tạo lúc" span={2}>{dayjs(auditCase.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
      </Descriptions>

      {/* Alert Details */}
      {auditCase.alert && (
        <>
          <Divider orientation="left" style={{ fontSize: 13 }}>Cảnh báo gốc</Divider>
          <div style={{ background: '#fff7e6', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <Text strong>{auditCase.alert.title}</Text>
            <div style={{ marginTop: 4 }}><Text type="secondary">{auditCase.alert.description}</Text></div>
            {auditCase.alert.relatedData && (
              <pre style={{ fontSize: 11, background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 8, maxHeight: 120, overflow: 'auto' }}>
                {JSON.stringify(auditCase.alert.relatedData, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}

      {/* Explanation Form */}
      <Divider orientation="left" style={{ fontSize: 13 }}>Biểu mẫu Giải trình & Thẩm định</Divider>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          explanationStatus: auditCase.explanationStatus,
          rootCauseAnalysis: auditCase.rootCauseAnalysis || '',
          actionPlan: auditCase.actionPlan || '',
          explanationText: auditCase.explanationText || '',
          auditorVerdict: auditCase.auditorVerdict || '',
          assignedAuditor: auditCase.assignedAuditor || '',
        }}
      >
        <Form.Item name="explanationStatus" label="Trạng thái xử lý">
          <Select>
            <Option value="PENDING_EXPLANATION">Chờ giải trình</Option>
            <Option value="EXPLAINED">Đã giải trình</Option>
            <Option value="APPROVED">Chấp nhận giải trình</Option>
            <Option value="REJECTED">Từ chối → Chuyển kiểm toán tại chỗ</Option>
          </Select>
        </Form.Item>

        <Form.Item name="assignedAuditor" label="Kiểm toán viên phụ trách">
          <Input placeholder="Nhập tên KTV được phân công..." />
        </Form.Item>

        <Form.Item name="rootCauseAnalysis" label="3. Root Cause Analysis (Phân tích nguyên nhân gốc)">
          <TextArea rows={3} placeholder="Phân tích danh sách Top 5 khách hàng / yếu tố gây phát sinh cảnh báo..." />
        </Form.Item>

        <Form.Item name="actionPlan" label="4. Kế hoạch Hành động & Timeline">
          <TextArea rows={3} placeholder="Tiến độ thu hồi / phát mại TSBĐ / thời hạn đưa chỉ số về ngưỡng an toàn..." />
        </Form.Item>

        <Form.Item name="explanationText" label="Nội dung Giải trình của Đơn vị">
          <TextArea rows={3} placeholder="Nội dung giải trình từ Chi nhánh / Đơn vị kinh doanh..." />
        </Form.Item>

        <Form.Item name="auditorVerdict" label="5. Ý kiến Thẩm định của KTNB">
          <TextArea rows={3} placeholder="Ý kiến của Kiểm toán viên: Chấp nhận / Chuyển kiểm toán tại chỗ..." />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CmcaAuditCaseDrawer;
