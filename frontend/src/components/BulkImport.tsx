import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Upload, message, Table, Tag, Space, Typography } from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

interface BulkImportProps {
  module: string;
  onSuccess: () => void;
  templateData: any[];
  fileName: string;
}

const BulkImport: React.FC<BulkImportProps> = ({ module, onSuccess, templateData, fileName }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const downloadTemplate = async () => {
    try {
      const response = await api.post('/import/export-template', { templateData }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      message.error('Vui lòng chọn file!');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await api.post(`/import/${module}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data);
      message.success(`Đã xử lý xong: ${response.data.success} thành công, ${response.data.errors.length} lỗi.`);
      if (response.data.success > 0) {
        onSuccess();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi upload file');
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    { title: 'Dòng', dataIndex: 'item', key: 'item', render: (item: any) => JSON.stringify(item) },
    { title: 'Lỗi', dataIndex: 'message', key: 'message', render: (msg: string) => <Text type="danger">{msg}</Text> },
  ];

  return (
    <>
      <Button icon={<FileExcelOutlined />} onClick={() => setIsVisible(true)}>
        Nhập từ Excel
      </Button>

      <Modal
        title={`Nhập dữ liệu ${fileName} từ Excel`}
        open={isVisible}
        onCancel={() => {
          setIsVisible(false);
          setResults(null);
          setFile(null);
        }}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Tải File Mẫu
          </Button>,
          <Button key="upload" type="primary" icon={<UploadOutlined />} loading={uploading} onClick={handleUpload}>
            Bắt đầu Nhập
          </Button>,
        ]}
        width={700}
      >
        <div className="mb-4">
          <Upload
            beforeUpload={(file) => {
              setFile(file);
              return false;
            }}
            maxCount={1}
            fileList={file ? [file] : []}
          >
            <Button icon={<UploadOutlined />}>{t('common.btnChooseExcel', 'Chọn File Excel (.xlsx, .xls)')}</Button>
          </Upload>
        </div>

        {results && (
          <div className="mt-4">
            <div className="flex gap-4 mb-4">
              <Tag color="green">Thành công: {results.success}</Tag>
              <Tag color="red">Thất bại: {results.errors.length}</Tag>
            </div>
            {results.errors.length > 0 && (
              <Table 
                size="small" 
                dataSource={results.errors} 
                columns={columns} 
                rowKey={(record, index) => index!}
                pagination={{ pageSize: 5 }}
              />
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default BulkImport;
