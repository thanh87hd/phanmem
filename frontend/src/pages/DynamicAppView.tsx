import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Alert, Card, Row, Col, Typography, Button, Table, Space, Modal, message, Badge, Popconfirm, Calendar, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, InfoCircleOutlined, DesktopOutlined } from '@ant-design/icons';
import axios from 'axios';
import api from '../services/api';
import DynamicForm from '../components/framework/DynamicForm';
import type { DynamicFieldSchema } from '../components/framework/DynamicForm';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface ResourceMetadata {
  id: number;
  resourceName: string;
  displayName: string;
  schema: DynamicFieldSchema[];
  uiSchema?: {
    widgets?: {
      id: string;
      type: 'header' | 'stats' | 'alert' | 'table' | 'form' | 'kanban' | 'calendar';
      title: string;
      config: any;
    }[];
  };
}

const DynamicAppView: React.FC = () => {
  const { t } = useTranslation();
  const { resourceName } = useParams<{ resourceName: string }>();
  const navigate = useNavigate();

  const [metadata, setMetadata] = useState<ResourceMetadata | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const fetchAppInfo = async () => {
    if (!resourceName) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch metadata schema
      const metaRes = await api.get(`/framework/metadata/${resourceName}`);
      setMetadata(metaRes.data);

      // 2. Fetch record data
      const dataRes = await api.get(`/framework/data/${resourceName}`);
      setData(dataRes.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(`Ứng dụng "${resourceName}" không tồn tại hoặc chưa được kích hoạt.`);
      } else {
        setError('Không thể tải cấu hình và dữ liệu ứng dụng.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAppInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceName]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/framework/data/${resourceName}/${id}`);
      message.success('Đã xóa bản ghi thành công');
      fetchAppInfo();
    } catch (error) {
      message.error('Lỗi khi xóa bản ghi');
    }
  };

  const handleFormSubmit = async (values: any) => {
    const formattedValues = { ...values };
    metadata?.schema.forEach(field => {
      if (field.type === 'date' && formattedValues[field.name]) {
        formattedValues[field.name] = dayjs(formattedValues[field.name]).format('YYYY-MM-DD');
      }
    });

    try {
      if (editingRecord) {
        await api.put(`/framework/data/${resourceName}/${editingRecord.id}`, formattedValues);
        message.success('Cập nhật dữ liệu thành công');
      } else {
        await api.post(`/framework/data/${resourceName}`, formattedValues);
        message.success('Thêm mới dữ liệu thành công');
      }
      setIsModalVisible(false);
      fetchAppInfo();
    } catch (error) {
      message.error('Lỗi khi lưu dữ liệu');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <Spin size="large" tip="Đang tải ứng dụng..." />
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Lỗi tải ứng dụng"
          description={error || 'Không tìm thấy cấu hình hợp lệ.'}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          }
        />
      </div>
    );
  }

  const widgets = metadata.uiSchema?.widgets || [];

  const columns = metadata.schema.map((field) => ({
    title: field.label,
    dataIndex: ['data', field.name],
    key: field.name,
    render: (text: any) => {
      if (field.type === 'date') return text ? dayjs(text).format('DD/MM/YYYY') : '';
      if (field.type === 'select') {
        const option = field.options?.find(o => String(o.value) === String(text));
        return option ? option.label : text;
      }
      return text;
    }
  }));

  const showActions = widgets.find(w => w.type === 'table')?.config?.showActions ?? true;
  if (showActions) {
    columns.push({
      title: 'Hành động',
      key: 'actions',
      dataIndex: 'id',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingRecord(record); setIsModalVisible(true); }}>{t('common.btnEdit', 'Sửa')}</Button>
          <Popconfirm title="Xác nhận xóa bản ghi này?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>{t('common.btnDelete', 'Xóa')}</Button>
          </Popconfirm>
        </Space>
      ),
    } as any);
  }

  const handleKanbanDrop = async (recordId: string, newStatus: string, statusField: string) => {
    const record = data.find(d => d.id === recordId);
    if (!record) return;
    
    // Optimistic update
    const prevData = [...data];
    setData(data.map(d => {
      if (d.id === recordId) {
        return { ...d, data: { ...d.data, [statusField]: newStatus } };
      }
      return d;
    }));

    try {
      const updatedValues = { ...record.data, [statusField]: newStatus };
      await api.put(`/framework/data/${resourceName}/${recordId}`, updatedValues);
      message.success(`Đã chuyển trạng thái thành: ${newStatus}`);
    } catch (err) {
      message.error('Lỗi khi chuyển trạng thái');
      setData(prevData); // Revert on error
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/app-studio')}>
          Quay lại App Studio
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {widgets.map((widget) => {
          if (widget.type === 'header') {
            return (
              <Card 
                key={widget.id}
                style={{ 
                  background: widget.config.bgColor || 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', 
                  color: widget.config.textColor || '#ffffff',
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <Title level={2} style={{ color: 'inherit', margin: 0 }}>
                  {widget.config.title || metadata.displayName}
                </Title>
                <Paragraph style={{ color: 'inherit', opacity: 0.9, marginTop: 8, marginBottom: 0, fontSize: 15 }}>
                  {widget.config.subtitle || `Trang quản lý dữ liệu động ${metadata.displayName}`}
                </Paragraph>
              </Card>
            );
          }

          if (widget.type === 'stats') {
            return (
              <Row gutter={16} key={widget.id}>
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    style={{ borderLeft: `5px solid ${widget.config.color || '#ea9105'}`, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    styles={{ body: {} }}
                  >
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                      {widget.config.label || 'Tổng số bản ghi'}
                    </Text>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <Text strong style={{ fontSize: 28, color: widget.config.color || '#ea9105' }}>
                        {data.length}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>bản ghi hiện có</Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            );
          }

          if (widget.type === 'alert') {
            return (
              <Alert
                key={widget.id}
                message={widget.config.message || 'Cảnh báo'}
                type={widget.config.alertType || 'info'}
                showIcon
                style={{ borderRadius: 6 }}
              />
            );
          }

          if (widget.type === 'table') {
            const pageSize = widget.config.pageSize || 10;
            return (
              <Card 
                key={widget.id} 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>📊 Danh sách dữ liệu</span>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); setIsModalVisible(true); }}>
                      Thêm Mới
                    </Button>
                  </div>
                }
                style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <Table
                  columns={columns}
                  dataSource={data}
                  rowKey="id"
                  pagination={{ pageSize }}
                  locale={{ emptyText: 'Chưa có dữ liệu nào. Vui lòng thêm mới bản ghi đầu tiên!' }}
                />
              </Card>
            );
          }

          if (widget.type === 'form') {
            return (
              <Card 
                key={widget.id} 
                title={<span style={{ fontSize: 16, fontWeight: 600 }}>📝 Nhập Dữ Liệu Nhanh</span>}
                style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div style={{ maxWidth: 600 }}>
                  <DynamicForm
                    schema={metadata.schema}
                    onSubmit={handleFormSubmit}
                  />
                </div>
              </Card>
            );
          }

          if (widget.type === 'kanban') {
            const statusField = widget.config.statusField;
            const columnsConfig: string[] = widget.config.columns || [];
            
            return (
              <Card 
                key={widget.id} 
                title={<span style={{ fontSize: 16, fontWeight: 600 }}>📋 Bảng Kanban</span>}
                style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowX: 'auto' }}
              >
                {!statusField ? (
                  <Alert message="Chưa cấu hình trường trạng thái (Status Field) cho Kanban" type="warning" />
                ) : (
                  <div style={{ display: 'flex', gap: 16, minHeight: 400 }}>
                    {columnsConfig.map((col) => {
                      const colRecords = data.filter(d => (d.data[statusField] || '') === col);
                      return (
                        <div 
                          key={col} 
                          style={{ minWidth: 280, width: 300, background: '#f0f2f5', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column' }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const recordId = e.dataTransfer.getData('text/plain');
                            if (recordId) {
                              handleKanbanDrop(recordId, col, statusField);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text strong>{col}</Text>
                            <Badge count={colRecords.length} style={{ backgroundColor: '#ea9105' }} />
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                            {colRecords.map(record => (
                              <Card 
                                key={record.id} 
                                size="small" 
                                style={{ borderRadius: 6, cursor: 'grab', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('text/plain', record.id)}
                                onClick={() => { setEditingRecord(record); setIsModalVisible(true); }}
                              >
                                {metadata.schema.slice(0, 3).map((f, i) => {
                                  if (f.name === statusField) return null;
                                  return (
                                    <div key={f.name}>
                                      {i === 0 ? (
                                        <Text strong>{record.data[f.name] || '(Trống)'}</Text>
                                      ) : (
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{f.label}: {record.data[f.name]}</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </Card>
                            ))}
                            {colRecords.length === 0 && (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12 }}>
                                Kéo thả thẻ vào đây
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          }

          if (widget.type === 'calendar') {
            const dateField = widget.config.dateField;
            const titleField = widget.config.titleField;
            
            const cellRender = (current: Dayjs) => {
              if (!dateField) return null;
              const dateStr = current.format('YYYY-MM-DD');
              const dayRecords = data.filter(d => {
                if (!d.data[dateField]) return false;
                return dayjs(d.data[dateField]).format('YYYY-MM-DD') === dateStr;
              });
              
              return (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {dayRecords.map(record => (
                    <li key={record.id} style={{ marginBottom: 4 }}>
                      <Tag 
                        color="blue" 
                        style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                        onClick={() => { setEditingRecord(record); setIsModalVisible(true); }}
                      >
                        {titleField ? record.data[titleField] : 'Sự kiện'}
                      </Tag>
                    </li>
                  ))}
                </ul>
              );
            };
            
            return (
              <Card 
                key={widget.id} 
                title={<span style={{ fontSize: 16, fontWeight: 600 }}>📅 Lịch Dữ liệu</span>}
                style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {!dateField ? (
                  <Alert message="Chưa cấu hình trường Ngày tháng (Date Field) cho Calendar" type="warning" />
                ) : (
                  <Calendar cellRender={cellRender} />
                )}
              </Card>
            );
          }

          return null;
        })}
      </div>

      {/* Pop-up form for creation/editing inside Table widget */}
      <Modal
        title={editingRecord ? 'Cập nhật bản ghi' : 'Thêm mới bản ghi'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <DynamicForm
          schema={metadata.schema}
          initialValues={editingRecord?.data}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default DynamicAppView;
