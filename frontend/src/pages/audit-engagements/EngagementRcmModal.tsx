import React from 'react';
import { Modal, Table } from 'antd';
import { useTranslation } from 'react-i18next';

interface EngagementRcmModalProps {
  open: boolean;
  rcmList: any[];
  onCancel: () => void;
  onOk: () => void;
  onSelectionChange: (selectedRows: any[]) => void;
}

export const EngagementRcmModal: React.FC<EngagementRcmModalProps> = ({
  open,
  rcmList,
  onCancel,
  onOk,
  onSelectionChange,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title="Thư viện Rủi ro/Kiểm soát (RCM)"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={t('common.btnImportToProgram', 'Nhập vào Chương trình')}
      cancelText={t('common.btnCancel', 'Hủy')}
      width={1000}
    >
      <Table
        rowSelection={{
          type: 'checkbox',
          onChange: (_keys: React.Key[], selectedRows: any[]) => {
            onSelectionChange(selectedRows);
          },
        }}
        columns={[
          {
            title: 'Quy trình',
            dataIndex: 'legacyProcessName',
            key: 'legacyProcessName',
            width: 200,
            ellipsis: true,
            render: (text: string, record: any) => text || record.processName || '-',
          },
          {
            title: 'Tên Rủi ro',
            dataIndex: 'riskName',
            key: 'riskName',
            width: 220,
            ellipsis: true,
          },
          {
            title: 'Mô tả',
            dataIndex: 'riskDescription',
            key: 'riskDescription',
            width: 280,
            ellipsis: true,
          },
          {
            title: 'Thủ tục dự kiến',
            dataIndex: 'testProcedure',
            key: 'testProcedure',
            width: 260,
            ellipsis: true,
          },
        ]}
        dataSource={rcmList}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        scroll={{ x: 960 }}
      />
    </Modal>
  );
};
