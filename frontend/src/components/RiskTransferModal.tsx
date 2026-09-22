import React, { useState } from 'react';
import { Modal, Form, Select, Input, message, Alert, Space, Typography, Button } from 'antd';
import { SwapOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface RiskTransferModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  auditUniverses: any[];
}

const RiskTransferModal: React.FC<RiskTransferModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  auditUniverses,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const handleSourceChange = (val: number) => {
    const s = auditUniverses.find((u) => u.id === val);
    setSelectedSource(s);
  };

  const handleTargetChange = (val: number) => {
    const t = auditUniverses.find((u) => u.id === val);
    setSelectedTarget(t);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await api.post('/audit-universe/transfer-risk', {
        sourceUniverseId: values.sourceUniverseId,
        targetUniverseId: values.targetUniverseId,
        notes: values.notes,
      });

      message.success(
        `Chuyển giao rủi ro thành công! Đã kế thừa điểm rủi ro và cập nhật ${res.data.updatedFindingsCount} phát hiện tồn đọng sang đơn vị mới.`,
      );
      form.resetFields();
      setSelectedSource(null);
      setSelectedTarget(null);
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi chuyển giao rủi ro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined className="text-amber-500" />
          <span>Kế Thừa & Chuyển Giao Rủi Ro (IIA Standard 2010)</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Xác nhận chuyển giao"
      cancelText="Hủy"
      width={680}
    >
      <Alert
        message="Chuẩn mực IIA 2010 về Kế hoạch kiểm toán dựa trên rủi ro"
        description="Khi ĐVKD nâng cấp mô hình (ví dụ: PGD lên Chi nhánh) hoặc sáp nhập, toàn bộ điểm rủi ro vận hành, quy mô tài sản và các phát hiện vi phạm cũ chưa khắc phục sẽ được chuyển giao và kế thừa sang thực thể mới nhằm bảo đảm không bị xóa vết rủi ro."
        type="info"
        showIcon
        className="mb-4"
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="sourceUniverseId"
          label="Đơn vị / Thực thể cũ (Nguồn chuyển giao)"
          rules={[{ required: true, message: 'Vui lòng chọn đơn vị nguồn' }]}
        >
          <Select
            showSearch
            placeholder="Chọn đơn vị cũ..."
            optionFilterProp="children"
            onChange={handleSourceChange}
          >
            {auditUniverses.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.name} ({u.departmentCode || u.department || 'N/A'}) - Điểm RR: {u.riskScore || 2.5}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="targetUniverseId"
          label="Đơn vị / Thực thể mới (Đích kế thừa)"
          rules={[{ required: true, message: 'Vui lòng chọn đơn vị đích' }]}
        >
          <Select
            showSearch
            placeholder="Chọn đơn vị mới..."
            optionFilterProp="children"
            onChange={handleTargetChange}
          >
            {auditUniverses.map((u) => (
              <Option key={u.id} value={u.id} disabled={selectedSource?.id === u.id}>
                {u.name} ({u.departmentCode || u.department || 'N/A'})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedSource && selectedTarget && (
          <div className="bg-amber-50 p-3 rounded-lg mb-4 text-xs space-y-1">
            <Text strong className="text-amber-800">
              Đối soát thông số chuyển giao:
            </Text>
            <div>• Điểm sai phạm cũ chuyển giao: <b>{selectedSource.pastFindingsScore || 1.0}</b></div>
            <div>• Điểm rủi ro vận hành kế thừa: <b>{selectedSource.operationalRiskScore || 2.5}</b></div>
            <div>• Điểm rủi ro tổng hợp hiện tại của nguồn: <b>{selectedSource.riskScore || 2.5}</b></div>
          </div>
        )}

        <Form.Item name="notes" label="Căn cứ & Ghi chú chuyển đổi (Số QĐ sáp nhập/nâng cấp...)">
          <TextArea rows={3} placeholder="VD: Nâng cấp PGD theo Quyết định số 123/2026/QĐ-HĐQT..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RiskTransferModal;
