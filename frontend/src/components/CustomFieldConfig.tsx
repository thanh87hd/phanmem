import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Option } = Select;

const CustomFieldConfig: React.FC = () => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await api.get('/custom-fields');
      setFields(res.data);
    } catch (error) {
      message.error('Không thể tải danh sách trường dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFields();
  }, []);

  const handleOpenModal = (record?: any) => {
    form.resetFields();
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.setFieldsValue({
        entityType: 'AuditFinding',
        type: 'text',
        required: false,
        showInTable: false,
        order: 0,
      });
    }
    setModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await api.patch(`/custom-fields/${editingId}`, values);
        message.success('Đã cập nhật trường dữ liệu');
      } else {
        await api.post('/custom-fields', values);
        message.success('Đã tạo trường dữ liệu mới');
      }
      setModalVisible(false);
      fetchFields();
    } catch (error) {
      message.error('Lỗi khi lưu trường dữ liệu');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/custom-fields/${id}`);
      message.success('Đã xóa trường dữ liệu');
      fetchFields();
    } catch (error) {
      message.error('Lỗi khi xóa trường dữ liệu');
    }
  };

  const columns = [
    { title: 'Đối tượng', dataIndex: 'entityType', key: 'entityType' },
    { title: 'Tên biến (Key)', dataIndex: 'name', key: 'name' },
    { title: 'Tên hiển thị (Label)', dataIndex: 'label', key: 'label' },
    { title: 'Kiểu dữ liệu', dataIndex: 'type', key: 'type' },
    { title: 'Bắt buộc', dataIndex: 'required', key: 'required', render: (val: boolean) => val ? 'Có' : 'Không' },
    { title: 'Hiện trên Bảng', dataIndex: 'showInTable', key: 'showInTable', render: (val: boolean) => val ? 'Có' : 'Không' },
    { title: 'Thứ tự', dataIndex: 'order', key: 'order' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>{t('common.btnEdit', 'Sửa')}</Button>
          <Popconfirm title="Bạn có chắc chắn xóa?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>{t('common.btnDelete', 'Xóa')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Thêm Trường Dữ Liệu
        </Button>
      </div>
      <Table columns={columns} dataSource={fields} rowKey="id" loading={loading} />

      <Modal
        title={editingId ? 'Sửa Trường Dữ Liệu' : 'Thêm Trường Dữ Liệu'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="entityType" label="Đối tượng áp dụng" rules={[{ required: true }]}>
            <Select>
              <Option value="AuditUniverse">Audit Universe (Quy trình/Đơn vị)</Option>
              <Option value="AuditEngagement">Cuộc Kiểm toán</Option>
              <Option value="AuditFinding">Phát hiện Kiểm toán</Option>
              <Option value="Recommendation">Kiến nghị</Option>
              <Option value="AuditPlan">Kế hoạch Kiểm toán</Option>
              <Option value="AuditReport">Báo cáo Kiểm toán</Option>
              <Option value="Department">Đơn vị / Phòng ban</Option>
              <Option value="User">Người dùng</Option>
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Tên biến (chữ cái thường, không dấu, viết liền)" rules={[{ required: true }]}>
            <Input placeholder="VD: rootCauseDetails" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input placeholder="VD: Chi tiết nguyên nhân gốc rễ" />
          </Form.Item>
          <Form.Item name="type" label="Kiểu dữ liệu" rules={[{ required: true }]}>
            <Select>
              <Option value="text">Văn bản ngắn (Text)</Option>
              <Option value="textarea">Văn bản dài (TextArea)</Option>
              <Option value="number">Số (Number)</Option>
              <Option value="date">Ngày tháng (Date)</Option>
              <Option value="select">Lựa chọn (Dropdown)</Option>
              <Option value="multi-select">Chọn nhiều (Multi-Select)</Option>
              <Option value="checkbox">Hộp kiểm (Checkbox)</Option>
              <Option value="file">Tệp tin (File Upload)</Option>
              <Option value="user">Người dùng (User Picker)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'select' || type === 'multi-select') {
                return (
                  <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <p style={{ fontWeight: 'bold' }}>Cấu hình danh sách lựa chọn</p>
                    <Form.List name="options">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                              <Form.Item
                                {...restField}
                                name={[name, 'label']}
                                rules={[{ required: true, message: 'Nhập Label' }]}
                              >
                                <Input placeholder="Label hiển thị (VD: Cao)" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'value']}
                                rules={[{ required: true, message: 'Nhập Value' }]}
                              >
                                <Input placeholder="Giá trị (VD: high)" />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                            </Space>
                          ))}
                          <Form.Item>
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              Thêm lựa chọn
                            </Button>
                          </Form.Item>
                        </>
                      )}
                    </Form.List>
                  </div>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="required" label="Bắt buộc nhập" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="showInTable" label="Hiển thị trên Bảng danh sách" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="order" label="Thứ tự hiển thị">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomFieldConfig;
