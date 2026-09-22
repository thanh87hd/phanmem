import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Layout, Menu, Typography, Card, Button, Input, Select, 
  Switch, Table, Space, Modal, Form, Divider, Tag, Alert, Row, Col, Empty, message, Popconfirm
} from 'antd';
import { 
  PlusOutlined, SaveOutlined, DeleteOutlined, EditOutlined, 
  SettingOutlined, DesktopOutlined, AlignLeftOutlined, 
  TableOutlined, FormOutlined, InfoCircleOutlined, 
  PieChartOutlined, DragOutlined, EyeOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'lookup' | 'file' | 'formula';
  required: boolean;
  options?: { label: string; value: string }[];
  targetResource?: string;
  formulaStr?: string;
}

interface Widget {
  id: string;
  type: 'header' | 'stats' | 'alert' | 'table' | 'form' | 'kanban' | 'calendar';
  title: string;
  config: any;
}

const WIDGET_TEMPLATES = [
  { type: 'header', title: 'Header trang', icon: <AlignLeftOutlined />, desc: 'Tiêu đề, mô tả và banner của ứng dụng' },
  { type: 'stats', title: 'Thẻ thống kê', icon: <PieChartOutlined />, desc: 'Hiển thị các chỉ số/thống kê nhanh' },
  { type: 'alert', title: 'Khung thông báo (Alert)', icon: <InfoCircleOutlined />, desc: 'Hiển thị cảnh báo hoặc hướng dẫn' },
  { type: 'table', title: 'Bảng dữ liệu (Table)', icon: <TableOutlined />, desc: 'Danh sách và các hành động (Sửa, Xóa)' },
  { type: 'form', title: 'Form nhập liệu (Form)', icon: <FormOutlined />, desc: 'Form thêm mới / cập nhật dữ liệu' },
  { type: 'kanban', title: 'Bảng Kanban', icon: <DesktopOutlined />, desc: 'Kéo thả thẻ dữ liệu theo trạng thái' },
  { type: 'calendar', title: 'Lịch (Calendar)', icon: <DesktopOutlined />, desc: 'Hiển thị dữ liệu dạng Lịch' },
];

