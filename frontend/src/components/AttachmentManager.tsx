import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Radio,
  message,
  Popconfirm,
  Tooltip,
  Upload,
  Typography,
} from 'antd';
import {
  PaperClipOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  SafetyCertificateOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

export interface FileAssetInfo {
  id: number;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  createdAt: string;
}

export interface VerificationInfo {
  id: number;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Unverified';
  result?: string;
  verifiedAt?: string;
}

export interface FileLinkItem {
  id: number;
  fileAssetId: number;
  ownerType: string;
  ownerId: number;
  relationType: string;
  caption?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  fileAsset?: FileAssetInfo;
  verifications?: VerificationInfo[];
}

export interface AttachmentManagerProps {
  ownerType: string;
  ownerId: number;
  relationType?: string;
  title?: string;
  readOnly?: boolean;
  canVerify?: boolean;
  onFilesChanged?: () => void;
}

const getMimeIcon = (mimeType?: string) => {
  if (!mimeType) return <PaperClipOutlined className="text-gray-400 text-lg" />;
  if (mimeType.includes('pdf'))
    return <FilePdfOutlined className="text-red-500 text-lg" />;
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('sheet')
  )
    return <FileExcelOutlined className="text-green-600 text-lg" />;
  if (mimeType.includes('word') || mimeType.includes('officedocument'))
    return <FileWordOutlined className="text-blue-500 text-lg" />;
  if (mimeType.startsWith('image/'))
    return <FileImageOutlined className="text-purple-500 text-lg" />;
  return <PaperClipOutlined className="text-gray-500 text-lg" />;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  ownerType,
  ownerId,
  relationType,
  title = 'HỒ SƠ & BẰNG CHỨNG ĐÍNH KÈM',
  readOnly = false,
  canVerify = true,
  onFilesChanged,
}) => {
  const [links, setLinks] = useState<FileLinkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [selectedLink, setSelectedLink] = useState<FileLinkItem | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadForm] = Form.useForm();
  const [verifyForm] = Form.useForm();

  const fetchLinks = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const params: any = { ownerType, ownerId };
      if (relationType) params.relationType = relationType;

      const res = await api.get('/file-assets/links', { params });
      setLinks(res.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đính kèm:', err);
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId, relationType]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      message.warning('Vui lòng chọn hoặc kéo thả tệp cần tải lên');
      return;
    }

    try {
      const values = await uploadForm.validateFields();
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('ownerType', ownerType);
      formData.append('ownerId', String(ownerId));
      formData.append('relationType', values.relationType || relationType || 'attachment');
      if (values.caption) formData.append('caption', values.caption);

      await api.post('/file-assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Tải lên và gắn liên kết tệp thành công!');
      setUploadModalOpen(false);
      uploadForm.resetFields();
      setSelectedFile(null);
      fetchLinks();
      onFilesChanged?.();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi tải tệp lên');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (link: FileLinkItem) => {
    const url = `/api/file-assets/links/${link.id}/download`;
    window.open(url, '_blank');
  };

  const handleDelete = async (linkId: number) => {
    try {
      await api.delete(`/file-assets/links/${linkId}`);
      message.success('Đã gỡ tệp đính kèm');
      fetchLinks();
      onFilesChanged?.();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa tệp');
    }
  };

  const handleOpenVerifyModal = (link: FileLinkItem) => {
    setSelectedLink(link);
    const latestVerif = link.verifications?.[0];
    verifyForm.setFieldsValue({
      status: latestVerif?.status || 'Verified',
      result: latestVerif?.result || '',
    });
    setVerifyModalOpen(true);
  };

  const handleVerifySubmit = async () => {
    if (!selectedLink) return;
    try {
      const values = await verifyForm.validateFields();
      await api.post(`/file-assets/links/${selectedLink.id}/verify`, values);
      message.success('Đã ghi nhận thẩm định bằng chứng');
      setVerifyModalOpen(false);
      fetchLinks();
      onFilesChanged?.();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi thẩm định bằng chứng');
    }
  };

  const copyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    message.success('Đã sao chép mã băm SHA-256');
  };

  const renderVerificationStatus = (link: FileLinkItem) => {
    const verif = link.verifications?.[0];
    if (!verif) return <Tag color="default">Chưa thẩm định</Tag>;

    switch (verif.status) {
      case 'Verified':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Đã thẩm định
          </Tag>
        );
      case 'Rejected':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Từ chối
          </Tag>
        );
      case 'Pending':
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            Chờ thẩm định
          </Tag>
        );
      default:
        return <Tag color="default">{verif.status}</Tag>;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-3 shadow-sm">
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <SafetyCertificateOutlined className="text-blue-600 text-base" />
          <span className="font-semibold text-slate-800 text-sm tracking-wide">
            {title}
          </span>
          <Tag color="blue" className="rounded-full px-2 text-xs">
            {links.length} tệp
          </Tag>
        </div>

        {!readOnly && (
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            onClick={() => {
              uploadForm.setFieldsValue({
                relationType: relationType || 'evidence',
              });
              setUploadModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Đính kèm tệp
          </Button>
        )}
      </div>

      {/* Danh sách tệp */}
      <Table
        size="small"
        loading={loading}
        dataSource={links}
        rowKey="id"
        pagination={false}
        scroll={{ x: 600 }}
        columns={[
          {
            title: 'Tệp đính kèm',
            key: 'file',
            render: (_, record) => {
              const asset = record.fileAsset;
              return (
                <div className="flex items-start space-x-2.5">
                  <div className="mt-1">{getMimeIcon(asset?.mimeType)}</div>
                  <div className="max-w-xs">
                    <Text
                      strong
                      className="text-slate-800 text-xs block truncate"
                      title={asset?.originalName}
                    >
                      {asset?.originalName || 'Tệp không tên'}
                    </Text>
                    {record.caption && (
                      <span className="text-slate-500 text-xs block italic">
                        {record.caption}
                      </span>
                    )}
                    <span className="text-slate-400 text-xs">
                      {formatSize(asset?.size)} •{' '}
                      {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}
                    </span>
                  </div>
                </div>
              );
            },
          },
          {
            title: 'Toàn vẹn (SHA-256)',
            key: 'checksum',
            width: 140,
            render: (_, record) => {
              const checksum = record.fileAsset?.checksum;
              if (!checksum)
                return <span className="text-slate-300 text-xs">N/A</span>;

              return (
                <Tooltip title={`Mã SHA-256 nguyên bản: ${checksum}`}>
                  <Tag
                    color="cyan"
                    className="cursor-pointer text-xs font-mono font-normal flex items-center w-max"
                    onClick={() => copyChecksum(checksum)}
                  >
                    {checksum.substring(0, 8)}...
                    <CopyOutlined className="ml-1 text-[10px]" />
                  </Tag>
                </Tooltip>
              );
            },
          },
          {
            title: 'Thẩm định',
            key: 'verification',
            width: 130,
            render: (_, record) => (
              <div>
                {renderVerificationStatus(record)}
                {canVerify && !readOnly && (
                  <Button
                    type="link"
                    size="small"
                    className="text-xs p-0 block mt-0.5 text-blue-600"
                    onClick={() => handleOpenVerifyModal(record)}
                  >
                    Đánh giá
                  </Button>
                )}
              </div>
            ),
          },
          {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            align: 'right',
            render: (_, record) => (
              <div className="flex justify-end space-x-1">
                <Tooltip title="Tải tệp xuống">
                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(record)}
                  />
                </Tooltip>
                {!readOnly && (
                  <Popconfirm
                    title="Xác nhận gỡ tệp đính kèm này?"
                    okText="Xóa"
                    cancelText="Hủy"
                    onConfirm={() => handleDelete(record.id)}
                  >
                    <Tooltip title="Gỡ liên kết">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Tooltip>
                  </Popconfirm>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Modal Upload Kéo Thả */}
      <Modal
        title="Đính Kèm Tài Liệu & Bằng Chứng"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false);
          uploadForm.resetFields();
          setSelectedFile(null);
        }}
        onOk={handleUploadSubmit}
        confirmLoading={uploading}
        okText="Tải lên & Lưu"
        cancelText="Đóng"
        destroyOnClose
      >
        <Form form={uploadForm} layout="vertical" className="mt-4">
          <Form.Item label="Chọn tệp tin (hoặc kéo thả)" required>
            <Dragger
              beforeUpload={(file) => {
                setSelectedFile(file);
                return false;
              }}
              maxCount={1}
              fileList={
                selectedFile
                  ? [
                      {
                        uid: '-1',
                        name: selectedFile.name,
                        status: 'done',
                        size: selectedFile.size,
                      },
                    ]
                  : []
              }
              onRemove={() => setSelectedFile(null)}
            >
              <p className="ant-upload-drag-icon text-blue-500">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text text-sm font-medium">
                Bấm vào đây hoặc kéo thả file vào khung này
              </p>
              <p className="ant-upload-hint text-xs text-slate-400">
                Hỗ trợ PDF, Word, Excel, Hình ảnh... Tự động tính hash SHA-256
                để bảo đảm bằng chứng nguyên vẹn.
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="relationType"
            label="Mục đích liên kết"
            initialValue={relationType || 'evidence'}
          >
            <Radio.Group buttonStyle="solid" size="small">
              <Radio.Button value="evidence">Bằng chứng (Evidence)</Radio.Button>
              <Radio.Button value="appendix">Phụ lục (Appendix)</Radio.Button>
              <Radio.Button value="attachment">Hồ sơ đính kèm</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="caption" label="Ghi chú / Mô tả tệp">
            <Input.TextArea
              rows={2}
              placeholder="VD: Biên bản đối soát kho quỹ, Sao kê tài khoản vi phạm..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Thẩm Định Bằng Chứng */}
      <Modal
        title="Thẩm Định Bằng Chứng Kiểm Toán"
        open={verifyModalOpen}
        onCancel={() => setVerifyModalOpen(false)}
        onOk={handleVerifySubmit}
        okText="Lưu Thẩm Định"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={verifyForm} layout="vertical" className="mt-3">
          <Paragraph className="text-xs text-slate-500 mb-4 bg-slate-100 p-2.5 rounded">
            Tệp đang thẩm định:{' '}
            <strong className="text-slate-800">
              {selectedLink?.fileAsset?.originalName}
            </strong>
            <br />
            Mã hash: {selectedLink?.fileAsset?.checksum || 'Chưa có'}
          </Paragraph>

          <Form.Item
            name="status"
            label="Kết luận thẩm định"
            rules={[{ required: true, message: 'Vui lòng chọn kết luận' }]}
          >
            <Radio.Group>
              <Radio value="Verified">
                <Tag color="success">Đã thẩm định (Đạt)</Tag>
              </Radio>
              <Radio value="Rejected">
                <Tag color="error">Từ chối (Không đạt)</Tag>
              </Radio>
              <Radio value="Pending">
                <Tag color="warning">Chờ bổ sung minh chứng</Tag>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="result" label="Ý kiến đánh giá / Ghi chú đối soát">
            <Input.TextArea
              rows={3}
              placeholder="Ghi nhận tính hợp lệ, đầy đủ, kịp thời của tài liệu bằng chứng..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttachmentManager;
