import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Tag, DatePicker, Card, Typography, Row, Col, Statistic, Switch, Calendar, Badge, message } from 'antd';
import { PlusOutlined, CalendarOutlined, TeamOutlined, EnvironmentOutlined, RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../services/api';
import { useCurrentUser } from '../utils/useCurrentUser';

const { Title, Text } = Typography;

const ResourceCalendar: React.FC = () => {
  const { t } = useTranslation();

  const TEAM_OPTIONS = [
    { value: 'PKT_HoiSo', label: t('auditUniverse.modal.teamHq', 'Phòng KT Hội sở & Hệ thống') },
    { value: 'PKT_DVKD', label: t('auditUniverse.modal.teamBranch', 'Phòng KT Đơn vị Kinh doanh') },
    { value: 'TongHop', label: t('auditEngagements.generalDepartment', 'Bộ phận Tổng hợp') },
  ];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [users, setUsers] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [form] = Form.useForm();

  const currentUser = useCurrentUser();
  const roleName = currentUser?.role?.name || currentUser?.role || '';
  const roleLower = roleName.toLowerCase();
  const isKtv = roleLower.includes(t('resourceCalendar.auditor', 'kiểm toán viên')) || roleLower.includes('ktv') || roleLower === t('resourceCalendar.member', 'thành viên');
  const isAdminOrLead = !isKtv || roleLower.includes('admin') || roleLower.includes(t('auditTemplates.administration', 'quản trị')) || roleLower.includes(t('resourceCalendar.prefect', 'trưởng ban')) || roleLower.includes(t('resourceCalendar.leader', 'lãnh đạo')) || roleLower.includes(t('resourceCalendar.manager', 'giám đốc'));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-schedules?month=${selectedMonth}`);
      setData(Array.isArray(res.data) ? res.data : []);
    } catch { setData([]); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(t('auditEngagements.errorLoadingPersonnelList', 'Lỗi tải danh sách nhân sự:'), error);
    }
  };

  const fetchEngagements = async () => {
    try {
      const res = await api.get('/audit-engagements');
      setEngagements(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(t('resourceCalendar.errorLoadingAuditList', 'Lỗi tải danh sách cuộc kiểm toán:'), error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    fetchEngagements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [selectedMonth]);

  const handleAiAllocate = async () => {
    setAiLoading(true);
    try {
      const currentYear = dayjs(selectedMonth + '-01').year();
      const res = await api.post('/ai/allocate-resources', { year: currentYear });
      if (res.data && res.data.success) {
        message.success(res.data.message || t('resourceCalendar.messages.aiSuccess', 'Đã phân bổ AI thành công'));
        fetchData();
      } else {
        message.error(res.data.message || t('resourceCalendar.messages.aiError', 'Lỗi khi phân bổ'));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || t('resourceCalendar.messages.aiCallError', 'Có lỗi xảy ra khi gọi AI'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    setApproveLoading(true);
    try {
      const res = await api.post('/ai/approve-resources');
      if (res.data && res.data.success) {
        message.success(res.data.message || t('resourceCalendar.messages.approveSuccess', 'Đã duyệt kế hoạch thành công'));
        fetchData();
      } else {
        message.error(res.data.message || t('resourceCalendar.messages.approveError', 'Lỗi khi duyệt'));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || t('resourceCalendar.messages.approveCallError', 'Có lỗi xảy ra khi duyệt kế hoạch'));
    } finally {
      setApproveLoading(false);
    }
  };


  const handleSave = async (values: any) => {
    try {
      const selectedUser = users.find(u => u.id === values.userId);
      const selectedEngagement = engagements.find(e => e.id === values.engagementId);

      const payload = {
        ...values,
        userName: selectedUser ? selectedUser.fullName || selectedUser.username : '',
        engagementName: selectedEngagement ? selectedEngagement.name : '',
        startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      delete payload.dateRange;
      if (editingId) {
        await api.patch(`/audit-schedules/${editingId}`, payload);
        message.success(t('resourceCalendar.messages.saveSuccess', 'Đã cập nhật'));
      } else {
        await api.post('/audit-schedules', payload);
        message.success(t('resourceCalendar.messages.addSuccess', 'Đã thêm lịch'));
      }
      setModalOpen(false); form.resetFields(); setEditingId(null); fetchData();
    } catch { message.error(t('auditExpenses.messages.saveError', 'Lỗi khi lưu')); }
  };


  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      dateRange: record.startDate && record.endDate ? [dayjs(record.startDate), dayjs(record.endDate)] : null,
    });
    setModalOpen(true);
  };

  const uniqueUsers = [...new Set(data.map(d => d.userName))].length;
  const travelCount = data.filter(d => d.travelRequired).length;

  const getListData = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    return data.filter(d => dateStr >= d.startDate && dateStr <= d.endDate);
  };

  const dateCellRender = (value: Dayjs) => {
    const items = getListData(value);
    return (
      <ul className="p-0 m-0 list-none">
        {items.slice(0, 3).map((item, i) => {
          let badgeStatus: any = 'processing';
          if (item.status === 'Proposed') badgeStatus = 'warning';
          else if (item.travelRequired) badgeStatus = 'error';

          let roleTag = 'TV';
          if (item.isBackup || item.role === t('resourceCalendar.roles.backup', 'Dự phòng')) roleTag = 'DP';
          else if (item.role?.includes(t('resourceCalendar.chief', 'Trưởng'))) roleTag = 'TD';

          return (
            <li key={i}>
              <Badge 
                status={badgeStatus} 
                text={<span className="text-xs">{item.userName} ({roleTag})</span>} 
              />
            </li>
          );
        })}
        {items.length > 3 && <li><Text type="secondary" className="text-xs">+{items.length - 3} thêm</Text></li>}
      </ul>
    );
  };

  const columns = [
    { title: 'KTV', dataIndex: 'userName', key: 'userName', render: (v: string) => <strong>{v}</strong> },
    { title: t('auditExpenses.table.engagement', 'Cuộc KT'), dataIndex: 'engagementName', key: 'engagementName', width: 220, render: (v: string) => v || <Text type="secondary">{t('executionDashboard.cols.notAssigned', 'Chưa gắn')}</Text> },
    {
      title: t('resourceCalendar.table.role', 'Vai trò'), dataIndex: 'role', key: 'role', width: 140,
      render: (v: string, r: any) => {
        if (r.isBackup || v === t('resourceCalendar.roles.backup', 'Dự phòng')) return <Tag color="magenta">{t('resourceCalendar.roles.backup', 'Dự phòng')}</Tag>;
        if (v?.includes(t('resourceCalendar.chief', 'Trưởng'))) return <Tag color="volcano">{t('auditEngagements.cols.leadAuditor', 'Trưởng đoàn')}</Tag>;
        return <Tag color="blue">{v || t('auditEngagements.member', 'Thành viên')}</Tag>;
      }
    },
    { title: t('resourceCalendar.table.from', 'Từ'), dataIndex: 'startDate', key: 'startDate', width: 110, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: t('resourceCalendar.table.to', 'Đến'), dataIndex: 'endDate', key: 'endDate', width: 110, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    {
      title: t('resourceCalendar.table.location', 'Địa điểm'), dataIndex: 'location', key: 'location', width: 160,
      render: (v: string) => <span><EnvironmentOutlined className="mr-1" />{v || t('auditeePortal.detail.unidentified', 'Chưa xác định')}</span>,
    },
    {
      title: t('resourceCalendar.table.travel', 'Công tác'), dataIndex: 'travelRequired', key: 'travelRequired', width: 100,
      render: (v: boolean) => v ? <Tag color="red">{t('resourceCalendar.travel.yes', 'Có đi CT')}</Tag> : <Tag color="green">{t('resourceCalendar.travel.no', 'Tại chỗ')}</Tag>,
    },
    {
      title: t('auditEngagements.cols.ownerTeam', 'Phòng'), dataIndex: 'teamCode', key: 'teamCode', width: 180,
      render: (v: string) => {
        const teamOpt = TEAM_OPTIONS.find(o => o.value === v);
        return <Tag>{teamOpt?.label || v || t('executionDashboard.cols.notAssigned', 'Chưa gắn')}</Tag>;
      },
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'), dataIndex: 'status', key: 'status', width: 110,
      render: (v: string) => {
        const m: Record<string, string> = { 
          Planned: 'default', 
          Confirmed: 'processing', 
          InProgress: 'warning', 
          Completed: 'success', 
          Cancelled: 'error',
          Proposed: 'purple'
        };
        const labelMap: Record<string, string> = {
          Planned: 'Planned',
          Confirmed: 'Confirmed',
          InProgress: 'InProgress',
          Completed: 'Completed',
          Cancelled: 'Cancelled',
          Proposed: t('resourceCalendar.statusLabels.proposed', 'Đề xuất AI')
        };
        return <Tag color={m[v]}>{labelMap[v] || v}</Tag>;
      },
    },
    {
      title: '', key: 'actions', width: 70,
      render: (_: any, r: any) => <Button size="small" onClick={() => handleEdit(r)}>{t('auditTemplates.btnEdit', 'Sửa')}</Button>,
    },
  ];

  const displayColumns = isAdminOrLead 
    ? columns 
    : columns.filter(col => col.key !== 'actions');

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={3} className="!mb-1">{t('resourceCalendar.title', 'Lịch Công tác & Phân bổ KTV')}</Title>
          <Text className="text-gray-500">{t('resourceCalendar.subtitle', 'Quản lý lịch trình, phân bổ nguồn lực kiểm toán viên bằng AI')}</Text>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500 mr-1">{t('resourceCalendar.viewSwitch', 'Lịch')}</span>
          <Switch checked={viewMode === 'calendar'} onChange={(v) => setViewMode(v ? 'calendar' : 'table')} />
          <DatePicker picker="month" value={dayjs(selectedMonth + '-01')} onChange={(v) => v && setSelectedMonth(v.format('YYYY-MM'))} className="mr-2" />
          
          {isAdminOrLead && (
            <>
              <Button 
                type="dashed" 
                style={{ borderColor: '#722ed1', color: '#722ed1' }}
                icon={<RobotOutlined />}
                onClick={handleAiAllocate}
                loading={aiLoading}
              >
                {t('resourceCalendar.btnAiAllocate', 'Tự động phân bổ bằng AI')}
              </Button>
    
              <Button 
                type="primary" 
                ghost
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                icon={<CheckCircleOutlined />}
                onClick={handleApprovePlan}
                loading={approveLoading}
              >
                {t('resourceCalendar.btnApprovePlan', 'Duyệt kế hoạch')}
              </Button>
    
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>{t('resourceCalendar.btnAdd', 'Thêm lịch')}</Button>
            </>
          )}
        </div>
      </div>

      <Row gutter={16} className="mb-4">
        <Col span={8}><Card variant="borderless" className="shadow-sm"><Statistic title={t('resourceCalendar.kpis.monthly', 'Lịch trong tháng')} value={data.length} prefix={<CalendarOutlined />} /></Card></Col>
        <Col span={8}><Card variant="borderless" className="shadow-sm"><Statistic title={t('resourceCalendar.kpis.auditors', 'KTV được phân công')} value={uniqueUsers} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={8}><Card variant="borderless" className="shadow-sm"><Statistic title={t('resourceCalendar.kpis.travel', 'Có đi công tác')} value={travelCount} prefix={<EnvironmentOutlined />} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>

      {viewMode === 'calendar' ? (
        <Card variant="borderless" className="shadow-sm">
          <Calendar cellRender={(date, info) => info.type === 'date' ? dateCellRender(date) : null} />
        </Card>
      ) : (
        <Card variant="borderless" className="shadow-sm">
          <Table dataSource={data} columns={displayColumns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
        </Card>
      )}

      <Modal forceRender title={editingId ? [t('resourceCalendar.modal.titleEdit', 'Sửa lịch')] : t('resourceCalendar.modal.titleAdd', 'Thêm lịch công tác')} open={modalOpen} onCancel={() => { setModalOpen(false); setEditingId(null); }} footer={null} width={550}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="userId" label="KTV" rules={[{ required: true, message: t('auditFindings.pleaseChooseKtv', 'Vui lòng chọn KTV') }]}>
            <Select placeholder={t('auditEngagements.chooseKtv', 'Chọn KTV')} showSearch optionFilterProp="children">
              {users.map(u => (
                <Select.Option key={u.id} value={u.id}>
                  {u.fullName} ({u.jobTitle || u.username})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="engagementId" label={t('workingPapers.cols.planName', 'Cuộc kiểm toán')}>
            <Select placeholder={t('resourceCalendar.selectAuditIfAny', 'Chọn cuộc kiểm toán (nếu có)')} allowClear showSearch optionFilterProp="children">
              {engagements
                .filter(e => {
                  // Luôn hiển thị cuộc kiểm toán hiện tại của lịch đang sửa (kể cả đã hoàn thành) để tránh mất hiển thị
                  const currentId = form.getFieldValue('engagementId');
                  return e.id === currentId || e.status !== 'Completed';
                })
                .map(e => (
                  <Select.Option key={e.id} value={e.id}>
                    {e.name} {e.status === 'Completed' ? [t('resourceCalendar.completed', '(Đã hoàn thành)')] : `(${e.status})`}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label={t('workingPapers.time', 'Thời gian')} rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}><Form.Item name="location" label={t('resourceCalendar.table.location', 'Địa điểm')}><Input placeholder={t('resourceCalendar.forExampleBacNinhBranch', 'VD: Chi nhánh Bắc Ninh')} /></Form.Item></Col>
            <Col span={12}><Form.Item name="teamCode" label={t('auditEngagements.cols.ownerTeam', 'Phòng')}><Select options={TEAM_OPTIONS} placeholder={t('resourceCalendar.selectRoom', 'Chọn phòng')} /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label={t('resourceCalendar.table.role', 'Vai trò')}>
                <Select placeholder={t('auditEngagements.selectRole', 'Chọn vai trò')}>
                  <Select.Option value={t('auditEngagements.headOfAuditTeam', 'Trưởng đoàn kiểm toán')}>{t('auditEngagements.headOfAuditTeam', 'Trưởng đoàn kiểm toán')}</Select.Option>
                  <Select.Option value={t('auditEngagements.member', 'Thành viên')}>{t('auditEngagements.member', 'Thành viên')}</Select.Option>
                  <Select.Option value={t('resourceCalendar.roles.backup', 'Dự phòng')}>{t('resourceCalendar.roles.backup', 'Dự phòng')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isBackup" label={t('resourceCalendar.isTheKtvBackup', 'Là KTV dự phòng?')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="travelRequired" label={t('resourceCalendar.goingOnABusinessTrip', 'Có đi công tác?')} valuePropName="checked"><Switch /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label={t('auditTemplates.cols.status', 'Trạng thái')}>
                <Select placeholder={t('regulatoryKB.form.placeholderStatus', 'Chọn trạng thái')}>
                  <Select.Option value="Proposed">{t('resourceCalendar.statusLabels.proposed', 'Đề xuất AI')}</Select.Option>
                  <Select.Option value="Planned">Planned</Select.Option>
                  <Select.Option value="Confirmed">Confirmed</Select.Option>
                  <Select.Option value="InProgress">InProgress</Select.Option>
                  <Select.Option value="Completed">Completed</Select.Option>
                  <Select.Option value="Cancelled">Cancelled</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label={t('auditPlan.cols.notes', 'Ghi chú')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>{t('common.save', 'Lưu')}</Button></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResourceCalendar;
