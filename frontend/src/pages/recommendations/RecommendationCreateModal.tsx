import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Select, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';

const { TextArea } = Input;
const { Option } = Select;

interface RecommendationCreateModalProps {
  open: boolean;
  onClose: () => void;
  onOk: () => void;
  form: FormInstance;
  findings: any[];
  departments: any[];
  selectedDept: any;
  auditeeUsers: any[];
  users: any[];
}

export const RecommendationCreateModal: React.FC<RecommendationCreateModalProps> = ({
  open,
  onClose,
  onOk,
  form,
  findings,
  departments,
  selectedDept,
  auditeeUsers,
  users,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('recommendations.createModal.title', 'Tạo Kiến nghị mới')}
      open={open}
      onOk={onOk}
      onCancel={onClose}
      okText={t('auditEngagements.create', 'Tạo')}
      cancelText={t('findingKB.modal.cancelText', 'Hủy')}
      width={650}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="findingId" label={t('recommendations.createModal.labelFinding', 'Phát hiện liên quan')}>
          <Select placeholder={t('recommendations.createModal.placeholderFinding', 'Chọn phát hiện...')} allowClear showSearch optionFilterProp="children">
            {findings.map((f: any) => (
              <Option key={f.id} value={f.id}>{f.findingTitle}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="recommendation" label="Nội dung Kiến nghị" rules={[{ required: true }]}>
          <TextArea rows={3} placeholder="Mô tả kiến nghị khắc phục..." />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="departmentId" label="Đơn vị chịu trách nhiệm" rules={[{ required: true }]}>
              <Select placeholder="Chọn đơn vị..." allowClear showSearch optionFilterProp="children">
                {departments.map((d: any) => (
                  <Option key={d.id} value={d.id}>{d.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dueDate" label="Hạn hoàn thành (SLA)">
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="auditeeOwnerId" 
              label={
                <span>
                  Phụ trách trực tiếp ĐVĐKT {selectedDept ? <span className="text-xs text-blue-600 font-normal">({selectedDept.name})</span> : null}
                </span>
              }
            >
              <Select placeholder="Chọn người phụ trách đơn vị..." allowClear showSearch optionFilterProp="children">
                {(auditeeUsers.length > 0 ? auditeeUsers : users).map((u: any) => (
                  <Option key={u.id} value={u.id}>
                    {u.fullName} ({u.username}) {u.jobTitle ? `- ${u.jobTitle}` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ktnbReviewerId" label="Người rà soát KTNB">
              <Select placeholder="Chọn người rà soát KTNB..." allowClear showSearch optionFilterProp="children">
                {users.map((u: any) => (
                  <Option key={u.id} value={u.id}>
                    {u.fullName} ({u.username}) {u.jobTitle ? `- ${u.jobTitle}` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <DynamicFormRenderer entityType="Recommendation" form={form} />
      </Form>
    </Modal>
  );
};
