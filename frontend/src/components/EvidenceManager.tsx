import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, Button, Table, Space, Tag, Typography, message,
  Modal, Form, Input, Popconfirm, Spin, Badge, Tooltip,
} from 'antd';
import {
  UploadOutlined, DownloadOutlined, DeleteOutlined,
  PaperClipOutlined, FileImageOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined,
  SyncOutlined, CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import api from '../services/api';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface Props {
  linkedResource: string;   // 'recommendations' | 'working-papers' | 'audit-findings'
  linkedResourceId: number;
  readOnly?: boolean;
}

const FILE_ICON_MAP: Record<string, React.ReactNode> = {
  'application/pdf': <FilePdfOutlined className="text-red-500" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileWordOutlined className="text-blue-500" />,
  'application/msword': <FileWordOutlined className="text-blue-500" />,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': <FileExcelOutlined className="text-green-500" />,
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImageOutlined className="text-purple-500" />;
  return FILE_ICON_MAP[mimeType] || <PaperClipOutlined />;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const EvidenceManager: React.FC<Props> = ({ linkedResource, linkedResourceId, readOnly = false }) => {
  const { t } = useTranslation();
  const [evidences, setEvidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form] = Form.useForm();
  const [aiVerifyingId, setAiVerifyingId] = useState<number | null>(null);

  const handleAiVerify = async (id: number) => {
    setAiVerifyingId(id);
    try {
      message.loading({ content: 'AI đang phân tích & quét OCR tài liệu...', key: 'ai-verifying' });
      await api.post(`/evidences/${id}/ai-verify`, {}, { timeout: 60000 });
      message.success({ content: 'AI thẩm định bằng chứng hoàn tất!', key: 'ai-verifying' });
      fetchEvidences();
    } catch (error: any) {
      message.error({ content: error.response?.data?.message || 'Lỗi khi thẩm định AI', key: 'ai-verifying' });
    } finally {
      setAiVerifyingId(null);
    }
  };

  const fetchEvidences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/evidences', {
        params: { resource: linkedResource, resourceId: linkedResourceId },
      });
      setEvidences(res.data);
    } catch {
      message.error('Lỗi tải danh sách bằng chứng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (linkedResourceId) fetchEvidences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedResourceId]);

  const handleBeforeUpload = (file: File) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      message.error('File không được vượt quá 20MB');
      return false;
    }
    setPendingFile(file);
    setDescModalOpen(true);
    return false; // Ngăn upload tự động
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;
    try {
      const values = await form.validateFields();
      setUploading(true);

      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('linkedResource', linkedResource);
      formData.append('linkedResourceId', linkedResourceId.toString());
      formData.append('description', values.description || '');

      await api.post('/evidences/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success(`Đã tải lên: ${pendingFile.name}`);
      setDescModalOpen(false);
      setPendingFile(null);
      form.resetFields();
      fetchEvidences();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi tải lên file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (evidence: any) => {
    try {
      message.loading({ content: 'Đang tải file...', key: 'downloading' });
      const response = await api.get(`/evidences/${evidence.id}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: evidence.mimeType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = evidence.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: 'Tải xuống bằng chứng hoàn tất!', key: 'downloading' });
    } catch (e) {
      console.error(e);
      message.error({ content: 'Lỗi tải xuống bằng chứng', key: 'downloading' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/evidences/${id}`);
      message.success('Đã xóa bằng chứng');
      fetchEvidences();
    } catch {
      message.error('Lỗi xóa bằng chứng');
    }
  };

  const columns = [
    {
      title: 'File',
      key: 'file',
      render: (_: any, r: any) => (
        <Space>
          {getFileIcon(r.mimeType)}
          <div>
            <Text strong className="block text-sm">{r.originalName}</Text>
            <Text type="secondary" className="text-xs">{formatBytes(r.size)}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (d: string) => <Text className="text-xs text-gray-500">{d || '-'}</Text>,
    },
    {
      title: 'Người upload',
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      width: 130,
      render: (name: string) => <Tag>{name || '-'}</Tag>,
    },
    {
      title: 'Ngày upload',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 130,
      render: (d: string) => <Text className="text-xs">{dayjs(d).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (v: number) => <Tag color="geekblue">v{v}</Tag>,
    },
    {
      title: 'AI Thẩm định (OCR)',
      key: 'aiVerify',
      width: 260,
      render: (_: any, r: any) => {
        if (linkedResource !== 'recommendations') return <Text type="secondary" className="text-xs">Không áp dụng</Text>;

        let statusColor: 'default' | 'success' | 'error' | 'processing' | 'warning' = 'default';
        let label = 'Chờ thẩm định';
        
        if (r.aiVerificationStatus === 'Verified') {
          statusColor = 'success';
          label = 'Đạt yêu cầu';
        } else if (r.aiVerificationStatus === 'Rejected') {
          statusColor = 'error';
          label = 'Không đạt / Cần bổ sung';
        } else if (r.aiVerificationStatus === 'Pending') {
          statusColor = 'warning';
          label = 'Đang thẩm định';
        }

        return (
          <Space orientation="vertical" size={2} className="w-full">
            <Space size={8}>
              <Badge status={statusColor} text={<Text className="text-xs" strong>{label}</Text>} />
              <Button 
                type="link" 
                size="small" 
                className="p-0 text-xs flex items-center" 
                onClick={() => handleAiVerify(r.id)}
                loading={aiVerifyingId === r.id}
                icon={<SyncOutlined />}
              >
                Re-verify
              </Button>
            </Space>
            {r.aiVerificationResult && (
              <Tooltip title={r.aiVerificationResult}>
                <Paragraph 
                  ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }} 
                  className="text-[10px] text-gray-500 !mb-0 max-w-[240px]"
                >
                  {r.aiVerificationResult}
                </Paragraph>
              </Tooltip>
            )}
          </Space>
        );
      }
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button
            type="text" size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(r)}
            title="Tải xuống"
          />
          {!readOnly && (
            <Popconfirm
              title="Xóa bằng chứng này?"
              onConfirm={() => handleDelete(r.id)}
              okText={t('common.btnDelete', 'Xóa')} cancelText={t('common.btnCancel', 'Hủy')}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const uploadProps: UploadProps = {
    beforeUpload: (file) => handleBeforeUpload(file as unknown as File),
    showUploadList: false,
    multiple: false,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp',
  };

  return (
    <div>
      {!readOnly && (
        <div className="mb-3 flex justify-between items-center">
          <Text className="text-gray-500 text-sm">
            <PaperClipOutlined className="mr-1" />
            {evidences.length} bằng chứng đính kèm
          </Text>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} size="small" type="dashed">
              Tải lên bằng chứng
            </Button>
          </Upload>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4"><Spin /></div>
      ) : (
        <Table
          columns={columns}
          dataSource={evidences}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'Chưa có bằng chứng đính kèm' }}
        />
      )}

      <Modal
        title="Mô tả bằng chứng"
        open={descModalOpen}
        onOk={handleUploadConfirm}
        onCancel={() => { setDescModalOpen(false); setPendingFile(null); }}
        okText={t('common.btnUpload', 'Tải lên')}
        confirmLoading={uploading}
      >
        <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
          <Text strong>File: </Text>
          <Text>{pendingFile?.name}</Text>
        </div>
        <Form form={form} layout="vertical">
          <Form.Item name="description" label="Mô tả bằng chứng (tùy chọn)">
            <Input.TextArea rows={3} placeholder="Nhập mô tả ngắn về tài liệu này..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EvidenceManager;
