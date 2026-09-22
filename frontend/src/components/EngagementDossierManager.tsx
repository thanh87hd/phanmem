import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Upload,
  Tag,
  Space,
  Typography,
  message,
  Popconfirm,
  Badge,
  Progress,
  Tooltip,
  Alert,
  Modal
} from 'antd';
import {
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PaperClipOutlined,
  InboxOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

export interface DossierDocument {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  documentType: 'DECISION' | 'PROPOSAL' | 'OUTLINE' | 'SAMPLING_PLAN' | 'OTHER';
  category?: string;
  linkedResource?: string;
  linkedResourceId?: number;
  uploadedBy?: number;
  uploadedByName?: string;
  createdAt: string;
}

export const DOSSIER_TYPE_MAP: Record<string, { label: string; tagColor: string; icon: any; isRequired: boolean }> = {
  DECISION: {
    label: '1. Quyết định thành lập đoàn kiểm toán',
    tagColor: 'blue',
    icon: <FilePdfOutlined className="text-red-500 text-base" />,
    isRequired: true
  },
  PROPOSAL: {
    label: '2. Tờ trình phê duyệt cuộc kiểm toán',
    tagColor: 'purple',
    icon: <FileWordOutlined className="text-blue-600 text-base" />,
    isRequired: true
  },
  OUTLINE: {
    label: '3. Kế hoạch kiểm toán chi tiết (MB01A/MB02A)',
    tagColor: 'cyan',
    icon: <FileExcelOutlined className="text-emerald-600 text-base" />,
    isRequired: true
  },
  SAMPLING_PLAN: {
    label: '4. Kế hoạch chọn mẫu kiểm toán (ISA 530)',
    tagColor: 'orange',
    icon: <FileExcelOutlined className="text-amber-600 text-base" />,
    isRequired: true
  },
  OTHER: {
    label: '5. Tài liệu & Phê duyệt pháp lý bổ sung',
    tagColor: 'default',
    icon: <FileTextOutlined className="text-slate-500 text-base" />,
    isRequired: false
  }
};

interface EngagementDossierManagerProps {
  engagementId?: number;
  readOnly?: boolean;
  onDossierChange?: (docs: DossierDocument[], urls: {
    decisionDocUrl?: string;
    proposalDocUrl?: string;
    outlineDocUrl?: string;
    samplingPlanDocUrl?: string;
  }) => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtensionIcon = (filename: string, mimeType?: string) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
  }
  if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
    return <FileWordOutlined style={{ color: '#2b579a', fontSize: 18 }} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
    return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
  }
  return <FileTextOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />;
};

