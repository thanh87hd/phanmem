import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Typography, Card, Modal, Form, Input, Tag,
  Select, message, Tooltip, Avatar, Rate, Divider, List, Row, Col, Alert,
  Tabs, Drawer, Descriptions, Badge
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined,
  TrophyOutlined, StarOutlined, DownloadOutlined, CloseOutlined,
  LockOutlined, UnlockOutlined, KeyOutlined, ExclamationCircleOutlined,
  ThunderboltOutlined, SwapOutlined, HistoryOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';
import BulkImport from '../components/BulkImport';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import { useTranslation } from 'react-i18next';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;
const { Option } = Select;

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  jobTitle?: string;
  role?: { id: number; name: string };
  employeeId?: string;
  workplace?: string;
  startDate?: string;
  birthDate?: string;
  landlinePhone?: string;
  priorDepartments?: string;
  coolingOffEndDate?: string;
  isActive?: boolean;
  status?: 'Active' | 'Resigned' | 'Transferred' | 'Suspended';
  resignationDate?: string;
  transferDate?: string;
  transferDestination?: string;
  statusReason?: string;
  statusUpdatedAt?: string;
  lockedUntil?: string;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lastLoginAt?: string;
}

interface Role {
  id: number;
  name: string;
}

const Personnel: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // Danh mục Chức danh Chuyên môn chuẩn KTNB Ngân hàng (Professional Ranks / Job Titles)
  const jobTitleSelectOptions = React.useMemo(() => {
    const titles = [
      'Trưởng Ban Kiểm toán Nội bộ (CAE)',
      'Phó Trưởng Ban KTNB',
      'Giám đốc Khối Kiểm toán Nội bộ',
      'Phó Giám đốc Khối KTNB',
      'Trưởng phòng KTNB Hội sở',
      'Phó phòng KTNB Hội sở',
      'Trưởng phòng KTNB ĐVKD',
      'Phó phòng KTNB ĐVKD',
      'Chuyên gia KTNB',
      'Kiểm toán viên cao cấp',
      'Kiểm toán viên chính',
      'Kiểm toán viên',
      'Trợ lý KTV',
      'Nhân sự Tổng hợp',
      'Nhân sự Khắc phục',
      'Trưởng Ban kiểm soát',
      'Phó Trưởng Ban kiểm soát',
      'Thành viên Ban kiểm soát',
    ];
    return titles.map(title => ({
      value: title,
      label: title,
    }));
  }, []);

  // Skills Matrix State
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compForm] = Form.useForm();

  // Password Management State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetAutoGenerate, setResetAutoGenerate] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const fetchCompetencies = async (userId: number) => {
    setCompLoading(true);
    try {
      const res = await api.get(`/users/${userId}/competencies`);
      setCompetencies(res.data);
    } catch {
      message.error('Không thể tải ma trận năng lực');
    } finally {
      setCompLoading(false);
    }
  };

  const openCompetencyModal = (record: User) => {
    setSelectedUser(record);
    setIsCompModalOpen(true);
    fetchCompetencies(record.id);
    compForm.resetFields();
  };

  const handleSaveCompetency = async () => {
    if (!selectedUser) return;
    try {
      const values = await compForm.validateFields();
      await api.post(`/users/${selectedUser.id}/competencies`, values);
      message.success('Cập nhật năng lực thành công!');
      fetchCompetencies(selectedUser.id);
      compForm.resetFields();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Có lỗi xảy ra khi lưu năng lực');
    }
  };

  // Lifecycle Status Modal State
  const [activeTabStatus, setActiveTabStatus] = useState<string>('Active');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTargetUser, setStatusTargetUser] = useState<User | null>(null);
  const [newStatusType, setNewStatusType] = useState<'Resigned' | 'Transferred' | 'Suspended' | 'Active'>('Resigned');
  const [statusForm] = Form.useForm();

  // History Drawer State
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [historyUser, setHistoryUser] = useState<User | null>(null);

  const fetchData = async (statusFilter?: string) => {
    setLoading(true);
    try {
      const currentFilter = statusFilter !== undefined ? statusFilter : activeTabStatus;
      const statusParam = currentFilter === 'ALL' ? 'ALL' : currentFilter;
      const [usersRes, rolesRes] = await Promise.all([
        api.get(`/users?status=${statusParam}&includeInactive=true`),
        api.get('/roles'),
      ]);
      setData(usersRes.data);
      setRoles(rolesRes.data);
    } catch {
      message.error('Không thể tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTabStatus);
  }, [activeTabStatus]);

  const openStatusModal = (record: User, type: 'Resigned' | 'Transferred' | 'Suspended' | 'Active') => {
    setStatusTargetUser(record);
    setNewStatusType(type);
    statusForm.resetFields();
    statusForm.setFieldsValue({
      status: type,
      resignationDate: new Date().toISOString().slice(0, 10),
      transferDate: new Date().toISOString().slice(0, 10),
    });
    setStatusModalVisible(true);
  };

  const handleUpdateStatus = async () => {
    if (!statusTargetUser) return;
    try {
      const values = await statusForm.validateFields();
      await api.patch(`/users/${statusTargetUser.id}/status`, {
        ...values,
        status: newStatusType,
      });
      message.success(`Đã cập nhật trạng thái nhân sự [${statusTargetUser.fullName}] thành công!`);
      setStatusModalVisible(false);
      fetchData(activeTabStatus);
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleQuickRestore = async (record: User) => {
    try {
      await api.post(`/users/${record.id}/restore`);
      message.success(`Đã khôi phục tài khoản nhân sự [${record.fullName}] hoạt động trở lại!`);
      fetchData(activeTabStatus);
    } catch {
      message.error('Khôi phục thất bại');
    }
  };

  const openHistoryDrawer = (record: User) => {
    setHistoryUser(record);
    setHistoryDrawerVisible(true);
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record: User) => {
    setEditingRecord(record);
    const effectiveRoleId = record.role?.id || (record as any).roleId || undefined;

    form.setFieldsValue({
      ...record,
      jobTitle: record.jobTitle || undefined,
      roleId: effectiveRoleId,
      priorDepartments: record.priorDepartments || undefined,
      coolingOffEndDate: record.coolingOffEndDate || undefined,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const formValues = await form.validateFields();
      const values = {
        ...formValues,
        jobTitle: formValues.jobTitle || null,
        roleId: formValues.roleId || null,
        priorDepartments: formValues.priorDepartments || null,
        coolingOffEndDate: formValues.coolingOffEndDate || null,
        customFields: extractCustomFields(formValues),
      };
      if (editingRecord) {
        await api.patch(`/users/${editingRecord.id}`, values);
        message.success('Cập nhật nhân sự thành công!');
      } else {
        await api.post('/users', values);
        message.success('Thêm nhân sự thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return; // form validation error
      const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      message.error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('Đã xóa nhân sự');
      fetchData();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  // ==================== PASSWORD MANAGEMENT HANDLERS ====================

  const openResetModal = (record: User) => {
    setResetTargetUser(record);
    setResetPassword('');
    setGeneratedPassword('');
    setResetAutoGenerate(true);
    setResetModalVisible(true);
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser) return;
    try {
      const payload: any = { targetUserId: resetTargetUser.id };
      if (!resetAutoGenerate && resetPassword) {
        payload.newPassword = resetPassword;
      }
      const res = await api.post('/auth/admin-reset-password', payload);
      setGeneratedPassword(res.data.temporaryPassword);
      message.success(`Đã reset mật khẩu cho ${resetTargetUser.fullName}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Reset mật khẩu thất bại');
    }
  };

  const handleUnlockAccount = async (record: User) => {
    try {
      await api.post('/auth/unlock-account', { targetUserId: record.id });
      message.success(`Đã mở khóa tài khoản: ${record.fullName}`);
      fetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Mở khóa thất bại');
    }
  };

  const handleForceChangePassword = (record: User) => {
    Modal.confirm({
      title: 'Buộc đổi mật khẩu',
      icon: <ExclamationCircleOutlined />,
      content: `Người dùng "${record.fullName}" sẽ phải đổi mật khẩu khi đăng nhập lần tiếp theo.`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.post('/auth/force-change-password', { targetUserId: record.id });
          message.success(`Đã yêu cầu ${record.fullName} đổi mật khẩu`);
          fetchData();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
      },
    });
  };

  const columns = [
    {
      title: t('personnel.cols.empId', 'Mã NV'),
      dataIndex: 'employeeId',
      key: 'employeeId',
      ...getColumnSearchProps<User>('employeeId', 'Mã NV'),
      sorter: getColumnSorter<User>('employeeId', 'string'),
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>{text || '—'}</Text>
    },
    {
      title: t('personnel.cols.name', 'Nhân sự'),
      key: 'name',
      ...getColumnSearchProps<User>('fullName', 'Nhân sự', (r) => `${r.fullName} ${r.username}`),
      sorter: getColumnSorter<User>('fullName', 'string'),
      render: (_: any, record: User) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Avatar
            style={{ backgroundColor: '#d97706', flexShrink: 0 }}
            icon={<UserOutlined />}
          />
          <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{record.fullName}</span>
              {record.coolingOffEndDate && new Date(record.coolingOffEndDate) >= new Date() && (
                <Tooltip title={`Đang trong thời gian cách ly độc lập theo Điều 39 TT13 đến: ${record.coolingOffEndDate} (Đơn vị cũ: ${record.priorDepartments || 'N/A'})`}>
                  <Tag color="volcano" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                    Cách ly độc lập
                  </Tag>
                </Tooltip>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>@{record.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('personnel.cols.jobTitle', 'Chức danh chuyên môn'),
      dataIndex: 'jobTitle',
      key: 'jobTitle',
      ...getColumnSelectFilterProps<User>('jobTitle', undefined, data, (r) => r.jobTitle || 'Chưa cập nhật'),
      sorter: getColumnSorter<User>('jobTitle', 'string', (r) => r.jobTitle || ''),
      render: (text: string) => {
        return text ? (
          <Tag color="cyan" style={{ whiteSpace: 'nowrap' }}>{text}</Tag>
        ) : (
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>—</Text>
        );
      }
    },
    {
      title: t('personnel.cols.workplace', 'Nơi làm việc'),
      dataIndex: 'workplace',
      key: 'workplace',
      ...getColumnSelectFilterProps<User>('workplace', [
        { text: 'Miền Bắc (MB)', value: 'MB' },
        { text: 'Miền Nam (MN)', value: 'MN' },
      ]),
      sorter: getColumnSorter<User>('workplace', 'string'),
      render: (text: string) => {
        if (!text) return <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>—</Text>;
        return text === 'MB' ? (
          <Tag color="geekblue" style={{ whiteSpace: 'nowrap' }}>Miền Bắc (MB)</Tag>
        ) : (
          <Tag color="orange" style={{ whiteSpace: 'nowrap' }}>Miền Nam (MN)</Tag>
        );
      }
    },
    {
      title: t('personnel.cols.contact', 'Liên hệ'),
      key: 'contact',
      ...getColumnSearchProps<User>('email', 'Email / SĐT', (r) => `${r.email} ${r.phone || ''} ${r.landlinePhone || ''}`),
      render: (_: any, record: User) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
          <div><Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{record.email}</Text></div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
            {record.phone && <Tag color="blue" style={{ fontSize: 11, margin: 0, padding: '0 4px', whiteSpace: 'nowrap' }}>DĐ: {record.phone}</Tag>}
            {record.landlinePhone && <Tag color="purple" style={{ fontSize: 11, margin: 0, padding: '0 4px', whiteSpace: 'nowrap' }}>CĐ: {record.landlinePhone}</Tag>}
          </div>
        </div>
      )
    },
    {
      title: t('personnel.cols.personalInfo', 'Thông tin cá nhân'),
      key: 'personalInfo',
      ...getColumnSearchProps<User>('birthDate', 'Ngày sinh/Ngày vào', (r) => `${r.birthDate || ''} ${r.startDate || ''}`),
      render: (_: any, record: User) => (
        <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {record.birthDate && <div style={{ whiteSpace: 'nowrap' }}>Ngày sinh: <Text strong style={{ whiteSpace: 'nowrap' }}>{record.birthDate}</Text></div>}
          {record.startDate && <div style={{ whiteSpace: 'nowrap' }}>Ngày vào: <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{record.startDate}</Text></div>}
        </div>
      )
    },
    {
      title: t('personnel.cols.role', 'Nhóm quyền (CASL Role)'),
      key: 'role',
      ...getColumnSelectFilterProps<User>('role', undefined, data, (r) => r.role?.name || 'Chưa gán'),
      sorter: getColumnSorter<User>('role', 'string', (r) => r.role?.name || ''),
      render: (_: any, record: User) => (
        record.role ? <Tag color="blue" style={{ whiteSpace: 'nowrap' }}>{record.role.name}</Tag> : <Tag color="default" style={{ whiteSpace: 'nowrap' }}>Chưa gán</Tag>
      ),
    },
    {
      title: t('personnel.cols.status', 'Trạng thái'),
      key: 'status',
      ...getColumnSelectFilterProps<User>('status', [
        { text: 'Đang làm việc', value: 'Active' },
        { text: 'Đã điều chuyển', value: 'Transferred' },
        { text: 'Đã nghỉ việc', value: 'Resigned' },
        { text: 'Tạm dừng', value: 'Suspended' },
      ], undefined, (r) => r.status || (r.isActive ? 'Active' : 'Resigned')),
      sorter: getColumnSorter<User>('status', 'string', (r) => r.status || (r.isActive ? 'Active' : 'Resigned')),
      render: (_: any, record: User) => {
        const st = record.status || (record.isActive ? 'Active' : 'Resigned');
        if (st === 'Active') {
          return <Tag color="success">Đang làm việc</Tag>;
        }
        if (st === 'Transferred') {
          return (
            <Tooltip title={`Điều chuyển đến: ${record.transferDestination || 'Đơn vị khác'} (${record.transferDate || ''})`}>
              <Tag color="blue">Đã điều chuyển</Tag>
            </Tooltip>
          );
        }
        if (st === 'Resigned') {
          return (
            <Tooltip title={`Ngày nghỉ: ${record.resignationDate || ''} - Lý do: ${record.statusReason || 'N/A'}`}>
              <Tag color="default">{t('personnel.status.resigned', 'Đã nghỉ việc')}</Tag>
            </Tooltip>
          );
        }
        if (st === 'Suspended') {
          return <Tag color="warning">{t('personnel.status.suspended', 'Tạm dừng')}</Tag>;
        }
        return <Tag color="default">{st}</Tag>;
      },
    },
    {
      title: t('personnel.cols.action', 'Thao tác'),
      key: 'action',
      render: (_: any, record: User) => {
        const isLocked = record.lockedUntil && new Date(record.lockedUntil) > new Date();
        const st = record.status || (record.isActive ? 'Active' : 'Resigned');

        return (
          <Space style={{ whiteSpace: 'nowrap' }}>
            <Tooltip title={t('personnel.actions.history', 'Tra cứu lịch sử công tác & trách nhiệm')}>
              <Button
                type="text"
                style={{ color: '#ea9105' }}
                icon={<TeamOutlined />}
                onClick={() => openHistoryDrawer(record)}
              />
            </Tooltip>

            <Tooltip title={t('personnel.actions.resetPassword', 'Reset mật khẩu')}>
              <Button 
                type="text" 
                style={{ color: '#722ed1' }} 
                icon={<KeyOutlined />} 
                onClick={() => openResetModal(record)} 
              />
            </Tooltip>
            {isLocked && (
              <Tooltip title={t('personnel.actions.unlockAccount', 'Mở khóa tài khoản (đang bị khóa)')}>
                <Button 
                  type="text" 
                  style={{ color: '#ff4d4f' }} 
                  icon={<UnlockOutlined />} 
                  onClick={() => handleUnlockAccount(record)} 
                />
              </Tooltip>
            )}
            <Tooltip title={t('personnel.actions.forcePasswordChange', 'Buộc đổi mật khẩu')}>
              <Button 
                type="text" 
                style={{ color: '#fa8c16' }} 
                icon={<ThunderboltOutlined />} 
                onClick={() => handleForceChangePassword(record)} 
              />
            </Tooltip>
            <Tooltip title={t('personnel.actions.competencyMatrix', 'Ma trận năng lực')}>
              <Button 
                type="text" 
                style={{ color: '#ea9105' }} 
                icon={<TrophyOutlined />} 
                onClick={() => openCompetencyModal(record)} 
              />
            </Tooltip>
            <Tooltip title={t('personnel.actions.edit', 'Chỉnh sửa')}>
              <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
            </Tooltip>

            {/* Các hành động vòng đời thay cho xóa cứng */}
            {st === 'Active' ? (
              <>
                <Tooltip title={t('personnel.actions.resign', 'Báo Nghỉ Việc (Bảo toàn 100% lịch sử)')}>
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => openStatusModal(record, 'Resigned')}
                  />
                </Tooltip>
                <Tooltip title={t('personnel.actions.transfer', 'Điều Chuyển Công Tác')}>
                  <Button
                    type="text"
                    style={{ color: '#13c2c2' }}
                    icon={<SwapOutlined />}
                    onClick={() => openStatusModal(record, 'Transferred')}
                  />
                </Tooltip>
              </>
            ) : (
              <Tooltip title={t('personnel.actions.reactivate', 'Khôi phục hoạt động')}>
                <Button
                  type="text"
                  style={{ color: '#52c41a' }}
                  icon={<UnlockOutlined />}
                  onClick={() => handleQuickRestore(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const filteredData = data.filter((item: any) => filterRecursive(item, searchText));

  const handleExport = () => {
    exportToExcel(filteredData, columns, 'Danh_sach_nhan_su');
  };

  if (isModalOpen) {
    return (
      <div className="animate-fadeIn p-1">
        {/* Premium Header with Back/Home button */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 bg-transparent">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setIsModalOpen(false)} 
              className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-10"
              icon={<CloseOutlined />}
            >
              ← Quay lại danh sách
            </Button>
            <div>
              <Title level={3} className="!mb-1 text-slate-800" style={{ margin: 0 }}>
                {editingRecord ? 'Cập nhật Nhân sự' : 'Thêm Nhân sự mới'}
              </Title>
              <Text type="secondary" className="text-sm">
                Thiết lập thông tin cá nhân, chức danh, nơi làm việc và phân quyền truy cập hệ thống.
              </Text>
            </div>
          </div>
          <Space>
            <Button onClick={() => setIsModalOpen(false)} className="rounded-xl shadow-sm h-10 px-5">
              Hủy bỏ
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave} 
              className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 px-6 text-white"
            >
              {editingRecord ? 'Cập nhật' : 'Thêm nhân sự'}
            </Button>
          </Space>
        </div>

        <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fullName" label={<span className="font-semibold text-slate-700">Họ và tên</span>} rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Nguyễn Văn A" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="username" label={<span className="font-semibold text-slate-700">Tên đăng nhập</span>} rules={[{ required: true, message: 'Vui lòng nhập username' }]}>
                  <Input placeholder="nguyenvana" disabled={!!editingRecord} className="rounded-lg h-10" />
                </Form.Item>
              </Col>
            </Row>

            {!editingRecord && (
              <Form.Item 
                name="password" 
                label={
                  <span className="font-semibold text-slate-700">
                    Mật khẩu ban đầu <span className="text-xs font-normal text-slate-500">(Mặc định: @bcd1234 nếu để trống)</span>
                  </span>
                }
              >
                <Input.Password placeholder="Để trống sẽ tự tạo mật khẩu mặc định @bcd1234" className="rounded-lg h-10" />
              </Form.Item>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="employeeId" label={<span className="font-semibold text-slate-700">Mã nhân sự (Employee ID)</span>}>
                  <Input placeholder="Ví dụ: 3000031424" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="workplace" label={<span className="font-semibold text-slate-700">Nơi làm việc / Khu vực</span>}>
                  <Select placeholder="Chọn khu vực" className="h-10">
                    <Option value="MB">Miền Bắc (MB)</Option>
                    <Option value="MN">Miền Nam (MN)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="email" 
                  label={
                    <span className="font-semibold text-slate-700">
                      Email công vụ <span className="text-xs font-normal text-slate-500">(Tùy chọn)</span>
                    </span>
                  } 
                  rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}
                >
                  <Input placeholder="email@company.vn" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="phone" label={<span className="font-semibold text-slate-700">Số điện thoại di động</span>}>
                  <Input placeholder="0901xxxxxx" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="landlinePhone" label={<span className="font-semibold text-slate-700">Số điện thoại cố định</span>}>
                  <Input placeholder="Ví dụ: 63434" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="department" label={<span className="font-semibold text-slate-700">Phòng ban công tác</span>}>
                  <Input placeholder="Phòng KT ĐVKD" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="birthDate" label={<span className="font-semibold text-slate-700">Ngày sinh</span>}>
                  <Input placeholder="dd/mm/yyyy (ví dụ: 17/11/1984)" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="startDate" label={<span className="font-semibold text-slate-700">Ngày vào KTNB</span>}>
                  <Input placeholder="dd/mm/yyyy (ví dụ: 16/06/2025)" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="position" label={<span className="font-semibold text-slate-700">Chức vụ trong đoàn (Position)</span>}>
                  <Input placeholder="Ví dụ: Trưởng đoàn, Phó đoàn, Thành viên đoàn, Thư ký đoàn" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="jobTitle" 
                  label={
                    <span className="font-semibold text-slate-700">
                      Chức danh Chuyên môn (Job Title) <span className="text-xs font-normal text-slate-500">(Ngạch bậc KTV)</span>
                    </span>
                  } 
                  rules={[{ required: true, message: 'Vui lòng chọn chức danh chuyên môn' }]}
                >
                  <Select 
                    placeholder="Chọn chức danh chuyên môn" 
                    showSearch 
                    allowClear
                    className="h-10"
                    filterOption={(input, option) => 
                      String(option?.value || '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {jobTitleSelectOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        <span>{opt.label}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item 
              name="roleId" 
              label={
                <span className="font-semibold text-slate-700">
                  Nhóm quyền Hệ thống (Role CASL RBAC) <span className="text-xs font-normal text-slate-500">(Quyền truy cập tính năng & phê duyệt)</span>
                </span>
              }
              rules={[{ required: true, message: 'Vui lòng chọn nhóm quyền hệ thống' }]}
            >
              <Select 
                placeholder="Chọn nhóm quyền hệ thống" 
                allowClear 
                className="h-10"
              >
                {roles.map(r => (
                  <Option key={r.id} value={r.id}>
                    {r.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider style={{ margin: '16px 0 16px 0' }} dashed>
              <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">
                🛡️ Khai báo Tính Độc Lập & Thời Hạn Cách Ly (Điều 39 Thông tư 13/2018/TT-NHNN & IIA 1130)
              </span>
            </Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="priorDepartments" 
                  label={
                    <span className="font-semibold text-slate-700">
                      Đơn vị công tác trước khi sang KTNB <span className="text-xs font-normal text-slate-500">(Tùy chọn)</span>
                    </span>
                  }
                >
                  <Input placeholder="Ví dụ: Khối Quản lý Rủi ro, Khối KHDN, Chi nhánh Hà Nội..." className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="coolingOffEndDate" 
                  label={
                    <span className="font-semibold text-slate-700">
                      Thời hạn hết cách ly độc lập (Cooling-off Date)
                    </span>
                  }
                >
                  <Input type="date" className="rounded-lg h-10" />
                </Form.Item>
              </Col>
            </Row>
            
            <DynamicFormRenderer entityType="User" form={form} initialValues={editingRecord || undefined} />
          </Form>

          <Divider className="my-6" />

          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsModalOpen(false)} className="rounded-xl px-6 h-10">
              {t('common.cancel', 'Hủy bỏ')}
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave} 
              className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-6 font-semibold h-10 text-white"
            >
              {editingRecord ? t('common.update', 'Cập nhật') : t('common.add', 'Thêm nhân sự')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            {t('personnel.title', 'Quản lý Nhân sự')}
          </Title>
          <Text type="secondary">Danh sách cán bộ Kiểm toán Nội bộ</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Tìm theo tên, email, mã NV..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260 }}
            className="rounded-lg shadow-sm"
          />
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="shadow-sm rounded-xl border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold h-10"
          >
            Tải Excel
          </Button>
          <BulkImport 
            module="users" 
            onSuccess={fetchData} 
            fileName="Nhan_su" 
            templateData={[
              { 
                "Họ và tên": "Nguyễn Văn An", 
                "Tên đăng nhập": "annv", 
                "Email": "annv@lpbank.com.vn", 
                "Số điện thoại": "0912345678",
                "Mã nhân viên": "10001",
                "Chức danh chuyên môn": "Kiểm toán viên chính", 
                "Nhóm quyền": "Kiểm toán viên", 
                "Phòng ban": "Phòng Kiểm toán ĐVKD", 
                "Nơi làm việc": "MB", 
                "Chức vụ trong đoàn": "Thành viên đoàn",
                "Đơn vị công tác trước": "Khối Quản lý Rủi ro",
                "Thời hạn cách ly": "2026-12-31"
              },
              { 
                "Họ và tên": "Trần Thị Mai", 
                "Tên đăng nhập": "maitt", 
                "Email": "maitt@lpbank.com.vn", 
                "Số điện thoại": "0987654321",
                "Mã nhân viên": "10002",
                "Chức danh chuyên môn": "Kiểm toán viên cao cấp", 
                "Nhóm quyền": "Trưởng đoàn", 
                "Phòng ban": "Phòng Kiểm toán Hội sở", 
                "Nơi làm việc": "MB", 
                "Chức vụ trong đoàn": "Trưởng đoàn",
                "Đơn vị công tác trước": "Chi nhánh Hà Nội",
                "Thời hạn cách ly": "2025-06-30"
              }
            ]}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={openCreateModal}
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
          >
            Thêm Nhân sự
          </Button>
        </Space>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Tabs
            activeKey={activeTabStatus}
            onChange={(key) => setActiveTabStatus(key)}
            items={[
              {
                key: 'Active',
                label: (
                  <span>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    Đang làm việc (Active)
                  </span>
                ),
              },
              {
                key: 'Transferred',
                label: (
                  <span>
                    <SwapOutlined style={{ color: '#13c2c2' }} />
                    Đã điều chuyển (Transferred)
                  </span>
                ),
              },
              {
                key: 'Resigned',
                label: (
                  <span>
                    <CloseOutlined style={{ color: '#8c8c8c' }} />
                    Đã nghỉ việc (Resigned)
                  </span>
                ),
              },
              {
                key: 'ALL',
                label: (
                  <span>
                    <HistoryOutlined />
                    Tất cả hồ sơ lưu trữ ({data.length})
                  </span>
                ),
              },
            ]}
          />
        </div>

        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} nhân sự` }}
        />
      </Card>

      {/* Modal Cập Nhật Trạng Thái Vòng Đời Nhân Sự */}
      <Modal
        title={
          <Space>
            {newStatusType === 'Resigned' && <CloseOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
            {newStatusType === 'Transferred' && <SwapOutlined style={{ color: '#13c2c2', fontSize: 18 }} />}
            {newStatusType === 'Suspended' && <LockOutlined style={{ color: '#faad14', fontSize: 18 }} />}
            <span style={{ fontWeight: 700 }}>
              {newStatusType === 'Resigned'
                ? `Báo Nghỉ Việc & Khóa Tài Khoản — ${statusTargetUser?.fullName}`
                : newStatusType === 'Transferred'
                ? `Điều Chuyển Công Tác — ${statusTargetUser?.fullName}`
                : `Tạm Khóa Hoạt Động — ${statusTargetUser?.fullName}`}
            </span>
          </Space>
        }
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        onOk={handleUpdateStatus}
        okText={t('common.btnConfirmUpdate', 'Xác Nhận Cập Nhật')}
        okButtonProps={{ danger: newStatusType === 'Resigned' }}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={560}
      >
        <Alert
          message="Bảo toàn 100% dữ liệu lịch sử và trách nhiệm giải trình"
          description="Hệ thống sẽ vô hiệu hóa quyền đăng nhập nhưng bảo lưu toàn bộ Giấy tờ làm việc (WP), Báo cáo, Phát hiện kiểm toán, Timesheet và Điểm KPI do nhân sự này từng thực hiện."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={statusForm} layout="vertical">
          {newStatusType === 'Resigned' && (
            <Form.Item
              name="resignationDate"
              label={<span className="font-semibold text-slate-700">Ngày chính thức nghỉ việc</span>}
              rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ việc' }]}
            >
              <Input type="date" className="h-10" />
            </Form.Item>
          )}

          {newStatusType === 'Transferred' && (
            <>
              <Form.Item
                name="transferDate"
                label={<span className="font-semibold text-slate-700">Ngày điều chuyển công tác</span>}
                rules={[{ required: true, message: 'Vui lòng chọn ngày điều chuyển' }]}
              >
                <Input type="date" className="h-10" />
              </Form.Item>

              <Form.Item
                name="transferDestination"
                label={<span className="font-semibold text-slate-700">Đơn vị / Chi nhánh chuyển đến</span>}
                rules={[{ required: true, message: 'Vui lòng nhập đơn vị chuyển đến' }]}
              >
                <Input placeholder="Ví dụ: Khối Quản lý Rủi ro, Chi nhánh TP.HCM..." className="h-10" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="statusReason"
            label={<span className="font-semibold text-slate-700">Lý do / Quyết định số / Bàn giao công việc</span>}
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập số quyết định, người nhận bàn giao hồ sơ công việc hoặc lý do nghỉ/chuyển..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer Tra Cứu Lịch Sử Công Tác & Trách Nhiệm Giải Trình */}
      <Drawer
        title={
          <Space>
            <TeamOutlined style={{ color: '#ea9105', fontSize: 18 }} />
            <span style={{ fontWeight: 700 }}>Hồ Sơ & Lịch Sử Công Tác — {historyUser?.fullName}</span>
          </Space>
        }
        open={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        width={720}
      >
        {historyUser && (
          <div>
            <Card style={{ marginBottom: 16 }} variant="borderless">
              <Descriptions title="Thông tin nhân sự" bordered size="small" column={2}>
                <Descriptions.Item label="Họ và tên"><b>{historyUser.fullName}</b></Descriptions.Item>
                <Descriptions.Item label="Mã nhân viên">{historyUser.employeeId || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tên đăng nhập">@{historyUser.username}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={historyUser.status === 'Active' ? 'success' : historyUser.status === 'Transferred' ? 'blue' : 'default'}>
                    {historyUser.status === 'Active' ? 'Đang làm việc' : historyUser.status === 'Transferred' ? 'Đã điều chuyển' : 'Đã nghỉ việc'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Phòng ban">{historyUser.department || '—'}</Descriptions.Item>
                <Descriptions.Item label="Chức danh">{historyUser.jobTitle || '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày vào KTNB">{historyUser.startDate || '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày nghỉ/chuyển">
                  {historyUser.resignationDate || historyUser.transferDate || '—'}
                </Descriptions.Item>
                {historyUser.transferDestination && (
                  <Descriptions.Item label="Đơn vị chuyển đến" span={2}>
                    <b>{historyUser.transferDestination}</b>
                  </Descriptions.Item>
                )}
                {historyUser.priorDepartments && (
                  <Descriptions.Item label="Đơn vị công tác trước">
                    {historyUser.priorDepartments}
                  </Descriptions.Item>
                )}
                {historyUser.coolingOffEndDate && (
                  <Descriptions.Item label="Thời hạn cách ly độc lập">
                    <Tag color="volcano">{historyUser.coolingOffEndDate}</Tag>
                  </Descriptions.Item>
                )}
                {historyUser.statusReason && (
                  <Descriptions.Item label="Lý do / Bàn giao" span={2}>
                    <Text italic>{historyUser.statusReason}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="wp"
              items={[
                {
                  key: 'wp',
                  label: 'Giấy tờ làm việc (WP)',
                  children: (
                    <div style={{ padding: 12, textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
                      <Text type="secondary">
                        Tất cả các Giấy tờ làm việc do <b>{historyUser.fullName}</b> từng lập hoặc duyệt được lưu giữ vĩnh viễn trong cơ sở dữ liệu và liên kết qua Mã nhân sự.
                      </Text>
                    </div>
                  ),
                },
                {
                  key: 'findings',
                  label: 'Phát hiện & Sai phạm',
                  children: (
                    <div style={{ padding: 12, textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
                      <Text type="secondary">
                        Các phát hiện kiểm toán, cán bộ vi phạm và trách nhiệm giải trình liên quan đến <b>{historyUser.fullName}</b> được bảo toàn đầy đủ.
                      </Text>
                    </div>
                  ),
                },
                {
                  key: 'kpi',
                  label: 'Điểm BSC-KPI Quá Khứ',
                  children: (
                    <div style={{ padding: 12, textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
                      <Text type="secondary">
                        Bản tính điểm BSC-KPI và biểu mẫu MB02 các kỳ trước đây của <b>{historyUser.fullName}</b> được bảo lưu nguyên vẹn để phục vụ thanh tra, kiểm toán lại.
                      </Text>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* Skills Matrix Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrophyOutlined style={{ color: '#ea9105', fontSize: 20 }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Ma trận Năng lực & Chứng chỉ KTV - {selectedUser?.fullName}</span>
          </div>
        }
        open={isCompModalOpen}
        onCancel={() => setIsCompModalOpen(false)}
        footer={null}
        width={750}
      >
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          {/* List of current skills */}
          <div style={{ flex: 1, maxHeight: 400, overflowY: 'auto', borderRight: '1px solid #f0f0f0', paddingRight: 24 }}>
            <Title level={5} style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Outfit, sans-serif' }}>
              <StarOutlined style={{ color: '#ea9105' }} />
              Năng lực hiện tại
            </Title>
            <List
              loading={compLoading}
              dataSource={competencies}
              locale={{ emptyText: 'Chưa cập nhật kỹ năng nào' }}
              renderItem={(item: any) => (
                <List.Item style={{ display: 'block', padding: '12px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 14 }}>{item.skillName}</Text>
                    <Rate disabled defaultValue={item.rating} value={item.rating} style={{ fontSize: 14, color: '#ea9105' }} />
                  </div>
                  <div>
                    <Tag color={item.skillCategory === 'Core' ? 'blue' : item.skillCategory === 'Specialized' ? 'purple' : 'default'}>
                      {item.skillCategory === 'Core' ? 'Năng lực cốt lõi' : item.skillCategory === 'Specialized' ? 'Năng lực chuyên biệt' : 'Kỹ năng bổ trợ'}
                    </Tag>
                    {item.notes && <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>{item.notes}</div>}
                  </div>
                </List.Item>
              )}
            />
          </div>

          {/* Add / Update skill form */}
          <div style={{ width: 300 }}>
            <Title level={5} style={{ marginTop: 0, fontFamily: 'Outfit, sans-serif' }}>Đánh giá & Cập nhật</Title>
            <Form form={compForm} layout="vertical" onFinish={handleSaveCompetency}>
              <Form.Item name="skillName" label="Kỹ năng nghiệp vụ" rules={[{ required: true, message: 'Vui lòng chọn kỹ năng' }]}>
                <Select placeholder="Chọn kỹ năng">
                  <Option value="Quản trị rủi ro">Quản trị rủi ro</Option>
                  <Option value="Tín dụng">Tín dụng</Option>
                  <Option value="Kế toán & Kho quỹ">Kế toán & Kho quỹ</Option>
                  <Option value="Công nghệ thông tin">Công nghệ thông tin</Option>
                  <Option value="Bảo mật hệ thống">Bảo mật hệ thống</Option>
                  <Option value="Huy động vốn">Huy động vốn</Option>
                  <Option value="Vận hành thẻ">Vận hành thẻ</Option>
                  <Option value="Kiểm toán Ngoại hối">Kiểm toán Ngoại hối</Option>
                </Select>
              </Form.Item>

              <Form.Item name="skillCategory" label="Phân nhóm năng lực" initialValue="Core">
                <Select>
                  <Option value="Core">Năng lực cốt lõi</Option>
                  <Option value="Specialized">Năng lực chuyên biệt</Option>
                  <Option value="SoftSkill">Kỹ năng mềm/Bổ trợ</Option>
                </Select>
              </Form.Item>

              <Form.Item name="rating" label="Điểm đánh giá (1 - 5 Sao)" rules={[{ required: true, message: 'Vui lòng đánh giá sao' }]} initialValue={3}>
                <Rate style={{ color: '#ea9105' }} />
              </Form.Item>

              <Form.Item name="notes" label="Ghi chú (Chứng chỉ, Kinh nghiệm...)">
                <Input.TextArea placeholder="Chứng chỉ CIA, ACCA hoặc kinh nghiệm công tác..." rows={2} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}>
                  Lưu Đánh Giá
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: '#722ed1', fontSize: 18 }} />
            <span style={{ fontWeight: 700 }}>Reset Mật khẩu — {resetTargetUser?.fullName}</span>
          </Space>
        }
        open={resetModalVisible}
        onCancel={() => { setResetModalVisible(false); setGeneratedPassword(''); }}
        footer={
          generatedPassword ? (
            <Button onClick={() => { setResetModalVisible(false); setGeneratedPassword(''); }}>{t('common.btnClose', 'Đóng')}</Button>
          ) : (
            <Space>
              <Button onClick={() => setResetModalVisible(false)}>{t('common.btnCancel', 'Hủy')}</Button>
              <Button type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }} onClick={handleResetPassword}>
                Reset mật khẩu
              </Button>
            </Space>
          )
        }
        width={500}
      >
        {generatedPassword ? (
          <Alert
            message="Mật khẩu mới đã được tạo thành công!"
            description={
              <div>
                <p>Mật khẩu tạm thời cho <strong>{resetTargetUser?.username}</strong>:</p>
                <div style={{ 
                  background: '#f6ffed', 
                  border: '2px dashed #52c41a', 
                  borderRadius: 8, 
                  padding: '12px 16px', 
                  textAlign: 'center',
                  fontSize: 18,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginTop: 8,
                  userSelect: 'all',
                }}>
                  {generatedPassword}
                </div>
                <p style={{ marginTop: 12, color: '#fa8c16', fontSize: 12 }}>
                  ⚠️ Hãy sao chép và gửi mật khẩu này cho người dùng. Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần tiếp theo.
                </p>
              </div>
            }
            type="success"
            showIcon
          />
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Select
                value={resetAutoGenerate ? 'auto' : 'manual'}
                onChange={(v) => setResetAutoGenerate(v === 'auto')}
                style={{ width: '100%' }}
                size="large"
              >
                <Select.Option value="auto">🎲 Tự động tạo mật khẩu an toàn (16 ký tự)</Select.Option>
                <Select.Option value="manual">✏️ Nhập mật khẩu thủ công</Select.Option>
              </Select>
            </div>

            {!resetAutoGenerate && (
              <Input.Password
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 12 ký tự, chữ hoa + thường + số + đặc biệt)"
                size="large"
                style={{ borderRadius: 8 }}
              />
            )}

            <Alert
              message="Lưu ý bảo mật (PCI DSS 8.3)"
              description={
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  <li>Mật khẩu mới phải có ít nhất 12 ký tự</li>
                  <li>Chứa chữ hoa (A-Z), chữ thường (a-z), số (0-9), ký tự đặc biệt</li>
                  <li>Không được trùng 4 mật khẩu gần nhất</li>
                  <li>Người dùng sẽ phải đổi mật khẩu ngay khi đăng nhập</li>
                </ul>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Personnel;
