import React from 'react';
import { Modal, Typography, Input } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { TextArea } = Input;

interface RiskScoringRejectModalProps {
  open: boolean;
  rejectReason: string;
  onChangeReason: (reason: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export const RiskScoringRejectModal: React.FC<RiskScoringRejectModalProps> = ({
  open,
  rejectReason,
  onChangeReason,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={
        <span>
          <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Từ chối Đánh giá Rủi ro
        </span>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={t('common.btnConfirmReject', 'Xác nhận Từ chối')}
      okButtonProps={{ danger: true }}
      cancelText={t('common.btnCancel', 'Hủy')}
    >
      <div style={{ marginTop: 16 }}>
        <Text style={{ marginBottom: 8, display: 'block' }}>
          Vui lòng nhập lý do từ chối đánh giá này:
        </Text>
        <TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => onChangeReason(e.target.value)}
          placeholder="VD: Thiếu dữ liệu chứng minh, cần bổ sung phân tích chi tiết hơn..."
        />
      </div>
    </Modal>
  );
};
