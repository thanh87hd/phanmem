import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Tag, DatePicker, Card, Typography, Row, Col, Statistic, InputNumber, Progress, message, Divider, Space } from 'antd';
import { PlusOutlined, TrophyOutlined, BookOutlined, WarningOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { useCurrentUser } from '../utils/useCurrentUser';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;

const CPE_TARGET = 40; // IIA yêu cầu 40 giờ CPE/năm

const TrainingCPE: React.FC = () => {
  const { t } = useTranslation();

  const TRAINING_CATEGORIES = [
    { value: 'Technical', label: t('trainingCPE.expertise', '💻 Chuyên môn') },
    { value: 'Leadership', label: t('trainingCPE.management', '👔 Quản lý') },
    { value: 'Compliance', label: t('trainingCPE.compliance', '📋 Tuân thủ') },
    { value: 'SoftSkills', label: t('trainingCPE.softSkills', '🤝 Kỹ năng mềm') },
    { value: 'Other', label: t('auditExpenses.categories.other', '📌 Khác') },
  ];

  const [records, setRecords] = useState<any[]>([]);
  const [cpeSummary, setCpeSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'summary'>('records');
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<any>({ category: 'Technical', cpeHours: 10 });
  const currentUser = useCurrentUser();
  const currentYear = new Date().getFullYear();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        api.get(`/training?year=${currentYear}`).catch(() => ({ data: [] })),
        api.get(`/training/cpe-summary?year=${currentYear}`).catch(() => ({ data: null })),
      ]);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setCpeSummary(summaryRes.data);
    } catch { setRecords([]); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values: any) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
        userId: currentUser.id,
        userName: currentUser.fullName || currentUser.username,
        year: currentYear,
      };
      if (editingId) {
        await api.patch(`/training/${editingId}`, payload);
        message.success(t('resourceCalendar.messages.saveSuccess', 'Đã cập nhật'));
      } else {
        await api.post('/training', payload);
        message.success(t('trainingCPE.messages.addSuccess', 'Đã thêm khóa đào tạo'));
      }
      setModalOpen(false); 
      form.resetFields(); 
      setFormValues({ category: 'Technical', cpeHours: 10 });
      setEditingId(null); 
      fetchData();
    } catch { message.error(t('auditExpenses.messages.saveError', 'Lỗi khi lưu')); }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    const initialValues = {
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
    };
    form.setFieldsValue(initialValues);
    setFormValues(initialValues);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setFormValues({ category: 'Technical', cpeHours: 10 });
    setModalOpen(true);
  };

  const myRecords = records.filter(r => r.userId === currentUser.id);
  const myTotalCpe = myRecords.reduce((s, r) => s + Number(r.cpeHours || 0), 0);
  const myProgress = Math.min(100, Math.round((myTotalCpe / CPE_TARGET) * 100));

  const summaryColumns = [
    { 
      title: 'KTV', 
      dataIndex: 'userName', 
      key: 'userName', 
      ...getColumnSearchProps<any>('userName', 'KTV'),
      sorter: getColumnSorter<any>('userName', 'string'),
      render: (v: string) => <strong>{v}</strong> 
    },
    { 
      title: t('trainingCPE.summaryTable.courses', 'Số khóa'), 
      dataIndex: 'courses', 
      key: 'courses', 
      width: 90,
      sorter: (a: any, b: any) => (a.courses || 0) - (b.courses || 0),
    },
    { 
      title: t('trainingCPE.summaryTable.cpeHours', 'Giờ CPE'), 
      dataIndex: 'totalCpe', 
      key: 'totalCpe', 
      width: 100, 
      sorter: (a: any, b: any) => (a.totalCpe || 0) - (b.totalCpe || 0),
      render: (v: number) => <strong>{v}</strong> 
    },
    { 
      title: t('trainingCPE.summaryTable.target', 'Mục tiêu'), 
      dataIndex: 'target', 
      key: 'target', 
      width: 90,
      sorter: (a: any, b: any) => (a.target || 0) - (b.target || 0),
    },
    { 
      title: t('trainingCPE.summaryTable.remaining', 'Còn thiếu'), 
      dataIndex: 'remaining', 
      key: 'remaining', 
      width: 100, 
      sorter: (a: any, b: any) => (a.remaining || 0) - (b.remaining || 0),
      render: (v: number) => v > 0 ? <Text type="danger">{v} giờ</Text> : <Text type="success">{t('trainingCPE.summaryTable.met', 'Đủ')}</Text> 
    },
    {
      title: t('auditeePortal.table.progress', 'Tiến độ'), 
      key: 'progress', 
      width: 200,
      render: (_: any, r: any) => <Progress percent={Math.min(100, Math.round((r.totalCpe / r.target) * 100))} size="small" status={r.isCompliant ? 'success' : 'normal'} />,
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'isCompliant', 
      key: 'isCompliant', 
      width: 120,
      ...getColumnSelectFilterProps<any>('isCompliant', [
        { text: '✅ Đạt', value: true },
        { text: '⚠️ Chưa đạt', value: false },
      ]),
      sorter: (a: any, b: any) => Number(a.isCompliant) - Number(b.isCompliant),
      render: (v: boolean) => v ? <Tag color="success">✅ Đạt</Tag> : <Tag color="warning">⚠️ Chưa đạt</Tag>,
    },
  ];

  const recordColumns = [
    { 
      title: t('trainingCPE.recordTable.courseName', 'Khóa đào tạo'), 
      dataIndex: 'courseName', 
      key: 'courseName', 
      ...getColumnSearchProps<any>('courseName', 'Khóa đào tạo'),
      sorter: getColumnSorter<any>('courseName', 'string'),
      render: (v: string) => <strong>{v}</strong> 
    },
    { 
      title: t('trainingCPE.recordTable.provider', 'Nhà cung cấp'), 
      dataIndex: 'provider', 
      key: 'provider', 
      width: 150,
      ...getColumnSearchProps<any>('provider', 'Nhà cung cấp'),
      sorter: getColumnSorter<any>('provider', 'string'),
    },
    {
      title: t('auditEngagements.cols.type', 'Loại'), 
      dataIndex: 'category', 
      key: 'category', 
      width: 130,
      ...getColumnSelectFilterProps<any>('category', TRAINING_CATEGORIES.map(t => ({ text: t.label, value: t.value }))),
      sorter: getColumnSorter<any>('category', 'string'),
      render: (v: string) => { const c = TRAINING_CATEGORIES.find(t => t.value === v); return c?.label || v; },
    },
    { 
      title: t('trainingCPE.summaryTable.cpeHours', 'Giờ CPE'), 
      dataIndex: 'cpeHours', 
      key: 'cpeHours', 
      width: 90, 
      sorter: (a: any, b: any) => (a.cpeHours || 0) - (b.cpeHours || 0),
      render: (v: number) => <strong>{v}</strong> 
    },
    { 
      title: t('resourceCalendar.table.from', 'Từ'), 
      dataIndex: 'startDate', 
      key: 'startDate', 
      width: 110, 
      ...getColumnSearchProps<any>('startDate', 'Từ ngày'),
      sorter: getColumnSorter<any>('startDate', 'date'),
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' 
    },
    { 
      title: t('resourceCalendar.table.to', 'Đến'), 
      dataIndex: 'endDate', 
      key: 'endDate', 
      width: 110, 
      ...getColumnSearchProps<any>('endDate', 'Đến ngày'),
      sorter: getColumnSorter<any>('endDate', 'date'),
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' 
    },
    { 
      title: 'KTV', 
      dataIndex: 'userName', 
      key: 'userName', 
      width: 130,
      ...getColumnSearchProps<any>('userName', 'KTV'),
      sorter: getColumnSorter<any>('userName', 'string'),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'), key: 'actions', width: 100,
      render: (_: any, r: any) => <Button size="small" onClick={() => handleEdit(r)}>{t('auditTemplates.btnEdit', 'Sửa')}</Button>,
    },
  ];

  if (modalOpen) {
    const previewCategory = TRAINING_CATEGORIES.find(c => c.value === (formValues.category || 'Technical'))?.label || formValues.category || t('trainingCPE.expertise', '💻 Chuyên môn');
    const previewCpe = Number(formValues.cpeHours || 0);
    const futureTotalCpe = myTotalCpe + previewCpe;
    const futureProgress = Math.min(100, Math.round((futureTotalCpe / CPE_TARGET) * 100));

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
                  {editingId ? [t('trainingCPE.form.titleEdit', 'Hiệu chỉnh Thông tin Khóa Đào tạo')] : t('trainingCPE.form.titleAdd', 'Khai báo Khóa Đào tạo / Giờ CPE Mới')}
                </Title>
                <Tag color={editingId ? 'orange' : 'green'} className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs">
                  {editingId ? [t('auditEngagements.update', 'Cập nhật')] : t('generalTasks.form.tagCreate', 'Tạo mới')}
                </Tag>
              </div>
              <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
                {t('trainingCPE.documentProfessionalTrainingCoursesInternationalCertifications', 'Ghi nhận các khóa đào tạo chuyên môn, chứng chỉ quốc tế và giờ CPE để duy trì tính tuân thủ của kiểm toán viên.')}
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
              {editingId ? [t('auditEngagements.update', 'Cập nhật')] : t('trainingCPE.form.btnSave', 'Lưu khóa học')}
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
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item name="courseName" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelCourseName', 'Tên khóa đào tạo / Hội thảo / Chứng chỉ')}</span>} rules={[{ required: true, message: t('trainingCPE.form.validCourseName', 'Nhập tên khóa đào tạo') }]}>
                      <Input placeholder="Ví dụ: Cập nhật chuẩn IIA 2025, Chứng chỉ CIA Part 1, Cyber Security Seminar..." className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="provider" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelProvider', 'Đơn vị tổ chức / Nhà cung cấp')}</span>}>
                      <Input placeholder={t('trainingCPE.form.placeholderProvider', 'Ví dụ: IIA Vietnam, Big4, SmartTrain...')} className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="category" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelCategory', 'Phân loại đào tạo')}</span>} initialValue="Technical">
                      <Select options={TRAINING_CATEGORIES} className="h-11 rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Form.Item name="cpeHours" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelCpeHours', 'Số giờ CPE đạt được')}</span>} rules={[{ required: true, message: t('trainingCPE.form.validCpeHours', 'Nhập số giờ CPE') }]}>
                      <InputNumber className="w-full h-11 rounded-xl border-slate-200 flex items-center" min={0} max={120} step={0.5} placeholder={t('trainingCPE.form.placeholderCpeHours', 'Ví dụ: 10')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="startDate" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelStartDate', 'Ngày bắt đầu học')}</span>}>
                      <DatePicker className="w-full h-11 rounded-xl border-slate-200" format="DD/MM/YYYY" placeholder={t('trainingCPE.form.placeholderDate', 'Chọn ngày')} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="endDate" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelEndDate', 'Ngày kết thúc học')}</span>}>
                      <DatePicker className="w-full h-11 rounded-xl border-slate-200" format="DD/MM/YYYY" placeholder={t('trainingCPE.form.placeholderDate', 'Chọn ngày')} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="notes" label={<span className="font-semibold text-slate-700 text-sm">{t('trainingCPE.form.labelNotes', 'Ghi chú thêm')}</span>}>
                  <Input.TextArea rows={4} placeholder={t('trainingCPE.form.placeholderNotes', 'Mô tả nội dung chính khóa học, kết quả thu hoạch...')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]" />
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
                    {editingId ? [t('trainingCPE.form.btnSaveEditFull', 'Cập nhật khóa học')] : t('trainingCPE.form.btnSave', 'Lưu khóa học')}
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card 
              className="border border-slate-100 rounded-2xl shadow-md overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 text-white"
              styles={{ body: {} }}
            >
              <div className="bg-[#ea9105] p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrophyOutlined className="text-xl" />
                  <span className="font-bold tracking-wide uppercase text-sm">{t('trainingCPE.cpeDeclarationCertificate', 'Chứng Chỉ Khai Báo CPE')}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">IIA GLOBAL</span>
              </div>
              
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1 pb-3 border-b border-white/10">
                  <span className="text-xs text-slate-300 uppercase font-semibold">{t('trainingCPE.nameOfTrainingCourse', 'Tên khóa đào tạo')}</span>
                  <span className="font-bold text-base text-amber-300">{formValues.courseName || t('trainingCPE.theKeyNameHasNotBeen', 'Chưa điền tên khóa')}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-300 uppercase font-semibold block mb-1">{t('trainingCPE.organizationalUnit', 'Đơn vị tổ chức')}</span>
                    <span className="font-medium text-slate-100 text-sm">{formValues.provider || t('trainingCPE.unitsHaveNotBeenFilledIn', 'Chưa điền đơn vị')}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-300 uppercase font-semibold block mb-1">{t('auditEngagements.classify', 'Phân loại')}</span>
                    <span className="font-medium text-slate-100 text-sm">{previewCategory}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div>
                    <span className="text-xs text-slate-300 uppercase font-semibold block">{t('trainingCPE.numberOfHoursRecorded', 'Số giờ được ghi nhận')}</span>
                    <span className="text-2xl font-black text-emerald-400">{previewCpe} giờ CPE</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card 
              className="border border-slate-100 rounded-2xl shadow-sm bg-white mt-4"
              title={<span className="font-semibold text-slate-800 text-sm">📊 Dự kiến tiến độ của bạn ({currentYear})</span>}
              size="small"
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{t('trainingCPE.present', 'Hiện tại:')}</span>
                  <span className="font-semibold text-slate-800">{myTotalCpe} giờ</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{t('trainingCPE.thisCourse', 'Khóa học này:')}</span>
                  <span className="font-semibold text-[#ea9105]">{previewCpe} giờ</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">{t('trainingCPE.totalAfterCumulative', 'Tổng sau tích lũy:')}</span>
                  <span className="font-bold text-slate-900 text-sm">{futureTotalCpe} / 40 giờ</span>
                </div>

                <Progress 
                  percent={futureProgress} 
                  strokeColor={futureProgress >= 100 ? '#52c41a' : { '0%': '#ea9105', '100%': '#52c41a' }} 
                  strokeWidth={14} 
                  className="mt-1"
                />

                <div className="mt-1 text-center">
                  {futureTotalCpe >= CPE_TARGET ? (
                    <Tag color="success" className="font-semibold py-1 px-3 rounded-xl border-none shadow-3xs text-xs animate-pulse">
                      {t('trainingCPE.youWillMeetStandardIia', '🎉 BẠN SẼ ĐẠT TIÊU CHUẨN IIA!')}
                    </Tag>
                  ) : (
                    <Tag color="warning" className="font-semibold py-1 px-3 rounded-xl border-none shadow-3xs text-xs">
                      ⚠️ Cần thêm {CPE_TARGET - futureTotalCpe} giờ để hoàn thành
                    </Tag>
                  )}
                </div>
              </div>
            </Card>

            <Card 
              className="border border-slate-100 rounded-2xl shadow-sm bg-white mt-4"
              title={<span className="font-semibold text-slate-800 text-sm">{t('trainingCPE.iiaCpeRegulations', '💡 Quy định CPE của IIA')}</span>}
              size="small"
            >
              <div className="text-xs text-slate-600 flex flex-col gap-2.5">
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span>{t('trainingCPE.reachMinimum', 'Đạt tối thiểu')} <strong>{t('trainingCPE.40HoursOfCpe', '40 giờ CPE')}</strong> {t('trainingCPE.annuallyToMaintainTheOperationOf', 'hàng năm để duy trì tính hoạt động của các chứng chỉ kiểm toán quốc tế (CIA, v.v.).')}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span>{t('trainingCPE.storeAllCertificatesconfirmationOfCourseParticipation', 'Lưu trữ đầy đủ chứng chỉ/xác nhận tham gia khóa học trong vòng 3 năm để phục vụ hậu kiểm.')}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#ea9105] font-bold">▪</span>
                  <span>{t('trainingCPE.needToUpdateDiverseTopicsIncluding', 'Cần cập nhật các chủ đề đa dạng bao gồm đạo đức nghề nghiệp, kiểm toán công nghệ thông tin và quản trị rủi ro.')}</span>
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
          <Title level={3} className="!mb-1">{t('trainingCPE.title', 'Đào tạo & CPE')}</Title>
          <Text className="text-gray-500">{t('trainingCPE.subtitle', 'Theo dõi giờ đào tạo chuyên môn liên tục (40h CPE/năm theo IIA)')}</Text>
        </div>
        <div className="flex gap-2">
          <Button type={activeTab === 'records' ? 'primary' : 'default'} icon={<BookOutlined />} onClick={() => setActiveTab('records')} className="rounded-xl h-10">{t('trainingCPE.btnRecords', 'Ghi nhận')}</Button>
          <Button type={activeTab === 'summary' ? 'primary' : 'default'} icon={<TrophyOutlined />} onClick={() => setActiveTab('summary')} className="rounded-xl h-10">{t('trainingCPE.btnSummary', 'Tổng hợp CPE')}</Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
          >
            {t('trainingCPE.btnAdd', 'Thêm khóa')}
          </Button>
        </div>
      </div>

      {/* My CPE Card */}
      <Card variant="borderless" className="shadow-sm mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
        <Row gutter={16} align="middle">
          <Col span={6}><Statistic title={`CPE của tôi (${currentYear})`} value={myTotalCpe} suffix={`/ ${CPE_TARGET} giờ`} valueStyle={{ color: myTotalCpe >= CPE_TARGET ? '#52c41a' : '#faad14' }} /></Col>
          <Col span={12}><Progress percent={myProgress} strokeColor={myProgress >= 100 ? '#52c41a' : { '0%': '#108ee9', '100%': '#87d068' }} strokeWidth={20} className="rounded-full" /></Col>
          <Col span={6}>{myTotalCpe >= CPE_TARGET ? <Tag color="success" className="text-base py-1 px-3 rounded-xl border-none font-semibold shadow-3xs">{t('trainingCPE.meetsIiaRequirements', '✅ Đạt yêu cầu IIA')}</Tag> : <Tag color="warning" className="text-base py-1 px-3 rounded-xl border-none font-semibold shadow-3xs">⚠️ Còn thiếu {CPE_TARGET - myTotalCpe} giờ</Tag>}</Col>
        </Row>
      </Card>

      {activeTab === 'records' ? (
        <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-100" title={t('trainingCPE.cardRecords', 'Danh sách khóa đào tạo')}>
          <Table dataSource={records} columns={recordColumns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" className="rounded-xl overflow-hidden" />
        </Card>
      ) : (
        <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-100" title={`Tổng hợp CPE toàn Khối — Năm ${currentYear}`}>
          {cpeSummary && (
            <Row gutter={16} className="mb-4">
              <Col span={8}><Statistic title={t('evidenceManager.labels.passed', 'Đạt yêu cầu')} value={cpeSummary.totalCompliant} valueStyle={{ color: '#52c41a' }} prefix={<TrophyOutlined />} /></Col>
              <Col span={8}><Statistic title={t('trainingCPE.summaryTable.nonCompliant', 'Chưa đạt')} value={cpeSummary.totalNonCompliant} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} /></Col>
              <Col span={8}><Statistic title={t('trainingCPE.generalKtv', 'Tổng KTV')} value={(cpeSummary.totalCompliant || 0) + (cpeSummary.totalNonCompliant || 0)} /></Col>
            </Row>
          )}
          <Table dataSource={cpeSummary?.summary || []} columns={summaryColumns} rowKey="userId" loading={loading} pagination={false} size="middle" className="rounded-xl overflow-hidden" />
        </Card>
      )}
    </div>
  );
};

export default TrainingCPE;
