import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Modal, Tag, Input,
  message, Tooltip, Badge, Empty, Alert
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  KeyOutlined, ExclamationCircleOutlined, ReloadOutlined,
  UserOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import { filterRecursive } from '../utils/excelExport';

const { Title, Text } = Typography;

interface PasswordChangeRequest {
  id: number;
  userId: number;
  username: string;
  reason: string;
  status: string;
  adminId?: number;
  adminUsername?: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

const PasswordChangeRequests: React.FC = () => {
  const { t } = useTranslation();

  const [data, setData] = useState<PasswordChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('pending');
  const [searchText, setSearchText] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/auth/password-change-requests${filter ? `?status=${filter}` : ''}`);
      setData(res.data || []);
    } catch {
      message.error(t('passwordChangeRequests.messages.loadError', 'Không thể tải danh sách yêu cầu'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleApprove = (record: PasswordChangeRequest) => {
    Modal.confirm({
      title: t('passwordChangeRequests.approveConfirmTitle', 'Phê duyệt yêu cầu đổi mật khẩu'),
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      content: (
        <div>
          <p>Phê duyệt yêu cầu từ <strong>{record.username}</strong>?</p>
          <p style={{ color: '#666', fontSize: 12 }}>
            {t('passwordChangeRequests.approveConfirmSubtext', 'Hệ thống sẽ tự động tạo mật khẩu tạm thời và buộc người dùng đổi mật khẩu khi đăng nhập.')}
          </p>
        </div>
      ),
      okText: t('auditCommitteePortal.table.btnApprove', 'Phê duyệt'),
      cancelText: t('findingKB.modal.cancelText', 'Hủy'),
      onOk: async () => {
        try {
          const res = await api.post('/auth/approve-password-change', {
            requestId: record.id,
          });
          setTargetUsername(record.username);
          setGeneratedPassword(res.data.temporaryPassword);
          setShowPasswordModal(true);
          message.success(t('passwordChangeRequests.messages.approveSuccess', 'Đã phê duyệt yêu cầu thành công'));
          fetchData();
        } catch (err: any) {
          message.error(err?.response?.data?.message || t('passwordChangeRequests.messages.approveError', 'Phê duyệt thất bại'));
        }
      },
    });
  };

  const handleReject = (record: PasswordChangeRequest) => {
    Modal.confirm({
      title: t('passwordChangeRequests.rejectConfirmTitle', 'Từ chối yêu cầu'),
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: `Từ chối yêu cầu đổi mật khẩu của "${record.username}"?`,
      okText: t('workingPapers.status.Rejected', 'Từ chối'),
      okType: 'danger',
      cancelText: t('findingKB.modal.cancelText', 'Hủy'),
      onOk: async () => {
        try {
          await api.post('/auth/reject-password-change', {
            requestId: record.id,
            adminNote: t('passwordChangeRequests.rejectedByAdmin', 'Từ chối bởi Admin'),
          });
          message.success(t('passwordChangeRequests.messages.rejectSuccess', 'Đã từ chối yêu cầu'));
          fetchData();
        } catch (err: any) {
          message.error(err?.response?.data?.message || t('personnel.operationFailed', 'Thao tác thất bại'));
        }
      },
    });
  };

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'orange', icon: <ClockCircleOutlined />, label: t('passwordChangeRequests.status.pending', 'Đang chờ duyệt') },
    approved: { color: 'green', icon: <CheckCircleOutlined />, label: t('auditCommitteePortal.table.approved', 'Đã phê duyệt') },
    rejected: { color: 'red', icon: <CloseCircleOutlined />, label: t('passwordChangeRequests.tabRejected', 'Đã từ chối') },
  };

  const filteredData = data.filter(item => filterRecursive(item, searchText));

  const columns = [
    {
      title: t('passwordChangeRequests.cols.user', 'Người yêu cầu'),
      key: 'user',
      ...getColumnSearchProps<PasswordChangeRequest>('username', 'Tên người dùng'),
      sorter: getColumnSorter<PasswordChangeRequest>('username', 'string'),
      render: (_: any, record: PasswordChangeRequest) => (
        <Space>
          <UserOutlined style={{ color: '#ea9105' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{record.username}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>ID: {record.userId}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('auditPlan.review.diffReason', 'Lý do'),
      dataIndex: 'reason',
      key: 'reason',
      ...getColumnSearchProps<PasswordChangeRequest>('reason', 'Lý do'),
      render: (text: string) => <Text style={{ fontSize: 13 }}>{text || '—'}</Text>,
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      dataIndex: 'status',
      key: 'status',
      width: 160,
      ...getColumnSelectFilterProps<PasswordChangeRequest>('status', undefined, data),
      render: (status: string) => {
        const config = statusConfig[status] || { color: 'default', icon: null, label: status };
        return (
          <Tag color={config.color} icon={config.icon} style={{ fontSize: 12 }}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: t('passwordChangeRequests.cols.date', 'Ngày yêu cầu'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      defaultSortOrder: 'descend' as const,
      sorter: getColumnSorter<PasswordChangeRequest>('createdAt', 'date'),
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
    },
    {
      title: t('passwordChangeRequests.cols.admin', 'Admin xử lý'),
      key: 'admin',
      width: 150,
      render: (_: any, record: PasswordChangeRequest) => (
        record.adminUsername ? (
          <div>
            <Text style={{ fontSize: 13 }}>{record.adminUsername}</Text>
            {record.processedAt && (
              <div style={{ fontSize: 11, color: '#999' }}>
                {new Date(record.processedAt).toLocaleString('vi-VN')}
              </div>
            )}
          </div>
        ) : <Text type="secondary">—</Text>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 120,
      render: (_: any, record: PasswordChangeRequest) => {
        if (record.status !== 'pending') return null;
        return (
          <Space>
            <Tooltip title={t('auditCommitteePortal.table.btnApprove', 'Phê duyệt')}>
              <Button
                type="text"
                style={{ color: '#52c41a' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
              />
            </Tooltip>
            <Tooltip title={t('workingPapers.status.Rejected', 'Từ chối')}>
              <Button
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleReject(record)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const pendingCount = data.filter(d => d.status === 'pending').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <KeyOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            Yêu cầu Đổi mật khẩu
            {pendingCount > 0 && (
              <Badge count={pendingCount} style={{ marginLeft: 12 }} />
            )}
          </Title>
          <Text type="secondary">{t('passwordChangeRequests.subtitle', 'Phê duyệt hoặc từ chối các yêu cầu đổi mật khẩu từ người dùng')}</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Tìm theo tên người dùng, lý do..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button.Group>
            <Button type={filter === 'pending' ? 'primary' : 'default'} onClick={() => setFilter('pending')}>
              {t('passwordChangeRequests.tabPending', 'Đang chờ')}
            </Button>
            <Button type={filter === 'approved' ? 'primary' : 'default'} onClick={() => setFilter('approved')}>
              {t('workingPapers.status.Approved', 'Đã duyệt')}
            </Button>
            <Button type={filter === 'rejected' ? 'primary' : 'default'} onClick={() => setFilter('rejected')}>
              {t('passwordChangeRequests.tabRejected', 'Đã từ chối')}
            </Button>
            <Button type={filter === '' ? 'primary' : 'default'} onClick={() => setFilter('')}>
              {t('auditeePortal.tabs.all', 'Tất cả')}
            </Button>
          </Button.Group>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>{t('auditTrail.btnRefresh', 'Làm mới')}</Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng ${t} yêu cầu` }}
          locale={{ emptyText: <Empty description={t('passwordChangeRequests.emptyLabel', 'Không có yêu cầu nào')} /> }}
        />
      </Card>

      {/* Generated Password Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <span style={{ fontWeight: 700 }}>{t('passwordChangeRequests.modalSuccessTitle', 'Mật khẩu tạm thời đã được tạo')}</span>
          </Space>
        }
        open={showPasswordModal}
        onCancel={() => { setShowPasswordModal(false); setGeneratedPassword(''); }}
        footer={
          <Button type="primary" onClick={() => { setShowPasswordModal(false); setGeneratedPassword(''); }}>
            {t('passwordChangeRequests.btnCopied', 'Đã sao chép xong')}
          </Button>
        }
        width={480}
      >
        <Alert
          message={`Mật khẩu mới cho: ${targetUsername}`}
          description={
            <div>
              <div style={{
                background: '#f6ffed',
                border: '2px dashed #52c41a',
                borderRadius: 8,
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: 20,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: 1,
                marginTop: 8,
                userSelect: 'all',
              }}>
                {generatedPassword}
              </div>
              <p style={{ marginTop: 12, color: '#fa8c16', fontSize: 12 }}>
                ⚠️ Hãy sao chép và gửi mật khẩu này cho người dùng qua kênh an toàn. 
                Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần tiếp theo.
              </p>
            </div>
          }
          type="success"
          showIcon
        />
      </Modal>
    </div>
  );
};

export default PasswordChangeRequests;
