import React, { useEffect } from 'react';
import { Modal, Form, Input, Typography, Tag, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const { Text } = Typography;
const { TextArea } = Input;

interface FindingResponseModalProps {
  open: boolean;
  finding: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const FindingResponseModal: React.FC<FindingResponseModalProps> = ({
  open,
  finding,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && finding) {
      form.setFieldsValue({
        auditeeResponse: finding.auditeeResponse || '',
      });
    } else {
      form.resetFields();
    }
  }, [open, finding, form]);

  const handleSubmit = async () => {
    if (!finding) return;
    try {
      const values = await form.validateFields();
      await api.patch(`/audit-findings/${finding.id}`, {
        auditeeResponse: values.auditeeResponse,
      });
      message.success('Đã gửi ý kiến phản hồi giải trình thành công!');
      onClose();
      onSuccess();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || 'Lỗi khi gửi ý kiến giải trình');
    }
  };

  return (
    <Modal
      title={
        <>
          <FileTextOutlined className="mr-2 text-red-500" />
          Bổ sung ý kiến giải trình của Đối tượng Kiểm toán
        </>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={t('common.btnSendExplanation', 'Gửi ý kiến giải trình')}
      okButtonProps={{ className: 'bg-[#ea9105] border-[#ea9105]' }}
      width={650}
    >
      {finding && (
        <div className="mb-4 p-3 bg-red-50/20 border border-red-100 rounded-lg">
          <div className="mb-1">
            <Text strong>Phát hiện: </Text>
            <Text>{finding.findingTitle}</Text>
          </div>
          <div className="mb-1">
            <Text strong>Mã phát hiện: </Text>
            <Tag color="red">{finding.findingCode || `FD-${finding.id}`}</Tag>
          </div>
          <div className="mb-1">
            <Text strong>Hiện trạng lỗi: </Text>
            <Text type="secondary">{finding.condition}</Text>
          </div>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="auditeeResponse"
          label="Ý kiến giải trình chính thức của Đơn vị (Auditee Official Opinion)"
          rules={[{ required: true, message: 'Vui lòng nhập ý kiến giải trình của đơn vị trước khi gửi' }]}
        >
          <TextArea
            rows={6}
            placeholder="Nhập ý kiến phản hồi giải trình của đơn vị, các nguyên nhân khách quan/chủ quan và cam kết chấn chỉnh..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
