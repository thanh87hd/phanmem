import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, PieChartOutlined, BarChartOutlined, LineChartOutlined, TableOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Option } = Select;

const ReportBuilder: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [roles, setRoles] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const entityTypeOptions = [
    { value: 'AuditFinding', label: 'Phát hiện Kiểm toán' },
    { value: 'AuditEngagement', label: 'Cuộc Kiểm toán' },
  ];

  const entityFieldsMap: any = {
    AuditFinding: [
      { value: 'status', label: 'Trạng thái' },
      { value: 'riskLevel', label: 'Mức độ rủi ro' },
      { value: 'rootCauseCategory', label: 'Nhóm nguyên nhân' },
    ],
    AuditEngagement: [
      { value: 'status', label: 'Trạng thái' },
      { value: 'riskRating', label: 'Mức rủi ro' },
    ]
  };

  const selectedEntity = Form.useWatch('entityType', form);

  useEffect(() => {
    fetchReports();
    fetchRoles();
    fetchCustomFields();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (e) {
      message.error('Lỗi khi tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  async function fetchRoles() {
    try {
      const res = await api.get('/roles');
      setRoles(res.data || []);
    } catch (e) {
      console.log('Error fetching roles');
    }
  };

  async function fetchCustomFields() {
    try {
      const res = await api.get('/custom-fields');
      setCustomFields(res.data || []);
    // eslint-disable-next-line no-empty
    } catch (e) {}
  };

  const getAvailableFields = () => {
    if (!selectedEntity) return [];
    const staticFields = entityFieldsMap[selectedEntity] || [];
    const dynFields = customFields
      .filter(cf => cf.entityType === selectedEntity)
      .map(cf => ({ value: `cf_${cf.name}`, label: `${cf.label} (Động)` }));
    return [...staticFields, ...dynFields];
  };

  const handleOpenModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        ...record
      });
    } else {
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({
        aggregateFunc: 'COUNT',
        chartType: 'bar',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.patch(`/reports/${editingId}`, values);
        message.success('Cập nhật báo cáo thành công');
      } else {
        await api.post('/reports', values);
        message.success('Tạo báo cáo mới thành công');
      }
      setIsModalOpen(false);
      fetchReports();
    } catch (e) {
      console.log('Validation failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/reports/${id}`);
      message.success('Đã xóa báo cáo');
      fetchReports();
    } catch (e) {
      message.error('Lỗi khi xóa báo cáo');
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'pie': return <PieChartOutlined style={{ color: '#eb2f96' }} />;
      case 'bar': return <BarChartOutlined style={{ color: '#ea9105' }} />;
      case 'line': return <LineChartOutlined style={{ color: '#52c41a' }} />;
      case 'table': return <TableOutlined style={{ color: '#fa8c16' }} />;
      default: return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Danh sách Biểu đồ / Báo cáo Động</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Tạo Báo cáo mới
        </Button>
      </div>

      <Table
        dataSource={reports}
        rowKey="id"
        loading={loading}
        columns={[
          { title: 'Tên báo cáo', dataIndex: 'name' },
          { title: 'Đối tượng', dataIndex: 'entityType' },
          { title: 'Loại biểu đồ', dataIndex: 'chartType', render: t => <Space>{getChartIcon(t)} {t.toUpperCase()}</Space> },
          { title: 'Trường phân nhóm', dataIndex: 'groupBy' },
          {
            title: 'Thao tác',
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editingId ? 'Chỉnh sửa Báo cáo' : 'Tạo Báo cáo mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên Biểu đồ / Báo cáo" rules={[{ required: true }]}>
            <Input placeholder="VD: Thống kê Phát hiện theo mức độ rủi ro" />
          </Form.Item>
          
          <Space style={{ display: 'flex', marginBottom: 16 }}>
            <Form.Item name="entityType" label="Đối tượng Dữ liệu" rules={[{ required: true }]} style={{ width: 300 }}>
              <Select options={entityTypeOptions} />
            </Form.Item>
            
            <Form.Item name="chartType" label="Loại Biểu đồ" rules={[{ required: true }]} style={{ width: 300 }}>
              <Select>
                <Option value="bar"><BarChartOutlined /> Biểu đồ Cột</Option>
                <Option value="pie"><PieChartOutlined /> Biểu đồ Tròn</Option>
                <Option value="line"><LineChartOutlined /> Biểu đồ Đường</Option>
                <Option value="table"><TableOutlined /> Bảng dữ liệu</Option>
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', marginBottom: 16 }}>
            <Form.Item name="groupBy" label="Trường phân nhóm (Trục X / Lát cắt)" style={{ width: 300 }}>
              <Select options={getAvailableFields()} allowClear placeholder="Chọn trường tĩnh hoặc động" />
            </Form.Item>
            <Form.Item name="aggregateFunc" label="Hàm tổng hợp" style={{ width: 300 }}>
              <Select>
                <Option value="COUNT">Đếm số lượng (COUNT)</Option>
                <Option value="SUM">Tính tổng (SUM)</Option>
                <Option value="AVG">Trung bình (AVG)</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="aggregateField" label="Trường để tính tổng/trung bình (Chỉ dành cho SUM/AVG)">
            <Select options={getAvailableFields()} allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportBuilder;