const AppStudio: React.FC = () => {
  const { t } = useTranslation();
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [loading, setLoading] = useState(false);

  // App Metadata Form
  const [appForm] = Form.useForm();
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Schema Editor State
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [fieldForm] = Form.useForm();
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Canvas State (Drag and Drop Layout)
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  // Permissions State
  const [permissions, setPermissions] = useState<any>({ view: [], create: [], update: [], delete: [] });
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [roles, setRoles] = useState<string[]>(['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban Kiểm soát']);

  // Fetch all existing applications
  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/framework/metadata');
      setApps(res.data);
    } catch (error) {
      message.error('Không thể tải danh sách ứng dụng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApps();
    api.get('/roles')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const roleNames = res.data
            .map((r: any) => r.name || r.code || (typeof r === 'string' ? r : ''))
            .filter(Boolean);
          if (roleNames.length > 0) setRoles(roleNames);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateApp = async (values: any) => {
    try {
      const res = await api.post('/framework/metadata', {
        resourceName: values.resourceName,
        displayName: values.displayName,
        schema: [],
        uiSchema: { widgets: [] },
        isActive: true
      });
      message.success('Tạo ứng dụng mới thành công!');
      setCreateModalVisible(false);
      appForm.resetFields();
      fetchApps();
      
      // Open editor directly
      openEditor(res.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo ứng dụng');
    }
  };

  const openEditor = (app: any) => {
    setSelectedApp(app);
    setFields(app.schema || []);
    setWidgets(app.uiSchema?.widgets || []);
    setPermissions(app.permissions || { view: [], create: [], update: [], delete: [] });
    setSelectedWidgetId(null);
    setMode('editor');
  };

  const handleSaveDesign = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      await api.put(`/framework/metadata/${selectedApp.resourceName}`, {
        schema: fields,
        uiSchema: { widgets },
        permissions
      });
      message.success('Đã lưu cấu hình ứng dụng thành công!');
      fetchApps();
    } catch (error) {
      message.error('Lỗi khi lưu cấu hình thiết kế');
    } finally {
      setLoading(false);
    }
  };

  // --- FIELD EDITOR HANDLERS ---
  const handleOpenFieldModal = (index?: number) => {
    fieldForm.resetFields();
    if (index !== undefined) {
      setEditingFieldIndex(index);
      const field = fields[index];
      fieldForm.setFieldsValue({
        ...field,
        options: field.options || [],
        targetResource: field.targetResource || undefined,
        formulaStr: field.formulaStr || undefined
      });
    } else {
      setEditingFieldIndex(null);
      fieldForm.setFieldsValue({
        type: 'text',
        required: false,
        options: []
      });
    }
    setFieldModalVisible(true);
  };

  const handleSaveField = (values: any) => {
    const newField: Field = {
      name: values.name,
      label: values.label,
      type: values.type,
      required: values.required,
      options: values.options,
      targetResource: values.targetResource,
      formulaStr: values.formulaStr
    };

    if (editingFieldIndex !== null) {
      const updated = [...fields];
      updated[editingFieldIndex] = newField;
      setFields(updated);
    } else {
      // Check duplicate name
      if (fields.some(f => f.name === values.name)) {
        message.error('Tên trường này đã tồn tại!');
        return;
      }
      setFields([...fields, newField]);
    }
    setFieldModalVisible(false);
  };

  const handleDeleteField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('text/plain', type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;

    // Create a new widget instance
    const newWidget: Widget = {
      // eslint-disable-next-line react-hooks/purity
      id: `${type}_${Date.now()}`,
      type: type as any,
      title: `Widget ${type.toUpperCase()}`,
      config: getDefaultConfig(type)
    };

    setWidgets([...widgets, newWidget]);
    setSelectedWidgetId(newWidget.id);
  };

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'header':
        return { title: selectedApp?.displayName || 'Tên Ứng dụng', subtitle: 'Mô tả chi tiết ứng dụng', bgColor: 'linear-gradient(135deg, #f59e0b, #ea580c)', textColor: '#ffffff' };
      case 'stats':
        return { label: 'Tổng số yêu cầu', color: '#ea9105' };
      case 'alert':
        return { message: 'Vui lòng điền đầy đủ các thông tin bắt buộc trước khi lưu.', alertType: 'warning' };
      case 'table':
        return { showActions: true, pageSize: 5 };
      case 'form':
        return { layout: 'vertical' };
      case 'kanban':
        return { statusField: '', columns: ['To Do', 'In Progress', 'Done'] };
      case 'calendar':
        return { dateField: '', titleField: '' };
      default:
        return {};
    }
  };

  const deleteWidget = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= widgets.length) return;

    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setWidgets(updated);
  };

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

  const updateWidgetConfig = (key: string, value: any) => {
    if (!selectedWidgetId) return;
    setWidgets(widgets.map(w => {
      if (w.id === selectedWidgetId) {
        return {
          ...w,
          config: {
            ...w.config,
            [key]: value
          }
        };
      }
      return w;
    }));
  };

  const columns = [
    { title: 'Tên Ứng dụng', dataIndex: 'displayName', key: 'displayName', render: (t: string, record: any) => <Text strong>{t} ({record.resourceName})</Text> },
    { title: 'Số trường dữ liệu', key: 'fieldsCount', render: (_: any, record: any) => record.schema?.length || 0 },
    { title: 'Số thành phần giao diện', key: 'widgetsCount', render: (_: any, record: any) => record.uiSchema?.widgets?.length || 0 },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString('vi-VN') },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="primary" icon={<SettingOutlined />} onClick={() => openEditor(record)}>{t('common.btnDesignLayout', 'Thiết kế Layout')}</Button>
          <Button icon={<EyeOutlined />} onClick={() => window.open(`/dynamic-app/${record.resourceName}`, '_blank')}>Xem App</Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 12 }}>
      {mode === 'list' ? (
        <Card title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>🎨 App Studio - Thiết kế Ứng dụng Động Kéo Thả</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>{t('common.btnCreateApp', 'Tạo App Mới')}</Button>
          </div>
        }>
          <Table columns={columns} dataSource={apps} rowKey="id" loading={loading} />
        </Card>
      ) : (
        <Layout style={{ minHeight: 'calc(100vh - 150px)', background: '#fff' }}>
          {/* Header Editor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setMode('list')}>{t('common.btnBackToList', 'Quay lại danh sách')}</Button>
              <Title level={4} style={{ margin: 0 }}>Thiết kế App: {selectedApp?.displayName}</Title>
              <Tag color="orange">{selectedApp?.resourceName}</Tag>
            </Space>
            <Space>
              <Button icon={<SettingOutlined />} onClick={() => setPermissionModalVisible(true)}>{t('common.btnPermissions', 'Phân quyền')}</Button>
              <Button icon={<EyeOutlined />} onClick={() => window.open(`/dynamic-app/${selectedApp.resourceName}`, '_blank')}>{t('common.btnPreview', 'Xem thực tế')}</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveDesign} loading={loading}>{t('common.btnSaveConfig', 'Lưu cấu hình')}</Button>
            </Space>
          </div>

          <Layout>
            {/* Left Sidebar: Toolbox & Fields */}
            <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0', padding: 16, overflowY: 'auto' }}>
              <div style={{ marginBottom: 24 }}>
                <Title level={5}><SettingOutlined /> 1. Cấu hình các trường dữ liệu</Title>
                <Paragraph style={{ fontSize: 12, color: '#64748b' }}>Định nghĩa các trường thông tin cho Database của App này.</Paragraph>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {fields.map((f, i) => (
                    <Card size="small" key={f.name} style={{ background: '#fafafa' }} styles={{ body: {} }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{f.label}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11 }}>{f.name} ({f.type})</Text>
                        </div>
                        <Space>
                          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleOpenFieldModal(i)} />
                          <Popconfirm title="Xóa trường này?" onConfirm={() => handleDeleteField(i)}>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                    </Card>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => handleOpenFieldModal()} block>{t('common.btnAddField', 'Thêm trường dữ liệu')}</Button>
                </div>
              </div>

              <Divider />

              <div>
                <Title level={5}><DragOutlined /> 2. Kéo thả Widget</Title>
                <Paragraph style={{ fontSize: 12, color: '#64748b' }}>Nhấn giữ và kéo thả các khối giao diện dưới đây vào Canvas bên phải.</Paragraph>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {WIDGET_TEMPLATES.map(w => (
                    <Card
                      key={w.type}
                      hoverable
                      draggable
                      onDragStart={(e) => handleDragStart(e, w.type)}
                      style={{ cursor: 'grab', background: '#fafafa', border: '1px dashed #d9d9d9' }}
                      styles={{ body: {} }}
                    >
                      <Space>
                        <div style={{ fontSize: 20, color: '#ea9105' }}>{w.icon}</div>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{w.title}</Text>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{w.desc}</div>
                        </div>
                      </Space>
                    </Card>
                  ))}
                </div>
              </div>
            </Sider>

            {/* Central Canvas */}
            <Content style={{ padding: 24, background: '#f5f5f5', minHeight: '600px', overflowY: 'auto' }}>
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{ 
                  background: '#ffffff', 
                  border: '2px dashed #ea9105', 
                  borderRadius: 12, 
                  minHeight: '550px', 
                  padding: 24,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
              >
                {widgets.length === 0 && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <Empty description={
                      <span>
                        <Text strong style={{ fontSize: 15 }}>Khu vực Canvas Thiết kế</Text>
                        <br />
                        <Text type="secondary">Kéo các widget từ Menu trái thả vào đây để bắt đầu xây dựng App</Text>
                      </span>
                    } />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {widgets.map((widget, index) => {
                    const isSelected = selectedWidgetId === widget.id;
                    return (
                      <div
                        key={widget.id}
                        onClick={() => setSelectedWidgetId(widget.id)}
                        style={{
                          border: isSelected ? '2px solid #ea9105' : '1px solid #d9d9d9',
                          borderRadius: 8,
                          padding: 16,
                          background: '#fff',
                          position: 'relative',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 4px 12px rgba(234,145,5,0.15)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Control actions */}
                        <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}>
                          <Space>
                            <Button size="small" type="text" disabled={index === 0} icon={<PlusOutlined style={{ transform: 'rotate(180deg)' }} />} onClick={(e) => { e.stopPropagation(); moveWidget(index, 'up'); }} />
                            <Button size="small" type="text" disabled={index === widgets.length - 1} icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); moveWidget(index, 'down'); }} />
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => deleteWidget(widget.id, e)} />
                          </Space>
                        </div>

                        {/* Visual representations of widgets */}
                        {widget.type === 'header' && (
                          <div style={{ background: widget.config.bgColor || 'linear-gradient(135deg, #f59e0b, #ea580c)', padding: '24px 16px', borderRadius: 6, color: widget.config.textColor || '#ffffff' }}>
                            <Title level={4} style={{ color: 'inherit', margin: 0 }}>{widget.config.title || 'Tiêu đề'}</Title>
                            <Text style={{ color: 'inherit', opacity: 0.85 }}>{widget.config.subtitle || 'Mô tả ngắn'}</Text>
                          </div>
                        )}

                        {widget.type === 'stats' && (
                          <Row gutter={16}>
                            <Col span={8}>
                              <Card style={{ borderLeft: `4px solid ${widget.config.color || '#ea9105'}` }} styles={{ body: {} }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{widget.config.label || 'Thống kê'}</Text>
                                <br />
                                <Text strong style={{ fontSize: 24, color: widget.config.color || '#ea9105' }}>128</Text>
                              </Card>
                            </Col>
                          </Row>
                        )}

                        {widget.type === 'alert' && (
                          <Alert message={widget.config.message || 'Nội dung thông báo'} type={widget.config.alertType || 'info'} showIcon />
                        )}

                        {widget.type === 'table' && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <Text strong style={{ fontSize: 14 }}>📊 Bảng Dữ liệu Động (Xem trước)</Text>
                              <Button type="primary" size="small" icon={<PlusOutlined />}>{t('common.btnAddRecord', 'Thêm bản ghi')}</Button>
                            </div>
                            <Table 
                              size="small"
                              columns={fields.map(f => ({ title: f.label, dataIndex: f.name, key: f.name }))} 
                              dataSource={[
                                fields.reduce((acc, f) => ({ ...acc, [f.name]: `Dữ liệu mẫu ${f.label}` }), {})
                              ]} 
                              pagination={false} 
                            />
                          </div>
                        )}

                        {widget.type === 'form' && (
                          <div>
                            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>📝 Form Nhập dữ liệu (Xem trước)</Text>
                            <Form layout={widget.config.layout || 'vertical'}>
                              {fields.map(f => (
                                <Form.Item key={f.name} label={f.label} required={f.required}>
                                  <Input placeholder={`Nhập ${f.label}...`} disabled />
                                </Form.Item>
                              ))}
                              <Button type="primary" disabled>{t('common.btnSaveData', 'Lưu dữ liệu')}</Button>
                            </Form>
                          </div>
                        )}

                        {widget.type === 'kanban' && (
                          <div>
                            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>📋 Bảng Kanban (Xem trước)</Text>
                            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                              {(widget.config.columns || []).map((col: string) => (
                                <div key={col} style={{ minWidth: 250, background: '#f0f2f5', borderRadius: 6, padding: 12 }}>
                                  <Text strong>{col}</Text>
                                  <Card size="small" style={{ marginTop: 8 }}>Thẻ dữ liệu mẫu</Card>
                                  <Card size="small" style={{ marginTop: 8 }}>Thẻ dữ liệu mẫu 2</Card>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {widget.type === 'calendar' && (
                          <div>
                            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>📅 Lịch Dữ liệu (Xem trước)</Text>
                            <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, textAlign: 'center', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Text type="secondary">Giao diện Calendar sẽ hiển thị các bản ghi dựa trên trường "{widget.config.dateField || 'Ngày'}"</Text>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Content>

            {/* Right Sidebar: Inspector */}
            <Sider width={300} theme="light" style={{ borderLeft: '1px solid #f0f0f0', padding: 16, overflowY: 'auto' }}>
              <Title level={5}><SettingOutlined /> 3. Inspector (Thuộc tính)</Title>
              <Paragraph style={{ fontSize: 12, color: '#64748b' }}>Chọn một Widget trên Canvas để thay đổi thiết kế.</Paragraph>
              <Divider />

              {selectedWidget ? (
                <div>
                  <Title level={5} style={{ marginBottom: 16 }}>Loại Widget: <Tag color="blue">{selectedWidget.type.toUpperCase()}</Tag></Title>
                  
                  {selectedWidget.type === 'header' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Tiêu đề</Text>
                        <Input value={selectedWidget.config.title} onChange={(e) => updateWidgetConfig('title', e.target.value)} />
                      </div>
                      <div>
                        <Text>Mô tả ngắn</Text>
                        <Input.TextArea value={selectedWidget.config.subtitle} onChange={(e) => updateWidgetConfig('subtitle', e.target.value)} />
                      </div>
                      <div>
                        <Text>Màu nền Banner</Text>
                        <Input type="color" value={selectedWidget.config.bgColor} onChange={(e) => updateWidgetConfig('bgColor', e.target.value)} style={{ width: '100%', height: 35, padding: 0 }} />
                      </div>
                      <div>
                        <Text>Màu chữ Banner</Text>
                        <Input type="color" value={selectedWidget.config.textColor} onChange={(e) => updateWidgetConfig('textColor', e.target.value)} style={{ width: '100%', height: 35, padding: 0 }} />
                      </div>
                    </Space>
                  )}

                  {selectedWidget.type === 'stats' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Nhãn thống kê</Text>
                        <Input value={selectedWidget.config.label} onChange={(e) => updateWidgetConfig('label', e.target.value)} />
                      </div>
                      <div>
                        <Text>Màu sắc số liệu</Text>
                        <Input type="color" value={selectedWidget.config.color} onChange={(e) => updateWidgetConfig('color', e.target.value)} style={{ width: '100%', height: 35, padding: 0 }} />
                      </div>
                    </Space>
                  )}

                  {selectedWidget.type === 'alert' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Nội dung thông báo</Text>
                        <Input.TextArea value={selectedWidget.config.message} onChange={(e) => updateWidgetConfig('message', e.target.value)} />
                      </div>
                      <div>
                        <Text>Loại alert</Text>
                        <Select value={selectedWidget.config.alertType} onChange={(val) => updateWidgetConfig('alertType', val)} style={{ width: '100%' }}>
                          <Option value="info">Info (Xanh dương)</Option>
                          <Option value="success">Success (Xanh lá)</Option>
                          <Option value="warning">Warning (Vàng)</Option>
                          <Option value="error">Error (Đỏ)</Option>
                        </Select>
                      </div>
                    </Space>
                  )}

                  {selectedWidget.type === 'table' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Số bản ghi / Trang</Text>
                        <Select value={selectedWidget.config.pageSize} onChange={(val) => updateWidgetConfig('pageSize', val)} style={{ width: '100%' }}>
                          <Option value={5}>5 bản ghi</Option>
                          <Option value={10}>10 bản ghi</Option>
                          <Option value={20}>20 bản ghi</Option>
                        </Select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text>Hiển thị Nút Sửa/Xóa</Text>
                        <Switch checked={selectedWidget.config.showActions} onChange={(val) => updateWidgetConfig('showActions', val)} />
                      </div>
                    </Space>
                  )}

                  {selectedWidget.type === 'form' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Bố cục Form</Text>
                        <Select value={selectedWidget.config.layout} onChange={(val) => updateWidgetConfig('layout', val)} style={{ width: '100%' }}>
                          <Option value="vertical">Theo chiều dọc</Option>
                          <Option value="horizontal">Theo chiều ngang</Option>
                          <Option value="inline">Gộp trên 1 dòng</Option>
                        </Select>
                      </div>
                    </Space>
                  )}

                  {selectedWidget.type === 'kanban' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Trường dữ liệu phân trạng thái</Text>
                        <Select value={selectedWidget.config.statusField} onChange={(val) => updateWidgetConfig('statusField', val)} style={{ width: '100%' }} placeholder="Chọn trường Select">
                          {fields.filter(f => f.type === 'select').map(f => (
                            <Option key={f.name} value={f.name}>{f.label}</Option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Text>Danh sách Cột (Trạng thái)</Text>
                        <Select mode="tags" value={selectedWidget.config.columns} onChange={(val) => updateWidgetConfig('columns', val)} style={{ width: '100%' }} placeholder="Thêm cột Kanban" />
                      </div>
                    </Space>
                  )}

                  {selectedWidget.type === 'calendar' && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text>Trường Ngày tháng (Date Field)</Text>
                        <Select value={selectedWidget.config.dateField} onChange={(val) => updateWidgetConfig('dateField', val)} style={{ width: '100%' }} placeholder="Chọn trường Date">
                          {fields.filter(f => f.type === 'date').map(f => (
                            <Option key={f.name} value={f.name}>{f.label}</Option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Text>Trường Tiêu đề sự kiện</Text>
                        <Select value={selectedWidget.config.titleField} onChange={(val) => updateWidgetConfig('titleField', val)} style={{ width: '100%' }} placeholder="Chọn trường Text">
                          {fields.filter(f => f.type === 'text').map(f => (
                            <Option key={f.name} value={f.name}>{f.label}</Option>
                          ))}
                        </Select>
                      </div>
                    </Space>
                  )}
                </div>
              ) : (
                <Empty description="Vui lòng chọn một Widget trên Canvas để chỉnh sửa cấu hình" />
              )}
            </Sider>
          </Layout>
        </Layout>
      )}

      {/* Permission Modal */}
      <Modal
        title="Cấu hình Phân quyền Truy cập (RBAC)"
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        onOk={() => setPermissionModalVisible(false)}
        okText={t('common.btnConfirm', 'Xác nhận')}
        cancelText={t('common.btnClose', 'Đóng')}
      >
        <Alert message="Chỉ định các vai trò (Roles) có quyền thực hiện hành động trên dữ liệu của Ứng dụng này. Bỏ trống đồng nghĩa với việc không ai có quyền (trừ Admin)." type="info" showIcon style={{ marginBottom: 16 }} />
        
        <Form layout="vertical">
          <Form.Item label="Quyền Xem (View)">
            <Select mode="multiple" value={permissions.view} onChange={val => setPermissions({ ...permissions, view: val })} placeholder="Chọn các Role được phép XEM">
              {roles.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Quyền Thêm mới (Create)">
            <Select mode="multiple" value={permissions.create} onChange={val => setPermissions({ ...permissions, create: val })} placeholder="Chọn các Role được phép THÊM">
              {roles.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Quyền Cập nhật (Update)">
            <Select mode="multiple" value={permissions.update} onChange={val => setPermissions({ ...permissions, update: val })} placeholder="Chọn các Role được phép SỬA">
              {roles.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Quyền Xóa (Delete)">
            <Select mode="multiple" value={permissions.delete} onChange={val => setPermissions({ ...permissions, delete: val })} placeholder="Chọn các Role được phép XÓA">
              {roles.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* CREATE NEW APP MODAL */}
      <Modal
        title="Tạo Ứng dụng động mới"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => appForm.submit()}
      >
        <Form form={appForm} layout="vertical" onFinish={handleCreateApp}>
          <Form.Item name="resourceName" label="Tên biến / Identifier (Không dấu, không khoảng cách)" rules={[{ required: true }, { pattern: /^[a-zA-Z0-9]+$/, message: 'Chỉ chấp nhận chữ cái và số viết liền' }]}>
            <Input placeholder="VD: KhieuNaiKhachHang" />
          </Form.Item>
          <Form.Item name="displayName" label="Tên hiển thị ứng dụng" rules={[{ required: true }]}>
            <Input placeholder="VD: Khiếu nại Khách hàng" />
          </Form.Item>
        </Form>
      </Modal>

      {/* SCHEMA FIELD CONFIG MODAL */}
      <Modal
        title={editingFieldIndex !== null ? 'Chỉnh sửa Trường dữ liệu' : 'Thêm Trường dữ liệu'}
        open={fieldModalVisible}
        onCancel={() => setFieldModalVisible(false)}
        onOk={() => fieldForm.submit()}
        width={500}
      >
        <Form form={fieldForm} layout="vertical" onFinish={handleSaveField}>
          <Form.Item name="name" label="Tên trường (Database Key - viết liền không dấu)" rules={[{ required: true }, { pattern: /^[a-z0-9A-Z_]+$/, message: 'Chỉ chấp nhận chữ cái, số, gạch dưới' }]}>
            <Input placeholder="VD: customerName" disabled={editingFieldIndex !== null} />
          </Form.Item>
          <Form.Item name="label" label="Tên hiển thị (Label)" rules={[{ required: true }]}>
            <Input placeholder="VD: Tên Khách hàng" />
          </Form.Item>
          <Form.Item name="type" label="Kiểu dữ liệu" rules={[{ required: true }]}>
            <Select>
              <Option value="text">Văn bản ngắn (Text)</Option>
              <Option value="textarea">Văn bản dài (TextArea)</Option>
              <Option value="number">Số (Number)</Option>
              <Option value="date">Ngày tháng (Date)</Option>
              <Option value="select">Dropdown Lựa chọn (Select)</Option>
              <Option value="lookup">Tham chiếu (Lookup)</Option>
              <Option value="file">Đính kèm Tệp (File)</Option>
              <Option value="formula">Công thức tính (Formula)</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'formula') {
                return (
                  <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }} title="Cấu hình Công thức">
                    <Form.Item name="formulaStr" label="Biểu thức toán học (Dùng [] cho tên biến)" rules={[{ required: true, message: 'Nhập công thức' }]}>
                      <Input placeholder="VD: [quantity] * [price] + 10" />
                    </Form.Item>
                    <Typography.Text type="secondary" style={{fontSize: 12}}>
                      Các biến trong ngoặc vuông sẽ tự động được lấy giá trị từ các trường khác để tính toán.
                    </Typography.Text>
                  </Card>
                );
              }
              if (type === 'lookup') {
                return (
                  <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }} title="Cấu hình Tham chiếu Lookup">
                    <Form.Item name="targetResource" label="Chọn Ứng dụng/Bảng tham chiếu" rules={[{ required: true, message: 'Vui lòng chọn bảng tham chiếu' }]}>
                      <Select placeholder="Chọn ứng dụng...">
                        {apps.map(app => (
                          <Option key={app.resourceName} value={app.resourceName}>
                            {app.displayName} ({app.resourceName})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Card>
                );
              }
              if (type === 'select') {
                return (
                  <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }} title="Cấu hình tùy chọn dropdown">
                    <Form.List name="options">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                              <Form.Item {...restField} name={[name, 'label']} rules={[{ required: true, message: 'Nhập Label' }]}>
                                <Input placeholder="Label hiển thị (VD: Thành viên)" />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: 'Nhập Value' }]}>
                                <Input placeholder="Giá trị (VD: member)" />
                              </Form.Item>
                              <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>{t('common.btnAddOption', 'Thêm Tùy chọn')}</Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="required" label="Bắt buộc điền thông tin" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppStudio;
