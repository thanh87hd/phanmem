import React, { useState } from 'react';
import { Modal, Button, Space, Alert, Select, Table, message } from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

export interface UnassignedSamplesModalProps {
  visible: boolean;
  unassignedSamples: any[];
  teamMembersList: { userId: number; fullName: string; role: string }[];
  auditors: any[];
  onClose: () => void;
  onAssignSampleAuditor: (sampleId: number, auditorId: number | null) => Promise<void>;
  onBulkAssignSuccess: () => void;
}

export const UnassignedSamplesModal: React.FC<UnassignedSamplesModalProps> = ({
  visible,
  unassignedSamples,
  teamMembersList,
  auditors,
  onClose,
  onAssignSampleAuditor,
  onBulkAssignSuccess,
}) => {
  const [selectedUnassignedRowKeys, setSelectedUnassignedRowKeys] = useState<React.Key[]>([]);
  const [bulkTargetAuditorId, setBulkTargetAuditorId] = useState<number | null>(null);

  const handleBulkAssign = async () => {
    if (!bulkTargetAuditorId || selectedUnassignedRowKeys.length === 0) {
      message.warning('Vui lòng chọn KTV và ít nhất một mẫu cần phân công');
      return;
    }
    const u = auditors.find((item: any) => item.id === bulkTargetAuditorId);
    try {
      await api.post('/audit-samples/bulk-assign', {
        sampleIds: selectedUnassignedRowKeys,
        assignedAuditorId: bulkTargetAuditorId,
        assignedAuditorName: u ? (u.fullName || u.username) : '',
      });
      message.success(`Đã phân công ${selectedUnassignedRowKeys.length} mẫu cho ${u?.fullName || u?.username}`);
      setSelectedUnassignedRowKeys([]);
      onClose();
      onBulkAssignSuccess();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi phân công hàng loạt mẫu');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserSwitchOutlined className="text-amber-600" />
          <span>Phân Bổ {unassignedSamples.length} Mẫu Chưa Được Phân Công</span>
        </Space>
      }
      open={visible}
      onCancel={() => {
        onClose();
        setSelectedUnassignedRowKeys([]);
      }}
      width={950}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      <Alert
        message="Các mẫu dưới đây hiện chưa được chỉ định KTV phụ trách (hoặc tên KTV trong file import không trùng khớp với danh sách nhân sự đoàn). Bạn có thể phân công trực tiếp từng dòng hoặc chọn nhiều dòng để gán hàng loạt."
        type="info"
        showIcon
        className="mb-3 text-xs"
      />

      {/* Bulk Assign Toolbar */}
      <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">
            Đã chọn: <strong className="text-blue-600">{selectedUnassignedRowKeys.length}</strong> mẫu
          </span>
        </div>
        <Space>
          <Select
            style={{ minWidth: 240 }}
            placeholder="Chọn KTV trong đoàn để gán..."
            value={bulkTargetAuditorId || undefined}
            onChange={setBulkTargetAuditorId}
            showSearch
            optionFilterProp="children"
          >
            <Select.OptGroup label="👥 Nhân sự Đoàn kiểm toán">
              {teamMembersList.map((m) => (
                <Option key={`bulk-${m.userId}`} value={m.userId}>
                  {m.fullName} ({m.role})
                </Option>
              ))}
            </Select.OptGroup>
            <Select.OptGroup label="👤 KTV khác">
              {auditors
                .filter((u) => !teamMembersList.some((m) => m.userId === u.id))
                .map((u: any) => (
                  <Option key={`bulk-sys-${u.id}`} value={u.id}>
                    {u.fullName || u.username} ({u.role || 'KTV'})
                  </Option>
                ))}
            </Select.OptGroup>
          </Select>
          <Button
            type="primary"
            disabled={selectedUnassignedRowKeys.length === 0 || !bulkTargetAuditorId}
            onClick={handleBulkAssign}
          >
            Áp dụng phân công
          </Button>
        </Space>
      </div>

      {/* Table of Unassigned Samples */}
      <Table
        dataSource={unassignedSamples}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 8 }}
        rowSelection={{
          selectedRowKeys: selectedUnassignedRowKeys,
          onChange: setSelectedUnassignedRowKeys,
        }}
        columns={[
          {
            title: 'Tập mẫu',
            dataIndex: 'batchName',
            key: 'batchName',
            width: 140,
            render: (t: string) => <span className="font-semibold text-xs text-blue-700">{t}</span>,
          },
          {
            title: 'Mã Mẫu / CIF',
            dataIndex: 'cifOrAccount',
            key: 'cifOrAccount',
            width: 120,
          },
          {
            title: 'Khách hàng / Nghiệp vụ',
            dataIndex: 'customerName',
            key: 'customerName',
          },
          {
            title: 'Chi nhánh',
            dataIndex: 'branchCode',
            key: 'branchCode',
            width: 100,
          },
          {
            title: 'Quy mô (VND)',
            dataIndex: 'amount',
            key: 'amount',
            width: 130,
            render: (v: number) => (v ? Number(v).toLocaleString() : '-'),
          },
          {
            title: 'Lý do chưa khớp',
            key: 'reason',
            width: 180,
            render: (_: any, r: any) => (
              <div>
                <span className="text-xs text-amber-700">{r.reason}</span>
                {r.rawAuditorName && r.rawAuditorName !== '(Để trống)' && (
                  <div className="text-[11px] text-gray-400">File ghi: &quot;{r.rawAuditorName}&quot;</div>
                )}
              </div>
            ),
          },
          {
            title: 'Phân công ngay',
            key: 'action',
            width: 170,
            render: (_: any, r: any) => (
              <Select
                size="small"
                className="w-full"
                placeholder="Gán KTV..."
                showSearch
                optionFilterProp="children"
                onChange={async (val) => {
                  await onAssignSampleAuditor(r.id, val);
                }}
              >
                {teamMembersList.map((m) => (
                  <Option key={`row-assign-${m.userId}`} value={m.userId}>
                    {m.fullName}
                  </Option>
                ))}
              </Select>
            ),
          },
        ]}
      />
    </Modal>
  );
};
