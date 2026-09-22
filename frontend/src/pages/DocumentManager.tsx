import React, { useState, useEffect } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, Select, Upload, message, Tag, Tabs, Row, Col } from 'antd';
import { FileOutlined, CloudUploadOutlined, DownloadOutlined, DeleteOutlined, InboxOutlined, FileTextOutlined, FileExcelOutlined, FilePdfOutlined, ContainerOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import { filterRecursive } from '../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { TabPane } = Tabs;

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (!mimeType) return <FileOutlined />;
  if (mimeType.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileTextOutlined style={{ color: '#2b579a' }} />;
  return <FileOutlined />;
};

const DocumentManager: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/documents');
      setData(response.data || []);
    } catch (error) {
      message.error(t('documentManager.messages.loadError', 'Lỗi khi tải danh sách tài liệu'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      message.success(t('documentManager.messages.deleteSuccess', 'Đã xóa tài liệu'));
      fetchDocuments();
    } catch (error) {
      message.error(t('documentManager.messages.deleteError', 'Lỗi khi xóa tài liệu'));
    }
  };

  const handleDownload = (record: any) => {
    api.get(`/documents/${record.id}/download`, { responseType: 'blob' }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = record.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    }).catch(() => {
      message.error(t('documentManager.messages.downloadError', 'Lỗi khi tải xuống'));
    });
  };

  const handleUploadSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (fileList.length === 0) {
        message.warning(t('documentManager.requireFile', 'Vui lòng chọn file để tải lên'));
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);
      formData.append('documentType', values.documentType);
      if (values.category) {
        formData.append('category', values.category);
      }

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      message.success(t('documentManager.messages.uploadSuccess', 'Tải lên thành công'));
      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error(t('documentManager.messages.uploadError', 'Tải lên thất bại'));
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      title: t('documentManager.cols.name', 'Tên Tài liệu'),
      dataIndex: 'originalName',
      key: 'originalName',
      ...getColumnSearchProps<any>('originalName', 'Tên Tài liệu'),
      sorter: getColumnSorter<any>('originalName', 'string'),
      render: (text: string, record: any) => (
        <Space>
          {getFileIcon(record.mimeType)}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: t('documentManager.cols.type', 'Phân loại'),
      dataIndex: 'documentType',
      key: 'documentType',
      ...getColumnSelectFilterProps<any>('documentType', undefined, data),
      sorter: getColumnSorter<any>('documentType', 'string'),
      render: (type: string, record: any) => {
        let color = 'default';
        let label = t('documentManager.types.general', 'Tài liệu chung');
        if (type === 'Template') { color = 'purple'; label = t('documentManager.types.template', 'Mẫu biểu'); }
        else if (type === 'Report') { color = 'volcano'; label = t('documentManager.types.report', 'Báo cáo'); }
        else if (type === 'Presentation' || type === 'Tờ trình') { color = 'magenta'; label = t('documentManager.types.submission', 'Tờ trình'); }
        else if (type === 'Outline' || type === 'Đề cương') { color = 'cyan'; label = t('documentManager.types.outline', 'Đề cương'); }
        else if (type === 'Decision' || type === 'Quyết định') { color = 'gold'; label = t('documentManager.types.decision', 'Quyết định'); }
        else if (type === 'File') { color = 'blue'; label = t('documentManager.types.general', 'Tài liệu chung'); }
        
        return (
          <Space orientation="vertical" size={0}>
            <Tag color={color}>{label}</Tag>
            {record.category && <Text type="secondary" style={{ fontSize: 11 }}>{record.category}</Text>}
          </Space>
        );
      },
    },
    {
      title: t('documentManager.cols.size', 'Kích thước'),
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatBytes(size),
      sorter: getColumnSorter<any>('size', 'number'),
    },
    {
      title: t('documentManager.cols.uploader', 'Người tải lên'),
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      ...getColumnSearchProps<any>('uploadedByName', 'Người tải lên'),
      sorter: getColumnSorter<any>('uploadedByName', 'string'),
    },
    {
      title: t('documentManager.cols.date', 'Ngày tải lên'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: t('documentManager.cols.source', 'Nguồn tải lên'),
      dataIndex: 'linkedResource',
      key: 'linkedResource',
      ...getColumnSelectFilterProps<any>('linkedResource', undefined, data),
      render: (linked: string, record: any) => {
        if (!linked) return <Tag color="default">{t('documentManager.sources.direct', 'Trực tiếp')}</Tag>;
        let label = linked;
        let color = 'default';
        if (linked === 'AuditEngagements') { label = t('documentManager.sources.engagement', 'Đoàn Kiểm toán'); color = 'blue'; }
        if (linked === 'Recommendations') { label = t('documentManager.sources.recommendation', 'Kiến nghị'); color = 'green'; }
        if (linked === 'AuditFindings') { label = t('documentManager.sources.finding', 'Phát hiện'); color = 'orange'; }
        
        return (
          <Space orientation="vertical" size={0}>
            <Tag color={color}>{label}</Tag>
            {record.linkedResourceId && <Text type="secondary" style={{ fontSize: 11 }}>ID: {record.linkedResourceId}</Text>}
          </Space>
        );
      },
    },
    {
      title: t('documentManager.cols.action', 'Thao tác'),
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<DownloadOutlined />} style={{ color: '#ea9105' }} onClick={() => handleDownload(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({
              title: t('documentManager.deleteConfirmTitle', 'Xóa tài liệu'),
              content: t('documentManager.deleteConfirmContent', 'Bạn có chắc chắn muốn xóa tài liệu này vĩnh viễn không?'),
              onOk: () => handleDelete(record.id)
            });
          }} />
        </Space>
      ),
    },
  ];

  const renderTable = (filterType?: string) => {
    let filteredData = data.filter(item => filterRecursive(item, searchText));
    if (filterType === 'AuditEngagements') {
      filteredData = filteredData.filter(d => d.linkedResource === 'AuditEngagements');
    } else if (filterType) {
      filteredData = filteredData.filter(d => d.documentType === filterType);
    }
    return (
      <Table 
        columns={columns} 
        dataSource={filteredData} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ContainerOutlined className="mr-2" style={{ color: '#ea9105' }} />
            {t('documentManager.title', 'Quản lý Tài liệu & Mẫu biểu')}
          </Title>
          <Text type="secondary">{t('documentManager.subtitle', 'Quản lý tập trung các files, mẫu biểu và báo cáo dùng chung cho toàn hệ thống.')}</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Tìm kiếm tài liệu..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}>
            {t('documentManager.btnUpload', 'Tải lên Tài liệu')}
          </Button>
        </Space>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <Tabs defaultActiveKey="all">
          <TabPane tab={t('documentManager.tabAll', t('documentManager.tabAll', t('documentManager.tabAll', t('documentManager.tabAll', t('documentManager.tabAll', t('documentManager.tabAll', 'Tất cả Tài liệu'))))))} key="all">
            {renderTable()}
          </TabPane>
          <TabPane tab={t('documentManager.tabTemplates', t('documentManager.tabTemplates', t('documentManager.tabTemplates', t('documentManager.tabTemplates', t('documentManager.tabTemplates', t('documentManager.tabTemplates', 'Mẫu biểu (Templates)'))))))} key="Template">
            {renderTable('Template')}
          </TabPane>
          <TabPane tab={t('documentManager.tabReports', t('documentManager.tabReports', t('documentManager.tabReports', t('documentManager.tabReports', t('documentManager.tabReports', t('documentManager.tabReports', 'Báo cáo (Reports)'))))))} key="Report">
            {renderTable('Report')}
          </TabPane>
          <TabPane tab={t('documentManager.tabFiles', t('documentManager.tabFiles', t('documentManager.tabFiles', t('documentManager.tabFiles', t('documentManager.tabFiles', t('documentManager.tabFiles', 'Tài liệu chung'))))))} key="File">
            {renderTable('File')}
          </TabPane>
          <TabPane tab={t('documentManager.tabEngagements', t('documentManager.tabEngagements', t('documentManager.tabEngagements', t('documentManager.tabEngagements', t('documentManager.tabEngagements', t('documentManager.tabEngagements', 'Hồ sơ Đoàn kiểm toán'))))))} key="AuditEngagements">
            {renderTable('AuditEngagements')}
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={t('documentManager.uploadModalTitle', 'Tải lên Tài liệu mới')}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setFileList([]); }}
        onOk={handleUploadSubmit}
        confirmLoading={uploading}
        okText={t('documentManager.uploadBtn', 'Tải lên')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="documentType" label={t('documentManager.labelDocType', 'Loại tài liệu')} rules={[{ required: true }]} initialValue="File">
            <Select>
              <Option value="File">{t('documentManager.types.general', 'Tài liệu chung')}</Option>
              <Option value="Template">{t('documentManager.types.template', 'Mẫu biểu')}</Option>
              <Option value="Report">{t('documentManager.types.report', 'Báo cáo')}</Option>
              <Option value="Presentation">{t('documentManager.types.submission', 'Tờ trình')}</Option>
              <Option value="Outline">{t('documentManager.types.outline', 'Đề cương')}</Option>
              <Option value="Decision">{t('documentManager.types.decision', 'Quyết định')}</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="category" label={t('documentManager.labelCategory', 'Nhãn phân loại (Tùy chọn)')}>
            <Input placeholder={t('documentManager.placeholderCategory', 'VD: Quy trình, Chính sách, Báo cáo Ban Giám Đốc')} />
          </Form.Item>

          <Form.Item label={t('documentManager.labelSelectFile', 'Chọn File')} required>
            <Dragger
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file]);
                return false;
              }}
              onRemove={() => setFileList([])}
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#ea9105' }} />
              </p>
              <p className="ant-upload-text">{t('documentManager.uploadDragText', 'Nhấn hoặc kéo thả file vào khu vực này')}</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentManager;


