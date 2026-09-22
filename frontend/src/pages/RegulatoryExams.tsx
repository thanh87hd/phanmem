import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Typography, Modal, Form, Input, DatePicker, Select, message, Tag, Space, Card, Drawer, Row, Col } from 'antd';
import { PlusOutlined, BankOutlined, FileSearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import { filterRecursive } from '../utils/excelExport';

const { Title, Text } = Typography;

const RegulatoryExams: React.FC = () => {
  const { t } = useTranslation();

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExamModalVisible, setIsExamModalVisible] = useState(false);
  const [isFindingModalVisible, setIsFindingModalVisible] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterAuthority, setFilterAuthority] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [examForm] = Form.useForm();
  const [findingForm] = Form.useForm();

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    setLoading(true);
    try {
      const res = await api.get('/regulatory-exams');
      setExams(res.data || []);
    } catch (e) {
      message.error(t('regulatoryExams.messages.loadError', 'Lỗi khi tải danh sách thanh tra'));
    } finally {
      setLoading(false);
    }
  }

  const handleCreateExam = async (values: any) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      };
      await api.post('/regulatory-exams', payload);
      message.success(t('regulatoryExams.messages.addExamSuccess', 'Thêm đợt thanh tra thành công'));
      setIsExamModalVisible(false);
      examForm.resetFields();
      fetchExams();
    } catch (e) {
      message.error(t('regulatoryExams.messages.addError', 'Lỗi khi thêm mới'));
    }
  };

  const handleCreateFinding = async (values: any) => {
    if (!selectedExam) return;
    try {
      const payload = {
        ...values,
        deadline: values.deadline?.format('YYYY-MM-DD'),
      };
      await api.post(`/regulatory-exams/${selectedExam.id}/findings`, payload);
      message.success(t('regulatoryExams.messages.addFindingSuccess', 'Thêm kết luận/kiến nghị thành công'));
      setIsFindingModalVisible(false);
      findingForm.resetFields();
      fetchExams();
      
      // Update selected exam findings in drawer
      const updatedExam = await api.get(`/regulatory-exams/${selectedExam.id}`);
      setSelectedExam(updatedExam.data);
    } catch (e) {
      message.error(t('regulatoryExams.messages.addError', 'Lỗi khi thêm mới'));
    }
  };

  const openDrawer = (exam: any) => {
    setSelectedExam(exam);
    setDrawerVisible(true);
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = filterRecursive(exam, searchText);
    const matchesAuth = !filterAuthority || exam.authority === filterAuthority;
    const matchesStat = !filterStatus || exam.status === filterStatus;
    return matchesSearch && matchesAuth && matchesStat;
  });

  const examColumns = [
    { 
      title: t('regulatoryExams.examTable.name', 'Tên đợt thanh tra/kiểm toán'), 
      dataIndex: 'title', 
      key: 'title',
      ...getColumnSearchProps<any>('title', 'Tên đợt thanh tra'),
      sorter: getColumnSorter<any>('title', 'string'),
      render: (t: string) => <Text strong>{t}</Text> 
    },
    { 
      title: t('regulatoryExams.examTable.authority', 'Cơ quan'), 
      dataIndex: 'authority', 
      key: 'authority',
      ...getColumnSelectFilterProps<any>('authority', undefined, exams),
      sorter: getColumnSorter<any>('authority', 'string'),
      render: (auth: string) => <Tag color="blue">{auth}</Tag>
    },
    { 
      title: t('regulatoryExams.examTable.startDate', 'Ngày bắt đầu'), 
      dataIndex: 'startDate', 
      key: 'startDate',
      sorter: getColumnSorter<any>('startDate', 'date')
    },
    { 
      title: t('regulatoryExams.examTable.endDate', 'Ngày kết thúc'), 
      dataIndex: 'endDate', 
      key: 'endDate',
      sorter: getColumnSorter<any>('endDate', 'date')
    },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status',
      ...getColumnSelectFilterProps<any>('status', undefined, exams),
      render: (status: string) => <Tag color={status === 'Open' ? 'orange' : 'green'}>{status}</Tag>
    },
    {
      title: t('regulatoryExams.examTable.action', 'Hành động'), 
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" icon={<FileSearchOutlined />} onClick={() => openDrawer(record)}>
          Xem Kết luận ({record.findings?.length || 0})
        </Button>
      )
    }
  ];

  const findingColumns = [
    { 
      title: t('regulatoryExams.findingTable.content', 'Nội dung Kiến nghị / Kết luận'), 
      dataIndex: 'findingTitle', 
      key: 'findingTitle',
      ...getColumnSearchProps<any>('findingTitle', 'Nội dung kiến nghị'),
      sorter: getColumnSorter<any>('findingTitle', 'string'),
    },
    { 
      title: t('regulatoryExams.findingTable.dept', 'Đơn vị liên quan'), 
      dataIndex: 'department', 
      key: 'department',
      ...getColumnSearchProps<any>('department', 'Đơn vị'),
      sorter: getColumnSorter<any>('department', 'string'),
    },
    { 
      title: t('regulatoryExams.findingTable.deadline', 'Hạn khắc phục'), 
      dataIndex: 'deadline', 
      key: 'deadline',
      sorter: getColumnSorter<any>('deadline', 'date')
    },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status',
      ...getColumnSelectFilterProps<any>('status', undefined, selectedExam?.findings || []),
      render: (status: string) => {
        const colors: any = { Open: 'red', InProgress: 'orange', Resolved: 'green' };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <Title level={3} className="!mb-1"><BankOutlined className="mr-2" />Regulatory Exam Tracker</Title>
          <Text className="text-gray-500">{t('regulatoryExams.subtitle', 'Quản lý và theo dõi các kết luận từ NHNN, Kiểm toán Nhà nước và cơ quan khác')}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsExamModalVisible(true)}>
          {t('regulatoryExams.btnAddExam', 'Thêm Đợt Thanh tra')}
        </Button>
      </div>

      {/* Toolbar Filter */}
      <Card variant="borderless" className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Tìm kiếm đợt thanh tra, cơ quan..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="Cơ quan thanh tra"
              style={{ width: '100%' }}
              value={filterAuthority || undefined}
              onChange={(val) => setFilterAuthority(val || '')}
              options={[
                { label: 'Ngân hàng Nhà nước', value: 'NHNN' },
                { label: 'Kiểm toán Nhà nước', value: 'KTNN' },
                { label: 'Cơ quan Thuế', value: 'Thuế' },
                { label: 'Bộ Công an', value: 'Bộ Công an' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ width: '100%' }}
              value={filterStatus || undefined}
              onChange={(val) => setFilterStatus(val || '')}
              options={[
                { label: 'Open (Đang thực hiện)', value: 'Open' },
                { label: 'Closed (Đã hoàn thành)', value: 'Closed' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button onClick={() => { setSearchText(''); setFilterAuthority(''); setFilterStatus(''); }} disabled={!searchText && !filterAuthority && !filterStatus}>
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" className="shadow-sm">
        <Table columns={examColumns} dataSource={filteredExams} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} />
      </Card>

      {/* Modal Create Exam */}
      <Modal
        title={t('regulatoryExams.modalExam.title', 'Thêm Đợt Thanh tra/Kiểm toán ngoài')}
        open={isExamModalVisible}
        onCancel={() => setIsExamModalVisible(false)}
        onOk={() => examForm.submit()}
      >
        <Form form={examForm} layout="vertical" onFinish={handleCreateExam}>
          <Form.Item name="title" label={t('regulatoryExams.modalExam.labelName', 'Tên đợt thanh tra')} rules={[{ required: true }]}>
            <Input placeholder={t('regulatoryExams.modalExam.placeholderName', 'VD: Thanh tra toàn diện NHNN năm 2024')} />
          </Form.Item>
          <Form.Item name="authority" label={t('regulatoryExams.modalExam.labelAuthority', 'Cơ quan thanh tra')} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="NHNN">{t('regulatoryExams.stateBankSbv', 'Ngân hàng Nhà nước (NHNN)')}</Select.Option>
              <Select.Option value={t('regulatoryExams.stateAudit', 'Kiểm toán Nhà nước')}>{t('regulatoryExams.stateAudit', 'Kiểm toán Nhà nước')}</Select.Option>
              <Select.Option value={t('regulatoryExams.taxAuthority', 'Cơ quan Thuế')}>{t('regulatoryExams.taxAuthority', 'Cơ quan Thuế')}</Select.Option>
              <Select.Option value={t('auditFindings.other', 'Khác')}>{t('auditFindings.other', 'Khác')}</Select.Option>
            </Select>
          </Form.Item>
          <Space>
            <Form.Item name="startDate" label={t('regulatoryExams.examTable.startDate', 'Ngày bắt đầu')}>
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label={t('regulatoryExams.examTable.endDate', 'Ngày kết thúc')}>
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Drawer: Exam Details & Findings */}
      <Drawer
        title={selectedExam ? `Kết luận: ${selectedExam.title}` : t('regulatoryExams.drawer.default', 'Chi tiết')}
        placement="right"
        width={800}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setIsFindingModalVisible(true)}>
            {t('regulatoryExams.drawer.btnAddFinding', 'Thêm Kết luận')}
          </Button>
        }
      >
        {selectedExam && (
          <Table 
            columns={findingColumns} 
            dataSource={selectedExam.findings || []} 
            rowKey="id" 
            pagination={false} 
          />
        )}
      </Drawer>

      {/* Modal Create Finding */}
      <Modal
        title={t('regulatoryExams.modalFinding.title', 'Thêm Kết luận / Kiến nghị thanh tra')}
        open={isFindingModalVisible}
        onCancel={() => setIsFindingModalVisible(false)}
        onOk={() => findingForm.submit()}
      >
        <Form form={findingForm} layout="vertical" onFinish={handleCreateFinding}>
          <Form.Item name="findingTitle" label={t('regulatoryExams.modalFinding.labelContent', 'Nội dung kết luận')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder={t('regulatoryExams.modalFinding.placeholderContent', 'Mô tả chi tiết kết luận hoặc kiến nghị...')} />
          </Form.Item>
          <Form.Item name="department" label={t('regulatoryExams.modalFinding.labelDept', 'Đơn vị liên quan / Đầu mối xử lý')}>
            <Input />
          </Form.Item>
          <Form.Item name="deadline" label="Hạn chót khắc phục">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RegulatoryExams;