const EngagementDossierManager: React.FC<EngagementDossierManagerProps> = ({
  engagementId,
  readOnly = false,
  onDossierChange
}) => {
  const [documents, setDocuments] = useState<DossierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const fetchDossier = async () => {
    if (!engagementId) return;
    setLoading(true);
    try {
      const res = await api.get(`/documents?linkedResource=engagement&linkedResourceId=${engagementId}`);
      const docs: DossierDocument[] = res.data || [];
      setDocuments(docs);
      notifyParent(docs);
    } catch (err) {
      console.error('Lỗi khi tải bộ hồ sơ pháp lý đoàn kiểm toán:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
  }, [engagementId]);

  const notifyParent = (docs: DossierDocument[]) => {
    if (!onDossierChange) return;

    const urls: {
      decisionDocUrl?: string;
      proposalDocUrl?: string;
      outlineDocUrl?: string;
      samplingPlanDocUrl?: string;
    } = {};

    const decisionDoc = docs.find(d => d.documentType === 'DECISION');
    if (decisionDoc) urls.decisionDocUrl = `/api/documents/${decisionDoc.id}/download`;

    const proposalDoc = docs.find(d => d.documentType === 'PROPOSAL');
    if (proposalDoc) urls.proposalDocUrl = `/api/documents/${proposalDoc.id}/download`;

    const outlineDoc = docs.find(d => d.documentType === 'OUTLINE');
    if (outlineDoc) urls.outlineDocUrl = `/api/documents/${outlineDoc.id}/download`;

    const samplingDoc = docs.find(d => d.documentType === 'SAMPLING_PLAN');
    if (samplingDoc) urls.samplingPlanDocUrl = `/api/documents/${samplingDoc.id}/download`;

    onDossierChange(docs, urls);
  };

  const handleUpload = async (file: File, documentType: string) => {
    if (!engagementId) {
      message.warning('Vui lòng chọn hoặc lưu đoàn kiểm toán trước khi tải tệp!');
      return false;
    }

    setUploadingType(documentType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('category', 'Hồ sơ pháp lý đoàn kiểm toán');
    formData.append('linkedResource', 'engagement');
    formData.append('linkedResourceId', String(engagementId));

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(`Đã tải lên tệp: ${file.name}`);

      // Đồng bộ cập nhật URL tương ứng vào AuditEngagement
      const newDocId = res.data?.id;
      if (newDocId) {
        const updatePayload: Record<string, string> = {};
        const downloadUrl = `/api/documents/${newDocId}/download`;
        if (documentType === 'DECISION') updatePayload.decisionDocUrl = downloadUrl;
        if (documentType === 'PROPOSAL') updatePayload.proposalDocUrl = downloadUrl;
        if (documentType === 'OUTLINE') updatePayload.outlineDocUrl = downloadUrl;
        if (documentType === 'SAMPLING_PLAN') updatePayload.samplingPlanDocUrl = downloadUrl;

        if (Object.keys(updatePayload).length > 0) {
          try {
            await api.patch(`/audit-engagements/${engagementId}`, updatePayload);
          } catch (e) {
            console.error('Cập nhật URL vào engagement thất bại', e);
          }
        }
      }

      await fetchDossier();
    } catch (err: any) {
      console.error('Lỗi khi tải tệp lên:', err);
      message.error(err.response?.data?.message || 'Tải tệp lên thất bại');
    } finally {
      setUploadingType(null);
    }
    return false; // Prevent default upload behavior
  };

  const handleDelete = async (doc: DossierDocument) => {
    try {
      await api.delete(`/documents/${doc.id}`);
      message.success(`Đã xóa tệp: ${doc.originalName}`);

      // Xóa URL tương ứng trong Engagement nếu cần
      if (engagementId && ['DECISION', 'PROPOSAL', 'OUTLINE', 'SAMPLING_PLAN'].includes(doc.documentType)) {
        const clearPayload: Record<string, any> = {};
        if (doc.documentType === 'DECISION') clearPayload.decisionDocUrl = null;
        if (doc.documentType === 'PROPOSAL') clearPayload.proposalDocUrl = null;
        if (doc.documentType === 'OUTLINE') clearPayload.outlineDocUrl = null;
        if (doc.documentType === 'SAMPLING_PLAN') clearPayload.samplingPlanDocUrl = null;
        try {
          await api.patch(`/audit-engagements/${engagementId}`, clearPayload);
        } catch (e) {
          console.error('Clear URL thất bại', e);
        }
      }

      await fetchDossier();
    } catch (err: any) {
      console.error('Lỗi khi xóa tệp:', err);
      message.error(err.response?.data?.message || 'Xóa tệp thất bại');
    }
  };

  // Tính toán độ hoàn thiện bộ hồ sơ
  const requiredTypes = ['DECISION', 'PROPOSAL', 'OUTLINE', 'SAMPLING_PLAN'];
  const completedRequired = requiredTypes.filter(type => documents.some(d => d.documentType === type));
  const completionRate = Math.round((completedRequired.length / requiredTypes.length) * 100);
  const isFullDossier = completedRequired.length === requiredTypes.length;

  const columns = [
    {
      title: 'Tên tệp & Định dạng',
      key: 'name',
      render: (_: any, record: DossierDocument) => (
        <Space align="center">
          {getFileExtensionIcon(record.originalName, record.mimeType)}
          <div>
            <Text strong className="text-slate-800 text-sm block">
              {record.originalName}
            </Text>
            <Text type="secondary" className="text-xs">
              Dung lượng: {formatFileSize(record.size)} | Mã lưu: #{record.id}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Hạng mục hồ sơ pháp lý',
      dataIndex: 'documentType',
      key: 'documentType',
      width: 280,
      render: (type: string) => {
        const meta = DOSSIER_TYPE_MAP[type] || DOSSIER_TYPE_MAP.OTHER;
        return (
          <Tag color={meta.tagColor} className="font-medium px-2 py-0.5 rounded">
            {meta.icon} <span className="ml-1">{meta.label}</span>
          </Tag>
        );
      }
    },
    {
      title: 'Người tải lên & Thời gian',
      key: 'uploadedBy',
      width: 220,
      render: (_: any, record: DossierDocument) => (
        <div className="text-xs text-slate-600">
          <div className="font-semibold text-slate-700">{record.uploadedByName || 'KTV Đoàn KT'}</div>
          <div className="text-slate-400">
            {record.createdAt ? new Date(record.createdAt).toLocaleString('vi-VN') : '-'}
          </div>
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: DossierDocument) => (
        <Space>
          <Tooltip title="Tải tệp về máy">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined className="text-blue-600" />}
              href={`/api/documents/${record.id}/download`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Xem trực tiếp trong tab mới">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined className="text-emerald-600" />}
              onClick={() => window.open(`/api/documents/${record.id}/download`, '_blank')}
            />
          </Tooltip>
          {!readOnly && (
            <Popconfirm
              title="Xác nhận xóa tài liệu này khỏi bộ hồ sơ?"
              onConfirm={() => handleDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Thẻ trạng thái bộ hồ sơ */}
      <Card className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-amber-50/40 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderOpenOutlined className="text-amber-600 text-xl" />
              <Title level={5} className="!mb-0 !text-slate-800">
                Bộ Hồ Sơ Pháp Lý & Kế Hoạch Đoàn Kiểm Toán (Audit Dossier)
              </Title>
              {isFullDossier ? (
                <Tag color="success" className="font-bold flex items-center gap-1">
                  <CheckCircleOutlined /> Đầy đủ 4/4 tài liệu bắt buộc
                </Tag>
              ) : (
                <Tag color="warning" className="font-bold flex items-center gap-1">
                  <ExclamationCircleOutlined /> Còn thiếu {requiredTypes.length - completedRequired.length}/4 tài liệu bắt buộc
                </Tag>
              )}
            </div>
            <Text type="secondary" className="text-xs block">
              Lưu trữ tập trung và đầy đủ theo quy trình kiểm toán ngân hàng: Quyết định thành lập đoàn, Tờ trình, Kế hoạch chi tiết MB01A/MB02A và Kế hoạch chọn mẫu ISA 530.
            </Text>
          </div>

          <div className="w-full md:w-56 text-right">
            <div className="text-xs font-semibold text-slate-600 mb-1">
              Độ hoàn thiện bộ hồ sơ: {completedRequired.length}/{requiredTypes.length} ({completionRate}%)
            </div>
            <Progress
              percent={completionRate}
              size="small"
              status={isFullDossier ? 'success' : 'active'}
              strokeColor={isFullDossier ? '#52c41a' : '#fa8c16'}
            />
          </div>
        </div>
      </Card>

      {/* 4 Nút Tải Nhanh cho 4 Hạng mục Bắt buộc */}
      {!readOnly && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {requiredTypes.map(type => {
            const meta = DOSSIER_TYPE_MAP[type];
            const existing = documents.filter(d => d.documentType === type);
            const isUploaded = existing.length > 0;

            return (
              <Card
                key={type}
                size="small"
                className={`rounded-xl border transition-all ${
                  isUploaded
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-dashed border-amber-300 bg-amber-50/20 hover:border-amber-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                      {meta.icon}
                      <span className="truncate">{meta.label.split('. ')[1] || meta.label}</span>
                    </div>
                    {isUploaded ? (
                      <Tag color="success" className="text-[10px] px-1 py-0 mr-0">
                        ✓ Đã có ({existing.length})
                      </Tag>
                    ) : (
                      <Tag color="error" className="text-[10px] px-1 py-0 mr-0">
                        Chưa có
                      </Tag>
                    )}
                  </div>

                  {isUploaded ? (
                    <div className="text-xs text-slate-600 truncate py-1">
                      📄 {existing[0].originalName}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      Chưa tải lên tệp đính kèm
                    </div>
                  )}

                  <Upload
                    beforeUpload={file => handleUpload(file, type)}
                    showUploadList={false}
                    disabled={uploadingType === type}
                  >
                    <Button
                      size="small"
                      block
                      icon={<UploadOutlined />}
                      loading={uploadingType === type}
                      className={`text-xs font-semibold rounded-lg ${
                        isUploaded
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          : 'bg-amber-600 hover:bg-amber-700 text-white border-none'
                      }`}
                    >
                      {isUploaded ? 'Tải tệp thay thế' : 'Tải lên ngay'}
                    </Button>
                  </Upload>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bảng Danh sách Tệp trong Bộ hồ sơ */}
      <Card
        size="small"
        className="rounded-xl border border-slate-200 shadow-sm"
        title={
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-sm">
              📋 Danh sách tài liệu trong Bộ hồ sơ ({documents.length} tệp)
            </span>
            {!readOnly && (
              <Upload
                beforeUpload={file => handleUpload(file, 'OTHER')}
                showUploadList={false}
                disabled={uploadingType === 'OTHER'}
              >
                <Button
                  size="small"
                  icon={<PaperClipOutlined />}
                  loading={uploadingType === 'OTHER'}
                  className="rounded-lg text-xs font-semibold"
                >
                  Đính kèm tài liệu khác
                </Button>
              </Upload>
            )}
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          pagination={documents.length > 5 ? { pageSize: 5 } : false}
          size="small"
          loading={loading}
          locale={{
            emptyText: (
              <div className="py-6 text-center text-slate-400">
                <InboxOutlined style={{ fontSize: 32 }} />
                <p className="mt-2 text-xs">Chưa có tài liệu nào được tải lên cho đoàn kiểm toán này.</p>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default EngagementDossierManager;
