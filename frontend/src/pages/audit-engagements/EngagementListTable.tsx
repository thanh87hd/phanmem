import React from 'react';
import { Card, Table, Space, Tag, Button } from 'antd';
import {
  FileTextOutlined,
  AuditOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReportExportButton from '../../components/ReportExportButton';
import { hasPermission } from '../../utils/permission';

interface EngagementListTableProps {
  engagements: any[];
  loading: boolean;
  currentUser: any;
  customFieldsDef: any[];
  onSelectEngagement: (engagement: any) => void;
  onEditEngagement: (engagement: any) => void;
  onDeleteEngagement: (id: number) => void;
  onOfficializeClick: (engagement: any) => void;
  users?: any[];
}

export const EngagementListTable: React.FC<EngagementListTableProps> = ({
  engagements,
  loading,
  currentUser,
  customFieldsDef,
  onSelectEngagement,
  onEditEngagement,
  onDeleteEngagement,
  onOfficializeClick,
  users = [],
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const dynamicCols = customFieldsDef
    .filter((f: any) => f.showInTable)
    .map((f: any) => ({
      title: f.label,
      dataIndex: ['customFields', f.name],
      key: `cf_${f.name}`,
      render: (val: any) => {
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Có' : 'Không';
        return val || '-';
      },
    }));

  const engagementColumns = [
    {
      title: 'Tên cuộc KT',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      ellipsis: true,
      render: (text: string) => (
        <span className="font-semibold text-slate-800">{text}</span>
      ),
    },
    ...dynamicCols,
    {
      title: 'Kế hoạch',
      dataIndex: 'planName',
      key: 'planName',
      width: 180,
      ellipsis: true,
      render: (text: string, record: any) =>
        text || record.legacyPlanName || record.plan?.name || record.plan?.title || '-',
    },
    {
      title: 'Trưởng đoàn',
      dataIndex: 'leadAuditor',
      key: 'leadAuditor',
      width: 180,
      render: (text: string, record: any) => {
        const leadUser = (users || []).find((u: any) => String(u.id) === String(record.leadAuditorId));
        const name = text || record.legacyLeadAuditor || record.leadAuditorUser?.fullName || leadUser?.fullName;
        if (!name) return <span className="text-slate-400 italic">Chưa phân công</span>;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-800">{name}</span>
            {record.isExpectedInfo && (
              <Tag color="gold" className="w-fit text-[11px] leading-tight px-1.5 py-0.5 m-0 font-normal">
                Dự kiến
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Đơn vị',
      dataIndex: 'auditedDepartment',
      key: 'auditedDepartment',
      width: 180,
      ellipsis: true,
      render: (text: any, record: any) => {
        const val =
          (typeof text === 'string' ? text : text?.name) ||
          record.legacyAuditedDepartment ||
          record.branchName;
        return val || '-';
      },
    },
    {
      title: 'Loại',
      dataIndex: 'engagementType',
      key: 'engagementType',
      width: 130,
      render: (val: string, record: any) => (
        <Space>
          <Tag color={val === 'Unplanned' ? 'purple' : 'blue'}>
            {val === 'Unplanned'
              ? t('auditEngagements.types.Unplanned', 'Đột xuất')
              : 'Kế hoạch'}
          </Tag>
          {record.isExpectedInfo && <Tag color="orange">Dự kiến</Tag>}
        </Space>
      ),
    },
    {
      title: 'Phòng',
      dataIndex: 'ownerTeam',
      key: 'ownerTeam',
      width: 120,
      render: (team: string) => <Tag color="cyan">{team}</Tag>,
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => <Tag color="blue">{s}</Tag>,
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 330,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space wrap>
          <Button
            type="primary"
            size="small"
            onClick={() => onSelectEngagement(record)}
            className="bg-[#ea9105] hover:bg-[#d07e00] border-none rounded-md font-semibold text-xs px-3 text-white"
          >
            Quản lý
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() =>
              navigate('/working-papers', {
                state: { engagementId: record.id, engagementName: record.name },
              })
            }
            className="rounded-md font-semibold text-xs px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            W/P
          </Button>
          <Button
            size="small"
            icon={<AuditOutlined />}
            onClick={() =>
              navigate('/audit-reports', {
                state: { engagementId: record.id, engagementName: record.name },
              })
            }
            className="rounded-md font-semibold text-xs px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            Báo cáo
          </Button>
          {!record.isOfficialized ? (
            <Button
              size="small"
              onClick={() => onOfficializeClick(record)}
              style={{
                backgroundColor: '#52c41a',
                color: '#fff',
                borderColor: '#52c41a',
              }}
              className="rounded-md font-semibold text-xs px-2"
            >
              Chính thức hóa
            </Button>
          ) : (
            <Tag color="green">Đã chốt đoàn</Tag>
          )}
          <ReportExportButton
            recordId={record.id}
            entityType="plan"
            showExcelOption={true}
            engagementId={record.id}
            label="Xuất KHKT"
          />
          {hasPermission(currentUser, 'plan:create') && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEditEngagement(record)}
            />
          )}
          {hasPermission(currentUser, 'plan:approve') && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteEngagement(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      variant="borderless"
      className="shadow-sm rounded-xl overflow-hidden border border-slate-200 mt-4"
    >
      <Table
        columns={engagementColumns as any}
        dataSource={engagements}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1440 }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </Card>
  );
};
