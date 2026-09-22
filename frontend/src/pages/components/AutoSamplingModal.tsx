import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, Checkbox, Row, Col, Space, Alert, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

export interface AutoSamplingModalProps {
  visible: boolean;
  batch: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AutoSamplingModal: React.FC<AutoSamplingModalProps> = ({
  visible,
  batch,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const autoDomain = Form.useWatch('domain', form);

  useEffect(() => {
    if (visible && batch) {
      form.resetFields();
      form.setFieldsValue({
        domain: batch.auditDomain || 'CREDIT',
        sampleSize: batch.sampleSize || 15,
        samplingStrategy: 'TOP_EXPOSURE',
        minAmount: batch.auditDomain === 'NON_CREDIT' ? 100000000 : 500000000,
        debtGroups: [1, 2, 3],
        targetBranches: ['CN_HN', 'CN_HCM', 'CN_DN', 'CN_BD'],
        transactionTypes: ['COUNTER_TRANS', 'ACC_OPENING', 'INT_REMITTANCE'],
      });
    }
  }, [visible, batch, form]);

  const handleExecute = async () => {
    if (!batch) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await api.post(`/audit-samples/batches/${batch.id}/auto-generate`, values);
      message.success(`Đã tự động chọn và sinh thành công ${res.data.generated} mẫu kiểm toán!`);
      onClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tự động bốc mẫu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined className="text-amber-500" />
          <span>Tự Động Chọn Mẫu Thông Minh ({batch?.batchName})</span>
        </Space>
      }
      open={visible}
      onOk={handleExecute}
      confirmLoading={loading}
      onCancel={onClose}
      width={750}
      okText="🚀 Bắt đầu Bốc Mẫu Tự Động"
      okButtonProps={{ className: 'bg-amber-600 hover:bg-amber-500 border-none' }}
    >
      <Alert
        message="Hệ thống sẽ tự động quét cơ sở dữ liệu và lọc hồ sơ bám sát theo các tiêu chí kiểm soát rủi ro trọng yếu."
        type="info"
        showIcon
        className="mb-4 text-xs"
      />
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="domain" label="Mảng nghiệp vụ" rules={[{ required: true }]}>
              <Select>
                <Option value="CREDIT">🏦 Tín dụng (Credit)</Option>
                <Option value="NON_CREDIT">📋 Phi tín dụng (Non-Credit)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="samplingStrategy" label="Chiến lược bốc mẫu" rules={[{ required: true }]}>
              <Select>
                <Option value="TOP_EXPOSURE">🔥 Rủi ro cao nhất (Top Dư nợ / GD lớn)</Option>
                <Option value="STRATIFIED_BRANCH">🏢 Phân tầng theo Chi nhánh (Stratified)</Option>
                <Option value="HIGH_RISK_CUSTOMERS">👤 Nhóm Khách hàng trọng điểm / VIP</Option>
                <Option value="SYSTEMATIC_RANDOM">🎲 Ngẫu nhiên hệ thống (Systematic)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="sampleSize" label="Số lượng mẫu cần bốc" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} max={500} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="minAmount" label="Ngưỡng giá trị tối thiểu (VND)">
              <InputNumber
                className="w-full"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="targetBranches" label="Đơn vị kinh doanh (Chi nhánh mục tiêu)">
          <Select mode="multiple" placeholder="Chọn chi nhánh cần lấy mẫu">
            <Option value="CN_HN">Chi nhánh Hà Nội (Rủi ro cao)</Option>
            <Option value="CN_HCM">Chi nhánh TP.HCM (Rủi ro cao)</Option>
            <Option value="CN_DN">Chi nhánh Đà Nẵng</Option>
            <Option value="CN_BD">Chi nhánh Bình Dương</Option>
            <Option value="CN_HP">Chi nhánh Hải Phòng</Option>
            <Option value="CN_CT">Chi nhánh Cần Thơ</Option>
          </Select>
        </Form.Item>

        {autoDomain === 'CREDIT' ? (
          <Form.Item name="debtGroups" label="Nhóm nợ cần bao phủ">
            <Checkbox.Group>
              <Checkbox value={1}>Nhóm 1 (Đủ tiêu chuẩn)</Checkbox>
              <Checkbox value={2}>Nhóm 2 (Cần chú ý - Warning)</Checkbox>
              <Checkbox value={3}>Nhóm 3-5 (Nợ xấu - NPL)</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        ) : (
          <Form.Item name="transactionTypes" label="Loại nghiệp vụ phi tín dụng mục tiêu">
            <Select mode="multiple">
              <Option value="COUNTER_TRANS">Giao dịch tiền mặt / Quầy</Option>
              <Option value="ACC_OPENING">Mở tài khoản / eKYC</Option>
              <Option value="INT_REMITTANCE">Chuyển tiền quốc tế / Kiều hối</Option>
              <Option value="TRADE_FINANCE">Bảo lãnh / L/C</Option>
              <Option value="CARD_ISSUANCE">Thẻ tín dụng / Ghi nợ</Option>
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
