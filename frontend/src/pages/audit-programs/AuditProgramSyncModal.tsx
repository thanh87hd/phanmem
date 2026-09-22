import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Typography, Upload, Button } from 'antd';
import { CloudUploadOutlined, FileExcelOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface AuditProgramSyncModalProps {
  visible: boolean;
  onCancel: () => void;
  wp: any;
  onImport: (wpId: number, file: File) => void;
}

export const AuditProgramSyncModal: React.FC<AuditProgramSyncModalProps> = ({
  visible,
  onCancel,
  wp,
  onImport,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={
        <>
          <CloudUploadOutlined className="text-amber-500 mr-2" />
          {t('AuditPrograms.syncWorkPapersOffline', 'Đồng bộ Giấy tờ làm việc Ngoại tuyến')}
        </>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <div className="py-4 text-center">
        <FileExcelOutlined className="text-5xl text-green-600 mb-4" />
        <Title level={4}>{t('AuditPrograms.syncExcelV30', 'Đồng bộ Excel v3.0')}</Title>
        <Text className="block mb-4 text-gray-500 text-sm">
          {t('AuditPrograms.selectYourEditedOfflineAuditPrograms', 'Chọn tệp Excel giấy tờ làm việc ngoại tuyến đã chỉnh sửa của')}{' '}
          <strong>{wp?.title}</strong>{' '}
          {t('AuditPrograms.toSyncDirectlyToTheServer', 'để đồng bộ trực tiếp lên máy chủ.')}
        </Text>

        <Upload
          beforeUpload={(file) => {
            if (wp?.id) {
              onImport(wp.id, file as unknown as File);
            }
            return false;
          }}
          showUploadList={false}
          accept=".xlsx"
        >
          <Button type="primary" size="large" icon={<CloudUploadOutlined />}>
            {t('AuditPrograms.selectAndSyncNow', 'Chọn và Đồng bộ Ngay')}
          </Button>
        </Upload>

        <Text className="block mt-4 text-xs text-red-500 font-semibold">
          {t(
            'AuditPrograms.noteKeepTheTitleLineAnd',
            '⚠️ Lưu ý: Giữ nguyên dòng tiêu đề và mã ID của tệp Excel để tránh sai lệch dữ liệu.',
          )}
        </Text>
      </div>
    </Modal>
  );
};
export default AuditProgramSyncModal;
