import React from 'react';
import { Modal, Form, Input } from 'antd';
import type { FormInstance } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export interface PlanApprovalModalProps {
  open: boolean;
  approvalType: 'approve' | 'reject';
  onOk: () => void;
  onCancel: () => void;
  form: FormInstance;
}

export const PlanApprovalModal: React.FC<PlanApprovalModalProps> = ({
  open,
  approvalType,
  onOk,
  onCancel,
  form,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className={`p-2 rounded-lg ${approvalType === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {approvalType === 'approve' ? <CheckOutlined /> : <CloseOutlined />}
          </span>
          <span className="font-bold text-slate-800">
            {approvalType === 'approve' ? 'Xác nhận Phê duyệt Kế hoạch' : 'Từ chối Kế hoạch Kiểm toán'}
          </span>
        </div>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={t('common.btnConfirm', 'Xác nhận')}
      cancelText={t('common.btnCancel', 'Hủy')}
      width={500}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item 
          name="notes" 
          label={<span className="font-semibold text-slate-700">Ý kiến phản chỉ đạo / Lý do phê duyệt hoặc từ chối</span>}
          rules={[{ required: approvalType === 'reject', message: 'Vui lòng nhập lý do từ chối kế hoạch' }]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder={approvalType === 'approve' ? 'Ví dụ: Kế hoạch đầy đủ, đồng ý duyệt triển khai các cuộc kiểm toán thực địa.' : 'Vui lòng ghi rõ lý do từ chối...'} 
            className="rounded-lg text-sm"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
