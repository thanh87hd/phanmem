import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Tag, DatePicker, Space, Card, Typography, Row, Col, Statistic, InputNumber, message, Divider } from 'antd';
import { PlusOutlined, DollarOutlined, PieChartOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { useCurrentUser } from '../utils/useCurrentUser';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;



const AuditExpenses: React.FC = () => {
  const { t } = useTranslation();

  const EXPENSE_CATEGORIES = [
    { value: 'Travel', label: t('auditExpenses.categories.travel', '✈️ Vé đi lại') },
    { value: 'Hotel', label: t('auditExpenses.categories.hotel', '🏨 Khách sạn') },
    { value: 'Meal', label: t('auditExpenses.categories.meal', '🍽️ Ăn uống') },
    { value: 'Transportation', label: t('auditExpenses.categories.transportation', '🚗 Di chuyển nội thành') },
    { value: 'Stationery', label: t('auditExpenses.categories.stationery', '📎 Văn phòng phẩm') },
    { value: 'Other', label: t('auditExpenses.categories.other', '📌 Khác') },
  ];

  const [data, setData] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<any>({ category: 'Travel', status: 'Draft' });
  const currentUser = useCurrentUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-expenses');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch { setData([]); }
    setLoading(false);
  };

  const fetchEngagements = async () => {
    try {
      const res = await api.get('/audit-engagements');
      const active = (res.data || []).filter((e: any) => e.status !== 'Draft' && e.status !== 'Rejected');
      setEngagements(active);
    } catch { /* ignore */ }
  };

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(); 
    fetchEngagements();
  }, []);

  const handleSave = async (values: any) => {
    try {
      const payload = {
        ...values,
        expenseDate: values.expenseDate?.format('YYYY-MM-DD'),
        submittedById: currentUser.id,
        submittedByName: currentUser.fullName || currentUser.username,
      };
      if (editingId) {
        await api.patch(`/audit-expenses/${editingId}`, payload);
        message.success(t('auditExpenses.messages.saveSuccess', 'Đã cập nhật chi phí'));
      } else {
        await api.post('/audit-expenses', payload);
        message.success(t('auditExpenses.messages.addSuccess', 'Đã thêm chi phí'));
      }
      setModalOpen(false); 
      form.resetFields(); 
      setFormValues({ category: 'Travel', status: 'Draft' });
      setEditingId(null); 
      fetchData();
    } catch { message.error(t('auditExpenses.messages.saveError', 'Lỗi khi lưu')); }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    const initialValues = { ...record, expenseDate: record.expenseDate ? dayjs(record.expenseDate) : null };
    form.setFieldsValue(initialValues);
    setFormValues(initialValues);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setFormValues({ category: 'Travel', status: 'Draft' });
    setModalOpen(true);
  };

  const totalAmount = data.reduce((s, e) => s + Number(e.amount || 0), 0);
  const approvedAmount = data.filter(e => e.status === 'Approved').reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendingAmount = data.filter(e => e.status === 'Submitted').reduce((s, e) => s + Number(e.amount || 0), 0);

  const formatMoney = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

  const columns = [
    { 
      title: t('auditExpenses.table.engagement', 'Cuộc KT'), 
      dataIndex: 'engagementName', 
      key: 'engagementName', 
      width: 200, 
      ...getColumnSelectFilterProps<any>('engagementName', undefined, data, (r) => r.engagementName || ''),
      sorter: getColumnSorter<any>('engagementName', 'string'),
      render: (v: string) => v || <Text type="secondary">{t('executionDashboard.cols.notAssigned', 'Chưa gắn')}</Text> 
    },
    {
      title: t('auditExpenses.table.category', 'Loại chi phí'), 
      dataIndex: 'category', 
      key: 'category', 
      width: 160,
      ...getColumnSelectFilterProps<any>('category', EXPENSE_CATEGORIES.map(e => ({ text: e.label, value: e.value }))),
      sorter: getColumnSorter<any>('category', 'string'),
      render: (v: string) => { const c = EXPENSE_CATEGORIES.find(e => e.value === v); return c?.label || v; },
    },
    {
      title: t('auditExpenses.table.amount', 'Số tiền'), 
      dataIndex: 'amount', 
      key: 'amount', 
      width: 140, 
      align: 'right' as const,
      sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
      render: (v: number) => <strong>{formatMoney(Number(v || 0))}</strong>,
    },
    { 
      title: t('auditReports.cols.date', 'Ngày'), 
      dataIndex: 'expenseDate', 
      key: 'expenseDate', 
      width: 110, 
      ...getColumnSearchProps<any>('expenseDate', 'Ngày'),
      sorter: getColumnSorter<any>('expenseDate', 'date'),
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' 
    },
    { 
      title: t('auditExpenses.table.submitter', 'Người nộp'), 
      dataIndex: 'submittedByName', 
      key: 'submittedByName', 
      width: 130,
      ...getColumnSearchProps<any>('submittedByName', 'Người nộp'),
      sorter: getColumnSorter<any>('submittedByName', 'string'),
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 110,
      ...getColumnSelectFilterProps<any>('status', [
        { text: t('auditExpenses.status.draft', 'Nháp'), value: 'Draft' },
        { text: t('auditEngagements.statusLabels.Review', 'Chờ duyệt'), value: 'Submitted' },
        { text: t('workingPapers.status.Approved', 'Đã duyệt'), value: 'Approved' },
        { text: t('workingPapers.status.Rejected', 'Từ chối'), value: 'Rejected' },
      ]),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (v: string) => {
        const m: Record<string, { color: string; label: string }> = { Draft: { color: 'default', label: t('auditExpenses.status.draft', 'Nháp') }, Submitted: { color: 'processing', label: t('auditEngagements.statusLabels.Review', 'Chờ duyệt') }, Approved: { color: 'success', label: t('workingPapers.status.Approved', 'Đã duyệt') }, Rejected: { color: 'error', label: t('workingPapers.status.Rejected', 'Từ chối') } };
        return <Tag color={m[v]?.color}>{m[v]?.label || v}</Tag>;
      },
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'), key: 'actions', width: 150,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" onClick={() => handleEdit(r)}>{t('auditTemplates.btnEdit', 'Sửa')}</Button>
          {r.status === 'Draft' && <Button size="small" type="primary" ghost onClick={async () => { await api.patch(`/audit-expenses/${r.id}`, { status: 'Submitted' }); fetchData(); }}>{t('auditExpenses.table.btnSubmit', 'Nộp')}</Button>}
        </Space>
      ),
    },
  ];

  if (modalOpen) {
    const previewCategory = EXPENSE_CATEGORIES.find(c => c.value === (formValues.category || 'Travel'))?.label || formValues.category || t('auditExpenses.categories.travel', '✈️ Vé đi lại');
    const previewAmount = formValues.amount || 0;
    const previewEngagement = formValues.engagementName || t('auditExpenses.preview.notLinked', 'Chưa liên kết cuộc kiểm toán');
    const previewDate = formValues.expenseDate ? formValues.expenseDate.format('DD/MM/YYYY') : t('auditExpenses.preview.noDate', 'Chưa chọn ngày');
    const previewStatus = formValues.status || 'Draft';

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
                  {editingId ? [t('auditExpenses.form.titleEdit', 'Hiệu chỉnh Chi phí Kiểm toán')] : t('auditExpenses.form.titleAdd', 'Thêm Chi phí Phát sinh Mới')}
                </Title>
                <Tag color={editingId ? 'orange' : 'green'} className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs">
                  {editingId ? [t('auditEngagements.update', 'Cập nhật')] : t('auditExpenses.form.tagCreate', 'Khởi tạo')}
                </Tag>
              </div>
              <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
                {t('auditExpenses.form.desc', 'Ghi nhận các chi phí đi lại, khách sạn, di chuyển, thực địa phát sinh phục vụ đoàn kiểm toán.')}
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
              {editingId ? [t('auditExpenses.form.btnSaveEdit', 'Cập nhật Chi phí')] : t('auditExpenses.btnAdd', 'Thêm chi phí')}
            </Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
              <Form 
                form={form} 
                layout="vertical" 
                onFinish={handleSave}
                onValuesChange={(_, allValues) => setFormValues(allValues)}
              >
                <Form.Item name="engagementName" label={<span className="font-semibold text-slate-700 text-sm">{t('workingPapers.affiliateAudit', 'Cuộc kiểm toán liên kết')}</span>} rules={[{ required: true, message: t('auditExpenses.form.validEngagement', 'Chọn cuộc kiểm toán') }]}>
                  <Select placeholder={t('auditExpenses.form.placeholderEngagement', 'Chọn cuộc kiểm toán thực tế...')} className="h-11 rounded-xl" showSearch optionFilterProp="children">
                    {engagements.map(e => <Select.Option key={e.id} value={e.name}>{e.name}</Select.Option>)}
                  </Select>
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="category" label={<span className="font-semibold text-slate-700 text-sm">{t('auditExpenses.form.labelCategory', 'Phân loại chi phí')}</span>} initialValue="Travel" rules={[{ required: true }]}>
                      <Select options={EXPENSE_CATEGORIES} className="h-11 rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="amount" label={<span className="font-semibold text-slate-700 text-sm">{t('auditExpenses.form.labelAmount', 'Số tiền chi phát sinh (VNĐ)')}</span>} rules={[{ required: true, message: t('auditExpenses.form.validAmount', 'Nhập số tiền chi') }]}>
                      <InputNumber className="w-full h-11 rounded-xl border-slate-200 flex items-center" min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v: any) => v?.replace(/,/g, '') || ''} placeholder={t('auditExpenses.form.placeholderAmount', 'Ví dụ: 5,000,000')} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="expenseDate" label={<span className="font-semibold text-slate-700 text-sm">{t('auditExpenses.form.labelDate', 'Ngày thực hiện chi')}</span>}>
                      <DatePicker className="w-full h-11 rounded-xl border-slate-200" format="DD/MM/YYYY" placeholder={t('auditExpenses.form.placeholderDate', 'Chọn ngày chi')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="status" label={<span className="font-semibold text-slate-700 text-sm">{t('auditExpenses.form.labelStatus', 'Trạng thái phê duyệt chi phí')}</span>} initialValue="Draft">
                      <Select 
                        className="h-11 rounded-xl"
                        options={[
                          { value: 'Draft', label: '📁 Nháp (Draft)' }, 
                          { value: 'Submitted', label: '🟡 Chờ duyệt (Submitted)' }, 
                          { value: 'Approved', label: '🟢 Đã duyệt (Approved)' }, 
                          { value: 'Rejected', label: '🔴 Từ chối (Rejected)' }
                        ]} 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label={<span className="font-semibold text-slate-700 text-sm">{t('auditExpenses.form.labelDesc', 'Mô tả nội dung chi tiết / Lý do chi')}</span>}>
                  <Input.TextArea rows={4} placeholder={t('auditExpenses.form.placeholderDesc', 'Ví dụ: Chi phí lưu trú khách sạn thực địa cho đoàn kiểm toán tại Chi nhánh Hải Phòng (5 ngày)...')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]" />
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
                    {editingId ? [t('auditExpenses.form.btnSaveEdit', 'Cập nhật Chi phí')] : t('auditExpenses.btnAdd', 'Thêm chi phí')}
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card 
              className="border border-slate-100 rounded-2xl shadow-md overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
              styles={{ body: {} }}
            >
              <div className="bg-[#ea9105] p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarOutlined className="text-xl" />
                  <span className="font-bold tracking-wide uppercase text-sm">{t('auditExpenses.preview.cardTitle', 'Phiếu Chi Phí Kiểm Toán')}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">LPBANK</span>
              </div>
              
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1 pb-3 border-b border-dashed border-slate-200">
                  <span className="text-xs text-slate-400 uppercase font-semibold">{t('workingPapers.cols.planName', 'Cuộc kiểm toán')}</span>
                  <span className="font-semibold text-slate-800 text-sm">{previewEngagement}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">{t('auditExpenses.table.category', 'Loại chi phí')}</span>
                    <span className="font-medium text-slate-700 text-sm">{previewCategory}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">{t('auditExpenses.preview.date', 'Ngày chi')}</span>
                    <span className="font-medium text-slate-700 text-xs">{previewDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">{t('auditExpenses.table.amount', 'Số tiền')}</span>
                    <span className="font-bold text-[#ea9105] text-base">{formatMoney(previewAmount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">{t('auditTemplates.cols.status', 'Trạng thái')}</span>
                    {(() => {
                      const m: Record<string, { color: string; label: string }> = { 
                        Draft: { color: 'default', label: t('auditExpenses.status.draft', 'Nháp') }, 
                        Submitted: { color: 'processing', label: t('auditEngagements.statusLabels.Review', 'Chờ duyệt') }, 
                        Approved: { color: 'success', label: t('workingPapers.status.Approved', 'Đã duyệt') }, 
                        Rejected: { color: 'error', label: t('workingPapers.status.Rejected', 'Từ chối') } 
                      };
                      const item = m[previewStatus] || { color: 'default', label: previewStatus };
                      return <Tag color={item.color} className="font-semibold m-0">{item.label}</Tag>;
                    })()}
                  </div>
                </div>

                {formValues.description && (
                  <div className="mt-2 p-3 bg-white rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">{t('auditExpenses.preview.detail', 'Nội dung chi tiết')}</span>
                    <p className="text-xs text-slate-600 italic mb-0 leading-relaxed line-clamp-3">
                      "{formValues.description}"
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card 
              className="border border-slate-100 rounded-2xl shadow-sm bg-white mt-4"
              title={<span className="font-semibold text-slate-800 text-sm">{t('auditExpenses.regulationsOnBusinessExpenses', '💡 Quy định Chi phí Công tác')}</span>}
              size="small"
            >
              <div className="text-xs text-slate-600 flex flex-col gap-3">
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span><strong>{t('auditExpenses.airlineTickets', 'Vé máy bay:')}</strong> {t('auditExpenses.bookARegularEconomyClassTicket', 'Đặt vé hạng phổ thông thông thường, đối chiếu hóa đơn VAT hợp lệ.')}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span><strong>{t('auditExpenses.hotelAccommodation', 'Lưu trú khách sạn:')}</strong> {t('auditExpenses.maximumLimitIs1500000VnddayFor', 'Hạn mức tối đa 1.500.000đ/ngày đối với Trưởng đoàn và 1.200.000đ/ngày đối với thành viên.')}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span><strong>{t('auditExpenses.foodAndBeveragePerDiem', 'Công tác phí ăn uống:')}</strong> {t('auditExpenses.contractNormIs200000VnddayfieldWorker', 'Định mức khoán 200.000đ/ngày/người thực địa.')}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span><strong>{t('auditExpenses.invoiceDocuments', 'Hóa đơn chứng từ:')}</strong> {t('auditExpenses.enterCorrectTaxCodeLpbankName', 'Ghi đúng Mã số thuế & tên LPBank. Chi phí trên 200k cần chuyển khoản thanh toán không dùng tiền mặt.')}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={3} className="!mb-1">{t('auditExpenses.title', 'Chi phí Kiểm toán')}</Title>
          <Text className="text-gray-500">{t('auditExpenses.subtitle', 'Quản lý ngân sách và chi phí các cuộc kiểm toán')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
          className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
        >
          {t('auditExpenses.btnAdd', 'Thêm chi phí')}
        </Button>
      </div>

      <Row gutter={16} className="mb-4">
        <Col span={8}><Card variant="borderless" className="shadow-sm"><Statistic title={t('auditExpenses.kpis.total', 'Tổng chi phí')} value={totalAmount} prefix={<DollarOutlined />} formatter={(v) => formatMoney(Number(v))} /></Card></Col>
        <Col span={8}><Card variant="borderless" className="shadow-sm"><Statistic title={t('workingPapers.status.Approved', 'Đã duyệt')} value={approvedAmount} valueStyle={{ color: '#52c41a' }} formatter={(v) => formatMoney(Number(v))} /></Card></Col>
        <Col span={8}><Card variant="borderless" className="shadow-sm"><Statistic title={t('auditEngagements.statusLabels.Review', 'Chờ duyệt')} value={pendingAmount} valueStyle={{ color: '#faad14' }} formatter={(v) => formatMoney(Number(v))} /></Card></Col>
      </Row>

      <Card variant="borderless" className="shadow-sm">
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" className="rounded-xl overflow-hidden"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><strong>{t('auditExpenses.table.totalRow', 'TỔNG CỘNG')}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><strong style={{ color: '#ea9105' }}>{formatMoney(totalAmount)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={4}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
};

export default AuditExpenses;
