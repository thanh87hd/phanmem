import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Button, Space, Table, Tag, Modal, Input,
  message, Row, Col, Statistic, Divider, Select, Tooltip, Upload,
  Progress, Alert, Badge, Tabs, InputNumber, Switch
} from 'antd';
import { 
  SettingOutlined, DatabaseOutlined, HistoryOutlined, 
  DeleteOutlined, DownloadOutlined, ReloadOutlined, 
  CloudUploadOutlined, ExclamationCircleOutlined, 
  MessageOutlined, 
  UndoOutlined, InboxOutlined, CheckCircleOutlined, 
  WarningOutlined, LockOutlined, SafetyOutlined, 
  SafetyCertificateOutlined, CloseCircleOutlined, 
  SlidersOutlined, FileProtectOutlined, FormOutlined, SubnodeOutlined,
  ClusterOutlined, MailOutlined, DesktopOutlined, ApiOutlined
} from '@ant-design/icons';
import api from '../services/api';
import CustomFieldConfig from '../components/CustomFieldConfig';
import WorkflowBuilder from '../components/WorkflowBuilder';
import ReportBuilder from '../components/ReportBuilder';
import IntegrationSettings from './IntegrationSettings';
import ExternalDatabaseConnections from './ExternalDatabaseConnections';
import InfrastructureMonitor from './InfrastructureMonitor';
import { PieChartOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const SystemManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [stats, setStats] = useState<any>({ totalAlerts: 0, lastCleanup: null });
  const [backups, setBackups] = useState<any[]>([]);
  const [backupStats, setBackupStats] = useState<any>({ totalFiles: 0, totalSizeMB: '0.00' });
  const [cleanupMonths, setCleanupMonths] = useState(6);

  // Restore Modal
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Active Progress Indicator
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');

  // Security Configuration Tab state
  const [configs, setConfigs] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>({
    pciDss: { score: 0, total: 8, passed: [], failed: [] },
    iso27001: { score: 0, total: 7, passed: [], failed: [] }
  });
  const [configLoading, setConfigLoading] = useState(false);

  // Kita AI logs & analytics state
  const [kitaLogs, setKitaLogs] = useState<any[]>([]);
  const [kitaAnalytics, setKitaAnalytics] = useState<any>({
    totalQuestions: 0,
    avgResponseTimeMs: 0,
    fallbackRate: 0,
    intentDistribution: [],
    sourceDistribution: [],
    dailyVolume: [],
    popularKeywords: []
  });
  const [kitaLoading, setKitaLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, backupsRes, backupStatsRes] = await Promise.all([
        api.get('/system-management/log-stats'),
        api.get('/system-management/backups'),
        api.get('/system-management/backup-stats'),
      ]);
      setStats(statsRes.data);
      setBackups(backupsRes.data);
      setBackupStats(backupStatsRes.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityData = async () => {
    setConfigLoading(true);
    try {
      const [configsRes, complianceRes] = await Promise.all([
        api.get('/system-management/security-config'),
        api.get('/system-management/security-config/compliance'),
      ]);
      setConfigs(configsRes.data);
      setCompliance(complianceRes.data);
    } catch (error) {
      message.error('Không thể tải cấu hình bảo mật');
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchKitaData = async () => {
    setKitaLoading(true);
    try {
      const [logsRes, analyticsRes] = await Promise.all([
        api.get('/ai/chat-logs'),
        api.get('/ai/chat-analytics'),
      ]);
      setKitaLogs(logsRes.data);
      setKitaAnalytics(analyticsRes.data);
    } catch (error) {
      message.error('Không thể tải nhật ký & phân tích Kita AI');
    } finally {
      setKitaLoading(false);
    }
  };

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(); 
    fetchSecurityData();
    fetchKitaData();
  }, []);

  const handleCleanup = () => {
    Modal.confirm({
      title: 'Xác nhận xóa Log Audit',
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc muốn xóa tất cả các bản ghi nhật ký cũ hơn ${cleanupMonths} tháng? Hành động này không thể hoàn tác.`,
      okText: 'Xóa ngay',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await api.delete(`/audit-trail/cleanup?months=${cleanupMonths}`);
          message.success(`Đã xóa ${res.data.deleted} bản ghi nhật ký.`);
          fetchData();
        } catch {
          message.error('Xóa log thất bại');
        }
      },
    });
  };

  // ==================== BACKUP ====================
  const handleBackup = async () => {
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
    setProgressStatus('Đang khởi tạo tiến trình sao lưu database...');
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        if (prev < 40) {
          setProgressStatus('Đang trích xuất dữ liệu Schema & Tables...');
          return prev + 10;
        }
        if (prev < 70) {
          setProgressStatus('Đang nén dữ liệu SQL backup...');
          return prev + 5;
        }
        setProgressStatus('Đang lưu tệp sao lưu an toàn...');
        return prev + 2;
      });
    }, 200);

    try {
      const res = await api.post('/system-management/backup');
      clearInterval(interval);
      setProgress(100);
      setProgressStatus('Hoàn thành! Đã tạo bản sao lưu thành công.');
      message.success(`Đã tạo bản sao lưu thành công: ${res.data.fileName}`);
      fetchData();
      setTimeout(() => setShowProgress(false), 1500);
    } catch (err: any) {
      clearInterval(interval);
      setShowProgress(false);
      message.error(err?.response?.data?.message || 'Tạo bản sao lưu thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ==================== DOWNLOAD ====================
  const handleDownload = async (fileName: string) => {
    try {
      const response = await api.get(`/system-management/backups/download?fileName=${encodeURIComponent(fileName)}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(`Đang tải xuống: ${fileName}`);
    } catch {
      message.error('Tải xuống file backup thất bại');
    }
  };

  // ==================== UPLOAD ====================
  const handleUpload = async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
    setProgressStatus(`Đang upload tệp ${file.name}...`);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 150);

    try {
      const res = await api.post('/system-management/backups/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearInterval(interval);
      setProgress(100);
      setProgressStatus('Tải lên hoàn tất!');
      message.success(`Upload thành công: ${res.data.fileName}`);
      fetchData();
      setTimeout(() => setShowProgress(false), 1500);
    } catch (err: any) {
      clearInterval(interval);
      setShowProgress(false);
      message.error(err?.response?.data?.message || 'Upload file backup thất bại');
    } finally {
      setLoading(false);
    }
    return false; // prevent default upload behavior
  };

  // ==================== RESTORE ====================
  const openRestoreModal = (fileName: string) => {
    setRestoreFileName(fileName);
    setAdminPassword('');
    setRestoreModalVisible(true);
  };

  const handleRestore = async () => {
    if (!adminPassword) {
      message.warning('Vui lòng nhập mật khẩu Admin để xác nhận');
      return;
    }
    setRestoreLoading(true);
    setRestoreModalVisible(false);
    setShowProgress(true);
    setProgress(0);
    setProgressStatus('Đang kiểm tra mật khẩu Admin & Tệp khôi phục...');

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        if (prev < 30) {
          setProgressStatus('Đang ngắt toàn bộ kết nối và dừng dịch vụ...');
          return prev + 8;
        }
        if (prev < 60) {
          setProgressStatus('Đang xóa cấu trúc schema cũ...');
          return prev + 5;
        }
        if (prev < 85) {
          setProgressStatus('Đang nạp cấu trúc SQL khôi phục (pg_restore)...');
          return prev + 3;
        }
        setProgressStatus('Đang đồng bộ hóa cấu hình bảo mật...');
        return prev + 1;
      });
    }, 300);

    try {
      await api.post('/system-management/backups/restore', {
        fileName: restoreFileName,
        adminPassword,
      });
      clearInterval(interval);
      setProgress(100);
      setProgressStatus('Khôi phục hoàn tất! Đang khởi động lại dịch vụ hệ thống...');
      message.success('Đã khôi phục database thành công! Hệ thống có thể cần khởi động lại.');
      fetchData();
      fetchSecurityData();
      setTimeout(() => setShowProgress(false), 2000);
    } catch (err: any) {
      clearInterval(interval);
      setShowProgress(false);
      message.error(err?.response?.data?.message || 'Khôi phục database thất bại');
    } finally {
      setRestoreLoading(false);
      setAdminPassword('');
    }
  };

  // ==================== DELETE ====================
  const handleDeleteBackup = (fileName: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa bản sao lưu',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Bạn có chắc muốn xóa file backup:</p>
          <Tag color="red" style={{ fontSize: 13 }}>{fileName}</Tag>
          <p style={{ marginTop: 12, color: '#ff4d4f' }}>
            <strong>⚠️ Hành động này không thể hoàn tác!</strong>
          </p>
        </div>
      ),
      okText: 'Xóa vĩnh viễn',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.delete(`/system-management/backups/${encodeURIComponent(fileName)}`);
          message.success(`Đã xóa file backup: ${fileName}`);
          fetchData();
        } catch {
          message.error('Xóa file backup thất bại');
        }
      },
    });
  };

  // ==================== CONFIGS UPDATE ====================
  const handleSaveConfig = async (key: string, value: any) => {
    setSavingConfig(true);
    try {
      await api.patch('/system-management/security-config', {
        updates: [{ key, value: String(value) }]
      });
      message.success(`Đã cập nhật cấu hình: ${key}`);
      fetchSecurityData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Cập nhật cấu hình bảo mật thất bại');
    } finally {
      setSavingConfig(false);
    }
  };

  // ==================== PRESET APPLICATION ====================
  const handleApplyPreset = (presetType: 'pci-dss' | 'iso-27001') => {
    const title = presetType === 'pci-dss' ? 'PCI DSS v4.0' : 'ISO 27001:2022';
    Modal.confirm({
      title: `Áp dụng chuẩn ${title}`,
      icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
      content: `Hệ thống sẽ ghi đè toàn bộ cấu hình bảo mật hiện tại bằng các giá trị khuyến nghị của chuẩn ${title}. Bạn có chắc chắn muốn thực hiện?`,
      okText: 'Áp dụng',
      okType: 'primary',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoading(true);
        try {
          await api.post(`/system-management/security-config/preset/${presetType}`);
          message.success(`Đã áp dụng cấu hình chuẩn ${title} thành công`);
          fetchSecurityData();
        } catch (err: any) {
          message.error('Áp dụng preset bảo mật thất bại');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const backupColumns = [
    {
      title: 'Tên bản sao lưu',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <DatabaseOutlined style={{ color: record.isUploaded ? '#722ed1' : '#ea9105', fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{text}</div>
            {record.isUploaded && (
              <Tag color="purple" style={{ fontSize: 10, marginTop: 2 }}>
                <CloudUploadOutlined /> Tải lên từ máy
              </Tag>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Dung lượng thực tế',
      dataIndex: 'size',
      key: 'size',
      width: 150,
      render: (size: number) => {
        if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
        return `${(size / 1024).toFixed(1)} KB`;
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('vi-VN')
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 280,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button 
            type="link" 
            size="small"
            icon={<DownloadOutlined />} 
            style={{ padding: 0 }}
            onClick={() => handleDownload(record.name)}
          >
            Tải xuống
          </Button>
          <Button 
            type="link" 
            size="small"
            icon={<UndoOutlined />} 
            style={{ color: '#fa8c16', padding: 0 }}
            onClick={() => openRestoreModal(record.name)}
          >
            Khôi phục
          </Button>
          <Button 
            type="link" 
            size="small"
            danger 
            icon={<DeleteOutlined />} 
            style={{ padding: 0 }}
            onClick={() => handleDeleteBackup(record.name)}
          >
            Xóa
          </Button>
        </Space>
      )
    }
  ];

  const securityColumns = [
    {
      title: 'Tham số Bảo mật',
      dataIndex: 'key',
      key: 'key',
      width: 280,
      render: (key: string, record: any) => (
        <Tooltip title={record.description} placement="topLeft">
          <div>
            <Text strong style={{ fontSize: 13, color: '#1e293b' }}>{key}</Text>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{record.description}</div>
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Chuẩn quy định',
      dataIndex: 'standard',
      key: 'standard',
      width: 220,
      render: (std: string, record: any) => {
        let color = 'blue';
        if (std === 'PCI_DSS') color = 'volcano';
        else if (std === 'ISO_27001') color = 'geekblue';
        else if (std === 'BOTH') color = 'purple';
        
        return (
          <Space orientation="vertical" size={2}>
            <Tag color={color} style={{ fontSize: 10, fontWeight: 600 }}>
              {std === 'BOTH' ? 'PCI DSS & ISO 27001' : (std ? std.replace('_', ' ') : 'Hệ thống')}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>{record.standardRef}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Giá trị cấu hình',
      key: 'value',
      width: 240,
      render: (_: any, record: any) => {
        if (record.valueType === 'boolean') {
          return (
            <Switch
              checked={record.value === 'true'}
              loading={savingConfig}
              onChange={(checked) => handleSaveConfig(record.key, checked ? 'true' : 'false')}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
            />
          );
        }
        if (record.valueType === 'number') {
          return (
            <InputNumber
              min={1}
              style={{ width: 140 }}
              value={parseInt(record.value, 10)}
              disabled={savingConfig}
              onChange={(val) => {
                if (val !== null) handleSaveConfig(record.key, val);
              }}
            />
          );
        }
        if (record.key === 'MIN_ROLE_FOR_BACKUP') {
          return (
            <Select
              style={{ width: 160 }}
              value={record.value}
              onChange={(val) => handleSaveConfig(record.key, val)}
              disabled={savingConfig}
            >
              <Option value="Admin">Admin</Option>
              <Option value="Trưởng Ban KTNB">Trưởng Ban KTNB</Option>
              <Option value="Kiểm toán viên">Kiểm toán viên</Option>
            </Select>
          );
        }
        return (
          <Input
            style={{ width: 160 }}
            defaultValue={record.value}
            disabled={savingConfig}
            onPressEnter={(e: any) => handleSaveConfig(record.key, e.target.value)}
            onBlur={(e: any) => handleSaveConfig(record.key, e.target.value)}
          />
        );
      }
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            Quản trị & Bảo trì Hệ thống
          </Title>
          <Text type="secondary">Sao lưu & khôi phục database thực tế, nhật ký vận hành và tuân thủ các chuẩn bảo mật ngân hàng.</Text>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => { 
            fetchData(); 
            fetchSecurityData(); 
          }}
          loading={loading || configLoading}
        >
          Làm mới dữ liệu
        </Button>
      </div>

      {/* Dynamic Progress Indicator */}
      {showProgress && (
        <Card style={{ marginBottom: 24, borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', boxShadow: '0 2px 8px rgba(245,158,11,0.1)' }}>
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ color: '#0f172a' }}>
                <SlidersOutlined spin={progress < 100} style={{ marginRight: 8, color: '#d97706' }} />
                {progressStatus}
              </Text>
              <Text strong style={{ color: '#0f172a' }}>{progress}%</Text>
            </div>
            <Progress 
              percent={progress} 
              status={progress === 100 ? 'success' : 'active'} 
              strokeColor={{ '0%': '#ea9105', '100%': '#52c41a' }}
              showInfo={false}
            />
          </Space>
        </Card>
      )}

      <Tabs 
        defaultActiveKey="maintenance" 
        size="large"
        style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        items={[
          {
            key: 'custom-fields',
            label: <span><FormOutlined style={{ marginRight: 4 }} />{t('systemManagement.tabs.customFields', 'Trường Dữ liệu Động')}</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <CustomFieldConfig />
              </div>
            )
          },
          {
            key: 'workflows',
            label: <span><SubnodeOutlined style={{ marginRight: 4 }} />{t('systemManagement.tabs.workflows', 'Quy trình Động')}</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <WorkflowBuilder />
              </div>
            )
          },
          {
            key: 'report-builder',
            label: <span><PieChartOutlined /> Báo cáo Động (Report Builder)</span>,
            children: (
              <ReportBuilder />
            )
          },
          {
            key: 'maintenance',
            label: <span><DatabaseOutlined style={{ marginRight: 4 }} />{t('systemManagement.tabs.maintenance', 'Sao lưu & Bảo trì')}</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Row gutter={[24, 24]}>
                  {/* === Nhật ký & Bảo trì === */}
                  <Col span={16}>
                    <Card 
                      title={<Space><HistoryOutlined /> Nhật ký & Bảo trì</Space>}
                      variant="borderless"
                      style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic title="Tổng số cảnh báo bảo mật" value={stats.totalAlerts} prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="Lần dọn dẹp gần nhất" value={stats.lastCleanup ? new Date(stats.lastCleanup).toLocaleDateString('vi-VN') : 'Chưa có'} />
                        </Col>
                      </Row>
                      
                      <Divider />
                      
                      <div style={{ background: '#fff7e6', padding: 16, borderRadius: 8, border: '1px solid #ffe7ba' }}>
                        <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <WarningOutlined style={{ color: '#fa8c16' }} /> Dọn dẹp Nhật ký Audit Trail
                        </Title>
                        <Paragraph>
                          Việc lưu trữ quá nhiều log audit trail có thể làm chậm quá trình truy vấn và tốn dung lượng ổ cứng. 
                          Khuyến nghị dọn dẹp định kỳ các bản ghi cũ.
                        </Paragraph>
                        <Space>
                          <Text>Xóa các bản ghi cũ hơn:</Text>
                          <Select value={cleanupMonths} onChange={setCleanupMonths} style={{ width: 150 }}>
                            <Option value={3}>3 tháng</Option>
                            <Option value={6}>6 tháng</Option>
                            <Option value={12}>1 năm</Option>
                            <Option value={24}>2 năm</Option>
                          </Select>
                          <Button danger type="primary" icon={<DeleteOutlined />} onClick={handleCleanup}>
                            Thực hiện dọn dẹp
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  </Col>

                  {/* === Trạng thái DB & Backup === */}
                  <Col span={8}>
                    <Card 
                      title={<Space><DatabaseOutlined /> Trạng thái Database</Space>}
                      variant="borderless"
                      style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic 
                            title="Tổng dung lượng backup thực tế" 
                            value={backupStats.totalSizeMB} 
                            suffix="MB" 
                            valueStyle={{ color: '#ea9105', fontWeight: 700 }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic 
                            title="Số file backup hiện tại" 
                            value={backupStats.totalFiles} 
                            suffix="files"
                          />
                        </Col>
                      </Row>
                      
                      <Divider />
                      
                      <Button 
                        type="primary" 
                        icon={<CloudUploadOutlined />} 
                        block 
                        onClick={handleBackup}
                        loading={loading}
                        style={{ height: 42, marginBottom: 12, background: 'linear-gradient(135deg, #ea9105, #c77700)', border: 'none', borderRadius: 6 }}
                      >
                        Tạo bản sao lưu tức thì (Full Backup)
                      </Button>

                      <Upload
                        accept=".sql"
                        showUploadList={false}
                        beforeUpload={handleUpload}
                      >
                        <Button 
                          icon={<CloudUploadOutlined />} 
                          block 
                          style={{ height: 42, marginBottom: 12, borderRadius: 6, borderColor: '#722ed1', color: '#722ed1' }}
                        >
                          Chọn File SQL & Tải lên
                        </Button>
                      </Upload>

                      <Upload.Dragger
                        accept=".sql"
                        showUploadList={false}
                        beforeUpload={handleUpload}
                        style={{ marginBottom: 12 }}
                      >
                        <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                          <InboxOutlined style={{ color: '#722ed1', fontSize: 24 }} />
                        </p>
                        <p style={{ fontSize: 13, margin: '4px 0 0 0' }}>
                          Kéo thả file .sql vào đây để tải lên
                        </p>
                      </Upload.Dragger>

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Lưu ý: Tệp sao lưu sẽ được lưu trữ tại thư mục an toàn trên server. Bạn nên định kỳ tải về để lưu trữ ngoại vi.
                      </Text>
                    </Card>
                  </Col>

                  {/* === Bảng danh sách backup === */}
                  <Col span={24}>
                    <Card 
                      title={
                        <Space>
                          <DatabaseOutlined />
                          <span>Danh sách các bản sao lưu database thực tế</span>
                          <Badge count={backups.length} style={{ backgroundColor: '#ea9105' }} />
                        </Space>
                      }
                      variant="borderless"
                      style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                      {backups.length === 0 ? (
                        <Alert
                          message="Chưa có bản sao lưu nào"
                          description="Nhấn nút 'Tạo bản sao lưu tức thì' để tạo bản sao lưu đầu tiên, hoặc upload file .sql từ máy tính của bạn."
                          type="info"
                          showIcon
                        />
                      ) : (
                        <Table 
                          dataSource={backups} 
                          columns={backupColumns} 
                          rowKey="name" 
                          loading={loading}
                          pagination={{ pageSize: 5, showTotal: (t) => `Tổng ${t} bản sao lưu` }}
                          style={{ background: '#fff', borderRadius: 8 }}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: 'security',
            label: <span><SafetyOutlined style={{ marginRight: 4 }} />Bảo mật & Tuân thủ</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Row gutter={[24, 24]}>
                  {/* === Báo cáo Tuân thủ (Compliance Scorecards) === */}
                  <Col span={8}>
                    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
                      {/* PCI DSS Scorecard */}
                      <Card 
                        title={<Space><SafetyCertificateOutlined style={{ color: '#fa8c16' }} /> PCI DSS v4.0 Compliance</Space>}
                        style={{ borderRadius: 8, borderLeft: '4px solid #fa8c16' }}
                      >
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                          <Progress 
                            type="circle" 
                            percent={Math.round((compliance.pciDss.score / compliance.pciDss.total) * 100)} 
                            strokeColor={{ '0%': '#ffa940', '100%': '#fa8c16' }}
                            width={110}
                          />
                          <div style={{ marginTop: 12 }}>
                            <Badge status={compliance.pciDss.score === compliance.pciDss.total ? 'success' : 'warning'} />
                            <Text strong style={{ fontSize: 15 }}>
                              Đạt {compliance.pciDss.score}/{compliance.pciDss.total} tiêu chí
                            </Text>
                          </div>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />
                        
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748b' }}>
                            TIÊU CHÍ CHƯA ĐẠT ({compliance.pciDss.failed.length})
                          </Text>
                          {compliance.pciDss.failed.length === 0 ? (
                            <Alert message="Chúc mừng! Hệ thống tuân thủ 100% chuẩn PCI DSS." type="success" showIcon />
                          ) : (
                            <Space orientation="vertical" style={{ width: '100%' }}>
                              {compliance.pciDss.failed.map((item: string) => (
                                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                  <Text delete type="secondary">{item}</Text>
                                </div>
                              ))}
                            </Space>
                          )}
                        </div>
                      </Card>

                      {/* ISO 27001 Scorecard */}
                      <Card 
                        title={<Space><FileProtectOutlined style={{ color: '#ea9105' }} /> ISO 27001:2022 Compliance</Space>}
                        style={{ borderRadius: 8, borderLeft: '4px solid #ea9105' }}
                      >
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                          <Progress 
                            type="circle" 
                            percent={Math.round((compliance.iso27001.score / compliance.iso27001.total) * 100)} 
                            strokeColor={{ '0%': '#f1e5d8', '100%': '#ea9105' }}
                            width={110}
                          />
                          <div style={{ marginTop: 12 }}>
                            <Badge status={compliance.iso27001.score === compliance.iso27001.total ? 'success' : 'warning'} />
                            <Text strong style={{ fontSize: 15 }}>
                              Đạt {compliance.iso27001.score}/{compliance.iso27001.total} tiêu chí
                            </Text>
                          </div>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748b' }}>
                            TIÊU CHÍ CHƯA ĐẠT ({compliance.iso27001.failed.length})
                          </Text>
                          {compliance.iso27001.failed.length === 0 ? (
                            <Alert message="Chúc mừng! Hệ thống tuân thủ 100% chuẩn ISO 27001." type="success" showIcon />
                          ) : (
                            <Space orientation="vertical" style={{ width: '100%' }}>
                              {compliance.iso27001.failed.map((item: string) => (
                                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                  <Text delete type="secondary">{item}</Text>
                                </div>
                              ))}
                            </Space>
                          )}
                        </div>
                      </Card>
                    </Space>
                  </Col>

                  {/* === Bảng tham số bảo mật === */}
                  <Col span={16}>
                    <Card 
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <Space><SlidersOutlined /> Thiết lập Tham số Bảo mật</Space>
                          <Space>
                            <Button 
                              type="dashed" 
                              danger
                              icon={<SafetyCertificateOutlined />} 
                              onClick={() => handleApplyPreset('pci-dss')}
                            >
                              PCI DSS Preset
                            </Button>
                            <Button 
                              type="dashed" 
                              style={{ color: '#ea9105', borderColor: '#ea9105' }}
                              icon={<FileProtectOutlined />} 
                              onClick={() => handleApplyPreset('iso-27001')}
                            >
                              ISO 27001 Preset
                            </Button>
                          </Space>
                        </div>
                      }
                      variant="borderless"
                      style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                      <Card
                        title={<Space><LockOutlined style={{ color: '#ea9105' }} /> Chế độ Xác thực & Đăng nhập (Auth Modes)</Space>}
                        style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #fed7aa', background: '#fffaf5' }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col span={6}>
                            <Card size="small" style={{ background: '#fff', borderRadius: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Text strong style={{ display: 'block', fontSize: 13 }}>1. Local User</Text>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Tài khoản CSDL nội bộ</Text>
                                </div>
                                <Switch
                                  checked={configs.find(c => c.key === 'AUTH_MODE_LOCAL_ENABLED')?.value === 'true'}
                                  onChange={(checked) => handleSaveConfig('AUTH_MODE_LOCAL_ENABLED', checked ? 'true' : 'false')}
                                  checkedChildren="Bật" unCheckedChildren="Tắt"
                                />
                              </div>
                            </Card>
                          </Col>

                          <Col span={6}>
                            <Card size="small" style={{ background: '#fff', borderRadius: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Text strong style={{ display: 'block', fontSize: 13 }}>2. Tự Đăng ký</Text>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Cho phép user tự đăng ký</Text>
                                </div>
                                <Switch
                                  checked={configs.find(c => c.key === 'ALLOW_SELF_REGISTRATION')?.value === 'true'}
                                  onChange={(checked) => handleSaveConfig('ALLOW_SELF_REGISTRATION', checked ? 'true' : 'false')}
                                  checkedChildren="Bật" unCheckedChildren="Tắt"
                                />
                              </div>
                            </Card>
                          </Col>

                          <Col span={6}>
                            <Card size="small" style={{ background: '#fff', borderRadius: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Text strong style={{ display: 'block', fontSize: 13 }}>3. Active Directory / LDAP</Text>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Domain LPBank Windows</Text>
                                </div>
                                <Switch
                                  checked={configs.find(c => c.key === 'AUTH_MODE_LDAP_ENABLED')?.value === 'true'}
                                  onChange={(checked) => handleSaveConfig('AUTH_MODE_LDAP_ENABLED', checked ? 'true' : 'false')}
                                  checkedChildren="Bật" unCheckedChildren="Tắt"
                                />
                              </div>
                            </Card>
                          </Col>

                          <Col span={6}>
                            <Card size="small" style={{ background: '#fff', borderRadius: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Text strong style={{ display: 'block', fontSize: 13 }}>4. Keycloak SSO (OIDC)</Text>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Single Sign-On chuẩn IAM</Text>
                                </div>
                                <Switch
                                  checked={configs.find(c => c.key === 'AUTH_MODE_KEYCLOAK_ENABLED')?.value === 'true'}
                                  onChange={(checked) => handleSaveConfig('AUTH_MODE_KEYCLOAK_ENABLED', checked ? 'true' : 'false')}
                                  checkedChildren="Bật" unCheckedChildren="Tắt"
                                />
                              </div>
                            </Card>
                          </Col>
                        </Row>

                        <Divider style={{ margin: '12px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13 }}>
                            <strong>Chế độ hiển thị tại màn hình đăng nhập:</strong>
                          </Text>
                          <Select
                            style={{ width: 260 }}
                            value={configs.find(c => c.key === 'AUTH_DEFAULT_MODE')?.value || 'ALL'}
                            onChange={(val) => handleSaveConfig('AUTH_DEFAULT_MODE', val)}
                          >
                            <Option value="ALL">Tất cả (Local + LDAP + Keycloak)</Option>
                            <Option value="LOCAL">Chỉ Tài khoản Nội bộ</Option>
                            <Option value="LDAP">Chỉ Domain / LDAP LPBank</Option>
                            <Option value="KEYCLOAK">Chỉ Keycloak SSO</Option>
                          </Select>
                        </div>
                      </Card>

                      <Alert 
                        message="Lưu ý quan trọng đối với PCI DSS & ISO 27001"
                        description="Việc chỉnh sửa các tham số này sẽ ảnh hưởng trực tiếp và lập tức tới cơ chế đăng nhập, độ mạnh mật khẩu và chính sách hết hạn phiên hoạt động của toàn bộ người dùng trong hệ thống."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />

                      <Table 
                        dataSource={configs} 
                        columns={securityColumns} 
                        rowKey="key" 
                        loading={configLoading}
                        pagination={false}
                        style={{ background: '#fff', borderRadius: 8 }}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: 'kita_logs',
            label: <span><MessageOutlined style={{ marginRight: 4 }} />Nhật ký & Phân tích Kita AI</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Row gutter={[24, 24]}>
                  {/* Stats Cards */}
                  <Col span={6}>
                    <Card style={{ background: '#fafafa', borderRadius: 8 }}>
                      <Statistic 
                        title="Tổng số câu hỏi phục vụ" 
                        value={kitaAnalytics.totalQuestions} 
                        prefix={<MessageOutlined style={{ color: '#ea9105' }} />}
                        valueStyle={{ color: '#ea9105', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card style={{ background: '#fafafa', borderRadius: 8 }}>
                      <Statistic 
                        title="Thời gian phản hồi TB" 
                        value={kitaAnalytics.avgResponseTimeMs} 
                        suffix=" ms"
                        prefix={<HistoryOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card style={{ background: '#fafafa', borderRadius: 8 }}>
                      <Statistic 
                        title="Tỷ lệ Fallback (Không khớp)" 
                        value={kitaAnalytics.fallbackRate} 
                        suffix="%"
                        prefix={<WarningOutlined style={{ color: '#fa8c16' }} />}
                        valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card style={{ background: '#fafafa', borderRadius: 8 }}>
                      <Statistic 
                        title="Chủ đề nổi bật được hỏi" 
                        value={kitaAnalytics.popularKeywords?.length || 0} 
                        suffix=" chủ đề"
                        prefix={<SettingOutlined style={{ color: '#722ed1' }} />}
                        valueStyle={{ color: '#722ed1', fontWeight: 700 }}
                      />
                    </Card>
                  </Col>

                  {/* Left Column: Popular Keywords */}
                  <Col span={8}>
                    <Card 
                      title={<Space><SettingOutlined /> Từ khóa & Câu hỏi phổ biến</Space>}
                      variant="borderless"
                      style={{ background: '#fafafa', borderRadius: 8, height: '100%' }}
                    >
                      <Paragraph>
                        Danh sách các từ khóa xuất hiện nhiều nhất trong câu hỏi của cán bộ nhân sự, được phân tích tự động bằng AI heuristic để hỗ trợ cải tiến hệ thống:
                      </Paragraph>
                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {kitaAnalytics.popularKeywords?.length === 0 ? (
                          <Alert message="Chưa có dữ liệu thống kê từ khóa." type="info" showIcon />
                        ) : (
                          kitaAnalytics.popularKeywords?.map((item: any, idx: number) => {
                            // eslint-disable-next-line no-useless-assignment
                            let color = 'orange';
                            if (idx === 0) color = 'red';
                            else if (idx === 1) color = 'volcano';
                            else if (idx === 2) color = 'gold';
                            else if (idx < 5) color = 'blue';
                            else color = 'default';

                            return (
                              <div key={item.keyword} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <Tag color={color} style={{ fontWeight: 'bold' }}>#{idx + 1}</Tag>
                                  <Text strong style={{ fontSize: 13 }}>{item.keyword}</Text>
                                </Space>
                                <Badge count={item.count} style={{ backgroundColor: '#d97706' }} />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Card>
                  </Col>

                  {/* Right Column: Chat History Table */}
                  <Col span={16}>
                    <Card 
                      title={
                        <Space>
                          <HistoryOutlined />
                          <span>Nhật ký hội thoại chi tiết của Trợ lý Kita</span>
                          <Badge count={kitaLogs.length} style={{ backgroundColor: '#ea9105' }} />
                        </Space>
                      }
                      variant="borderless"
                      style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                      <Table 
                        dataSource={kitaLogs} 
                        loading={kitaLoading}
                        rowKey="id"
                        pagination={{ pageSize: 8, showTotal: (t) => `Tổng ${t} cuộc hội thoại` }}
                        style={{ background: '#fff', borderRadius: 8 }}
                        columns={[
                          {
                            title: 'Nhân sự',
                            dataIndex: 'username',
                            key: 'username',
                            width: 110,
                            render: (text: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{text || 'Ẩn danh'}</Tag>
                          },
                          {
                            title: 'Nội dung hỏi',
                            dataIndex: 'userQuestion',
                            key: 'userQuestion',
                            render: (text: string) => (
                              <Tooltip title={text}>
                                <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                  {text}
                                </div>
                              </Tooltip>
                            )
                          },
                          {
                            title: 'Kita trả lời',
                            dataIndex: 'kitaReply',
                            key: 'kitaReply',
                            render: (text: string) => (
                              <Tooltip title={text}>
                                <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                                  {text?.replace(/\*\*|#/g, '')}
                                </div>
                              </Tooltip>
                            )
                          },
                          {
                            title: 'Ý định (Intent)',
                            dataIndex: 'intent',
                            key: 'intent',
                            width: 130,
                            render: (intent: string) => {
                              let color = 'default';
                              if (intent === 'AUDIT_PLAN') color = 'blue';
                              else if (intent === 'FINDING') color = 'magenta';
                              else if (intent === 'RECOMMENDATION') color = 'purple';
                              else if (intent === 'IT_SYSTEM') color = 'cyan';
                              else if (intent === 'CREDIT') color = 'gold';
                              else if (intent === 'PERSONNEL') color = 'green';
                              return <Tag color={color} style={{ fontSize: 10, fontWeight: 600 }}>{intent || 'Không rõ'}</Tag>;
                            }
                          },
                          {
                            title: 'Nguồn xử lý',
                            dataIndex: 'source',
                            key: 'source',
                            width: 140,
                            render: (source: string, record: any) => {
                              let color = 'default';
                              if (source?.includes('LLM')) color = 'orange';
                              else if (source?.includes('Heuristic')) color = 'green';
                              else if (record.isFallback) color = 'red';
                              return <Tag color={color} style={{ fontSize: 10 }}>{source || 'Hệ thống'}</Tag>;
                            }
                          },
                          {
                            title: 'Xử lý',
                            dataIndex: 'responseTimeMs',
                            key: 'responseTimeMs',
                            width: 90,
                            render: (time: number) => (
                              <span style={{ fontWeight: 600, color: time > 3000 ? '#fa8c16' : '#52c41a' }}>
                                {time} ms
                              </span>
                            )
                          },
                          {
                            title: 'Thời gian',
                            dataIndex: 'createdAt',
                            key: 'createdAt',
                            width: 140,
                            render: (date: string) => new Date(date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })
                          }
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: 'integration-settings',
            label: <span><ApiOutlined style={{ marginRight: 4 }} />Tích hợp Mail & SSO/LDAP</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <IntegrationSettings />
              </div>
            )
          },
          {
            key: 'external-integration',
            label: <span><DatabaseOutlined style={{ marginRight: 4 }} />Tích hợp CSDL Bên ngoài</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <ExternalDatabaseConnections />
              </div>
            )
          },
          {
            key: 'infrastructure-monitor',
            label: <span><DesktopOutlined style={{ marginRight: 4 }} />Giám sát Hạ tầng</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <InfrastructureMonitor />
              </div>
            )
          }
        ]}
      />

      {/* === Modal Restore Database === */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Khôi phục Database — Thao tác cực kỳ quan trọng</span>
          </Space>
        }
        open={restoreModalVisible}
        onCancel={() => { setRestoreModalVisible(false); setAdminPassword(''); }}
        onOk={handleRestore}
        okText={t('common.btnConfirmRestore', 'Xác nhận Khôi phục')}
        okType="danger"
        cancelText={t('common.btnCancel', 'Hủy')}
        confirmLoading={restoreLoading}
        width={520}
      >
        <Alert
          message="Cảnh báo: Thao tác không thể hoàn tác!"
          description={
            <div>
              <p>Việc khôi phục database sẽ <strong>ghi đè toàn bộ dữ liệu hiện tại</strong> bằng dữ liệu trong file backup.</p>
              <p>File sẽ được khôi phục:</p>
              <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>{restoreFileName}</Tag>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            <LockOutlined style={{ marginRight: 6 }} />
            Nhập mật khẩu Admin để xác nhận:
          </Text>
          <Input.Password
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Nhập mật khẩu tài khoản Admin hiện tại"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SystemManagement;
