import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, Select, Tag, DatePicker, message, InputNumber, Row, Col, Tabs, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, CloseCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;


const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  Submitted: 'orange',
  Approved: 'green',
  Rejected: 'red'
};

const TimesheetPage: React.FC = () => {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    Draft: t('auditTemplates.draft', 'Bản nháp'),
    Submitted: t('auditEngagements.statusLabels.Review', 'Chờ duyệt'),
    Approved: t('workingPapers.status.Approved', 'Đã duyệt'),
    Rejected: t('workingPapers.status.Rejected', 'Từ chối')
  };

  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('my-timesheets');
  
  const selectedEngagementId = Form.useWatch('engagementId', form);
  const watchDate = Form.useWatch('date', form);
  const watchHours = Form.useWatch('hours', form);
  const watchEngagementId = Form.useWatch('engagementId', form);
  const watchTaskId = Form.useWatch('taskId', form);
  const watchDescription = Form.useWatch('description', form);
  const watchStatus = Form.useWatch('status', form);
  
  const [txId] = useState(() => Math.floor(100 + Math.random() * 900));
  
  // Load current user from localStorage
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : { id: 1, username: 'admin', fullName: t('timesheet.administrator', 'Quản trị viên') };

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'my-timesheets' 
        ? `/timesheets?username=${currentUser.username}` 
        : `/timesheets?status=Submitted`;
      const res = await api.get(url);
      setTimesheets(res.data);
    } catch (error) {
      message.error(t('timesheet.messages.loadError', 'Lỗi khi tải dữ liệu timesheet'));
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagements = async () => {
    try {
      const res = await api.get('/audit-engagements');
      setEngagements(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTasks = async (engagementId: number) => {
    try {
      const res = await api.get(`/audit-tasks?engagementId=${engagementId}`);
      setTasks(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTimesheets();
    fetchEngagements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleEngagementChange = (value: number) => {
    form.setFieldsValue({ taskId: undefined });
    if (value) {
      fetchTasks(value);
    } else {
      setTasks([]);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), status: 'Draft' });
    setTasks([]);
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    form.resetFields();
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    });
    if (record.engagementId) {
      fetchTasks(record.engagementId);
    } else {
      setTasks([]);
    }
    setIsModalVisible(true);
  };


  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const engagement = engagements.find(e => e.id === values.engagementId);
      const task = tasks.find(t => t.id === values.taskId);

      const payload = {
        ...values,
        userId: currentUser.id,
        username: currentUser.username,
        date: values.date.format('YYYY-MM-DD'),
        engagementName: engagement?.name,
        taskName: task?.title,
      };

      if (values.id) {
        await api.patch(`/timesheets/${values.id}`, payload);
        message.success(t('timesheet.messages.updateSuccess', 'Cập nhật timesheet thành công'));
      } else {
        await api.post('/timesheets', payload);
        message.success(t('timesheet.messages.addSuccess', 'Thêm timesheet thành công'));
      }
      
      setIsModalVisible(false);
      fetchTimesheets();
    } catch (error) {
      console.log('Validate Failed:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/timesheets/${id}`);
      message.success(t('timesheet.messages.deleteSuccess', 'Đã xóa timesheet'));
      fetchTimesheets();
    } catch (error) {
      message.error(t('auditEngagements.errorWhileDeleting', 'Lỗi khi xóa'));
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/timesheets/${id}`, { status });
      message.success(`Đã chuyển trạng thái thành ${STATUS_LABELS[status]}`);
      fetchTimesheets();
    } catch (error) {
      message.error(t('timesheet.messages.statusError', 'Lỗi cập nhật trạng thái'));
    }
  };

  const columns = [
    { 
      title: t('timesheet.table.date', 'Ngày làm việc'), 
      dataIndex: 'date', 
      key: 'date',
      ...getColumnSearchProps<any>('date', 'Ngày làm việc'),
      sorter: getColumnSorter<any>('date', 'date'),
      render: (text: string) => dayjs(text).format('DD/MM/YYYY')
    },
    { 
      title: t('timesheet.table.employee', 'Nhân viên'), 
      dataIndex: 'username', 
      key: 'username',
      ...getColumnSearchProps<any>('username', 'Nhân viên'),
      sorter: getColumnSorter<any>('username', 'string'),
      render: (text: string) => <Text strong>{text}</Text>
    },
    { 
      title: t('workingPapers.cols.planName', 'Cuộc kiểm toán'), 
      dataIndex: 'engagementName', 
      key: 'engagementName',
      ...getColumnSelectFilterProps<any>('engagementName', undefined, timesheets, (r) => r.engagementName || ''),
      sorter: getColumnSorter<any>('engagementName', 'string'),
      render: (text: string) => text || '-'
    },
    { 
      title: t('timesheet.table.task', 'Công việc / Nhiệm vụ'), 
      dataIndex: 'taskName', 
      key: 'taskName',
      ...getColumnSearchProps<any>('taskName', 'Công việc'),
      sorter: getColumnSorter<any>('taskName', 'string'),
      render: (text: string, record: any) => (
        <div>
          <Text>{text || t('timesheet.table.generalWork', 'Việc chung')}</Text>
          {record.description && <div className="text-xs text-gray-500 mt-1">{record.description}</div>}
        </div>
      )
    },
    { 
      title: t('timesheet.table.hours', 'Số giờ'), 
      dataIndex: 'hours', 
      key: 'hours',
      sorter: (a: any, b: any) => (a.hours || 0) - (b.hours || 0),
      render: (val: number) => <Tag icon={<ClockCircleOutlined />} color="blue">{val}h</Tag>
    },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status',
      ...getColumnSelectFilterProps<any>('status', Object.entries(STATUS_LABELS).map(([k, v]) => ({ text: v, value: k }))),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      )
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {activeTab === 'my-timesheets' && record.status === 'Draft' && (
            <>
              <Button type="text" className="text-blue-500" onClick={() => updateStatus(record.id, 'Submitted')}>{t('timesheet.table.btnSubmit', 'Gửi duyệt')}</Button>
              <Button type="text" className="text-amber-500" onClick={() => handleEdit(record)}>{t('auditTemplates.btnEdit', 'Sửa')}</Button>
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
            </>
          )}
          {activeTab === 'approvals' && record.status === 'Submitted' && (
            <>
              <Button type="text" className="text-green-500" icon={<CheckCircleOutlined />} onClick={() => updateStatus(record.id, 'Approved')}>{t('auditPlan.actions.approve', 'Duyệt')}</Button>
              <Button type="text" className="text-red-500" icon={<CloseCircleOutlined />} onClick={() => updateStatus(record.id, 'Rejected')}>{t('workingPapers.status.Rejected', 'Từ chối')}</Button>
            </>
          )}
        </Space>
      )
    }
  ];

  if (isModalVisible) {
    return (
      <div style={{ background: '#f8f9fa', minHeight: '100%', padding: '4px' }}>
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <Button 
            onClick={() => setIsModalVisible(false)}
            icon={<CloseCircleOutlined />}
            style={{ borderColor: '#ea9105', color: '#ea9105', fontWeight: 600, borderRadius: 8 }}
          >
            {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
          </Button>
          <Title level={4} className="!mb-0" style={{ color: '#0f172a', fontWeight: 800 }}>
            {form.getFieldValue('id') ? [t('timesheet.timesheetUpdate', 'CẬP NHẬT GIỜ CÔNG (TIMESHEET)')] : t('timesheet.recordingNewWorkHours', 'GHI NHẬN GIỜ CÔNG MỚI')}
          </Title>
          <Space>
            <Button onClick={() => setIsModalVisible(false)} style={{ borderRadius: 8 }}>{t('auditTemplates.form.btnCancel', 'Hủy bỏ')}</Button>
            <Button 
              type="primary" 
              onClick={handleSave}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
            >
              {t('timesheet.form.btnSave', 'Lưu lại')}
            </Button>
          </Space>
        </div>

        {/* 2-Column Grid */}
        <Row gutter={[24, 24]}>
          {/* Left column: Form Editor */}
          <Col xs={24} lg={14}>
            <Card variant="borderless" className="shadow-sm rounded-xl" title={<span style={{ color: '#ea9105', fontWeight: 700 }}>{t('timesheet.form.cardFormTitle', 'Thông tin ghi nhận chi tiết')}</span>}>
              <Form form={form} layout="vertical">
                <Form.Item name="id" hidden><Input /></Form.Item>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="date" label={t('timesheet.table.date', 'Ngày làm việc')} rules={[{ required: true, message: t('timesheet.form.validDate', 'Vui lòng chọn ngày làm việc') }]}>
                      <DatePicker className="w-full" format="DD/MM/YYYY" style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="hours" label={t('timesheet.form.labelHours', 'Số giờ thực hiện')} rules={[{ required: true, message: t('timesheet.form.validHours', 'Vui lòng nhập số giờ công') }]}>
                      <InputNumber min={0.5} max={24} step={0.5} className="w-full" addonAfter={t('timesheet.form.hoursUnit', 'giờ')} style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="engagementId" label={t('timesheet.form.labelEngagement', 'Cuộc kiểm toán liên kết (Tùy chọn)')}>
                      <Select 
                        placeholder={t('auditExpenses.form.validEngagement', 'Chọn cuộc kiểm toán')} 
                        onChange={handleEngagementChange} 
                        allowClear 
                        showSearch 
                        optionFilterProp="children"
                        style={{ borderRadius: 8 }}
                      >
                        {engagements
                          .filter(e => {
                            const currentId = form.getFieldValue('engagementId');
                            return e.id === currentId || e.status !== 'Completed';
                          })
                          .map(e => <Option key={e.id} value={e.id}>{e.name}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      name="taskId" 
                      label={t('timesheet.form.labelTask', 'Nhiệm vụ trên Kanban (Tùy chọn)')}
                      extra={
                        selectedEngagementId && tasks.length === 0 ? (
                          <div style={{ marginTop: 4, lineHeight: '1.4' }}>
                            <Text type="warning" style={{ fontSize: 12 }}>
                              ⚠️ Cuộc kiểm toán này chưa có nhiệm vụ nào trên Kanban. Bạn có thể để trống ghi nhận t('timesheet.table.generalWork', 'Việc chung').
                            </Text>
                          </div>
                        ) : null
                      }
                    >
                      <Select placeholder={t('timesheet.form.placeholderTask', 'Chọn nhiệm vụ')} disabled={!selectedEngagementId} allowClear style={{ borderRadius: 8 }}>
                        {tasks.map(t => <Option key={t.id} value={t.id}>{t.title}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label={t('timesheet.form.labelDesc', 'Chi tiết công việc đã thực hiện')}>
                  <TextArea rows={4} placeholder={t('timesheet.form.placeholderDesc', 'Mô tả cụ thể bạn đã làm những gì, kết quả đạt được...')} style={{ borderRadius: 8 }} />
                </Form.Item>
                
                <Form.Item name="status" label={t('timesheet.form.labelStatus', 'Trạng thái phê duyệt')} rules={[{ required: true }]}>
                  <Select style={{ borderRadius: 8 }}>
                    <Option value="Draft">{t('timesheet.form.optDraft', 'Bản nháp (Có thể chỉnh sửa tiếp)')}</Option>
                    <Option value="Submitted">{t('timesheet.form.optSubmit', 'Gửi duyệt ngay tới Trưởng đoàn')}</Option>
                  </Select>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Right column: Voucher and Guidelines */}
          <Col xs={24} lg={10}>
            {/* Timesheet Voucher Preview */}
            <Card variant="borderless" className="shadow-sm rounded-xl mb-6 bg-gradient-to-br from-amber-50 to-orange-100/30" title={<span style={{ color: '#ea9105', fontWeight: 700 }}>{t('timesheet.form.voucherTitle', 'Voucher xem trước Timesheet')}</span>}>
              <div style={{
                background: '#fff',
                border: '2px dashed #ea9105',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Stamp */}
                <div style={{
                  position: 'absolute',
                  top: 15,
                  right: 15,
                  border: `3px solid ${watchStatus === 'Submitted' ? '#fa8c16' : '#8c8c8c'}`,
                  color: watchStatus === 'Submitted' ? '#fa8c16' : '#8c8c8c',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontWeight: 'bold',
                  fontSize: 12,
                  transform: 'rotate(15deg)',
                  textTransform: 'uppercase'
                }}>
                  {watchStatus === 'Submitted' ? [t('auditEngagements.statusLabels.Review', 'Chờ duyệt')] : t('auditTemplates.draft', 'Bản nháp')}
                </div>

                <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
                  <Text strong style={{ color: '#d97706', fontSize: 13, letterSpacing: 1 }}>{t('timesheet.form.voucherOrg', 'LPBANK — BAN KIỂM TOÁN NỘI BỘ')}</Text>
                  <Title level={4} style={{ color: '#0f172a', margin: '4px 0 0', fontWeight: 800 }}>{t('timesheet.workHourRecordingForm', 'PHIẾU GHI NHẬN GIỜ CÔNG')}</Title>
                  <Text type="secondary" style={{ fontSize: 11 }}>Mã giao dịch: TS-{dayjs().format('YYYYMMDD')}-{txId}</Text>
                </div>

                <Row gutter={[0, 12]} style={{ fontSize: 13 }}>
                  <Col span={8}><Text type="secondary">{t('timesheet.form.labelEmployee', 'Nhân sự:')}</Text></Col>
                  <Col span={16}><strong>{currentUser.fullName || currentUser.username}</strong></Col>

                  <Col span={8}><Text type="secondary">{t('timesheet.form.labelWorkDate', 'Ngày làm việc:')}</Text></Col>
                  <Col span={16}><strong>{watchDate ? dayjs(watchDate).format('DD/MM/YYYY') : t('timesheet.form.noDateSelected', 'Chưa chọn')}</strong></Col>

                  <Col span={8}><Text type="secondary">{t('timesheet.form.labelHoursLabel', 'Số giờ công:')}</Text></Col>
                  <Col span={16}>
                    <strong style={{ color: '#ea9105', fontSize: 16 }}>
                      {watchHours || 0} giờ
                    </strong>
                    {watchHours > 8 && (
                      <Tag color="orange" className="ml-2">Overtime</Tag>
                    )}
                  </Col>

                  <Col span={8}><Text type="secondary">{t('timesheet.form.labelEngagementLabel', 'Cuộc kiểm toán:')}</Text></Col>
                  <Col span={16}>
                    <strong>
                      {engagements.find(e => e.id === watchEngagementId)?.name || t('timesheet.form.generalWork', 'Việc chung / Remote')}
                    </strong>
                  </Col>

                  <Col span={8}><Text type="secondary">{t('timesheet.form.labelTaskLabel', 'Nhiệm vụ:')}</Text></Col>
                  <Col span={16}>
                    <strong>
                      {tasks.find(t => t.id === watchTaskId)?.title || t('timesheet.form.noTaskLinked', 'Chưa gắn nhiệm vụ Kanban')}
                    </strong>
                  </Col>

                  <Col span={24}>
                    <Divider style={{ margin: '8px 0' }} />
                  </Col>

                  <Col span={24}>
                    <Text type="secondary" className="block mb-1">{t('timesheet.form.workDescLabel', 'Mô tả công việc thực địa:')}</Text>
                    <div style={{
                      background: '#f9f9f9',
                      padding: 10,
                      borderRadius: 6,
                      minHeight: 60,
                      fontSize: 12,
                      color: '#555',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid #e8e8e8'
                    }}>
                      {watchDescription || t('timesheet.form.noDesc', 'Chưa nhập nội dung công việc...')}
                    </div>
                  </Col>
                </Row>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#bfbfbf', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                  HỆ THỐNG SMART AUDIT V3.0 — LPBANK
                </div>
              </div>
            </Card>

            {/* Timesheet Guidelines */}
            <Card variant="borderless" className="shadow-sm rounded-xl" title={<span style={{ color: '#ea9105', fontWeight: 700 }}>{t('timesheet.lpbanksWorkingHoursRegulations', 'Quy định giờ công của LPBank')}</span>}>
              <ul className="pl-4 m-0 text-xs text-gray-500 leading-relaxed" style={{ listStyleType: 'disc' }}>
                <li className="mb-2"><strong>{t('timesheet.workingHourStandards', 'Quy chuẩn giờ làm việc:')}</strong> {t('timesheet.theStandardNumberOfHoursA', 'Số giờ tiêu chuẩn một ngày là')} <strong>{t('timesheet.80Hours', '8.0 giờ')}</strong>.</li>
                <li className="mb-2"><strong>{t('timesheet.overtimeOt', 'Thời gian Overtime (OT):')}</strong> {t('timesheet.declaringWorkingHoursExceeding8Hoursday', 'Khai báo giờ công vượt quá 8 giờ/ngày sẽ được ghi nhận là Overtime và chuyển Trưởng đoàn duyệt riêng.')}</li>
                <li className="mb-2"><strong>{t('timesheet.declaringTasks', 'Khai báo nhiệm vụ:')}</strong> {t('timesheet.itIsRecommendedToAttachThe', 'Khuyến khích gắn timesheet trực tiếp với các nhiệm vụ tương ứng trên')} <strong>{t('timesheet.kanbanBoard', 'bảng Kanban')}</strong> {t('timesheet.ofTheAuditTeamToServe', 'của Đoàn kiểm toán để phục vụ đo lường tiến độ tự động bằng AI.')}</li>
                <li className="mb-2"><strong>{t('timesheet.timesheetSubmissionDeadline', 'Thời hạn nộp timesheet:')}</strong> {t('timesheet.mustCompleteAndSubmitTimesheetFor', 'Phải hoàn thành và gửi duyệt timesheet trước 17:30 mỗi thứ Sáu hàng tuần.')}</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-0">{t('timesheet.title', 'Timesheet & Báo cáo giờ công')}</Title>
          <Text type="secondary">{t('timesheet.subtitle', 'Quản lý và ghi nhận thời gian thực hiện công việc')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
          style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
        >
          {t('timesheet.btnAdd', 'Ghi nhận giờ công')}
        </Button>
      </div>

      <Card variant="borderless" className="shadow-sm rounded-xl">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'my-timesheets', label: t('timesheet.tabs.mine', 'Timesheet của tôi') },
          { key: 'approvals', label: t('timesheet.tabs.approvals', 'Chờ tôi phê duyệt') },
        ]} className="mb-4" />
        
        <Table 
          columns={columns} 
          dataSource={timesheets} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default TimesheetPage;
