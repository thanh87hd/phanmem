import React from 'react';
import { Table, Button, Tag, Select } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';

const { Option } = Select;

export interface BatchSamplesSubTableProps {
  batchRecord: any;
  auditors: any[];
  teamMembersList: { userId: number; fullName: string; role: string }[];
  onAssignSampleAuditor: (sampleId: number, auditorId: number | null) => Promise<void>;
  onOpenSampleDrawer: (sample: any) => void;
}

export const BatchSamplesSubTable: React.FC<BatchSamplesSubTableProps> = ({
  batchRecord,
  auditors,
  teamMembersList,
  onAssignSampleAuditor,
  onOpenSampleDrawer,
}) => {
  const samples = batchRecord.samples || [];

  if (samples.length === 0) {
    return (
      <div className="py-4 px-6 text-center text-gray-400 bg-slate-50 border border-dashed rounded">
        Chưa có mẫu nào trong tập này. Hãy nhấn &quot;Tự động bốc mẫu&quot; hoặc &quot;Import Excel&quot; để nạp danh sách mẫu.
      </div>
    );
  }

  const sampleColumns = [
    {
      title: 'Mã Mẫu / Tham chiếu',
      dataIndex: 'cifOrAccount',
      key: 'cifOrAccount',
      width: 140,
      render: (text: string, r: any) => (
        <strong className="text-slate-800">
          {text || r.sampleCode || `Mẫu #${r.sequenceNo || r.id}`}
        </strong>
      ),
    },
    {
      title: 'Khách hàng / Nghiệp vụ',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string, r: any) => (
        <div>
          <div className="font-medium text-slate-800">{text || r.sampleData?.customerName || '-'}</div>
          {r.sampleData?.businessProcess && (
            <Tag color="cyan" className="text-[10px]">{r.sampleData.businessProcess}</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Chi nhánh / Đơn vị',
      dataIndex: 'branchCode',
      key: 'branchCode',
      width: 130,
      render: (text: string, r: any) => (
        <span className="text-xs text-slate-600">{r.sampleData?.branchName || text || 'Hội sở'}</span>
      ),
    },
    {
      title: 'Quy mô / Dư nợ (VND)',
      key: 'amount',
      width: 150,
      render: (_: any, r: any) => {
        const val = r.loanAmount || r.sampleData?.outstandingBalance || r.sampleData?.transactionAmount || r.sampleData?.amount;
        return (
          <div>
            <span className="font-semibold text-slate-700">{val ? Number(val).toLocaleString() : '-'}</span>
            {r.debtGroup && <Tag color="orange" className="ml-1 text-[10px]">N{r.debtGroup}</Tag>}
          </div>
        );
      },
    },
    {
      title: 'KTV phụ trách mẫu',
      key: 'assignedAuditor',
      width: 220,
      render: (_: any, sample: any) => {
        const currentAuditorId =
          sample.assignedAuditorId ||
          (sample.assignedAuditorName
            ? auditors.find(
                (u: any) =>
                  (u.fullName || u.username).trim().toLowerCase() ===
                  sample.assignedAuditorName.trim().toLowerCase(),
              )?.id
            : batchRecord.assignedAuditorId);

        return (
          <Select
            size="small"
            className="w-full"
            placeholder="Chưa gán (Kế thừa tập)"
            value={currentAuditorId || undefined}
            allowClear
            showSearch
            optionFilterProp="children"
            onChange={(val) => onAssignSampleAuditor(sample.id, val)}
            onClear={() => onAssignSampleAuditor(sample.id, null)}
          >
            <Select.OptGroup label="👥 Nhân sự Đoàn kiểm toán">
              {teamMembersList.map((m) => (
                <Option key={`sample-m-${m.userId}`} value={m.userId}>
                  <UserOutlined className="mr-1 text-blue-500" />
                  {m.fullName} ({m.role})
                </Option>
              ))}
            </Select.OptGroup>
            <Select.OptGroup label="👤 KTV khác">
              {auditors
                .filter((u) => !teamMembersList.some((m) => m.userId === u.id))
                .map((u: any) => (
                  <Option key={`sample-u-${u.id}`} value={u.id}>
                    {u.fullName || u.username} ({u.role || 'KTV'})
                  </Option>
                ))}
            </Select.OptGroup>
          </Select>
        );
      },
    },
    {
      title: 'Kết quả KSNB',
      dataIndex: 'testResult',
      key: 'testResult',
      width: 110,
      render: (text: string) => {
        if (text === 'PASS') return <Tag color="success">ĐẠT (PASS)</Tag>;
        if (text === 'FAIL') return <Tag color="error">LỖI (FAIL)</Tag>;
        if (text === 'EXCEPTION') return <Tag color="warning">NGOẠI LỆ</Tag>;
        return <Tag color="default">Chưa KT</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_: any, sample: any) => (
        <Button
          size="small"
          type="primary"
          icon={<EditOutlined />}
          onClick={() => onOpenSampleDrawer(sample)}
          className="bg-emerald-600 hover:bg-emerald-500 border-none text-xs"
        >
          Biên bản KT
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-xs text-slate-700">
          📋 Chi tiết {samples.length} mẫu trong tập: <span className="text-blue-600">{batchRecord.batchName}</span>
        </span>
        <span className="text-xs text-gray-500">
          Có thể chọn phân công hoặc đổi KTV trực tiếp trên từng mẫu
        </span>
      </div>
      <Table
        columns={sampleColumns}
        dataSource={samples}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 5, size: 'small' }}
        bordered
      />
    </div>
  );
};
