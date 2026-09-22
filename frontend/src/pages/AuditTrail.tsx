import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Card, Typography, Tag, Select, Button, Space, Input, Badge, Tooltip, message, Modal, Tabs
} from 'antd';
import {
  AuditOutlined, SearchOutlined, ReloadOutlined,
  PlusCircleOutlined, EditOutlined, DeleteOutlined, WarningOutlined,
  LockOutlined, EyeOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;
const { Option } = Select;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <PlusCircleOutlined />,
  UPDATE: <EditOutlined />,
  DELETE: <DeleteOutlined />,
};

const AuditTrailPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterResource, setFilterResource] = useState<string>('');
  const [isCleanupModalVisible, setIsCleanupModalVisible] = useState(false);
  const [cleanupMonths, setCleanupMonths] = useState<number>(6);
  const [activeTab, setActiveTab] = useState('audit');

  const resourceOptions = [
    'users', 'roles', 'departments', 'audit-universe', 'risk-criteria',
    'risk-assessments', 'audit-plans', 'working-papers', 'audit-findings',
    'audit-reports', 'recommendations', 'evidences',
  ];

  const logColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      ...getColumnSearchProps<any>('createdAt', 'Thời gian'),
      sorter: getColumnSorter<any>('createdAt', 'date'),
      render: (date: string) => (
        <Text className="text-xs text-gray-500">
          {dayjs(date).format('DD/MM/YYYY HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      ...getColumnSelectFilterProps<any>('action', Object.entries(ACTION_LABELS).map(([k, v]) => ({ text: v, value: k }))),
      sorter: getColumnSorter<any>('action', 'string'),
      render: (action: string) => (
        <Tag color={ACTION_COLORS[action]} icon={ACTION_ICONS[action]}>
          {ACTION_LABELS[action] || action}
        </Tag>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'resource',
      key: 'resource',
      width: 160,
      ...getColumnSelectFilterProps<any>('resource', undefined, logs, (r) => r.resource || ''),
      sorter: getColumnSorter<any>('resource', 'string'),
      render: (r: string) => <Badge color="geekblue" text={r} />,
    },
    {
      title: 'ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 60,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'username',
      key: 'username',
      width: 140,
      ...getColumnSearchProps<any>('username', 'Người thực hiện'),
      sorter: getColumnSorter<any>('username', 'string'),
      render: (name: string) => <Text strong>{name || '-'}</Text>,
    },
    {
      title: 'Dữ liệu cũ',
      dataIndex: 'oldValue',
      key: 'oldValue',
      ...getColumnSearchProps<any>('oldValue', 'Dữ liệu cũ'),
      render: (val: string) =>
        val ? (
          <Tooltip title={val}>
            <Text className="text-xs text-gray-400 truncate block max-w-xs" ellipsis>
              {val}
            </Text>
          </Tooltip>
        ) : '-',
    },
    {
      title: 'Dữ liệu mới',
      dataIndex: 'newValue',
      key: 'newValue',
      ...getColumnSearchProps<any>('newValue', 'Dữ liệu mới'),
      render: (val: string) =>
        val ? (
          <Tooltip title={val}>
            <Text className="text-xs text-green-600 truncate block max-w-xs" ellipsis>
              {val}
            </Text>
          </Tooltip>
        ) : '-',
    },
  ];

  const alertColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      ...getColumnSearchProps<any>('createdAt', 'Thời gian'),
      sorter: getColumnSorter<any>('createdAt', 'date'),
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Loại vi phạm',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      ...getColumnSelectFilterProps<any>('type', undefined, alerts, (r) => r.type || ''),
      sorter: getColumnSorter<any>('type', 'string'),
      render: (type: string) => <Tag color="error">{type}</Tag>,
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      ...getColumnSelectFilterProps<any>('severity', [
        { text: 'High', value: 'High' },
        { text: 'Medium', value: 'Medium' },
        { text: 'Low', value: 'Low' },
      ]),
      sorter: getColumnSorter<any>('severity', 'string'),
      render: (sev: string) => {
        return <Badge status={sev === 'High' ? 'error' : 'warning'} text={sev} />;
      }
    },
    {
      title: 'Người dùng',
      dataIndex: 'username',
      key: 'username',
      width: 140,
      ...getColumnSearchProps<any>('username', 'Người dùng'),
      sorter: getColumnSorter<any>('username', 'string'),
      render: (name: string) => <Text strong>{name || 'Khách'}</Text>,
    },
    {
      title: 'Tài nguyên & Hành động',
      key: 'resource',
      ...getColumnSearchProps<any>('resource', 'Tài nguyên', (r) => `${r.action || ''} ${r.resource || ''} ${r.ipAddress || ''}`),
      render: (_: any, record: any) => (
        <Space orientation="vertical" size={0}>
          <Text style={{ fontSize: '12px' }}><Badge status="default" /> {record.action} {record.resource}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>IP: {record.ipAddress}</Text>
        </Space>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ...getColumnSearchProps<any>('description', 'Mô tả'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isResolved',
      key: 'isResolved',
      width: 120,
      ...getColumnSelectFilterProps<any>('isResolved', [
        { text: 'Đã xử lý', value: true },
        { text: 'Chưa xử lý', value: false },
      ]),
      render: (res: boolean) => (
        res ? <Tag color="success" icon={<CheckCircleOutlined />}>Đã xử lý</Tag> 
            : <Tag color="warning" icon={<WarningOutlined />}>Chưa xử lý</Tag>
      )
    },
  ];

  const fetchData = async (currentPage = page, currentSize = pageSize) => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const params: any = {
          page: currentPage,
          limit: currentSize,
        };
        if (filterResource) params.resource = filterResource;
        if (searchKeyword.trim()) params.search = searchKeyword.trim();
        const res = await api.get('/audit-trail', { params });
        if (res.data && Array.isArray(res.data.data)) {
          setLogs(res.data.data);
          setTotalLogs(res.data.total || 0);
        } else if (Array.isArray(res.data)) {
          setLogs(res.data);
          setTotalLogs(res.data.length);
        } else {
          setLogs([]);
          setTotalLogs(0);
        }
      } else {
        const res = await api.get('/audit-trail/security-alerts');
        setAlerts(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      message.error('Lỗi tải dữ liệu — bạn có thể chưa có quyền Admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterResource, activeTab, searchKeyword]);

  const handleCleanup = async () => {
    try {
      const res = await api.delete(`/audit-trail/cleanup?months=${cleanupMonths}`);
      message.success(`Đã xóa ${res.data.deleted} bản ghi cũ hơn ${cleanupMonths} tháng.`);
      setIsCleanupModalVisible(false);
      fetchData(1, pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa nhật ký hệ thống.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-0 flex items-center gap-2">
            <AuditOutlined className="text-blue-600" /> Hệ thống Nhật ký & Bảo mật
          </Title>
          <Text type="secondary">Giám sát hoạt động và cảnh báo truy cập trái phép</Text>
        </div>
        <Space>
          <Button danger icon={<DeleteOutlined />} onClick={() => setIsCleanupModalVisible(true)}>
            Dọn dẹp Log cũ
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(page, pageSize)} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'audit',
            label: <span><AuditOutlined /> Nhật ký hoạt động (Audit Log)</span>,
            children: (
              <>
                <Card variant="borderless" className="shadow-sm mb-4">
                  <Space wrap>
                    <Input.Search
                      placeholder="Tìm theo người dùng, module, dữ liệu..."
                      allowClear
                      onSearch={(val) => {
                        setSearchKeyword(val);
                        setPage(1);
                      }}
                      style={{ width: 280 }}
                    />
                    <Text>Lọc theo module:</Text>
                    <Select
                      allowClear
                      placeholder="Tất cả modules"
                      style={{ width: 200 }}
                      value={filterResource || undefined}
                      onChange={(val) => {
                        setFilterResource(val || '');
                        setPage(1);
                      }}
                    >
                      {resourceOptions.map(r => (
                        <Option key={r} value={r}>{r}</Option>
                      ))}
                    </Select>
                  </Space>
                </Card>
                <Card variant="borderless" className="shadow-sm">
                  <Table
                    columns={logColumns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      current: page,
                      pageSize: pageSize,
                      total: totalLogs,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / Tổng ${total} nhật ký`,
                      onChange: (newPage, newPageSize) => {
                        setPage(newPage);
                        setPageSize(newPageSize);
                        fetchData(newPage, newPageSize);
                      },
                    }}
                    size="small"
                    scroll={{ x: 1000 }}
                  />
                </Card>
              </>
            )
          },
          {
            key: 'security',
            label: <Badge count={alerts.filter(a => !a.isResolved).length} offset={[10, 0]} size="small">
                     <span><LockOutlined /> Cảnh báo Bảo mật</span>
                   </Badge>,
            children: (
              <Card variant="borderless" className="shadow-sm">
                <Table
                  columns={alertColumns}
                  dataSource={alerts}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                  size="small"
                  scroll={{ x: 1000 }}
                />
              </Card>
            )
          }
        ]}
      />

      <Modal
        title="Dọn dẹp Nhật ký Hệ thống"
        open={isCleanupModalVisible}
        onOk={handleCleanup}
        onCancel={() => setIsCleanupModalVisible(false)}
        okText={t('common.btnExecuteDelete', 'Thực hiện Xóa')}
        cancelText={t('common.btnCancel', 'Hủy')}
        okButtonProps={{ danger: true }}
      >
        <p>Chọn mốc thời gian để xóa các bản ghi <strong>cũ hơn</strong> thời gian này:</p>
        <Select
          value={cleanupMonths}
          onChange={(val) => setCleanupMonths(val)}
          style={{ width: '100%', marginTop: 10 }}
        >
          <Option value={3}>Cũ hơn 3 tháng</Option>
          <Option value={6}>Cũ hơn 6 tháng</Option>
          <Option value={9}>Cũ hơn 9 tháng</Option>
          <Option value={12}>Cũ hơn 1 năm</Option>
          <Option value={36}>Cũ hơn 3 năm</Option>
        </Select>
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded text-sm border border-red-200">
          <WarningOutlined className="mr-2" />
          Hành động này không thể hoàn tác.
        </div>
      </Modal>
    </div>
  );
};

export default AuditTrailPage;

