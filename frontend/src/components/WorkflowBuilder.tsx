import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm, Card, Typography, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SubnodeOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Option } = Select;
const { Title, Text } = Typography;

const WorkflowBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflows');
      setWorkflows(res.data);
    } catch (error) {
      message.error('Không thể tải danh sách quy trình');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkflows();
  }, []);

  const handleOpenModal = (record?: any) => {
    form.resetFields();
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        ...record,
        steps: record.steps?.sort((a: any, b: any) => a.order - b.order) || [],
      });
    } else {
      setEditingId(null);
      form.setFieldsValue({
        entityType: 'AuditFinding',
        isActive: true,
        steps: [
          { stepName: 'Tạo mới', statusValue: 'Draft', requiredRole: 'Any', isFinal: false },
        ],
      });
    }
    setModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await api.patch(`/workflows/${editingId}`, values);
        message.success('Đã cập nhật quy trình');
      } else {
        await api.post('/workflows', values);
        message.success('Đã tạo quy trình mới');
      }
      setModalVisible(false);
      fetchWorkflows();
    } catch (error) {
      message.error('Lỗi khi lưu quy trình');
    }
  };

  const columns = [
    { title: 'Tên Quy trình', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'Đối tượng áp dụng', dataIndex: 'entityType', key: 'entityType' },
    { title: 'Kích hoạt', dataIndex: 'isActive', key: 'isActive', render: (val: boolean) => <Switch checked={val} disabled /> },
    { 
      title: 'Số bước', 
      key: 'stepsCount', 
      render: (_: any, record: any) => record.steps?.length || 0 
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>{t('common.btnEdit', 'Sửa')}</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Tạo Quy trình mới
        </Button>
      </div>
      <Table columns={columns} dataSource={workflows} rowKey="id" loading={loading} />

      <Modal
        title={editingId ? 'Sửa Quy trình' : 'Thêm Quy trình'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="entityType" label="Đối tượng áp dụng" rules={[{ required: true }]}>
            <Select disabled={!!editingId}>
              <Option value="AuditFinding">Phát hiện Kiểm toán</Option>
              <Option value="AuditEngagement">Cuộc Kiểm toán</Option>
              <Option value="Recommendation">Kiến nghị</Option>
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Tên Quy trình" rules={[{ required: true }]}>
            <Input placeholder="VD: Quy trình duyệt phát hiện chuẩn" />
          </Form.Item>
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider><SubnodeOutlined /> Cấu hình các bước duyệt</Divider>
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', rowGap: 16, flexDirection: 'column' }}>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card size="small" key={key} title={`Bước ${index + 1}`} extra={
                    <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                  }>
                    <Space style={{ display: 'flex', width: '100%', gap: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'stepName']}
                        rules={[{ required: true, message: 'Nhập tên bước' }]}
                        style={{ width: 150 }}
                      >
                        <Input placeholder="Tên hiển thị (VD: Chờ Trưởng Ban duyệt)" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'statusValue']}
                        rules={[{ required: true, message: 'Nhập trạng thái' }]}
                        style={{ width: 120 }}
                      >
                        <Input placeholder="Key (VD: Pending_L2)" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'requiredRole']}
                        rules={[{ required: true }]}
                        style={{ width: 150 }}
                      >
                        <Select placeholder="Role phê duyệt">
                          <Option value="Any">Bất kỳ ai (Creator)</Option>
                          <Option value="Trưởng Ban KTNB">Trưởng Ban KTNB</Option>
                          <Option value="Trưởng phòng KTNB">Trưởng phòng KTNB</Option>
                          <Option value="Ban Kiểm soát">Ban Kiểm soát</Option>
                          <Option value="Admin">Admin</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'isFinal']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="Kết thúc" unCheckedChildren="Trung gian" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Thêm Bước Duyệt
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowBuilder;
