import React from 'react';
import { Table, Button, message } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { AttachmentManager } from '../../components/AttachmentManager';

export interface AppendixItem {
  name: string;
  fileUrl: string;
  type?: string;
}

export interface FindingAppendicesManagerProps {
  appendices: AppendixItem[];
  setAppendices: React.Dispatch<React.SetStateAction<AppendixItem[]>>;
  editingRecordId?: number | null;
}

export const FindingAppendicesManager: React.FC<FindingAppendicesManagerProps> = ({
  appendices,
  setAppendices,
  editingRecordId,
}) => {
  // Khi đang sửa phát hiện đã có ID: Sử dụng AttachmentManager thống nhất theo ADR-0009
  if (editingRecordId) {
    return (
      <AttachmentManager
        ownerType="AuditFinding"
        ownerId={editingRecordId}
        relationType="appendix"
        title="📄 PHỤ LỤC & BẰNG CHỨNG PHÁT HIỆN KIỂM TOÁN"
        canVerify={true}
      />
    );
  }

  // Khi đang tạo mới phát hiện chưa có ID: Tải phụ lục tạm thời và lưu vào state
  const handleAppendixUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('linkedResource', 'audit_finding');
    formData.append('linkedResourceId', '0');
    formData.append('description', 'Phụ lục phát hiện kiểm toán');

    try {
      message.loading({
        content: 'Đang tải lên phụ lục...',
        key: 'finding_upload',
      });
      const response = await api.post('/evidences/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const downloadUrl = `/api/evidences/${response.data.id}/download`;
      const newAppendix: AppendixItem = {
        name: file.name,
        fileUrl: downloadUrl,
        type: file.type || 'unknown',
      };
      setAppendices((prev) => [...prev, newAppendix]);
      message.success({
        content: 'Tải phụ lục thành công!',
        key: 'finding_upload',
      });
    } catch (err) {
      console.error(err);
      message.error({
        content: 'Lỗi khi tải phụ lục lên',
        key: 'finding_upload',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-5">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-gray-700 block text-xs">
          📄 PHỤ LỤC PHÁT HIỆN KIỂM TOÁN (Excel vi phạm, danh sách, hình ảnh...)
        </span>
        <div>
          <input
            type="file"
            id="drawer-finding-appendix-upload-input"
            style={{ display: 'none' }}
            onChange={handleAppendixUpload}
          />
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              document
                .getElementById('drawer-finding-appendix-upload-input')
                ?.click()
            }
          >
            Tải phụ lục lên
          </Button>
        </div>
      </div>
      <Table
        size="small"
        dataSource={appendices}
        rowKey={(record, idx) => record.fileUrl + idx}
        pagination={false}
        scroll={{ x: 450 }}
        columns={[
          {
            title: 'Tên file',
            dataIndex: 'name',
            key: 'name',
            width: 250,
            ellipsis: true,
          },
          {
            title: 'Tải xuống',
            key: 'download',
            width: 110,
            render: (_, r) => (
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => window.open(r.fileUrl)}
              >
                Tải xuống
              </Button>
            ),
          },
          {
            title: '',
            key: 'action',
            width: 70,
            render: (_, r, idx) => (
              <Button
                type="text"
                danger
                size="small"
                onClick={() =>
                  setAppendices((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                Xóa
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
};
