import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Card,
  Modal,
  Form,
  Select,
  Tag,
  Switch,
  Input,
  DatePicker,
  Popconfirm,
  Tooltip,
  Divider,
  Row,
  Col,
  message,
} from 'antd';
import {
  SyncOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  UserSwitchOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import {
  getColumnSearchProps,
  getColumnSelectFilterProps,
  getColumnSorter,
} from '../utils/tableFilterHelper';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const IndependenceTracker: React.FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>('1');
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [rotations, setRotations] = useState<any[]>([]);
  const [coolingOffUsers, setCoolingOffUsers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal 1: Khai báo Xung đột Lợi ích
  const [isDecModalVisible, setIsDecModalVisible] = useState(false);
  const [decForm] = Form.useForm();
  const [hasConflict, setHasConflict] = useState(false);

  // Modal 2: Thiết lập Luân chuyển KTV
  const [isRotModalVisible, setIsRotModalVisible] = useState(false);
  const [rotForm] = Form.useForm();

  // Modal 3: Khai báo Cách ly Đơn vị cũ (Cooling-off)
  const [isCoolingModalVisible, setIsCoolingModalVisible] = useState(false);
  const [coolingForm] = Form.useForm();

  useEffect(() => {
    fetchData();
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMetadata() {
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/departments').catch(() => ({ data: [] })),
      ]);
      setUsersList(Array.isArray(uRes.data) ? uRes.data : []);
      setDepartmentsList(Array.isArray(dRes.data) ? dRes.data : []);
    } catch {
      // ignore
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [decRes, rotRes, coolRes, usersRes] = await Promise.all([
        api.get('/independence/declarations').catch(() => ({ data: [] })),
        api.get('/independence/rotations').catch(() => ({ data: [] })),
        api.get('/independence/cooling-off').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ]);
      setDeclarations(decRes.data || []);
      setRotations(rotRes.data || []);

      const coolData = coolRes.data || [];
      if (coolData.length > 0) {
        setCoolingOffUsers(coolData);
      } else {
        const allUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
        setCoolingOffUsers(
          allUsers.filter((u: any) => u.priorDepartments || u.coolingOffEndDate),
        );
      }
    } catch {
      message.error(t('independence.messages.loadError', 'Lỗi khi tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  }

  // --- 1. Xử lý Khai báo Xung đột ---
  const handleOpenDecModal = () => {
    decForm.resetFields();
    decForm.setFieldsValue({
      year: new Date().getFullYear(),
      hasConflict: false,
    });
    setHasConflict(false);
    setIsDecModalVisible(true);
  };

  const handleSubmitDeclaration = async () => {
    try {
      const values = await decForm.validateFields();
      await api.post('/independence/declarations', values);
      message.success(t('independence.messages.submitSuccess', 'Đã gửi bản khai báo xung đột lợi ích thành công'));
      setIsDecModalVisible(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(t('independence.messages.submitError', 'Lỗi khi gửi khai báo'));
    }
  };

  const handleApproveException = async (id: number) => {
    try {
      await api.post(`/independence/declarations/${id}/approve-exception`, {
        notes: 'Phê duyệt ngoại lệ kèm biện pháp kiểm soát giảm thiểu',
      });
      message.success('Đã phê duyệt ngoại lệ xung đột lợi ích (CAE)');
      fetchData();
    } catch {
      message.error('Lỗi khi phê duyệt ngoại lệ');
    }
  };

  const handleRejectException = async (id: number) => {
    try {
      await api.post(`/independence/declarations/${id}/reject-exception`, {
        notes: 'Từ chối ngoại lệ xung đột lợi ích',
      });
      message.success('Đã từ chối ngoại lệ xung đột');
      fetchData();
    } catch {
      message.error('Lỗi khi từ chối ngoại lệ');
    }
  };

  // --- 2. Xử lý Thiết lập Luân chuyển KTV ---
  const handleOpenRotModal = () => {
    rotForm.resetFields();
    rotForm.setFieldsValue({
      lastAuditDate: dayjs(),
      nextAllowedAuditDate: dayjs().add(3, 'year'),
      isRestricted: true,
    });
    setIsRotModalVisible(true);
  };

  const handleLastAuditDateChange = (date: any) => {
    if (date) {
      rotForm.setFieldsValue({
        nextAllowedAuditDate: dayjs(date).add(3, 'year'),
      });
    }
  };

  const handleSubmitRotation = async () => {
    try {
      const values = await rotForm.validateFields();
      const payload = {
        auditorName: values.auditorName,
        departmentName: values.departmentName,
        lastAuditDate: values.lastAuditDate ? values.lastAuditDate.format('YYYY-MM-DD') : '',
        nextAllowedAuditDate: values.nextAllowedAuditDate ? values.nextAllowedAuditDate.format('YYYY-MM-DD') : '',
        isRestricted: values.isRestricted ?? true,
      };
      await api.post('/independence/rotations', payload);
      message.success('Thiết lập luân chuyển kiểm toán viên thành công');
      setIsRotModalVisible(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Lỗi khi thiết lập luân chuyển KTV');
    }
  };

  const handleDeleteRotation = async (id: number) => {
    try {
      await api.delete(`/independence/rotations/${id}`);
      message.success('Đã xóa quy định luân chuyển KTV');
      fetchData();
    } catch {
      message.error('Lỗi khi xóa quy định luân chuyển');
    }
  };

  // --- 3. Xử lý Khai báo Cách ly Đơn vị cũ (Cooling-off) ---
  const handleOpenCoolingModal = () => {
    coolingForm.resetFields();
    coolingForm.setFieldsValue({
      transferDate: dayjs(),
      coolingOffEndDate: dayjs().add(12, 'month'),
    });
    setIsCoolingModalVisible(true);
  };

  const handleTransferDateChange = (date: any) => {
    if (date) {
      coolingForm.setFieldsValue({
        coolingOffEndDate: dayjs(date).add(12, 'month'),
      });
    }
  };

  const handleSubmitCoolingOff = async () => {
    try {
      const values = await coolingForm.validateFields();
      const payload = {
        userId: values.userId,
        priorDepartments: values.priorDepartments,
        transferDate: values.transferDate ? values.transferDate.format('YYYY-MM-DD') : '',
        coolingOffEndDate: values.coolingOffEndDate ? values.coolingOffEndDate.format('YYYY-MM-DD') : '',
      };
      await api.post('/independence/cooling-off', payload);
      message.success('Khai báo thời hạn cách ly đơn vị cũ (Cooling-off) thành công');
      setIsCoolingModalVisible(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Lỗi khi khai báo cách ly đơn vị cũ');
    }
  };

  const handleDeleteCoolingOff = async (userId: number) => {
    try {
      await api.delete(`/independence/cooling-off/${userId}`);
      message.success('Đã xóa cấu hình cách ly đơn vị cũ');
      fetchData();
    } catch {
      message.error('Lỗi khi xóa cấu hình cách ly');
    }
  };

  // --- Columns ---
  const decColumns = [
    {
      title: t('auditPlan.cols.year', 'Năm'),
      dataIndex: 'year',
      key: 'year',
      width: 90,
      ...getColumnSearchProps<any>('year', 'Năm'),
      sorter: getColumnSorter<any>('year', 'number'),
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: t('workingPapers.auditor', 'Kiểm toán viên'),
      key: 'auditor',
      width: 220,
      ...getColumnSearchProps<any>('auditor', 'Kiểm toán viên', (r) => r.auditor?.fullName || ''),
      sorter: getColumnSorter<any>('auditor', 'string', (r) => r.auditor?.fullName || ''),
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.auditor?.fullName || 'Không xác định'}</Text>
          {r.auditor?.username && (
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>@{r.auditor.username}</div>
          )}
        </div>
      ),
    },
    {
      title: t('independence.decCols.conflict', 'Tình trạng Độc lập'),
      dataIndex: 'hasConflict',
      key: 'hasConflict',
      width: 170,
      ...getColumnSelectFilterProps<any>('hasConflict', [
        { text: t('independence.status.conflict', 'Có xung đột'), value: true },
        { text: t('independence.status.independent', 'Hoàn toàn độc lập'), value: false },
      ]),
      render: (val: boolean) =>
        val ? (
          <Tag color="red" icon={<WarningOutlined />}>
            {t('independence.status.conflict', 'Có xung đột')}
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            {t('independence.status.independent', 'Hoàn toàn độc lập')}
          </Tag>
        ),
    },
    {
      title: 'Mô tả & Chi tiết xung đột đã khai báo',
      dataIndex: 'details',
      key: 'details',
      render: (t: string, r: any) => (
        <div>
          <div>{t || <Text type="secondary">Cam kết không có người thân quản lý hoặc lợi ích tài chính tại các ĐVĐKT</Text>}</div>
          {r.hasConflict && (
            <Tag color="volcano" style={{ marginTop: 4, fontSize: 11 }}>
              Cần bố trí KTV khác thay thế khi kiểm toán đơn vị liên quan
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('independence.decCols.declaredAt', 'Ngày khai báo'),
      dataIndex: 'declaredAt',
      key: 'declaredAt',
      width: 130,
      ...getColumnSearchProps<any>('declaredAt', 'Ngày khai báo'),
      sorter: getColumnSorter<any>('declaredAt', 'date'),
      render: (t: string) => (t ? dayjs(t).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Phê duyệt Ngoại lệ (CAE)',
      key: 'caeApprovalStatus',
      width: 220,
      render: (_: any, r: any) => {
        if (!r.hasConflict) {
          return <Tag color="default">Không cần duyệt</Tag>;
        }
        if (r.caeApprovalStatus === 'Approved') {
          return (
            <Tooltip title={`Duyệt bởi: ${r.caeApprovedByName || 'CAE'} - ${r.caeNotes || ''}`}>
              <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt ngoại lệ</Tag>
            </Tooltip>
          );
        }
        if (r.caeApprovalStatus === 'Rejected') {
          return (
            <Tooltip title={r.caeNotes || 'Từ chối'}>
              <Tag color="red" icon={<CloseCircleOutlined />}>Từ chối ngoại lệ</Tag>
            </Tooltip>
          );
        }
        return (
          <Space size="small">
            <Tag color="gold" icon={<ClockCircleOutlined />}>Chờ CAE duyệt</Tag>
            <Popconfirm
              title="Phê duyệt ngoại lệ với biện pháp kiểm soát giảm thiểu?"
              onConfirm={() => handleApproveException(r.id)}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button size="small" type="link" style={{ color: '#52c41a', padding: 0 }}>Duyệt</Button>
            </Popconfirm>
            <Popconfirm
              title="Từ chối ngoại lệ xung đột cho KTV này?"
              onConfirm={() => handleRejectException(r.id)}
              okText="Từ chối"
              cancelText="Hủy"
            >
              <Button size="small" type="link" danger style={{ padding: 0 }}>Từ chối</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const rotColumns = [
    {
      title: t('workingPapers.auditor', 'Kiểm toán viên'),
      dataIndex: 'auditorName',
      key: 'auditorName',
      width: 200,
      ...getColumnSearchProps<any>('auditorName', 'Kiểm toán viên'),
      sorter: getColumnSorter<any>('auditorName', 'string'),
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: t('independence.rotCols.unit', 'Đơn vị đã kiểm toán liên tục'),
      dataIndex: 'departmentName',
      key: 'departmentName',
      ...getColumnSearchProps<any>('departmentName', 'Đơn vị'),
      sorter: getColumnSorter<any>('departmentName', 'string'),
      render: (dept: string) => <Tag color="blue">{dept}</Tag>,
    },
    {
      title: t('independence.rotCols.lastAudit', 'Lần cuối thực hiện'),
      dataIndex: 'lastAuditDate',
      key: 'lastAuditDate',
      width: 140,
      ...getColumnSearchProps<any>('lastAuditDate', 'Lần cuối'),
      sorter: getColumnSorter<any>('lastAuditDate', 'date'),
      render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
    },
    {
      title: t('independence.rotCols.nextAllowed', 'Cho phép kiểm lại từ'),
      dataIndex: 'nextAllowedAuditDate',
      key: 'nextAllowedAuditDate',
      width: 160,
      ...getColumnSearchProps<any>('nextAllowedAuditDate', 'Cho phép kiểm lại'),
      sorter: getColumnSorter<any>('nextAllowedAuditDate', 'date'),
      render: (t: string) => (
        <Text strong style={{ color: '#ea9105' }}>
          {t ? dayjs(t).format('DD/MM/YYYY') : '-'}
        </Text>
      ),
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái Luân chuyển'),
      dataIndex: 'isRestricted',
      key: 'isRestricted',
      width: 180,
      ...getColumnSelectFilterProps<any>('isRestricted', [
        { text: t('independence.status.restricted', 'Đang hạn chế (Cool-off)'), value: true },
        { text: t('independence.status.allowed', 'Được phép phân công'), value: false },
      ]),
      render: (res: boolean) =>
        res ? (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            {t('independence.status.restricted', 'Đang hạn chế (Cool-off)')}
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            {t('independence.status.allowed', 'Được phép phân công')}
          </Tag>
        ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 90,
      render: (_: any, r: any) => (
        <Popconfirm
          title="Xóa quy định luân chuyển này?"
          onConfirm={() => handleDeleteRotation(r.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const coolingOffColumns = [
    {
      title: 'Kiểm toán viên',
      key: 'name',
      width: 220,
      ...getColumnSearchProps<any>('name', 'Kiểm toán viên', (r) => `${r.fullName || ''} ${r.username || ''}`),
      sorter: getColumnSorter<any>('name', 'string', (r) => r.fullName || ''),
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.fullName}</Text>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>@{r.username} ({r.role?.name || r.jobTitle || 'KTV'})</div>
        </div>
      ),
    },
    {
      title: 'Đơn vị công tác trước đây',
      dataIndex: 'priorDepartments',
      key: 'priorDepartments',
      ...getColumnSearchProps<any>('priorDepartments', 'Đơn vị'),
      sorter: getColumnSorter<any>('priorDepartments', 'string'),
      render: (dept: string) => (
        <div>
          <Tag color="blue">{dept || 'Chưa ghi nhận'}</Tag>
          <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 2 }}>
            ⛔ Cấm phân công kiểm toán đơn vị này trong thời hạn cách ly
          </div>
        </div>
      ),
    },
    {
      title: 'Thời hạn cách ly độc lập (Cooling-off 12 tháng)',
      dataIndex: 'coolingOffEndDate',
      key: 'coolingOffEndDate',
      width: 260,
      render: (d: string) => {
        if (!d) return <Tag color="green">Đã hoàn thành cách ly</Tag>;
        const isPast = dayjs(d).isBefore(dayjs(), 'day');
        return isPast ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Đã hết hạn cách ly ({dayjs(d).format('DD/MM/YYYY')})
          </Tag>
        ) : (
          <Tag color="volcano" icon={<WarningOutlined />}>
            Đang cách ly đến: <b>{dayjs(d).format('DD/MM/YYYY')}</b>
          </Tag>
        );
      },
    },
    {
      title: 'Chuẩn mực áp dụng',
      key: 'std',
      width: 160,
      render: () => <Tag color="purple">IIA Standard 2.2</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 90,
      render: (_: any, r: any) => (
        <Popconfirm
          title="Xóa thông tin cách ly đơn vị cũ của nhân sự này?"
          onConfirm={() => handleDeleteCoolingOff(r.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {/* Header with Dynamic Action Buttons based on active tab */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <Title level={3} className="!mb-1">
            <SafetyCertificateOutlined className="mr-2 text-blue-600" />
            Tính Độc Lập & Khách Quan (Independence & Objectivity)
          </Title>
          <Text className="text-gray-500">
            {t(
              'independence.subtitle',
              'Đánh giá tính Độc lập, Khách quan, Luân chuyển KTV (TT13) và Cách ly đơn vị cũ (Theo Chuẩn mực IIA 2024)',
            )}
          </Text>
        </div>

        {/* Nút hành động tương ứng với Tab đang mở */}
        <Space wrap>
          {activeTab === '1' && (
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              onClick={handleOpenDecModal}
              style={{ background: '#ea9105', borderColor: '#ea9105' }}
            >
              Khai báo Xung đột Lợi ích Hàng năm
            </Button>
          )}

          {activeTab === '2' && (
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleOpenRotModal}
              style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
            >
              Thiết lập Luân chuyển KTV (TT13)
            </Button>
          )}

          {activeTab === '3' && (
            <Button
              type="primary"
              icon={<ClockCircleOutlined />}
              onClick={handleOpenCoolingModal}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}
            >
              Khai báo Cách ly Đơn vị cũ (Cooling-off)
            </Button>
          )}
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="bg-white p-4 rounded-lg shadow-sm"
        items={[
          {
            key: '1',
            label: (
              <span>
                <SafetyCertificateOutlined />
                {t('independence.tabDeclarations', '1. Lịch sử Khai báo Xung đột Lợi ích')}
              </span>
            ),
            children: (
              <div>
                <div className="flex justify-between items-center mb-4 p-3 bg-amber-50/50 rounded border border-amber-200">
                  <div>
                    <Text strong style={{ color: '#0f172a' }}>
                      📋 Quy định Khai báo Xung đột Lợi ích Hàng năm:
                    </Text>
                    <div style={{ fontSize: 13, color: '#595959' }}>
                      Tất cả Kiểm toán viên và Cán bộ KTNB phải thực hiện ký cam kết độc lập định kỳ hàng năm và trước mỗi cuộc kiểm toán (Theo Chuẩn mực IIA Standard 2.1).
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenDecModal}
                  >
                    Gửi bản khai báo mới
                  </Button>
                </div>
                <Table
                  columns={decColumns}
                  dataSource={declarations}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                  scroll={{ x: 'max-content' }}
                />
              </div>
            ),
          },
          {
            key: '2',
            label: (
              <span>
                <SyncOutlined />
                {t('independence.tabRotations', '2. Lịch Luân chuyển KTV (Auditor Rotation)')}
              </span>
            ),
            children: (
              <div>
                <div className="flex justify-between items-center mb-4 p-3 bg-orange-50 rounded border border-orange-100">
                  <div>
                    <Text strong style={{ color: '#d46b08' }}>
                      🔄 Quy tắc Luân chuyển KTV theo Thông tư 13/2018/TT-NHNN (Điều 16):
                    </Text>
                    <div style={{ fontSize: 13, color: '#595959' }}>
                      Kiểm toán viên không được thực hiện kiểm toán liên tiếp một đơn vị hoặc quy trình nghiệp vụ quá 3 năm liên tiếp. Sau khi kết thúc, phải áp dụng thời gian luân chuyển cách ly (Cool-off) tối thiểu 3 năm trước khi được phân công lại.
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenRotModal}
                    style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                  >
                    Thêm quy định luân chuyển
                  </Button>
                </div>
                <Table
                  columns={rotColumns}
                  dataSource={rotations}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                  scroll={{ x: 'max-content' }}
                />
              </div>
            ),
          },
          {
            key: '3',
            label: (
              <span>
                <ClockCircleOutlined />
                3. Cách ly Đơn vị cũ (Cooling-Off 12 tháng - IIA 2.2)
              </span>
            ),
            children: (
              <div>
                <div className="flex justify-between items-center mb-4 p-3 bg-purple-50 rounded border border-purple-100">
                  <div>
                    <Text strong style={{ color: '#722ed1' }}>
                      ⏳ Quy tắc Cách ly Đơn vị cũ (Cooling-off 12 tháng) theo Chuẩn mực IIA Standard 2.2:
                    </Text>
                    <div style={{ fontSize: 13, color: '#595959' }}>
                      Cán bộ từ các đơn vị kinh doanh hoặc phòng ban nghiệp vụ chuyển sang Khối KTNB không được tham gia kiểm toán các hoạt động, quy trình hoặc đơn vị mà mình từng trực tiếp đảm nhiệm trong vòng 12 tháng gần nhất kể từ ngày chuyển công tác.
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCoolingModal}
                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                  >
                    Khai báo cán bộ cách ly
                  </Button>
                </div>
                <Table
                  columns={coolingOffColumns}
                  dataSource={coolingOffUsers}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                  scroll={{ x: 'max-content' }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* ========================================================================= */}
      {/* MODAL 1: Khai báo Xung đột Lợi ích Hàng năm */}
      {/* ========================================================================= */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#ea9105' }} />
            <span>Khai báo Xung đột Lợi ích Hàng năm (IIA Standard 2.1)</span>
          </Space>
        }
        open={isDecModalVisible}
        onOk={handleSubmitDeclaration}
        onCancel={() => setIsDecModalVisible(false)}
        okText={t('independence.modal.btnSubmit', 'Gửi Bản Khai Báo')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={680}
      >
        <Form
          form={decForm}
          layout="vertical"
          className="mt-4"
          initialValues={{ year: new Date().getFullYear(), hasConflict: false }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="year"
                label={t('independence.modal.labelYear', 'Năm khai báo')}
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value={new Date().getFullYear()}>{new Date().getFullYear()}</Option>
                  <Option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</Option>
                  <Option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auditorId" label="Khai báo cho KTV (Mặc định: Tôi)">
                <Select placeholder="Chọn KTV (Để trống nếu tự khai)" allowClear showSearch optionFilterProp="children">
                  {usersList.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4 text-sm">
            <b>📌 Hướng dẫn chuẩn mực:</b> Bạn hoặc người có liên quan (vợ/chồng, cha mẹ, con cái, anh chị em ruột) có đang nắm giữ vị trí quản trị, điều hành, kế toán trưởng, hoặc có lợi ích kinh tế đáng kể tại các Đơn vị được kiểm toán không?
          </div>

          <Form.Item name="hasConflict" label="Tình trạng Độc lập & Xung đột" valuePropName="checked">
            <Switch
              checkedChildren={t('independence.modal.hasConflictOn', 'Có Xung đột')}
              unCheckedChildren={t('independence.modal.hasConflictOff', 'Hoàn toàn Độc lập')}
              onChange={setHasConflict}
            />
          </Form.Item>

          {hasConflict ? (
            <Form.Item
              name="details"
              label={t('independence.modal.labelDetails', 'Mô tả chi tiết Xung đột lợi ích')}
              rules={[
                {
                  required: true,
                  message: t(
                    'independence.modal.detailsRequired',
                    'Vui lòng mô tả chi tiết người thân hoặc lợi ích tại đơn vị liên quan',
                  ),
                },
              ]}
            >
              <TextArea
                rows={4}
                placeholder="VD: Có anh ruột là Giám đốc Chi nhánh Hà Nội; hoặc sở hữu cổ phần chi phối tại đối tác cung cấp dịch vụ..."
              />
            </Form.Item>
          ) : (
            <div className="p-3 bg-green-50 rounded border border-green-100 text-sm text-green-700 mb-3">
              ✅ Tôi cam kết không có bất kỳ mối quan hệ gia đình, lợi ích tài chính hay quyền lợi trực tiếp/gián tiếp nào làm suy giảm tính khách quan và độc lập khi thực hiện nhiệm vụ kiểm toán.
            </div>
          )}
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Thiết lập Luân chuyển KTV (Auditor Rotation) */}
      {/* ========================================================================= */}
      <Modal
        title={
          <Space>
            <SyncOutlined style={{ color: '#fa8c16' }} />
            <span>Thiết lập Quy định Luân chuyển KTV (Thông tư 13/2018/TT-NHNN)</span>
          </Space>
        }
        open={isRotModalVisible}
        onOk={handleSubmitRotation}
        onCancel={() => setIsRotModalVisible(false)}
        okText="Lưu Quy Định Luân Chuyển"
        cancelText="Hủy"
        width={680}
      >
        <Form form={rotForm} layout="vertical" className="mt-4">
          <div className="bg-orange-50 p-3 rounded border border-orange-100 mb-4 text-sm text-orange-800">
            <b>📜 Căn cứ Thông tư 13/2018/TT-NHNN Điều 16:</b> Ngân hàng bắt buộc áp dụng cơ chế luân chuyển kiểm toán viên nhằm tránh tình trạng gắn bó quá lâu tại một đơn vị, đảm bảo tính khách quan và phát hiện rủi ro độc lập.
          </div>

          <Form.Item
            name="auditorName"
            label="Kiểm toán viên luân chuyển"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập tên KTV' }]}
          >
            <Select
              showSearch
              placeholder="Chọn kiểm toán viên"
              optionFilterProp="children"
              allowClear
            >
              {usersList.map((u) => (
                <Option key={u.id} value={u.fullName}>
                  {u.fullName} ({u.username} — {u.department || 'KTNB'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="departmentName"
            label="Đơn vị đã thực hiện kiểm toán liên tiếp"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập đơn vị' }]}
          >
            <Select
              showSearch
              placeholder="Chọn phòng ban / chi nhánh"
              optionFilterProp="children"
              allowClear
            >
              {departmentsList.map((d) => (
                <Option key={d.id} value={d.name}>
                  {d.name} ({d.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lastAuditDate"
                label="Lần cuối thực hiện kiểm toán"
                rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc kỳ KT gần nhất' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={handleLastAuditDateChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nextAllowedAuditDate"
                label="Thời hạn cho phép kiểm lại (Sau Cool-off)"
                rules={[{ required: true, message: 'Vui lòng chọn ngày hết hạn hạn chế' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isRestricted"
            label="Áp dụng lệnh hạn chế phân công (Cool-off)"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Đang hạn chế Cool-off"
              unCheckedChildren="Được phép phân công"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: Khai báo Cách ly Đơn vị cũ (Cooling-Off 12 tháng) */}
      {/* ========================================================================= */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#722ed1' }} />
            <span>Khai báo Thời hạn Cách ly Đơn vị cũ (IIA Standard 2.2)</span>
          </Space>
        }
        open={isCoolingModalVisible}
        onOk={handleSubmitCoolingOff}
        onCancel={() => setIsCoolingModalVisible(false)}
        okText="Lưu Khai Báo Cách Ly"
        cancelText="Hủy"
        width={680}
      >
        <Form form={coolingForm} layout="vertical" className="mt-4">
          <div className="bg-purple-50 p-3 rounded border border-purple-100 mb-4 text-sm text-purple-900">
            <b>🛡️ Chuẩn mực Quốc tế IIA 2024 (Standard 2.2 - Objectivity):</b>
            <div style={{ marginTop: 2 }}>
              Nhân sự mới được điều chuyển hoặc tuyển dụng từ các khối nghiệp vụ khác sang KTNB phải áp dụng thời gian cách ly (Cooling-off) tối thiểu <b>12 tháng</b>, trong đó nghiêm cấm phân công kiểm toán các nghiệp vụ/đơn vị mình từng phụ trách trước đó.
            </div>
          </div>

          <Form.Item
            name="userId"
            label="Cán bộ / KTV mới chuyển sang KTNB"
            rules={[{ required: true, message: 'Vui lòng chọn cán bộ' }]}
          >
            <Select
              showSearch
              placeholder="Chọn cán bộ kiểm toán"
              optionFilterProp="children"
            >
              {usersList.map((u) => (
                <Option key={u.id} value={u.id}>
                  {u.fullName} ({u.username} — {u.jobTitle || 'KTV'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="priorDepartments"
            label="Đơn vị / Phòng ban công tác trước đây"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập đơn vị cũ' }]}
          >
            <Select
              showSearch
              placeholder="Chọn phòng ban / chi nhánh công tác trước đây"
              optionFilterProp="children"
            >
              {departmentsList.map((d) => (
                <Option key={d.id} value={d.name}>
                  {d.name} ({d.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="transferDate"
                label="Ngày chính thức chuyển sang KTNB"
                rules={[{ required: true, message: 'Vui lòng chọn ngày chuyển sang KTNB' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={handleTransferDateChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="coolingOffEndDate"
                label="Thời hạn cách ly độc lập (Đủ 12 tháng)"
                rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc cách ly' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default IndependenceTracker;
