import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Card, Row, Col, Typography, Tooltip, Alert } from 'antd';
import { EditOutlined, DeleteOutlined, DownloadOutlined, PlusOutlined, ThunderboltOutlined, FileTextOutlined, CheckCircleOutlined, UserOutlined, TeamOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;

const AuditMinutesTab: React.FC<{ engagementId: number }> = ({ engagementId }) => {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collating, setCollating] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchEngagementDetails = async () => {
    try {
      const res = await api.get(`/audit-engagements/${engagementId}`);
      setEngagement(res.data);
    } catch (error) {
      console.error('Lỗi tải thông tin đoàn kiểm toán:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMinutes = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-minutes?engagementId=${engagementId}`);
      setMinutes(res.data);
    } catch (error) {
      message.error('Lỗi tải danh sách Biên bản kiểm toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    if (engagementId) {
      fetchEngagementDetails();
      fetchMinutes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const handleAutoCollate = async () => {
    setCollating(true);
    message.loading({ content: 'Đang tự động bóc tách & tổng hợp dữ liệu từ các Working Papers của đoàn...', key: 'collate' });
    try {
      const res = await api.post(`/audit-minutes/auto-collate/${engagementId}`);
      message.success({ content: '🌟 Đã tự động tổng hợp toàn bộ thông tin đoàn, nhân sự và phát hiện từ các WP vào Biên bản kiểm toán (MB04)!', key: 'collate' });
      fetchMinutes();
    } catch (error: any) {
      message.error({ content: error?.response?.data?.message || 'Lỗi khi tự động tổng hợp Biên bản kiểm toán', key: 'collate' });
    } finally {
      setCollating(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    const leadName = engagement?.leadAuditorUser?.fullName || engagement?.legacyLeadAuditor || engagement?.leadAuditor || '';
    const unitName = engagement?.branchName || engagement?.auditedDepartment || engagement?.legacyAuditedDepartment || engagement?.name || '';
    const decNo = engagement?.decisionNo || '';
    
    // Format fieldwork period
    const fwStart = engagement?.fieldworkStartDate ? dayjs(engagement.fieldworkStartDate).format('DD/MM/YYYY') : '';
    const fwEnd = engagement?.fieldworkEndDate ? dayjs(engagement.fieldworkEndDate).format('DD/MM/YYYY') : '';
    const fieldworkStr = (fwStart && fwEnd) ? `Từ ngày ${fwStart} đến ngày ${fwEnd}` : '';

    // Team members formatted string if available
    let teamStr = '';
    if (engagement?.teamMembers && Array.isArray(engagement.teamMembers)) {
      teamStr = engagement.teamMembers.map((tm: any, i: number) => `${i + 1}. ${tm.fullName || tm.userId} - ${tm.role || 'Thành viên'}`).join('\n');
    }

    form.setFieldsValue({
      minuteNo: decNo ? `BBKT-${decNo}` : `BBKT-${engagementId}-${new Date().getFullYear()}`,
      decisionNumber: decNo,
      title: unitName,
      leadAuditorName: leadName,
      fieldworkPeriod: fieldworkStr,
      teamMembersText: teamStr,
      issueDate: dayjs(),
      status: 'Draft',
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      issueDate: record.issueDate ? dayjs(record.issueDate) : null,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/audit-minutes/${id}`);
      message.success('Đã xóa biên bản');
      fetchMinutes();
    } catch (error) {
      message.error('Lỗi khi xóa biên bản');
    }
  };

  const saveMinute = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        engagementId,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : null,
      };

      if (editingRecord) {
        await api.patch(`/audit-minutes/${editingRecord.id}`, payload);
        message.success('Cập nhật biên bản thành công');
      } else {
        await api.post('/audit-minutes', payload);
        message.success('Tạo biên bản thành công');
      }
      setIsModalVisible(false);
      fetchMinutes();
    } catch (error) {
      console.log('Validate Failed:', error);
    }
  };

  const handleExportWord = async (record: any, exportType: string = 'MB04_MERGED') => {
    const typeNames: Record<string, string> = {
      'MB04_TD': 'Biên bản Tín dụng (MB04 TD)',
      'MB04_PTD': 'Biên bản Phi tín dụng (MB04 PTD)',
      'MB04_PGDBD': 'Biên bản PGDBĐ / TKBĐ (MB04 PGDBĐ)',
      'MB04_MERGED': 'Biên bản Hợp nhất Toàn diện (MB04)',
    };
    message.loading({ content: `Đang kết xuất ${typeNames[exportType] || 'MB04'}...`, key: 'exporting' });
    try {
      const res = await api.get(`/audit-minutes/${record.id}/export/word?type=${exportType}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportType}_${record.minuteNo || record.id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: `Xuất file ${typeNames[exportType]} thành công!`, key: 'exporting' });
    } catch (error) {
      message.error({ content: 'Lỗi khi xuất file Word MB04', key: 'exporting' });
    }
  };

  const handleExportExcel = async (record: any, exportType: string = 'MB04_MERGED') => {
    message.loading({ content: 'Đang kết xuất Phụ lục Excel đối soát (> 1.000 dòng)...', key: 'exporting_excel' });
    try {
      const res = await api.get(`/audit-minutes/${record.id}/export/excel?type=${exportType}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bang_Ke_Doi_Soat_${exportType}_${record.minuteNo || record.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Xuất file Excel đối soát thành công (sẵn sàng chạy hàm/Pivot)!', key: 'exporting_excel' });
    } catch (error) {
      message.error({ content: 'Lỗi khi xuất file Excel đối soát', key: 'exporting_excel' });
    }
  };

  const columns = [
    { 
      title: 'Số Biên bản', 
      dataIndex: 'minuteNo', 
      key: 'minuteNo',
      width: 150,
      render: (text: string) => <span className="font-semibold text-slate-800">{text}</span>
    },
    { 
      title: 'Đơn vị / Chi nhánh', 
      dataIndex: 'auditedUnitName', 
      key: 'auditedUnitName',
      width: 200,
      ellipsis: true,
      render: (val: string, r: any) => val || r.title || 'Chi nhánh'
    },
    { 
      title: 'Trưởng đoàn', 
      dataIndex: 'leadAuditorName', 
      key: 'leadAuditorName',
      width: 170,
      ellipsis: true,
      render: (val: string) => (
        <span className="flex items-center gap-1.5 text-slate-700 truncate">
          <UserOutlined className="text-blue-500" /> {val || engagement?.legacyLeadAuditor || 'Trưởng đoàn'}
        </span>
      )
    },
    { 
      title: 'Số phát hiện', 
      dataIndex: 'findings', 
      key: 'findings',
      width: 130,
      render: (findings: any[], r: any) => {
        const count = findings ? findings.length : 0;
        return <Tag color={count > 0 ? 'volcano' : 'default'} className="font-semibold">{count} phát hiện</Tag>;
      }
    },
    { 
      title: 'Lượt Review Trưởng đoàn', 
      dataIndex: 'leadReviewCount', 
      key: 'leadReviewCount',
      width: 160,
      render: (count: number) => (
        <Space>
          <Tag color={count > 2 ? 'red' : count > 0 ? 'orange' : 'green'} className="font-semibold">
            {count || 0} lần soát xét
          </Tag>
        </Space>
      )
    },
    { 
      title: 'Ngày ký / Ban hành', 
      dataIndex: 'issueDate', 
      key: 'issueDate',
      width: 130,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-'
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      width: 110,
      render: (st: string) => (
        <Tag color={st === 'Confirmed' ? 'green' : st === 'Sent' ? 'blue' : 'orange'}>
          {st === 'Confirmed' ? 'Đã chốt' : st === 'Sent' ? 'Đã gửi' : 'Bản nháp'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 270,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const exportWordMenu = {
          items: [
            {
              key: 'MB04_TD',
              label: '📄 MB04: Tín dụng (40 Cột & Giải trình 3 cấp)',
              onClick: () => handleExportWord(record, 'MB04_TD'),
            },
            {
              key: 'MB04_PTD',
              label: '📑 MB04: Phi tín dụng (29 Bảng kê kho quỹ/User/ACQT)',
              onClick: () => handleExportWord(record, 'MB04_PTD'),
            },
            {
              key: 'MB04_PGDBD',
              label: '📮 MB04: PGDBĐ / Tiết kiệm bưu điện (VietnamPost)',
              onClick: () => handleExportWord(record, 'MB04_PGDBD'),
            },
            {
              type: 'divider' as const,
            },
            {
              key: 'MB04_MERGED',
              label: '📚 MB04: Hợp nhất Toàn diện đoàn kiểm toán',
              onClick: () => handleExportWord(record, 'MB04_MERGED'),
            },
          ],
        };

        const exportExcelMenu = {
          items: [
            {
              key: 'EXCEL_ALL',
              label: '📊 Excel: Toàn bộ bảng kê đối soát (> 1.000 dòng)',
              onClick: () => handleExportExcel(record, 'MB04_MERGED'),
            },
            {
              key: 'EXCEL_PTD',
              label: '📑 Excel: Bảng kê chi tiết Phi tín dụng & Quỹ',
              onClick: () => handleExportExcel(record, 'MB04_PTD'),
            },
            {
              key: 'EXCEL_TD',
              label: '📈 Excel: Ma trận Tín dụng 40 Cột',
              onClick: () => handleExportExcel(record, 'MB04_TD'),
            },
          ],
        };

        return (
          <Space>
            <Tooltip title="Chỉnh sửa thông tin">
              <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
            <Tooltip title="Xóa biên bản">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
            </Tooltip>
            <Dropdown menu={exportWordMenu} trigger={['click']}>
              <Button 
                type="primary" 
                size="small" 
                icon={<DownloadOutlined />} 
                className="bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold text-xs px-2.5 text-white"
              >
                Xuất Word ▾
              </Button>
            </Dropdown>
            <Dropdown menu={exportExcelMenu} trigger={['click']}>
              <Button 
                size="small" 
                icon={<FileExcelOutlined />} 
                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 font-semibold text-xs px-2.5"
              >
                Xuất Excel ▾
              </Button>
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Overview & Quick Actions Banner */}
      <Card variant="borderless" className="shadow-sm rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-orange-200">
        <Row gutter={[16, 16]} align="middle" justify="between">
          <Col xs={24} md={16}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ea9105] text-white flex items-center justify-center text-xl shadow-md">
                <FileTextOutlined />
              </div>
              <div>
                <Title level={4} className="!mb-0 text-slate-800">
                  Biên bản Kiểm toán (MB04) - Đoàn kiểm toán {engagement?.name || ''}
                </Title>
                <Text type="secondary" className="text-xs sm:text-sm text-slate-600 block mt-0.5">
                  Tự động thu thập thông tin Quyết định, Trưởng đoàn, KTV, phát hiện và mẫu sai sót từ toàn bộ Working Paper đã duyệt của đoàn.
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8} className="flex justify-end gap-2">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleAutoCollate}
              loading={collating}
              className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] text-white border-none font-semibold h-10 flex items-center gap-1.5"
            >
              ⚡ Tổng hợp tự động từ WP
            </Button>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="shadow-sm rounded-xl font-semibold h-10"
            >
              Tạo thủ công
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Minutes Table */}
      <Card variant="borderless" className="shadow-sm rounded-2xl overflow-hidden border border-slate-100">
        <Table 
          columns={columns as any} 
          dataSource={minutes} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 1290 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Edit / Create Modal */}
      <Modal
        title={editingRecord ? 'Cập nhật Biên bản kiểm toán' : 'Tạo mới Biên bản kiểm toán'}
        open={isModalVisible}
        onOk={saveMinute}
        onCancel={() => setIsModalVisible(false)}
        width={650}
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name="minuteNo" label="Số Biên bản" rules={[{ required: true, message: 'Nhập số biên bản' }]}>
                <Input placeholder="VD: BBKT-01/2026/QĐ-KTNB" className="rounded-lg h-10" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="decisionNumber" 
                label={
                  <Space>
                    <span>Số Quyết định thành lập đoàn</span>
                    {engagement?.decisionNo && <Tag color="blue" style={{ fontSize: 10 }}>Tự động kế thừa</Tag>}
                  </Space>
                }
              >
                <Input 
                  placeholder="VD: 123/2026/QĐ-KTNB" 
                  className="rounded-lg h-10" 
                  readOnly={!!engagement?.decisionNo}
                  style={engagement?.decisionNo ? { backgroundColor: '#fafafa', color: '#595959' } : {}}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item 
                name="title" 
                label={
                  <Space>
                    <span>Đơn vị / Chi nhánh được kiểm toán</span>
                    {(engagement?.branchName || engagement?.auditedDepartment) && <Tag color="green" style={{ fontSize: 10 }}>Kế thừa từ Đoàn</Tag>}
                  </Space>
                } 
                rules={[{ required: true }]}
              >
                <Input 
                  placeholder="VD: Chi nhánh Tây Nghệ An" 
                  className="rounded-lg h-10" 
                  readOnly={!!(engagement?.branchName || engagement?.auditedDepartment)}
                  style={(engagement?.branchName || engagement?.auditedDepartment) ? { backgroundColor: '#fafafa', color: '#595959' } : {}}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="leadAuditorName" 
                label={
                  <Space>
                    <span>Trưởng đoàn kiểm toán</span>
                    {(engagement?.leadAuditorUser || engagement?.legacyLeadAuditor || engagement?.leadAuditor) && <Tag color="purple" style={{ fontSize: 10 }}>Khóa theo Trưởng đoàn</Tag>}
                  </Space>
                }
              >
                <Input 
                  placeholder="VD: Nguyễn Văn A" 
                  className="rounded-lg h-10" 
                  readOnly={!!(engagement?.leadAuditorUser || engagement?.legacyLeadAuditor || engagement?.leadAuditor)}
                  style={(engagement?.leadAuditorUser || engagement?.legacyLeadAuditor || engagement?.leadAuditor) ? { backgroundColor: '#fafafa', color: '#595959' } : {}}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name="issueDate" label="Ngày ký / Ngày họp chốt">
                <DatePicker className="w-full h-10 rounded-lg" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái" initialValue="Draft">
                <Select className="h-10">
                  <Select.Option value="Draft">Bản nháp (Draft)</Select.Option>
                  <Select.Option value="Sent">Đã gửi ĐVKD (Sent)</Select.Option>
                  <Select.Option value="Confirmed">Đã chốt & Ký xác nhận (Confirmed)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="fieldworkPeriod" label="Thời gian kiểm toán thực địa">
            <Input placeholder="Từ ngày 05/01/2026 đến ngày 25/01/2026" className="rounded-lg h-10" />
          </Form.Item>

          <Form.Item name="teamMembersText" label="Thành phần Đoàn kiểm toán">
            <Input.TextArea rows={3} placeholder="1. Ông/Bà A - Trưởng đoàn&#10;2. Ông/Bà B - KTV Tín dụng&#10;3. Ông/Bà C - KTV Vận hành..." className="rounded-lg text-sm" />
          </Form.Item>

          <Form.Item name="summaryContent" label="Tóm tắt nội dung kết quả kiểm toán">
            <Input.TextArea rows={3} placeholder="Ghi chú tổng hợp kết quả..." className="rounded-lg text-sm" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AuditMinutesTab;
