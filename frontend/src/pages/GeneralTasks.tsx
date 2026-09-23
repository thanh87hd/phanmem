import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Tag, DatePicker, Space, Card, Typography, Row, Col, Statistic, message, Divider, Tabs, Progress, Tooltip, Badge } from 'antd';
import { 
  PlusOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined, 
  UnorderedListOutlined, 
  CloseOutlined,
  TeamOutlined,
  ApartmentOutlined,
  UserOutlined,
  BarChartOutlined,
  FireOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { useCurrentUser } from '../utils/useCurrentUser';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import { filterRecursive } from '../utils/excelExport';

const { Title, Text } = Typography;
const { TextArea } = Input;

const GeneralTasks: React.FC = () => {
  const { t } = useTranslation();

  const CATEGORIES = [
    { value: 'Policy', label: t('generalTasks.policy', '📜 Chính sách'), color: 'blue' },
    { value: 'Report', label: t('generalTasks.report', '📊 Báo cáo'), color: 'purple' },
    { value: 'Training', label: t('generalTasks.training', '🎓 Đào tạo'), color: 'green' },
    { value: 'Meeting', label: t('generalTasks.meeting', '🤝 Họp'), color: 'cyan' },
    { value: 'Support', label: t('generalTasks.support', '🔧 Hỗ trợ'), color: 'orange' },
    { value: 'Other', label: t('auditExpenses.categories.other', '📌 Khác'), color: 'default' },
  ];

  const PRIORITIES = [
    { value: 'High', label: 'Cao', color: 'red' },
    { value: 'Medium', label: t('auditPlan.tabs2.filterRisk.medium', 'Trung bình'), color: 'orange' },
    { value: 'Low', label: t('auditPlan.tabs2.filterRisk.low', 'Thấp'), color: 'green' },
  ];

  const [activeTab, setActiveTab] = useState<string>('list');
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [form] = Form.useForm();
  const currentUser = useCurrentUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/general-tasks');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch { setData([]); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  useEffect(() => { 
    fetchData(); 
    fetchUsers();
  }, []);

  // ═══ Thống kê Tiến độ theo Phòng ban ═══
  const departmentStats = useMemo(() => {
    const deptMap = new Map<string, {
      department: string;
      total: number;
      open: number;
      inProgress: number;
      done: number;
      overdue: number;
      users: Set<string>;
    }>();

    data.forEach(task => {
      const assignedUser = users.find(u => u.id === task.assignedToId);
      let deptName = task.teamCode || (typeof assignedUser?.department === 'object' ? assignedUser?.department?.name : assignedUser?.department) || 'Phòng KT Hội Sở';
      if (!deptName || deptName === 'null') deptName = 'Phòng Nghiệp vụ KTNB';

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          department: deptName,
          total: 0,
          open: 0,
          inProgress: 0,
          done: 0,
          overdue: 0,
          users: new Set(),
        });
      }

      const item = deptMap.get(deptName)!;
      item.total += 1;
      if (task.status === 'Open') item.open += 1;
      else if (task.status === 'InProgress') item.inProgress += 1;
      else if (task.status === 'Done') item.done += 1;

      if (task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && task.status !== 'Done') {
        item.overdue += 1;
      }
      if (task.assignedToName) {
        item.users.add(task.assignedToName);
      }
    });

    return Array.from(deptMap.values()).map(d => ({
      ...d,
      memberCount: d.users.size,
      rate: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [data, users]);

  // ═══ Thống kê Tiến độ & Tải công việc theo Nhân sự (KTV) ═══
  const personnelStats = useMemo(() => {
    const userMap = new Map<string, {
      userId: number | string;
      name: string;
      department: string;
      total: number;
      open: number;
      inProgress: number;
      done: number;
      overdue: number;
      highPriority: number;
    }>();

    data.forEach(task => {
      const uId = task.assignedToId || task.assignedToName || 'unassigned';
      const uName = task.assignedToName || 'Chưa phân công';
      const assignedUser = users.find(u => u.id === task.assignedToId);
      const dept = task.teamCode || (typeof assignedUser?.department === 'object' ? assignedUser?.department?.name : assignedUser?.department) || 'Khối KTNB';

      if (!userMap.has(String(uId))) {
        userMap.set(String(uId), {
          userId: uId,
          name: uName,
          department: dept,
          total: 0,
          open: 0,
          inProgress: 0,
          done: 0,
          overdue: 0,
          highPriority: 0,
        });
      }

      const item = userMap.get(String(uId))!;
      item.total += 1;
      if (task.status === 'Open') item.open += 1;
      else if (task.status === 'InProgress') item.inProgress += 1;
      else if (task.status === 'Done') item.done += 1;

      if (task.priority === 'High') item.highPriority += 1;

      if (task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && task.status !== 'Done') {
        item.overdue += 1;
      }
    });

    return Array.from(userMap.values()).map(u => {
      const rate = u.total > 0 ? Math.round((u.done / u.total) * 100) : 0;
      let workload = 'Bình thường';
      let workloadColor = 'blue';
      if (u.overdue > 0 || u.inProgress >= 5) {
        workload = 'Quá tải / Trễ hạn';
        workloadColor = 'red';
      } else if (u.inProgress >= 3) {
        workload = 'Bận rộn';
        workloadColor = 'orange';
      } else if (u.inProgress >= 1) {
        workload = 'Đang có việc';
        workloadColor = 'green';
      } else {
        workload = 'Sẵn sàng';
        workloadColor = 'default';
      }
      return {
        ...u,
        rate,
        workload,
        workloadColor,
      };
    }).sort((a, b) => b.total - a.total);
  }, [data, users]);

  const handleSave = async (values: any) => {
    try {
      const selectedUser = users.find(u => u.id === values.assignedToId);
      const payload = {
        ...values,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        assignedById: currentUser.id,
        assignedByName: currentUser.fullName || currentUser.username,
        assignedToId: values.assignedToId,
        assignedToName: selectedUser ? (selectedUser.fullName || selectedUser.username) : '',
        teamCode: currentUser.teamCode,
      };
      if (editingId) {
        await api.patch(`/general-tasks/${editingId}`, payload);
        message.success(t('generalTasks.messages.saveSuccess', 'Đã cập nhật công việc'));
      } else {
        await api.post('/general-tasks', payload);
        message.success(t('generalTasks.messages.addSuccess', 'Đã tạo công việc mới'));
      }
      setModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch { message.error(t('auditExpenses.messages.saveError', 'Lỗi khi lưu')); }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
      assignedToId: record.assignedToId || null,
    });
    setModalOpen(true);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await api.patch(`/general-tasks/${id}`, {
      status,
      completedDate: status === 'Done' ? dayjs().format('YYYY-MM-DD') : null,
    });
    fetchData();
  };

  const filteredData = data.filter((item) => {
    const matchesSearch = filterRecursive(item, searchText);
    const matchesCat = !filterCategory || item.category === filterCategory;
    const matchesPri = !filterPriority || item.priority === filterPriority;
    const matchesStat = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesCat && matchesPri && matchesStat;
  });

  const stats = {
    total: data.length,
    open: data.filter(d => d.status === 'Open').length,
    inProgress: data.filter(d => d.status === 'InProgress').length,
    done: data.filter(d => d.status === 'Done').length,
    overdue: data.filter(d => d.dueDate && dayjs(d.dueDate).isBefore(dayjs(), 'day') && d.status !== 'Done').length,
  };

  const columns = [
    { 
      title: t('auditCommitteePortal.table.title', 'Tiêu đề'), 
      dataIndex: 'title', 
      key: 'title', 
      ...getColumnSearchProps<any>('title', 'Tiêu đề'),
      sorter: getColumnSorter<any>('title', 'string'),
      render: (v: string) => <strong>{v}</strong> 
    },
    {
      title: t('auditEngagements.cols.type', 'Loại'), 
      dataIndex: 'category', 
      key: 'category', 
      width: 120,
      ...getColumnSelectFilterProps<any>('category', undefined, data),
      render: (v: string) => {
        const cat = CATEGORIES.find(c => c.value === v);
        return <Tag color={cat?.color || 'default'}>{cat?.label || v}</Tag>;
      },
    },
    {
      title: 'Ưu tiên', 
      dataIndex: 'priority', 
      key: 'priority', 
      width: 100,
      ...getColumnSelectFilterProps<any>('priority', undefined, data),
      render: (v: string) => {
        const p = PRIORITIES.find(pr => pr.value === v);
        return <Tag color={p?.color}>{p?.label || v}</Tag>;
      },
    },
    { 
      title: 'Giao cho', 
      dataIndex: 'assignedToName', 
      key: 'assignedToName', 
      width: 140,
      ...getColumnSearchProps<any>('assignedToName', 'Giao cho'),
      sorter: getColumnSorter<any>('assignedToName', 'string'),
    },
    { 
      title: t('generalTasks.table.assignedBy', 'Người giao'), 
      dataIndex: 'assignedByName', 
      key: 'assignedByName', 
      width: 140,
      ...getColumnSearchProps<any>('assignedByName', 'Người giao'),
      sorter: getColumnSorter<any>('assignedByName', 'string'),
    },
    {
      title: t('generalTasks.table.dueDate', 'Hạn'), 
      dataIndex: 'dueDate', 
      key: 'dueDate', 
      width: 110,
      sorter: getColumnSorter<any>('dueDate', 'date'),
      render: (v: string) => {
        if (!v) return '-';
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return <span style={{ color: isOverdue ? '#cf1322' : undefined, fontWeight: isOverdue ? 'bold' : undefined }}>{dayjs(v).format('DD/MM/YYYY')}</span>;
      },
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 130,
      ...getColumnSelectFilterProps<any>('status', undefined, data),
      render: (v: string) => {
        const colors: Record<string, string> = { Open: 'default', InProgress: 'processing', Done: 'success', Cancelled: 'error' };
        const labels: Record<string, string> = { Open: t('generalTasks.kpis.open', 'Mở'), InProgress: t('executionDashboard.status.inProgress', 'Đang làm'), Done: t('auditEngagements.statusLabels.Done', 'Hoàn thành'), Cancelled: t('findingKB.modal.cancelText', 'Hủy') };
        return <Tag color={colors[v]}>{labels[v] || v}</Tag>;
      },
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'), 
      key: 'actions', 
      width: 200,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" onClick={() => handleEdit(r)}>{t('auditTemplates.btnEdit', 'Sửa')}</Button>
          {r.status === 'Open' && <Button size="small" type="primary" ghost onClick={() => handleStatusChange(r.id, 'InProgress')}>{t('generalTasks.table.btnStart', 'Bắt đầu')}</Button>}
          {r.status === 'InProgress' && <Button size="small" type="primary" onClick={() => handleStatusChange(r.id, 'Done')}>{t('auditEngagements.statusLabels.Done', 'Hoàn thành')}</Button>}
        </Space>
      ),
    },
  ];

  if (modalOpen) {
    return (
      <div className="animate-fadeIn p-2" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Premium Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 bg-transparent">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => { setModalOpen(false); setEditingId(null); }} 
              className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-11"
              icon={<CloseOutlined />}
            >
              {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Title level={3} className="!mb-0 text-slate-800" style={{ margin: 0 }}>
                  {editingId ? [t('generalTasks.form.titleEdit', 'Hiệu chỉnh Công việc Chung')] : t('generalTasks.form.titleAdd', 'Giao nhiệm vụ / Công việc mới')}
                </Title>
                <Tag color={editingId ? 'orange' : 'green'} className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs">
                  {editingId ? [t('auditEngagements.update', 'Cập nhật')] : t('generalTasks.form.tagCreate', 'Tạo mới')}
                </Tag>
              </div>
              <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
                {t('generalTasks.form.desc', 'Phân công công việc hành chính, đào tạo, hỗ trợ chuyên môn ngoài kế hoạch kiểm toán chính thức.')}
              </Text>
            </div>
          </div>
          <Space size="middle">
            <Button onClick={() => { setModalOpen(false); setEditingId(null); }} className="rounded-xl shadow-sm h-11 px-5 font-medium hover:bg-slate-50">
              {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
            </Button>
            <Button 
              type="primary" 
              onClick={() => form.submit()} 
              className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-11 px-7 text-white transition-all duration-200"
            >
              {editingId ? [t('auditEngagements.update', 'Cập nhật')] : t('generalTasks.form.btnSaveAdd', 'Giao việc')}
            </Button>
          </Space>
        </div>

        <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Form.Item name="title" label={<span className="font-semibold text-slate-700 text-sm">{t('generalTasks.form.labelTitle', 'Tiêu đề công việc')}</span>} rules={[{ required: true, message: t('generalTasks.form.validTitle', 'Vui lòng nhập tiêu đề') }]}>
                  <Input placeholder="Ví dụ: Soạn báo cáo tổng hợp Q2, Biên soạn tài liệu đào tạo..." className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="category" label={<span className="font-semibold text-slate-700 text-sm">{t('generalTasks.form.labelCategory', 'Loại công việc')}</span>} initialValue="Other">
                  <Select options={CATEGORIES} className="h-11 rounded-xl" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="priority" label={<span className="font-semibold text-slate-700 text-sm">{t('generalTasks.form.labelPriority', 'Mức độ ưu tiên')}</span>} initialValue="Medium">
                  <Select options={PRIORITIES} className="h-11 rounded-xl" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item 
                  name="assignedToId" 
                  label={<span className="font-semibold text-slate-700 text-sm">{t('generalTasks.form.labelAssignee', 'Giao cho nhân sự')}</span>}
                  rules={[{ required: true, message: t('generalTasks.form.validAssignee', 'Vui lòng chọn nhân sự') }]}
                >
                  <Select 
                    showSearch
                    placeholder={t('generalTasks.form.placeholderAssignee', 'Chọn nhân sự được giao')} 
                    className="h-11 rounded-xl"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={users.map(u => ({
                      value: u.id,
                      label: `${u.fullName || u.username} (${u.username})`
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="dueDate" label={<span className="font-semibold text-slate-700 text-sm">{t('auditeePortal.table.dueDate', 'Hạn hoàn thành')}</span>}>
                  <DatePicker className="w-full h-11 rounded-xl border-slate-200" format="DD/MM/YYYY" placeholder={t('generalTasks.form.placeholderDueDate', 'Chọn ngày hạn chót')} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="status" label={<span className="font-semibold text-slate-700 text-sm">{t('generalTasks.form.labelStatus', 'Trạng thái công việc')}</span>} initialValue="Open">
                  <Select 
                    className="h-11 rounded-xl"
                    options={[
                      { value: 'Open', label: '🔵 Mở (Open)' }, 
                      { value: 'InProgress', label: '🟡 Đang làm (In Progress)' }, 
                      { value: 'Done', label: '🟢 Hoàn thành (Done)' }, 
                      { value: 'Cancelled', label: '🔴 Hủy (Cancelled)' }
                    ]} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={<span className="font-semibold text-slate-700 text-sm">{t('generalTasks.form.labelDesc', 'Mô tả nội dung chi tiết')}</span>}>
              <TextArea rows={6} placeholder="Nhập mô tả cụ thể về kết quả đầu ra mong đợi, các bước phối hợp thực hiện..." className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] text-sm font-sans" />
            </Form.Item>

            <Divider className="my-6" />

            <div className="flex justify-end gap-3">
              <Button onClick={() => { setModalOpen(false); setEditingId(null); }} className="rounded-xl px-6 h-11 font-medium hover:bg-slate-50 shadow-xs">
                {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-7 font-semibold h-11 text-white shadow-md transition-all duration-200"
              >
                {editingId ? [t('generalTasks.updateJobs', 'Cập nhật Công việc')] : t('generalTasks.btnAdd', 'Giao việc mới')}
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    );
  }

  const deptColumns = [
    {
      title: 'Phòng ban / Đơn vị',
      dataIndex: 'department',
      key: 'department',
      render: (v: string) => (
        <span className="font-semibold flex items-center gap-2 text-slate-800">
          <ApartmentOutlined className="text-amber-500 text-base" />
          {v}
        </span>
      ),
    },
    {
      title: 'KTV tham gia',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 140,
      render: (v: number) => <Tag color="blue" className="font-medium">{v} KTV</Tag>,
    },
    {
      title: 'Tổng việc',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      sorter: (a: any, b: any) => a.total - b.total,
      render: (v: number) => <strong className="text-sm">{v}</strong>,
    },
    {
      title: 'Đang làm',
      dataIndex: 'inProgress',
      key: 'inProgress',
      width: 110,
      render: (v: number) => <Tag color="processing">{v} việc</Tag>,
    },
    {
      title: 'Hoàn thành',
      dataIndex: 'done',
      key: 'done',
      width: 120,
      render: (v: number) => <Tag color="success">{v} việc</Tag>,
    },
    {
      title: 'Trễ hạn',
      dataIndex: 'overdue',
      key: 'overdue',
      width: 110,
      render: (v: number) => (
        v > 0 ? <Tag color="error" className="font-bold">{v} việc</Tag> : <Tag color="default">0</Tag>
      ),
    },
    {
      title: 'Tỷ lệ hoàn thành',
      dataIndex: 'rate',
      key: 'rate',
      width: 220,
      sorter: (a: any, b: any) => a.rate - b.rate,
      render: (v: number) => (
        <Progress 
          percent={v} 
          size="small" 
          strokeColor={v === 100 ? '#52c41a' : v < 50 ? '#faad14' : '#1890ff'} 
        />
      ),
    },
  ];

  const personnelColumns = [
    {
      title: 'Nhân sự (KTV)',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => (
        <span className="font-semibold flex items-center gap-2 text-slate-800">
          <UserOutlined className="text-blue-500" />
          {v}
        </span>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      render: (v: string) => <span className="text-slate-600 text-xs">{v}</span>,
    },
    {
      title: 'Tổng việc giao',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      sorter: (a: any, b: any) => a.total - b.total,
      render: (v: number) => <strong className="text-sm">{v}</strong>,
    },
    {
      title: 'Đang làm',
      dataIndex: 'inProgress',
      key: 'inProgress',
      width: 100,
      render: (v: number) => <Tag color="processing">{v}</Tag>,
    },
    {
      title: 'Hoàn thành',
      dataIndex: 'done',
      key: 'done',
      width: 110,
      render: (v: number) => <Tag color="success">{v}</Tag>,
    },
    {
      title: 'Trễ hạn',
      dataIndex: 'overdue',
      key: 'overdue',
      width: 100,
      render: (v: number) => (
        v > 0 ? <Tag color="error" className="font-bold">{v}</Tag> : <Tag color="default">0</Tag>
      ),
    },
    {
      title: 'Tiến độ',
      dataIndex: 'rate',
      key: 'rate',
      width: 180,
      sorter: (a: any, b: any) => a.rate - b.rate,
      render: (v: number) => <Progress percent={v} size="small" />,
    },
    {
      title: 'Tải công việc',
      dataIndex: 'workload',
      key: 'workload',
      width: 160,
      render: (_: any, r: any) => (
        <Tag color={r.workloadColor} className="font-semibold">{r.workload}</Tag>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={3} className="!mb-1">{t('generalTasks.title', 'Công việc Chung & Tiến Độ')}</Title>
          <Text className="text-gray-500">{t('generalTasks.subtitle', 'Quản lý phân giao công việc ngoài đoàn, theo dõi tiến độ theo phòng ban và nhân sự KTV')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}
          className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
        >
          {t('generalTasks.btnAdd', 'Giao việc mới')}
        </Button>
      </div>

      <Row gutter={16} className="mb-4">
        <Col span={5}><Card variant="borderless" className="shadow-sm"><Statistic title={t('executionDashboard.cols.total', 'Tổng')} value={stats.total} prefix={<UnorderedListOutlined />} /></Card></Col>
        <Col span={5}><Card variant="borderless" className="shadow-sm"><Statistic title={t('generalTasks.kpis.open', 'Mở')} value={stats.open} valueStyle={{ color: '#ea9105' }} /></Card></Col>
        <Col span={5}><Card variant="borderless" className="shadow-sm"><Statistic title={t('executionDashboard.status.inProgress', 'Đang làm')} value={stats.inProgress} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={5}><Card variant="borderless" className="shadow-sm"><Statistic title={t('auditEngagements.statusLabels.Done', 'Hoàn thành')} value={stats.done} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={4}><Card variant="borderless" className="shadow-sm"><Statistic title={t('findingsAnalytics.remediationTab.legendOverdue', 'Quá hạn')} value={stats.overdue} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        className="mb-4"
        items={[
          {
            key: 'list',
            label: (
              <span className="font-semibold flex items-center gap-1.5 px-2 py-1">
                <UnorderedListOutlined /> 📋 Danh sách Công việc Ngoài Đoàn
              </span>
            ),
            children: (
              <>
                {/* Toolbar Filter */}
                <Card variant="borderless" className="shadow-sm mb-4">
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                      <Input.Search
                        placeholder="Tìm tiêu đề, người thực hiện..."
                        allowClear
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                      <Select
                        allowClear
                        placeholder="Loại công việc"
                        style={{ width: '100%' }}
                        value={filterCategory || undefined}
                        onChange={(val) => setFilterCategory(val || '')}
                        options={CATEGORIES}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                      <Select
                        allowClear
                        placeholder="Mức ưu tiên"
                        style={{ width: '100%' }}
                        value={filterPriority || undefined}
                        onChange={(val) => setFilterPriority(val || '')}
                        options={PRIORITIES}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                      <Select
                        allowClear
                        placeholder="Trạng thái"
                        style={{ width: '100%' }}
                        value={filterStatus || undefined}
                        onChange={(val) => setFilterStatus(val || '')}
                        options={[
                          { label: 'Mở', value: 'Open' },
                          { label: 'Đang làm', value: 'InProgress' },
                          { label: 'Hoàn thành', value: 'Done' },
                          { label: 'Hủy', value: 'Cancelled' },
                        ]}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={3}>
                      <Button
                        onClick={() => {
                          setSearchText('');
                          setFilterCategory('');
                          setFilterPriority('');
                          setFilterStatus('');
                        }}
                        disabled={!searchText && !filterCategory && !filterPriority && !filterStatus}
                      >
                        Xóa lọc
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Card variant="borderless" className="shadow-sm">
                  <Table 
                    dataSource={filteredData} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading} 
                    pagination={{ pageSize: 15, showSizeChanger: true }} 
                    size="middle" 
                    className="rounded-xl overflow-hidden" 
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'progress',
            label: (
              <span className="font-semibold flex items-center gap-1.5 px-2 py-1">
                <BarChartOutlined /> 📊 Tiến độ theo Phòng ban & Nhân sự
              </span>
            ),
            children: (
              <div className="space-y-6">
                {/* 1. Bảng Tiến độ theo Phòng ban */}
                <Card 
                  title={(
                    <span className="font-bold flex items-center gap-2 text-slate-800">
                      <ApartmentOutlined className="text-amber-500 text-lg" />
                      Tiến độ Phân giao & Hoàn thành Công việc theo Phòng Ban
                    </span>
                  )}
                  variant="borderless" 
                  className="shadow-sm rounded-2xl"
                >
                  <Table
                    dataSource={departmentStats}
                    columns={deptColumns}
                    rowKey="department"
                    pagination={false}
                    size="middle"
                    className="rounded-xl overflow-hidden"
                  />
                </Card>

                {/* 2. Bảng Tiến độ & Tải công việc theo Nhân sự */}
                <Card 
                  title={(
                    <span className="font-bold flex items-center gap-2 text-slate-800">
                      <TeamOutlined className="text-blue-500 text-lg" />
                      Theo dõi Tiến độ, Tải công việc & Trễ hạn từng Nhân sự (KTV)
                    </span>
                  )}
                  variant="borderless" 
                  className="shadow-sm rounded-2xl"
                >
                  <Table
                    dataSource={personnelStats}
                    columns={personnelColumns}
                    rowKey="userId"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    size="middle"
                    className="rounded-xl overflow-hidden"
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default GeneralTasks;
