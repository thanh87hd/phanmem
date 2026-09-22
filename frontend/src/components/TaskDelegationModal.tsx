import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Select, DatePicker, Checkbox, InputNumber, Row, Col, message, Tabs, Button } from 'antd';
import type { Task, CreateTaskDto } from '../types/task';
import { tasksApi } from '../services/api/tasks';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface Props {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TaskDelegationModal({ visible, task, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [subTasks, setSubTasks] = useState<any[]>([]);

  useEffect(() => {
    if (visible && task) {
      form.setFieldsValue({
        ...task,
        dueDate: task.dueDate ? dayjs(task.dueDate) : null,
        startDate: task.startDate ? dayjs(task.startDate) : null,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPeriodic(task.isPeriodic);
      setSubTasks(task.subTasks || []);
    } else if (visible) {
      form.resetFields();
      setIsPeriodic(false);
      setSubTasks([]);
    }
  }, [visible, task, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateTaskDto = {
        ...values,
        assignedById: user?.id,
        assignedByName: user?.fullName,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      };

      let savedTask;
      if (task?.id) {
        savedTask = await tasksApi.update(task.id, payload);
        message.success('Task updated successfully');
      } else {
        savedTask = await tasksApi.create(payload);
        message.success('Task created successfully');
      }

      // Handle sub-tasks (simplified for now: create new sub-tasks)
      if (!task?.id && subTasks.length > 0) {
        for (const sub of subTasks) {
          if (sub.title) {
            await tasksApi.create({
              title: sub.title,
              assignedToId: sub.assignedToId || payload.assignedToId,
              priority: sub.priority || payload.priority,
              parentId: savedTask.id,
              sourceType: payload.sourceType,
            });
          }
        }
      }

      onSuccess();
    } catch (error) {
      message.error('Validation failed or API error');
    } finally {
      setLoading(false);
    }
  };

  const addSubTask = () => {
    setSubTasks([...subTasks, { key: Date.now(), title: '', priority: 'Medium' }]);
  };

  const updateSubTask = (index: number, field: string, value: any) => {
    const updated = [...subTasks];
    updated[index][field] = value;
    setSubTasks(updated);
  };

  const removeSubTask = (index: number) => {
    setSubTasks(subTasks.filter((_, i) => i !== index));
  };

  return (
    <Modal
      title={task ? t('taskManagement.editTask', 'Chỉnh sửa nhiệm vụ') : t('taskManagement.delegateTask', 'Giao nhiệm vụ mới')}
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      width={700}
      okText={task ? t('common.btnSave', 'Lưu thay đổi') : t('common.btnCreate', 'Tạo & Giao việc')}
      cancelText={t('common.btnCancel', 'Hủy')}
    >
      <Tabs defaultActiveKey="details">
        <TabPane tab="Task Details" key="details">
          <Form form={form} layout="vertical" className="mt-4">
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="title" label="Task Title" rules={[{ required: true, message: 'Please enter title' }]}>
                  <Input placeholder="E.g., Review Q3 Financials" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sourceType" label="Task Type" initialValue="General">
                  <Select>
                    <Option value="General">General</Option>
                    <Option value="Audit">Audit Engagement</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description">
              <TextArea rows={3} placeholder="Detailed instructions..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="assignedToId" label="Assign To (User ID)">
                  <InputNumber style={{ width: '100%' }} placeholder="User ID" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="priority" label="Priority" initialValue="Medium">
                  <Select>
                    <Option value="High">High</Option>
                    <Option value="Medium">Medium</Option>
                    <Option value="Low">Low</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="durationCategory" label="Duration" initialValue="ShortTerm">
                  <Select>
                    <Option value="ShortTerm">Short-Term</Option>
                    <Option value="LongTerm">Long-Term</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="startDate" label="Start Date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dueDate" label="Due Date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="isPeriodic" valuePropName="checked">
              <Checkbox onChange={(e) => setIsPeriodic(e.target.checked)}>
                This is a periodic/recurring task
              </Checkbox>
            </Form.Item>

            {isPeriodic && (
              <Form.Item name="frequency" label="Frequency" rules={[{ required: true }]}>
                <Select>
                  <Option value="Daily">Daily</Option>
                  <Option value="Weekly">Weekly</Option>
                  <Option value="Monthly">Monthly</Option>
                  <Option value="Yearly">Yearly</Option>
                </Select>
              </Form.Item>
            )}
            
            {task && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="status" label="Status">
                    <Select>
                      <Option value="Open">Open</Option>
                      <Option value="InProgress">In Progress</Option>
                      <Option value="Review">Under Review</Option>
                      <Option value="Done">Done</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="progress" label="Progress (%)">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Form>
        </TabPane>
        
        <TabPane tab={`Sub-Tasks (${subTasks.length})`} key="subtasks" disabled={!!task?.id}>
          <div className="mt-4">
            {!task?.id ? (
              <p className="text-gray-500 mb-4 text-sm">
                Break down this task into smaller assignments. They will be created along with the parent task.
              </p>
            ) : (
              <p className="text-gray-500 mb-4 text-sm">
                To edit sub-tasks for an existing task, please edit them directly from the main view.
              </p>
            )}

            {!task?.id && (
              <>
                {subTasks.map((sub, index) => (
                  <div key={sub.key || index} className="flex gap-2 mb-3 items-start bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex-1">
                      <Input 
                        placeholder="Sub-task title" 
                        value={sub.title} 
                        onChange={(e) => updateSubTask(index, 'title', e.target.value)}
                        className="mb-2"
                      />
                      <Row gutter={8}>
                        <Col span={12}>
                          <Select 
                            value={sub.priority} 
                            onChange={(val) => updateSubTask(index, 'priority', val)}
                            style={{ width: '100%' }}
                            size="small"
                          >
                            <Option value="High">High Priority</Option>
                            <Option value="Medium">Medium Priority</Option>
                            <Option value="Low">Low Priority</Option>
                          </Select>
                        </Col>
                        <Col span={12}>
                          <InputNumber 
                            placeholder="Assignee ID" 
                            value={sub.assignedToId} 
                            onChange={(val) => updateSubTask(index, 'assignedToId', val)}
                            style={{ width: '100%' }}
                            size="small"
                          />
                        </Col>
                      </Row>
                    </div>
                    <Button 
                      type="text" 
                      danger 
                      icon={<Trash2 size={16} />} 
                      onClick={() => removeSubTask(index)}
                    />
                  </div>
                ))}
                
                <Button type="dashed" block icon={<Plus size={16} />} onClick={addSubTask}>
                  Add Sub-Task
                </Button>
              </>
            )}
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
}
