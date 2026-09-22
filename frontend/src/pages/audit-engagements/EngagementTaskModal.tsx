import React from 'react';
import { Modal, Form, Input, Row, Col, Select, DatePicker } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface EngagementTaskModalProps {
  open: boolean;
  editingTask: any;
  taskForm: FormInstance;
  users: any[];
  statuses: string[];
  statusLabels: Record<string, string>;
  priorities: string[];
  onOk: () => void;
  onCancel: () => void;
}

export const EngagementTaskModal: React.FC<EngagementTaskModalProps> = ({
  open,
  editingTask,
  taskForm,
  users,
  statuses,
  statusLabels,
  priorities,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={
        editingTask
          ? t('auditEngagements.updateTasks', 'Cập nhật Nhiệm vụ')
          : t('auditEngagements.createTasks', 'Tạo Nhiệm vụ')
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={
        editingTask
          ? t('auditEngagements.update', 'Cập nhật')
          : t('auditEngagements.create', 'Tạo')
      }
      cancelText={t('findingKB.modal.cancelText', 'Hủy')}
    >
      <Form form={taskForm} layout="vertical">
        <Form.Item
          name="title"
          label={t('auditEngagements.taskTitle', 'Tiêu đề nhiệm vụ')}
          rules={[{ required: true }]}
        >
          <Input placeholder={t('auditEngagements.enterTitle', 'Nhập tiêu đề...')} />
        </Form.Item>
        <Form.Item name="description" label={t('auditEngagements.describe', 'Mô tả')}>
          <Input.TextArea
            rows={3}
            placeholder={t('auditEngagements.jobDescription', 'Mô tả công việc...')}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="assignedTo"
              label={t('auditEngagements.personInCharge', 'Người phụ trách')}
            >
              <Select
                placeholder={t('auditEngagements.employeeName', 'Tên nhân viên...')}
                showSearch
                allowClear
                optionFilterProp="children"
              >
                {users.map((u: any) => (
                  <Option key={u.id} value={u.fullName}>
                    {u.fullName} ({u.username})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dueDate" label={t('auditEngagements.deadline', 'Hạn chót')}>
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label={t('auditTemplates.cols.status', 'Trạng thái')}
            >
              <Select>
                {statuses.map((s) => (
                  <Option key={s} value={s}>
                    {statusLabels[s] || s}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="priority"
              label={t('auditEngagements.priority', 'Độ ưu tiên')}
            >
              <Select>
                {priorities.map((p) => (
                  <Option key={p} value={p}>
                    {p}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
