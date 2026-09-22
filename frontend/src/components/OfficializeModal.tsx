import React, { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, Select, Input, message, Alert, Space, Typography, Upload, Button, Row, Col } from 'antd';
import { CheckCircleOutlined, UploadOutlined, FilePdfOutlined, AuditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import EngagementDossierManager from './EngagementDossierManager';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface OfficializeModalProps {
  visible: boolean;
  engagement: any;
  onCancel: () => void;
  onSuccess: () => void;
  users: any[];
}

const OfficializeModal: React.FC<OfficializeModalProps> = ({
  visible,
  engagement,
  onCancel,
  onSuccess,
  users,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (engagement && visible) {
      form.setFieldsValue({
        dates: [
          engagement.fieldworkStartDate ? dayjs(engagement.fieldworkStartDate) : dayjs(),
          engagement.fieldworkEndDate ? dayjs(engagement.fieldworkEndDate) : dayjs().add(14, 'day'),
        ],
        leadAuditorId: engagement.leadAuditorId || engagement.leadAuditorUser?.id,
        teamMemberIds: Array.isArray(engagement.teamMembers)
          ? engagement.teamMembers.map((m: any) => m.userId || m.id).filter(Boolean)
          : [],
        decisionDocUrl: engagement.decisionDocUrl,
        proposalDocUrl: engagement.proposalDocUrl,
        outlineDocUrl: engagement.outlineDocUrl,
        samplingPlanDocUrl: engagement.samplingPlanDocUrl,
      });
    }
  }, [engagement, visible, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const lead = users.find((u) => u.id === values.leadAuditorId);
      const members = (values.teamMemberIds || []).map((id: number) => {
        const u = users.find((user) => user.id === id);
        return {
          userId: id,
          fullName: u?.fullName || u?.username || 'KTV',
          role: 'Kiểm toán viên thành viên',
        };
      });

      const payload = {
        fieldworkStartDate: values.dates[0].format('YYYY-MM-DD'),
        fieldworkEndDate: values.dates[1].format('YYYY-MM-DD'),
        leadAuditorId: values.leadAuditorId,
        leadAuditorName: lead?.fullName || lead?.username || 'Trưởng đoàn',
        teamMembers: members,
        decisionDocUrl: values.decisionDocUrl,
        proposalDocUrl: values.proposalDocUrl,
        outlineDocUrl: values.outlineDocUrl,
        samplingPlanDocUrl: values.samplingPlanDocUrl,
      };

      await api.post(`/audit-engagements/${engagement.id}/officialize`, payload);
      message.success('Chính thức hóa Đoàn kiểm toán thành công! Đoàn đã sẵn sàng bước vào giai đoạn Fieldwork.');
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi chính thức hóa đoàn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <AuditOutlined className="text-emerald-600" />
          <span>Chính Thức Hóa Đoàn Kiểm Toán (IIA Standard 2200 & TT 13)</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Phê duyệt & Kích hoạt Fieldwork"
      cancelText="Hủy"
      width={880}
    >
      <Alert
        message="Chuẩn mực IIA 2200 & Thông tư 13/2018/TT-NHNN về Kế hoạch cuộc kiểm toán"
        description="Khi bước vào thời điểm kiểm toán, Đoàn kiểm toán cần được chính thức hóa: Chốt nhân sự thực tế, thời gian fieldwork, và đính kèm đầy đủ 4 bộ hồ sơ pháp lý bắt buộc: Quyết định thành lập đoàn, Tờ trình phê duyệt, Đề cương/Kế hoạch kiểm toán (MB01A/MB02A), và Kế hoạch chọn mẫu."
        type="info"
        showIcon
        className="mb-4"
      />

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="dates"
              label="Thời gian Fieldwork thực tế (Bắt đầu - Kết thúc)"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian fieldwork' }]}
            >
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="leadAuditorId"
              label="Trưởng đoàn kiểm toán chính thức"
              rules={[{ required: true, message: 'Vui lòng chỉ định Trưởng đoàn' }]}
            >
              <Select showSearch placeholder="Chọn Trưởng đoàn..." optionFilterProp="children">
                {users.map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.fullName || u.username} ({u.role?.name || 'KTV'})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="teamMemberIds"
              label="Danh sách KTV thành viên đoàn"
              rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 KTV' }]}
            >
              <Select mode="multiple" placeholder="Chọn các KTV..." optionFilterProp="children">
                {users.map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.fullName || u.username}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Bộ Hồ sơ Pháp lý & Kế hoạch Đoàn kiểm toán */}
        <div className="mt-4 mb-2">
          <EngagementDossierManager
            engagementId={engagement?.id}
            onDossierChange={(_docs, urls) => {
              form.setFieldsValue({
                decisionDocUrl: urls.decisionDocUrl || form.getFieldValue('decisionDocUrl'),
                proposalDocUrl: urls.proposalDocUrl || form.getFieldValue('proposalDocUrl'),
                outlineDocUrl: urls.outlineDocUrl || form.getFieldValue('outlineDocUrl'),
                samplingPlanDocUrl: urls.samplingPlanDocUrl || form.getFieldValue('samplingPlanDocUrl'),
              });
            }}
          />
        </div>

        {/* Hidden Form Items to preserve compatibility */}
        <Form.Item name="decisionDocUrl" hidden><Input /></Form.Item>
        <Form.Item name="proposalDocUrl" hidden><Input /></Form.Item>
        <Form.Item name="outlineDocUrl" hidden><Input /></Form.Item>
        <Form.Item name="samplingPlanDocUrl" hidden><Input /></Form.Item>
      </Form>
    </Modal>
  );
};

export default OfficializeModal;
