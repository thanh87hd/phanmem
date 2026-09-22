import React from 'react';
import { Card, Button, Tag, Row, Col, Table, Tooltip, Progress, Alert } from 'antd';
import { TeamOutlined, UserSwitchOutlined, UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export interface TeamMemberItem {
  userId: number;
  fullName: string;
  role: string;
  username?: string;
}

export interface MemberWorkloadItem extends TeamMemberItem {
  batchCount: number;
  sampleCount: number;
  testedCount: number;
  passCount: number;
  failCount: number;
  totalAmount: number;
  progressPct: number;
}

export interface SamplingWorkloadCardProps {
  teamMembersList: TeamMemberItem[];
  memberWorkload: MemberWorkloadItem[];
  unassignedSamples: any[];
  totalSamplesCount: number;
  assignedSamplesCount: number;
  onOpenUnassignedModal: () => void;
}

export const SamplingWorkloadCard: React.FC<SamplingWorkloadCardProps> = ({
  teamMembersList,
  memberWorkload,
  unassignedSamples,
  totalSamplesCount,
  assignedSamplesCount,
  onOpenUnassignedModal,
}) => {
  return (
    <Card
      size="small"
      className="mb-4 bg-gradient-to-r from-blue-50/40 via-indigo-50/30 to-slate-50 border-blue-100 shadow-sm"
      title={
        <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
          <TeamOutlined className="text-blue-600" />
          <span>BẢNG TỔNG HỢP PHÂN CÔNG & TẢI TRỌNG CÔNG VIỆC NHÂN SỰ ĐOÀN KIỂM TOÁN</span>
        </div>
      }
      extra={
        unassignedSamples.length > 0 ? (
          <Button
            type="primary"
            danger
            size="small"
            icon={<UserSwitchOutlined />}
            onClick={onOpenUnassignedModal}
          >
            Phân bổ {unassignedSamples.length} mẫu chưa gán
          </Button>
        ) : (
          <Tag color="success">✅ 100% mẫu đã được phân công</Tag>
        )
      }
    >
      {/* Metric Overview Row */}
      <Row gutter={16} className="mb-3">
        <Col span={6}>
          <div className="bg-white p-2.5 rounded border border-blue-100 text-center">
            <div className="text-xs text-gray-500">Số nhân sự đoàn</div>
            <div className="text-lg font-bold text-blue-700">{teamMembersList.length} thành viên</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="bg-white p-2.5 rounded border border-slate-200 text-center">
            <div className="text-xs text-gray-500">Tổng mẫu kiểm toán</div>
            <div className="text-lg font-bold text-slate-800">{totalSamplesCount} mẫu</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="bg-white p-2.5 rounded border border-green-200 text-center">
            <div className="text-xs text-green-600 font-medium">Đã phân công phụ trách</div>
            <div className="text-lg font-bold text-green-700">
              {assignedSamplesCount}{' '}
              <span className="text-xs font-normal text-green-600">
                ({totalSamplesCount > 0 ? Math.round((assignedSamplesCount / totalSamplesCount) * 100) : 0}%)
              </span>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div
            className={`p-2.5 rounded border text-center ${
              unassignedSamples.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`text-xs ${unassignedSamples.length > 0 ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
              Chưa phân công cho ai
            </div>
            <div className={`text-lg font-bold ${unassignedSamples.length > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
              {unassignedSamples.length} mẫu
            </div>
          </div>
        </Col>
      </Row>

      {/* Member Allocation Table */}
      <Table
        dataSource={memberWorkload}
        rowKey="userId"
        size="small"
        pagination={false}
        bordered
        columns={[
          {
            title: 'Thành viên đoàn',
            key: 'member',
            render: (_: any, r: MemberWorkloadItem) => (
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserOutlined className="text-blue-500" />
                  <span>{r.fullName}</span>
                </div>
                {r.username && <span className="text-xs text-gray-400">@{r.username}</span>}
              </div>
            ),
          },
          {
            title: 'Nhiệm vụ trong đoàn',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => {
              let color = 'blue';
              if (role.includes('Trưởng đoàn')) color = 'gold';
              else if (role.includes('Phó')) color = 'cyan';
              else if (role.includes('Tín dụng')) color = 'purple';
              return <Tag color={color}>{role}</Tag>;
            },
          },
          {
            title: 'Số tập mẫu',
            dataIndex: 'batchCount',
            key: 'batchCount',
            width: 90,
            align: 'center',
            render: (v: number) => <Tag color={v > 0 ? 'geekblue' : 'default'}>{v} tập</Tag>,
          },
          {
            title: 'Số lượng mẫu phụ trách',
            key: 'samples',
            width: 170,
            render: (_: any, r: MemberWorkloadItem) => {
              const pct = totalSamplesCount > 0 ? Math.round((r.sampleCount / totalSamplesCount) * 100) : 0;
              return (
                <div>
                  <span className="font-bold text-blue-600 text-sm">{r.sampleCount}</span>
                  <span className="text-xs text-gray-400 ml-1">mẫu ({pct}%)</span>
                </div>
              );
            },
          },
          {
            title: 'Quy mô phụ trách (VND)',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 170,
            render: (v: number) => (
              <span className="font-medium text-slate-700">{v ? Number(v).toLocaleString() : '0'}</span>
            ),
          },
          {
            title: 'Tiến độ kiểm tra',
            key: 'progress',
            width: 180,
            render: (_: any, r: MemberWorkloadItem) => (
              <Tooltip title={`${r.testedCount}/${r.sampleCount} đã kiểm tra (${r.passCount} Pass, ${r.failCount} Fail)`}>
                <Progress percent={r.progressPct} size="small" strokeColor={r.progressPct === 100 ? '#52c41a' : '#1890ff'} />
              </Tooltip>
            ),
          },
          {
            title: 'Trạng thái',
            key: 'status',
            width: 120,
            render: (_: any, r: MemberWorkloadItem) => {
              if (r.sampleCount === 0) return <Tag color="default">Chưa gán mẫu</Tag>;
              if (r.progressPct === 100) return <Tag color="success">Hoàn thành</Tag>;
              if (r.progressPct > 0) return <Tag color="processing">Đang thực hiện</Tag>;
              return <Tag color="warning">Chưa bắt đầu</Tag>;
            },
          },
        ]}
      />

      {/* Warning if unassigned samples exist */}
      {unassignedSamples.length > 0 && (
        <Alert
          message={
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>
                <ExclamationCircleOutlined className="text-amber-500 mr-1.5" />
                Có <strong>{unassignedSamples.length}</strong> mẫu kiểm toán chưa được phân công cho nhân sự nào (do file upload để trống KTV hoặc tên KTV chưa khớp thành viên đoàn).
              </span>
              <Button
                size="small"
                type="primary"
                className="bg-amber-600 hover:bg-amber-500 border-none text-xs"
                onClick={onOpenUnassignedModal}
              >
                Xem danh sách & Phân bổ ngay
              </Button>
            </div>
          }
          type="warning"
          showIcon={false}
          className="mt-3 text-xs"
        />
      )}
    </Card>
  );
};
