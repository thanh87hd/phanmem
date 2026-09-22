import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Space, Typography, 
  Row, Col, Modal, Form, Input, Select, message, 
  Tooltip, Badge, Tag, Space as AntSpace, Alert, Tabs
} from 'antd';
import { 
  DatabaseOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined, 
  CloseCircleOutlined,
  SyncOutlined,
  CodeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { useTranslation } from 'react-i18next';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ExternalDatabaseConnections: React.FC = () => {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  
  // Test connection state
  const [testing, setTesting] = useState(false);

  // Query Workspace state
  const [selectedConn, setSelectedConn] = useState<any>(null);
  const [queryText, setQueryText] = useState('SELECT * FROM users LIMIT 10;');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [queryColumns, setQueryColumns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('connections');

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/external-database');
      setConnections(res.data || []);
    } catch (err) {
      message.error(t('externalDatabase.messages.loadError', 'Lỗi khi tải danh sách kết nối cơ sở dữ liệu'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleOpenCreate = () => {
    setEditingConn(null);
    form.resetFields();
    form.setFieldsValue({ type: 'postgres', port: 5432, isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setEditingConn(record);
    form.setFieldsValue(record);
    setIsModalOpen(false);
    // Timeout to make sure fields set cleanly in form
    setTimeout(() => {
      form.setFieldsValue(record);
      setIsModalOpen(true);
    }, 50);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: t('externalDatabase.deleteConfirmTitle', 'Xác nhận xóa kết nối'),
      content: t('externalDatabase.deleteConfirmContent', 'Bạn có chắc chắn muốn xóa cấu hình kết nối cơ sở dữ liệu này không?'),
      okText: t('common.delete', 'Xóa'),
      okType: 'danger',
      cancelText: t('externalDatabase.modal.btnCancel', 'Hủy'),
      onOk: async () => {
        try {
          await api.delete(`/external-database/${id}`);
          message.success(t('externalDatabase.messages.deleteSuccess', 'Đã xóa cấu hình kết nối thành công'));
          fetchConnections();
          if (selectedConn?.id === id) {
            setSelectedConn(null);
            setQueryResult([]);
            setQueryColumns([]);
          }
        } catch (err) {
          message.error(t('externalDatabase.messages.deleteError', 'Lỗi khi xóa kết nối'));
        }
      }
    });
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields(['type', 'host', 'port', 'username', 'password', 'database']);
      setTesting(true);
      message.loading({ content: t('externalDatabase.messages.testLoading', 'Đang kiểm tra kết nối...'), key: 'test-db' });
      
      const res = await api.post('/external-database/test-connection', values);
      if (res.data.success) {
        message.success({ content: t('externalDatabase.messages.testSuccess', 'Kết nối thành công tới database!'), key: 'test-db', duration: 3 });
      } else {
        message.error({ content: res.data.message || t('externalDatabase.messages.testFail', 'Kết nối thất bại!'), key: 'test-db', duration: 4 });
      }
    } catch (err) {
      message.error({ content: t('externalDatabase.messages.testWarning', 'Vui lòng điền đủ thông tin kết nối để kiểm tra'), key: 'test-db' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingConn) {
        await api.patch(`/external-database/${editingConn.id}`, values);
        message.success(t('externalDatabase.messages.saveEditSuccess', 'Cập nhật cấu hình kết nối thành công'));
      } else {
        await api.post('/external-database', values);
        message.success(t('externalDatabase.messages.saveAddSuccess', 'Thêm cấu hình kết nối mới thành công'));
      }
      setIsModalOpen(false);
      fetchConnections();
    } catch (err) {
      message.error(t('externalDatabase.messages.saveError', 'Lỗi khi lưu cấu hình kết nối'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQueryWorkspace = (record: any) => {
    setSelectedConn(record);
    setActiveTab('workspace');
  };

  const handleRunQuery = async () => {
    if (!selectedConn) {
      message.warning(t('externalDatabase.messages.selectConnWarning', 'Vui lòng chọn kết nối Database để thực thi'));
      return;
    }
    if (!queryText.trim()) {
      message.warning(t('externalDatabase.messages.emptyQueryWarning', 'Vui lòng nhập câu lệnh SQL'));
      return;
    }

    setQuerying(true);
    try {
      const res = await api.post(`/external-database/${selectedConn.id}/query`, { query: queryText });
      if (res.data.success) {
        const rows = res.data.data || [];
        setQueryResult(rows);
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]);
          const cols = keys.map(k => ({
            title: k,
            dataIndex: k,
            key: k,
            ellipsis: true,
            sorter: (a: any, b: any) => String(a[k] || '').localeCompare(String(b[k] || '')),
            render: (val: any) => {
              if (val === null || val === undefined) return <span className="text-gray-400 italic">null</span>;
              if (typeof val === 'object') return JSON.stringify(val);
              if (typeof val === 'boolean') return val ? 'true' : 'false';
              return String(val);
            }
          }));
          setQueryColumns(cols);
        }
        message.success(t('externalDatabase.messages.querySuccess', { count: rows.length, defaultValue: "Truy vấn thành công! Trả về {{count}} dòng dữ liệu." }));
      } else {
        message.error(t('externalDatabase.messages.noDataError', 'Không lấy được dữ liệu'));
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi không xác định';
      message.error(t('externalDatabase.messages.queryError', { msg: errMsg, defaultValue: "Lỗi truy vấn: {{msg}}" }));
    } finally {
      setQuerying(false);
    }
  };

  const handleExportResult = () => {
    if (queryResult.length === 0) return;
    exportToExcel(queryResult, queryColumns, `Query_${selectedConn.name}`);
  };

  const filteredConnections = connections.filter(item => filterRecursive(item, searchText));

  const columns = [
    {
      title: t('externalDatabase.cols.name', 'Tên Kết nối'),
      dataIndex: 'name',
      key: 'name',
      ...getColumnSearchProps<any>('name', 'Tên Kết nối'),
      sorter: getColumnSorter<any>('name', 'string'),
      render: (name: string, record: any) => (
        <Space>
          <DatabaseOutlined className="text-amber-600" />
          <Text strong>{name}</Text>
          {!record.isActive && <Tag color="default">Vô hiệu</Tag>}
        </Space>
      )
    },
    {
      title: t('externalDatabase.cols.type', 'Loại Server'),
      dataIndex: 'type',
      key: 'type',
      ...getColumnSelectFilterProps<any>('type', undefined, connections),
      sorter: getColumnSorter<any>('type', 'string'),
      render: (type: string) => {
        let color = 'blue';
        if (type === 'postgres') color = 'purple';
        if (type === 'mssql') color = 'red';
        if (type === 'mariadb') color = 'cyan';
        return <Tag color={color}>{type.toUpperCase()}</Tag>;
      }
    },
    {
      title: t('externalDatabase.cols.address', 'Host / Địa chỉ'),
      key: 'address',
      render: (_: any, record: any) => `${record.host}:${record.port}`
    },
    {
      title: t('externalDatabase.cols.dbName', 'Cơ sở Dữ liệu'),
      dataIndex: 'database',
      key: 'database',
      ...getColumnSearchProps<any>('database', 'Cơ sở Dữ liệu'),
      sorter: getColumnSorter<any>('database', 'string'),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('externalDatabase.cols.action', t('regulatoryExams.examTable.action', t('regulatoryExams.examTable.action', t('regulatoryExams.examTable.action', t('regulatoryExams.examTable.action', t('regulatoryExams.examTable.action', 'Hành động')))))),
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button 
            type="primary" 
            ghost 
            icon={<CodeOutlined />} 
            size="small"
            onClick={() => handleOpenQueryWorkspace(record)}
          >
            {t('externalDatabase.tabWorkspace', 'Workspace')}
          </Button>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleOpenEdit(record)}
          />
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small" 
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1"><DatabaseOutlined className="mr-2" />{t('externalDatabase.title', t('externalDatabase.title', t('externalDatabase.title', t('externalDatabase.title', t('externalDatabase.title', t('externalDatabase.title', 'Khai báo Kết nối Cơ sở Dữ liệu'))))))}</Title>
          <Text type="secondary">{t('externalDatabase.subtitle', t('externalDatabase.subtitle', t('externalDatabase.subtitle', t('externalDatabase.subtitle', t('externalDatabase.subtitle', t('externalDatabase.subtitle', 'Cấu hình kết nối tới các hệ thống cơ sở dữ liệu Core Banking, Data Warehouse ngoại vi để truy xuất dữ liệu kiểm toán'))))))}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          className="bg-amber-600 border-none hover:bg-amber-700"
          onClick={handleOpenCreate}
        >
          {t('externalDatabase.btnCreate', t('externalDatabase.btnCreate', t('externalDatabase.btnCreate', t('externalDatabase.btnCreate', t('externalDatabase.btnCreate', t('externalDatabase.btnCreate', 'Khai báo Kết nối mới'))))))}
        </Button>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <Tabs.TabPane tab={t('externalDatabase.tabSaved', t('externalDatabase.tabSaved', t('externalDatabase.tabSaved', t('externalDatabase.tabSaved', t('externalDatabase.tabSaved', t('externalDatabase.tabSaved', 'Danh sách kết nối đã lưu'))))))} key="connections">
          <Table 
            columns={columns} 
            dataSource={connections} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 8 }}
          />
        </Tabs.TabPane>
        
        <Tabs.TabPane tab={t('externalDatabase.tabWorkspace', t('externalDatabase.tabWorkspace', t('externalDatabase.tabWorkspace', t('externalDatabase.tabWorkspace', t('externalDatabase.tabWorkspace', t('externalDatabase.tabWorkspace', 'Workspace truy vấn an toàn'))))))} key="workspace">
          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Card title={t('externalDatabase.workspaceCardTitle', t('externalDatabase.workspaceCardTitle', t('externalDatabase.workspaceCardTitle', t('externalDatabase.workspaceCardTitle', t('externalDatabase.workspaceCardTitle', t('externalDatabase.workspaceCardTitle', 'Cơ sở Dữ liệu truy vấn'))))))} size="small" className="border-gray-200 bg-gray-50 h-full">
                <div className="mb-4">
                  <Text className="block mb-2 font-semibold">{t('externalDatabase.selectConnection', t('externalDatabase.selectConnection', t('externalDatabase.selectConnection', t('externalDatabase.selectConnection', t('externalDatabase.selectConnection', t('externalDatabase.selectConnection', 'Chọn Kết nối:'))))))}</Text>
                  <Select 
                    placeholder={t('externalDatabase.placeholderSelect', t('externalDatabase.placeholderSelect', t('externalDatabase.placeholderSelect', t('externalDatabase.placeholderSelect', t('externalDatabase.placeholderSelect', t('externalDatabase.placeholderSelect', 'Chọn Database...'))))))} 
                    value={selectedConn?.id} 
                    className="w-full"
                    onChange={(val) => {
                      const selected = connections.find(c => c.id === val);
                      if (selected) {
                        handleOpenQueryWorkspace(selected);
                      }
                    }}
                  >
                    {connections.map(c => (
                      <Option key={c.id} value={c.id}>
                        {c.name} ({c.type.toUpperCase()})
                      </Option>
                    ))}
                  </Select>
                </div>

                {selectedConn && (
                  <div className="p-3 bg-white border rounded text-xs space-y-2 mb-4">
                    <div><Text type="secondary">{t('externalDatabase.details.type', t('externalDatabase.details.type', t('externalDatabase.details.type', t('externalDatabase.details.type', t('externalDatabase.details.type', t('externalDatabase.details.type', 'Loại Server:'))))))}</Text> <Tag color="blue">{selectedConn.type.toUpperCase()}</Tag></div>
                    <div><Text type="secondary">{t('externalDatabase.details.host', 'Host/Port:')}</Text> <Text strong>{selectedConn.host}:{selectedConn.port}</Text></div>
                    <div><Text type="secondary">{t('externalDatabase.details.db', 'Database:')}</Text> <Text strong>{selectedConn.database}</Text></div>
                    <div><Text type="secondary">{t('externalDatabase.details.user', 'User:')}</Text> <Text strong>{selectedConn.username}</Text></div>
                  </div>
                )}
                
                <Alert 
                  message={t('externalDatabase.securityAlertTitle', t('login.securityNoteTitle', t('login.securityNoteTitle', t('login.securityNoteTitle', t('login.securityNoteTitle', t('login.securityNoteTitle', 'Lưu ý Bảo mật'))))))} 
                  description={t('externalDatabase.securityAlertDesc', t('externalDatabase.securityAlertDesc', t('externalDatabase.securityAlertDesc', t('externalDatabase.securityAlertDesc', t('externalDatabase.securityAlertDesc', t('externalDatabase.securityAlertDesc', 'Mọi truy vấn qua hệ thống được kiểm soát nghiêm ngặt. Chỉ các câu lệnh đọc (SELECT, WITH, SHOW) được chấp nhận. Toàn bộ lịch sử truy vấn sẽ được ghi nhật ký hệ thống (Audit Trail).'))))))}
                  type="warning" 
                  showIcon 
                />
              </Card>
            </Col>
            
            <Col xs={24} md={16}>
              <Card 
                title={t('externalDatabase.editorCardTitle', 'Query Editor & Output')} 
                size="small" 
                className="border-gray-200"
                extra={
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={handleRunQuery} 
                      loading={querying} 
                      icon={<PlayCircleOutlined />}
                      className="bg-green-600 hover:bg-green-700 border-none"
                      disabled={!selectedConn}
                    >
                      {t('externalDatabase.btnRunQuery', t('externalDatabase.btnRunQuery', t('externalDatabase.btnRunQuery', t('externalDatabase.btnRunQuery', t('externalDatabase.btnRunQuery', t('externalDatabase.btnRunQuery', 'Chạy Truy vấn'))))))}
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />} 
                      onClick={handleExportResult} 
                      disabled={queryResult.length === 0}
                    >
                      {t('externalDatabase.btnExportExcel', t('common.exportExcel', t('common.exportExcel', t('common.exportExcel', t('common.exportExcel', t('common.exportExcel', 'Xuất Excel'))))))}
                    </Button>
                  </Space>
                }
              >
                <div className="mb-4">
                  <TextArea 
                    rows={6}
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    className="font-mono bg-[#1e1e1e] text-[#d4d4d4]"
                    placeholder={t('externalDatabase.placeholderSql', t('externalDatabase.placeholderSql', t('externalDatabase.placeholderSql', t('externalDatabase.placeholderSql', t('externalDatabase.placeholderSql', t('externalDatabase.placeholderSql', 'Nhập câu lệnh SQL tại đây...'))))))}
                  />
                </div>
                
                <div className="border border-gray-200 rounded p-2 min-h-64 bg-gray-50 overflow-auto">
                  {querying ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                      <SyncOutlined spin className="text-3xl mb-3 text-amber-500" />
                      <div>{t('externalDatabase.queryingText', t('externalDatabase.queryingText', t('externalDatabase.queryingText', t('externalDatabase.queryingText', t('externalDatabase.queryingText', t('externalDatabase.queryingText', 'Đang kết nối & truy vấn dữ liệu...'))))))}</div>
                    </div>
                  ) : queryResult.length > 0 ? (
                    <Table 
                      dataSource={queryResult} 
                      columns={queryColumns}
                      pagination={{ pageSize: 5 }}
                      size="small"
                      rowKey={(record, index) => String(index)}
                      bordered
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                      <CodeOutlined className="text-3xl mb-2" />
                      <div>{t('externalDatabase.emptyOutput', t('externalDatabase.emptyOutput', t('externalDatabase.emptyOutput', t('externalDatabase.emptyOutput', t('externalDatabase.emptyOutput', t('externalDatabase.emptyOutput', 'Kết quả truy vấn dữ liệu sẽ hiển thị tại đây'))))))}</div>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>

      {/* Creation / Edit Modal */}
      <Modal
        title={editingConn ? t('externalDatabase.modal.titleEdit', t('externalDatabase.modal.titleEdit', t('externalDatabase.modal.titleEdit', t('externalDatabase.modal.titleEdit', t('externalDatabase.modal.titleEdit', t('externalDatabase.modal.titleEdit', 'Cập nhật cấu hình kết nối')))))) : t('externalDatabase.modal.titleAdd', t('externalDatabase.modal.titleAdd', t('externalDatabase.modal.titleAdd', t('externalDatabase.modal.titleAdd', t('externalDatabase.modal.titleAdd', t('externalDatabase.modal.titleAdd', 'Khai báo Kết nối cơ sở dữ liệu'))))))}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText={t('externalDatabase.modal.btnSave', t('auditTemplates.form.btnSave', t('auditTemplates.form.btnSave', t('auditTemplates.form.btnSave', t('auditTemplates.form.btnSave', t('auditTemplates.form.btnSave', 'Lưu cấu hình'))))))}
        cancelText={t('externalDatabase.modal.btnCancel', t('findingKB.modal.cancelText', t('findingKB.modal.cancelText', t('findingKB.modal.cancelText', t('findingKB.modal.cancelText', t('findingKB.modal.cancelText', 'Hủy'))))))}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item 
            name="name" 
            label={t('externalDatabase.modal.labelName', t('externalDatabase.modal.labelName', t('externalDatabase.modal.labelName', t('externalDatabase.modal.labelName', t('externalDatabase.modal.labelName', t('externalDatabase.modal.labelName', 'Tên gợi nhớ kết nối'))))))} 
            rules={[{ required: true, message: t('externalDatabase.modal.requiredName', t('externalDatabaseConnections.pleaseEnterAMnemonicName', t('externalDatabaseConnections.pleaseEnterAMnemonicName', t('externalDatabaseConnections.pleaseEnterAMnemonicName', t('externalDatabaseConnections.pleaseEnterAMnemonicName', t('externalDatabaseConnections.pleaseEnterAMnemonicName', 'Vui lòng nhập tên gợi nhớ')))))) }]}
          >
            <Input placeholder={t('externalDatabase.modal.placeholderName', t('externalDatabase.modal.placeholderName', t('externalDatabase.modal.placeholderName', t('externalDatabase.modal.placeholderName', t('externalDatabase.modal.placeholderName', t('externalDatabase.modal.placeholderName', 'Ví dụ: Core Banking Main Database, DWH Replica, v.v.'))))))} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="type" 
                label={t('externalDatabase.modal.labelType', t('externalDatabase.modal.labelType', t('externalDatabase.modal.labelType', t('externalDatabase.modal.labelType', t('externalDatabase.modal.labelType', t('externalDatabase.modal.labelType', 'Loại Hệ Quản trị CSDL'))))))} 
                rules={[{ required: true }]}
              >
                <Select onChange={(val) => {
                  let defaultPort = 5432;
                  if (val === 'mysql' || val === 'mariadb') defaultPort = 3306;
                  if (val === 'mssql') defaultPort = 1433;
                  form.setFieldsValue({ port: defaultPort });
                }}>
                  <Option value="postgres">PostgreSQL</Option>
                  <Option value="mysql">MySQL</Option>
                  <Option value="mariadb">MariaDB</Option>
                  <Option value="mssql">Microsoft SQL Server</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="database" 
                label={t('externalDatabase.modal.labelDbName', t('externalDatabase.modal.labelDbName', t('externalDatabase.modal.labelDbName', t('externalDatabase.modal.labelDbName', t('externalDatabase.modal.labelDbName', t('externalDatabase.modal.labelDbName', 'Tên CSDL (Database Name)'))))))} 
                rules={[{ required: true, message: t('externalDatabase.modal.requiredDbName', t('externalDatabaseConnections.pleaseEnterDatabaseName', t('externalDatabaseConnections.pleaseEnterDatabaseName', t('externalDatabaseConnections.pleaseEnterDatabaseName', t('externalDatabaseConnections.pleaseEnterDatabaseName', t('externalDatabaseConnections.pleaseEnterDatabaseName', 'Vui lòng nhập tên Database')))))) }]}
              >
                <Input placeholder={t('externalDatabase.modal.placeholderDbName', 'ktnb_core_db')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item 
                name="host" 
                label={t('externalDatabase.modal.labelHost', t('externalDatabase.modal.labelHost', t('externalDatabase.modal.labelHost', t('externalDatabase.modal.labelHost', t('externalDatabase.modal.labelHost', t('externalDatabase.modal.labelHost', 'Địa chỉ Host (IP / Domain)'))))))} 
                rules={[{ required: true, message: t('externalDatabase.modal.requiredHost', t('externalDatabaseConnections.pleaseEnterHost', t('externalDatabaseConnections.pleaseEnterHost', t('externalDatabaseConnections.pleaseEnterHost', t('externalDatabaseConnections.pleaseEnterHost', t('externalDatabaseConnections.pleaseEnterHost', 'Vui lòng nhập Host')))))) }]}
              >
                <Input placeholder={t('externalDatabase.modal.placeholderHost', t('externalDatabase.modal.placeholderHost', t('externalDatabase.modal.placeholderHost', t('externalDatabase.modal.placeholderHost', t('externalDatabase.modal.placeholderHost', t('externalDatabase.modal.placeholderHost', 'localhost hoặc 10.20.30.40'))))))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="port" 
                label={t('externalDatabase.modal.labelPort', t('externalDatabase.modal.labelPort', t('externalDatabase.modal.labelPort', t('externalDatabase.modal.labelPort', t('externalDatabase.modal.labelPort', t('externalDatabase.modal.labelPort', 'Cổng (Port)'))))))} 
                rules={[{ required: true, message: t('externalDatabase.modal.requiredPort', t('externalDatabaseConnections.pleaseEnterPort', t('externalDatabaseConnections.pleaseEnterPort', t('externalDatabaseConnections.pleaseEnterPort', t('externalDatabaseConnections.pleaseEnterPort', t('externalDatabaseConnections.pleaseEnterPort', 'Vui lòng nhập Port')))))) }]}
              >
                <Input type="number" placeholder="5432" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="username" 
                label={t('externalDatabase.modal.labelUser', t('externalDatabase.modal.labelUser', t('externalDatabase.modal.labelUser', t('externalDatabase.modal.labelUser', t('externalDatabase.modal.labelUser', t('externalDatabase.modal.labelUser', 'Tài khoản truy cập (Username)'))))))} 
                rules={[{ required: true, message: t('externalDatabase.modal.requiredUser', t('externalDatabaseConnections.pleaseEnterUsername', t('externalDatabaseConnections.pleaseEnterUsername', t('externalDatabaseConnections.pleaseEnterUsername', t('externalDatabaseConnections.pleaseEnterUsername', t('externalDatabaseConnections.pleaseEnterUsername', 'Vui lòng nhập Username')))))) }]}
              >
                <Input placeholder={t('externalDatabase.modal.placeholderUser', 'sa, root, postgres...')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="password" 
                label={t('externalDatabase.modal.labelPassword', t('externalDatabase.modal.labelPassword', t('externalDatabase.modal.labelPassword', t('externalDatabase.modal.labelPassword', t('externalDatabase.modal.labelPassword', t('externalDatabase.modal.labelPassword', 'Mật khẩu (Password)'))))))}
              >
                <Input.Password placeholder={t('externalDatabase.modal.placeholderPassword', '••••••••')} />
              </Form.Item>
            </Col>
          </Row>
          
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('externalDatabase.modal.testNote', t('externalDatabase.modal.testNote', t('externalDatabase.modal.testNote', t('externalDatabase.modal.testNote', t('externalDatabase.modal.testNote', t('externalDatabase.modal.testNote', 'Hãy kiểm tra kết nối tới Server trước khi lưu cấu hình.'))))))}
            </Text>
            <Button 
              type="dashed" 
              onClick={handleTestConnection} 
              loading={testing}
              className="hover:border-amber-500 hover:text-amber-500"
            >
              {t('externalDatabase.modal.btnTest', t('externalDatabase.modal.btnTest', t('externalDatabase.modal.btnTest', t('externalDatabase.modal.btnTest', t('externalDatabase.modal.btnTest', t('externalDatabase.modal.btnTest', 'Kiểm tra kết nối'))))))}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ExternalDatabaseConnections;
