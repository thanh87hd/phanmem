import React, { useState, useEffect } from 'react';
import {
  Typography, Card, Tabs, Form, Input, InputNumber, Switch,
  Button, Space, Divider, Tag, Alert, Row, Col, Select,
  message, Tooltip, Badge, Modal, Table, Steps
} from 'antd';
import {
  MailOutlined, SaveOutlined, LockOutlined, GlobalOutlined,
  UserSwitchOutlined, KeyOutlined, InfoCircleOutlined, ApiOutlined,
  ExclamationCircleOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, CloudServerOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WindowsOutlined, ThunderboltOutlined,
  SafetyOutlined, CopyOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Password } = Input;

// ── Interfaces ──────────────────────────────────────────────
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  authType: 'basic' | 'oauth2' | 'anonymous' | 'ntlm';
  user: string;
  password: string;
  domain: string;          // NTLM domain
  tenantId: string;        // OAuth2 / Microsoft 365
  clientId: string;        // OAuth2
  clientSecret: string;    // OAuth2
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

interface SsoProvider {
  id?: number;
  name: string;
  type: 'ldap' | 'ad' | 'saml' | 'oauth2';
  enabled: boolean;
  host: string;
  port: number;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  userSearchBase: string;
  userSearchFilter: string;
  groupSearchBase: string;
  groupRoleMapping: Record<string, string>;
  tlsEnabled: boolean;
  status?: 'connected' | 'disconnected' | 'testing';
}

const defaultSmtp: SmtpConfig = {
  host: '',
  port: 587,
  secure: false,
  authType: 'basic',
  user: '',
  password: '',
  domain: '',
  tenantId: '',
  clientId: '',
  clientSecret: '',
  fromName: 'KTNB LPBank',
  fromEmail: '',
  enabled: false,
};

// ── Helpers ──────────────────────────────────────────────────
const AUTH_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  basic:     { label: 'Basic Auth',       color: 'blue' },
  oauth2:    { label: 'OAuth2 (Modern)',   color: 'green' },
  anonymous: { label: 'Anonymous Relay',  color: 'orange' },
  ntlm:      { label: 'NTLM (Windows)',   color: 'purple' },
};

// ═══════════════════════════════════════════════════════════
const IntegrationSettings: React.FC = () => {
  const { t } = useTranslation();

  // ── Preset profiles ──────────────────────────────────────────
  const SMTP_PRESETS: Record<string, Partial<SmtpConfig> & { label: string; icon: string; note: string }> = {
    m365: {
      label: 'Microsoft 365',
      icon: '🏢',
      note: t('integrationSettings.requiresOauth2ModernAuthBasicAuth', 'Yêu cầu OAuth2 Modern Auth. Basic Auth đã bị Microsoft vô hiệu hóa từ 10/2022.'),
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      authType: 'oauth2',
    },
    exchange_basic: {
      label: 'Exchange On-Premise (Basic Auth)',
      icon: '🖥️',
      note: t('integrationSettings.usedForInternalExchangeServerIt', 'Dùng cho Exchange Server nội bộ còn hỗ trợ Basic Authentication.'),
      host: '',
      port: 587,
      secure: false,
      authType: 'basic',
    },
    exchange_relay: {
      label: 'Exchange On-Premise (Anonymous Relay)',
      icon: '🔀',
      note: t('integrationSettings.usedWhenExchangeIsConfiguredWith', 'Dùng khi Exchange được cấu hình Anonymous Relay. Không cần username/password.'),
      host: '',
      port: 25,
      secure: false,
      authType: 'anonymous',
    },
    exchange_ntlm: {
      label: 'Exchange On-Premise (NTLM)',
      icon: '🔐',
      note: t('integrationSettings.useNtlmAuthenticationWithAWindows', 'Dùng NTLM Authentication với tài khoản domain Windows.'),
      host: '',
      port: 587,
      secure: false,
      authType: 'ntlm',
    },
    gmail: {
      label: 'Gmail / Google Workspace',
      icon: '📧',
      note: t('integrationSettings.needToCreateAppPasswordIn', 'Cần tạo App Password trong Google Account (2FA bắt buộc).'),
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      authType: 'basic',
    },
  };

  const defaultSso: Partial<SsoProvider> = {
    name: '',
    type: 'ad',
    enabled: false,
    host: '',
    port: 389,
    baseDn: '',
    bindDn: '',
    bindPassword: '',
    userSearchBase: '',
    userSearchFilter: '(sAMAccountName={{username}})',
    groupSearchBase: '',
    tlsEnabled: false,
    groupRoleMapping: {
      'CN=KTNB-Admins,OU=Groups': 'Admin',
      'CN=KTNB-TruongBan,OU=Groups': t('processAnalysis.reportLeaderSign', 'Trưởng Ban KTNB'),
      'CN=KTNB-TruongDoan,OU=Groups': t('auditEngagements.cols.leadAuditor', 'Trưởng đoàn'),
      'CN=KTNB-KTV,OU=Groups': t('workingPapers.auditor', 'Kiểm toán viên'),
      'CN=KTNB-BKS,OU=Groups': t('integrationSettings.boardOfSupervisors', 'Ban Kiểm soát'),
    },
  };

  const ROLE_OPTIONS = ['Admin', t('processAnalysis.reportLeaderSign', 'Trưởng Ban KTNB'), t('auditEngagements.cols.leadAuditor', 'Trưởng đoàn'), t('workingPapers.auditor', 'Kiểm toán viên'), t('integrationSettings.boardOfSupervisors', 'Ban Kiểm soát'), 'Auditee'];
  const [smtpForm] = Form.useForm();
  const [ssoForm]  = Form.useForm();
  const [mappingForm] = Form.useForm();

  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([]);
  const [editingProvider, setEditingProvider] = useState<SsoProvider | null>(null);
  const [ssoModalVisible, setSsoModalVisible] = useState(false);
  const [mappingModalVisible, setMappingModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SsoProvider | null>(null);

  const [smtpLoading, setSmtpLoading]   = useState(false);
  const [smtpTesting, setSmtpTesting]   = useState(false);
  const [smtpStatus, setSmtpStatus]     = useState<'idle' | 'ok' | 'fail' | 'testing'>('idle');
  const [smtpMessage, setSmtpMessage]   = useState('');
  const [ssoLoading, setSsoLoading]     = useState(false);
  const [testingId, setTestingId]       = useState<number | null>(null);

  // Current auth type (to show/hide conditional fields)
  const [authType, setAuthType] = useState<string>('basic');

  // ── Fetch ──────────────────────────────────────────────
  const fetchSmtp = async () => {
    try {
      const res = await api.get('/system-management/smtp-config');
      if (res.data) {
        smtpForm.setFieldsValue(res.data);
        setAuthType(res.data.authType || 'basic');
      }
    } catch {
      smtpForm.setFieldsValue(defaultSmtp);
    }
  };

  const fetchSsoProviders = async () => {
    setSsoLoading(true);
    try {
      const res = await api.get('/system-management/sso-providers');
      setSsoProviders(res.data || []);
    } catch {
      setSsoProviders([]);
    } finally {
      setSsoLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSmtp(); fetchSsoProviders(); }, []);

  // ── Preset apply ────────────────────────────────────────
  const applyPreset = (key: string) => {
    const preset = SMTP_PRESETS[key];
    if (!preset) return;
    const current = smtpForm.getFieldsValue();
    smtpForm.setFieldsValue({
      ...current,
      host:     preset.host     ?? current.host,
      port:     preset.port     ?? current.port,
      secure:   preset.secure   ?? current.secure,
      authType: preset.authType ?? current.authType,
    });
    setAuthType(preset.authType ?? current.authType ?? 'basic');
    message.info(t('integrationSettings.presetAppliedPresetlabel', { p0: preset.label }));
  };

  // ── SMTP Save / Test ────────────────────────────────────
  const handleSaveSmtp = async () => {
    try {
      const values = await smtpForm.validateFields();
      setSmtpLoading(true);
      await api.post('/system-management/smtp-config', values);
      message.success(t('integrationSettings.emailConfigurationSavedSuccessfully', 'Đã lưu cấu hình Email thành công!'));
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || t('integrationSettings.saveConfigurationFailed', 'Lưu cấu hình thất bại'));
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    try {
      const values = await smtpForm.validateFields();
      setSmtpTesting(true);
      setSmtpStatus('testing');
      setSmtpMessage(t('integrationSettings.connecting', 'Đang kết nối...'));
      const res = await api.post('/system-management/smtp-config/test', values);
      setSmtpStatus('ok');
      setSmtpMessage(res.data?.message || t('integrationSettings.connectedAndSentTestEmailSuccessfully', 'Kết nối và gửi email kiểm tra thành công!'));
      message.success(t('integrationSettings.emailConnectionSuccessful', 'Kết nối email thành công!'));
    } catch (err: any) {
      setSmtpStatus('fail');
      const msg = err?.response?.data?.message || err?.message || t('integrationSettings.connectionFailed', 'Kết nối thất bại');
      setSmtpMessage(msg);
      message.error(msg);
    } finally {
      setSmtpTesting(false);
    }
  };

  // ── SSO ─────────────────────────────────────────────────
  const handleOpenSsoModal = (provider?: SsoProvider) => {
    setEditingProvider(provider || null);
    ssoForm.setFieldsValue(provider || defaultSso);
    setSsoModalVisible(true);
  };

  const handleSaveSso = async () => {
    try {
      const values = await ssoForm.validateFields();
      setSsoLoading(true);
      if (editingProvider?.id) {
        await api.patch(`/system-management/sso-providers/${editingProvider.id}`, values);
        message.success(t('integrationSettings.updatedSsoldapConnection', 'Đã cập nhật kết nối SSO/LDAP!'));
      } else {
        await api.post('/system-management/sso-providers', values);
        message.success(t('integrationSettings.newSsoldapConnectionAdded', 'Đã thêm kết nối SSO/LDAP mới!'));
      }
      setSsoModalVisible(false);
      fetchSsoProviders();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || t('integrationSettings.savingSsoConfigurationFailed', 'Lưu cấu hình SSO thất bại'));
    } finally {
      setSsoLoading(false);
    }
  };

  const handleTestSso = async (provider: SsoProvider) => {
    setTestingId(provider.id || null);
    try {
      await api.post(`/system-management/sso-providers/${provider.id}/test`);
      message.success(t('integrationSettings.successfulConnectionToProviderhost', { p0: provider.host }));
      fetchSsoProviders();
    } catch (err: any) {
      message.error(err?.response?.data?.message || t('integrationSettings.ssoldapConnectionFailed', 'Kết nối SSO/LDAP thất bại'));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteSso = (provider: SsoProvider) => {
    Modal.confirm({
      title: t('integrationSettings.deleteConnectionProvidername', { p0: provider.name }),
      icon: <ExclamationCircleOutlined />,
      content: t('integrationSettings.thisSsoUserWillNotBe', 'Người dùng SSO này sẽ không thể đăng nhập bằng tài khoản domain.'),
      okText: t('auditTemplates.btnDelete', 'Xóa'), okType: 'danger', cancelText: t('findingKB.modal.cancelText', 'Hủy'),
      onOk: async () => {
        await api.delete(`/system-management/sso-providers/${provider.id}`);
        message.success(t('integrationSettings.removedSsoConnection', 'Đã xóa kết nối SSO'));
        fetchSsoProviders();
      },
    });
  };

  const handleOpenMapping = (provider: SsoProvider) => {
    setSelectedProvider(provider);
    mappingForm.setFieldsValue({
      mapping: Object.entries(provider.groupRoleMapping || {}).map(([group, role]) => ({ group, role }))
    });
    setMappingModalVisible(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedProvider?.id) return;
    try {
      const { mapping } = await mappingForm.validateFields();
      const groupRoleMapping: Record<string, string> = {};
      (mapping || []).forEach((m: any) => { if (m.group && m.role) groupRoleMapping[m.group] = m.role; });
      await api.patch(`/system-management/sso-providers/${selectedProvider.id}`, { groupRoleMapping });
      message.success(t('integrationSettings.groupMappingSavedPermissions', 'Đã lưu ánh xạ nhóm → quyền!'));
      setMappingModalVisible(false);
      fetchSsoProviders();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(t('integrationSettings.saveMappingFailed', 'Lưu ánh xạ thất bại'));
    }
  };

  // ── SSO table columns ───────────────────────────────────
  const ssoColumns = [
    {
      title: t('integrationSettings.connectionName', 'Tên kết nối'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, r: SsoProvider) => (
        <Space>
          <CloudServerOutlined style={{ color: r.enabled ? '#52c41a' : '#ccc', fontSize: 18 }} />
          <div>
            <Text strong>{name}</Text>
            <div>
              <Tag color={r.type === 'ldap' ? 'blue' : r.type === 'ad' ? 'geekblue' : r.type === 'saml' ? 'purple' : 'orange'}>
                {r.type.toUpperCase()}
              </Tag>
              <Tag color={r.tlsEnabled ? 'green' : 'default'}>{r.tlsEnabled ? 'LDAPS/TLS' : 'Plain'}</Tag>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Server',
      key: 'host',
      render: (_: any, r: SsoProvider) => (
        <Space orientation="vertical" size={0}>
          <Text code style={{ fontSize: 12 }}>{r.host}:{r.port}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.baseDn}</Text>
        </Space>
      ),
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      key: 'status',
      width: 140,
      render: (_: any, r: SsoProvider) => (
        <Space orientation="vertical" size={0}>
          <Badge status={r.enabled ? 'success' : 'default'} text={r.enabled ? t('integrationSettings.on', 'Đang bật') : t('integrationSettings.turnOff', 'Tắt')} />
          {r.status === 'connected'    && <Tag color="green" style={{ fontSize: 10 }}>{t('integrationSettings.connected', '✓ Đã kết nối')}</Tag>}
          {r.status === 'disconnected' && <Tag color="red"   style={{ fontSize: 10 }}>{t('integrationSettings.connectionLost', '✗ Mất kết nối')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('integrationSettings.mapping', 'Ánh xạ'),
      key: 'mapping',
      width: 110,
      render: (_: any, r: SsoProvider) => (
        <Button size="small" icon={<KeyOutlined />} onClick={() => handleOpenMapping(r)}>
          {Object.keys(r.groupRoleMapping || {}).length} nhóm
        </Button>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 190,
      render: (_: any, r: SsoProvider) => (
        <Space>
          <Button size="small" icon={<ApiOutlined />} loading={testingId === r.id}
            onClick={() => handleTestSso(r)} style={{ color: '#ea9105', borderColor: '#ea9105' }}>
            Test
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenSsoModal(r)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSso(r)} />
        </Space>
      ),
    },
  ];

  // ── OAuth2 Azure App Registration steps ─────────────────
  const azureSteps = [
    {
      title: t('integrationSettings.createAppRegistration', 'Tạo App Registration'),
      description: t('integrationSettings.azurePortalAzureActiveDirectoryApp', 'Azure Portal → Azure Active Directory → App registrations → New registration. Đặt tên: "KTNB-AMS-MailSender"'),
    },
    {
      title: t('integrationSettings.grantApiPermissions', 'Cấp quyền API'),
      description: 'API permissions → Add permission → Microsoft Graph → Application → Mail.Send → Grant admin consent',
    },
    {
      title: t('integrationSettings.createClientSecret', 'Tạo Client Secret'),
      description: t('integrationSettings.certificatesSecretsNewClientSecretSet', 'Certificates & secrets → New client secret → Đặt thời hạn 24 tháng → Copy giá trị Value ngay (chỉ hiện 1 lần)'),
    },
    {
      title: t('integrationSettings.getConnectionInformation', 'Lấy thông tin kết nối'),
      description: t('integrationSettings.overviewCopyApplicationClientIdAnd', 'Overview → Copy: Application (client) ID và Directory (tenant) ID → Điền vào form bên trái'),
    },
  ];

  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ApiOutlined style={{ marginRight: 8, color: '#ea9105' }} />
          {t('integrationSettings.title', 'Tích hợp & Kết nối Hệ thống')}
        </Title>
        <Text type="secondary">
          {t('integrationSettings.subtitle', 'Cấu hình Email (Exchange / Microsoft 365 / SMTP) và kết nối SSO/LDAP/Active Directory để đăng nhập tập trung.')}
        </Text>
      </div>

      <Tabs size="large"
        style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        items={[

          // ════════════════════════════════════════════════
          // TAB 1: CẤU HÌNH EMAIL
          // ════════════════════════════════════════════════
          {
            key: 'smtp',
            label: <span><MailOutlined style={{ marginRight: 4 }} />{t('integrationSettings.emailConfiguration', 'Cấu hình Email')}</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Alert
                  type="warning"
                  showIcon
                  icon={<WindowsOutlined />}
                  style={{ marginBottom: 20 }}
                  message={<strong>{t('integrationSettings.importantNoteForMicrosoft365And', 'Lưu ý quan trọng với Microsoft 365 và Exchange Online')}</strong>}
                  description={
                    <span>
                      {t('integrationSettings.microsoftHas', 'Microsoft đã')} <strong>{t('integrationSettings.oauth2ModernAuthenticationRequired', 'bắt buộc OAuth2 Modern Authentication')}</strong> {t('integrationSettings.fromOctober2022BasicAuthRegular', 'từ tháng 10/2022. Basic Auth (username/password thông thường) bị vô hiệu hóa hoàn toàn trên Exchange Online. Chọn preset')} <Tag color="green">Microsoft 365</Tag> {t('integrationSettings.forCorrectConfiguration', 'để cấu hình đúng.')}
                    </span>
                  }
                />

                {/* Preset Buttons */}
                <Card
                  title={<Space><ThunderboltOutlined style={{ color: '#fa8c16' }} /> {t('integrationSettings.quickConfigurationAccordingToMailServer', 'Cấu hình nhanh theo loại mail server')}</Space>}
                  variant="borderless"
                  style={{ marginBottom: 20, borderRadius: 8, background: '#fffbe6', border: '1px solid #ffe58f' }}
                >
                  <Space wrap>
                    {Object.entries(SMTP_PRESETS).map(([key, preset]) => (
                      <Tooltip key={key} title={preset.note}>
                        <Button
                          onClick={() => applyPreset(key)}
                          style={{ height: 'auto', padding: '6px 14px' }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18 }}>{preset.icon}</div>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{preset.label}</div>
                          </div>
                        </Button>
                      </Tooltip>
                    ))}
                  </Space>
                </Card>

                <Row gutter={[28, 0]}>
                  {/* LEFT: FORM */}
                  <Col xs={24} lg={14}>
                    <Form form={smtpForm} layout="vertical" initialValues={defaultSmtp}>

                      {/* Card 1: Máy chủ */}
                      <Card
                        title={<Space><GlobalOutlined /> {t('integrationSettings.serversEncryption', 'Máy chủ & Mã hóa')}</Space>}
                        variant="borderless"
                        style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa' }}
                        extra={
                          <Form.Item name="enabled" valuePropName="checked" style={{ margin: 0 }}>
                            <Switch checkedChildren={t('integrationSettings.turnOn', 'Bật')} unCheckedChildren={t('integrationSettings.turnOff', 'Tắt')} />
                          </Form.Item>
                        }
                      >
                        <Row gutter={12}>
                          <Col span={16}>
                            <Form.Item name="host" label={t('integrationSettings.mailServerAddressSmtpHost', 'Địa chỉ mail server (SMTP Host)')}
                              rules={[{ required: true, message: t('integrationSettings.enterTheSmtpServerAddress', 'Nhập địa chỉ SMTP server') }]}>
                              <Input placeholder={t('integrationSettings.smtpoffice365comOrMaillpbankcomvn', 'smtp.office365.com hoặc mail.lpbank.com.vn')} prefix={<GlobalOutlined />} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="port" label={t('externalDatabase.modal.labelPort', 'Cổng (Port)')} rules={[{ required: true }]}>
                              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item name="secure" valuePropName="checked" label={t('integrationSettings.encryptionProtocol', 'Giao thức mã hóa')}>
                          <Switch
                            checkedChildren="SSL/TLS — Port 465"
                            unCheckedChildren={t('integrationSettings.starttlsPort587Recommended', 'STARTTLS — Port 587 (khuyên dùng)')}
                          />
                        </Form.Item>
                      </Card>

                      {/* Card 2: Xác thực */}
                      <Card
                        title={<Space><LockOutlined /> {t('integrationSettings.authenticationMethod', 'Phương thức Xác thực')}</Space>}
                        variant="borderless"
                        style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa' }}
                      >
                        <Form.Item
                          name="authType"
                          label={
                            <Space>
                              {t('integrationSettings.authenticationType', 'Loại xác thực')}
                              <Tooltip title={t('integrationSettings.microsoft365exchangeOnlineRequiresOauth2Exchange', 'Microsoft 365/Exchange Online bắt buộc OAuth2. Exchange On-Premise có thể dùng Basic, NTLM hoặc Anonymous Relay.')}>
                                <InfoCircleOutlined />
                              </Tooltip>
                            </Space>
                          }
                          rules={[{ required: true }]}
                        >
                          <Select onChange={(v) => setAuthType(v)} style={{ width: '100%' }}>
                            <Option value="oauth2">
                              <Space>
                                <Tag color="green" style={{ margin: 0 }}>{t('integrationSettings.requiredM365', 'Bắt buộc M365')}</Tag>
                                OAuth2 — Modern Authentication (Microsoft 365 / Exchange Online)
                              </Space>
                            </Option>
                            <Option value="basic">
                              <Space>
                                <Tag color="blue" style={{ margin: 0 }}>On-Premise</Tag>
                                Basic Auth — Username + Password (Exchange On-Premise / Gmail)
                              </Space>
                            </Option>
                            <Option value="ntlm">
                              <Space>
                                <Tag color="purple" style={{ margin: 0 }}>Windows</Tag>
                                {t('integrationSettings.ntlmWindowsDomainAccountAuthentication', 'NTLM — Xác thực tài khoản domain Windows')}
                              </Space>
                            </Option>
                            <Option value="anonymous">
                              <Space>
                                <Tag color="orange" style={{ margin: 0 }}>Relay</Tag>
                                {t('integrationSettings.anonymousRelayNoAuthenticationRequiredConfigured', 'Anonymous Relay — Không cần xác thực (cấu hình trên Exchange)')}
                              </Space>
                            </Option>
                          </Select>
                        </Form.Item>

                        {/* ── OAuth2 Fields (M365) ── */}
                        {authType === 'oauth2' && (
                          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 16, marginBottom: 8 }}>
                            <Text strong style={{ color: '#52c41a', display: 'block', marginBottom: 12 }}>
                              <SafetyOutlined /> {t('integrationSettings.oauth2AzureAppRegistrationInformation', 'OAuth2 — Thông tin Azure App Registration')}
                            </Text>
                            <Row gutter={12}>
                              <Col span={12}>
                                <Form.Item name="tenantId" label="Tenant ID (Directory ID)"
                                  rules={[{ required: authType === 'oauth2', message: t('integrationSettings.enterTenantId', 'Nhập Tenant ID') }]}>
                                  <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item name="clientId" label="Client ID (Application ID)"
                                  rules={[{ required: authType === 'oauth2', message: t('integrationSettings.enterClientId', 'Nhập Client ID') }]}>
                                  <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Form.Item name="clientSecret" label="Client Secret (Value)"
                              rules={[{ required: authType === 'oauth2', message: t('integrationSettings.enterClientSecret', 'Nhập Client Secret') }]}>
                              <Password placeholder={t('integrationSettings.clientSecretValueNotSecretId', 'Client secret value (không phải Secret ID)')} />
                            </Form.Item>
                            <Form.Item name="user" label={t('integrationSettings.mailSenderEmailMailSenderUpn', 'Email tài khoản gửi mail (Mail sender UPN)')}
                              rules={[{ required: authType === 'oauth2', type: 'email', message: t('integrationSettings.enterFullEmail', 'Nhập email đầy đủ') }]}>
                              <Input placeholder="ktnb-noreply@lpbank.com.vn" prefix={<MailOutlined />} />
                            </Form.Item>
                          </div>
                        )}

                        {/* ── Basic Auth Fields ── */}
                        {authType === 'basic' && (
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item name="user" label="Username / Email"
                                rules={[{ required: true, message: t('integrationSettings.enterUsername', 'Nhập username') }]}>
                                <Input placeholder="ktnb@lpbank.com.vn" prefix={<MailOutlined />} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="password" label={t('integrationSettings.passwordAppPassword', 'Mật khẩu / App Password')}
                                rules={[{ required: true, message: t('login.passwordPlaceholder', 'Nhập mật khẩu') }]}>
                                <Password placeholder={t('integrationSettings.passwordOrAppPassword', 'Mật khẩu hoặc App Password')} />
                              </Form.Item>
                            </Col>
                          </Row>
                        )}

                        {/* ── NTLM Fields ── */}
                        {authType === 'ntlm' && (
                          <>
                            <Row gutter={12}>
                              <Col span={8}>
                                <Form.Item name="domain" label="Domain Windows"
                                  rules={[{ required: true, message: t('integrationSettings.enterDomain', 'Nhập domain') }]}>
                                  <Input placeholder={t('integrationSettings.lpbankOrLpbankcomvn', 'LPBANK hoặc lpbank.com.vn')} />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item name="user" label={t('integrationSettings.usernameNoDomain', 'Username (không có domain)')}
                                  rules={[{ required: true, message: t('integrationSettings.enterUsername', 'Nhập username') }]}>
                                  <Input placeholder="ktnb.service" />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item name="password" label={t('login.password', 'Mật khẩu')}
                                  rules={[{ required: true }]}>
                                  <Password placeholder={t('integrationSettings.domainPassword', 'Mật khẩu domain')} />
                                </Form.Item>
                              </Col>
                            </Row>
                          </>
                        )}

                        {/* ── Anonymous: no auth fields ── */}
                        {authType === 'anonymous' && (
                          <Alert
                            type="info"
                            showIcon
                            message={t('integrationSettings.anonymousRelayDoesNotRequireAuthentication', 'Anonymous Relay không yêu cầu xác thực.')}
                            description={t('integrationSettings.makeSureTheIpAddressOf', 'Đảm bảo địa chỉ IP của server ứng dụng này đã được thêm vào Receive Connector trên Exchange Server với quyền ms-Exch-SMTP-Accept-Any-Recipient.')}
                          />
                        )}
                      </Card>

                      {/* Card 3: Người gửi */}
                      <Card
                        title={<Space><MailOutlined /> {t('integrationSettings.senderInformation', 'Thông tin Người gửi')}</Space>}
                        variant="borderless"
                        style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa' }}
                      >
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item name="fromName" label={t('integrationSettings.displayNameFromName', 'Tên hiển thị (From Name)')} rules={[{ required: true }]}>
                              <Input placeholder="KTNB LPBank" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="fromEmail" label={t('integrationSettings.fromEmail', 'Địa chỉ người gửi (From Email)')}
                              rules={[{ required: true, type: 'email', message: t('integrationSettings.enterAValidEmail', 'Nhập email hợp lệ') }]}>
                              <Input placeholder="ktnb-noreply@lpbank.com.vn" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Alert
                          type="info"
                          showIcon
                          style={{ fontSize: 12 }}
                          message={t('integrationSettings.withOauth2m365FromEmailMustBe', 'Với OAuth2/M365, "From Email" phải là email của mailbox có quyền Send As hoặc Send On Behalf.')}
                        />
                      </Card>

                      <Space>
                        <Button type="primary" icon={<SaveOutlined />} loading={smtpLoading}
                          onClick={handleSaveSmtp}
                          style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                          {t('auditTemplates.form.btnSave', 'Lưu cấu hình')}
                        </Button>
                        <Button icon={<MailOutlined />} loading={smtpTesting} onClick={handleTestSmtp}>
                          {t('integrationSettings.sendTestEmail', 'Gửi email kiểm tra')}
                        </Button>
                      </Space>
                    </Form>
                  </Col>

                  {/* RIGHT: Help panel */}
                  <Col xs={24} lg={10}>
                    {/* Status card */}
                    <Card title={t('integrationSettings.connectionStatus', 'Trạng thái kết nối')} variant="borderless"
                      style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa' }}>
                      {smtpStatus === 'idle' && (
                        <Alert message={t('integrationSettings.notCheckedYetPressSendTest', 'Chưa kiểm tra. Nhấn "Gửi email kiểm tra" sau khi điền đầy đủ cấu hình.')} type="info" showIcon />
                      )}
                      {smtpStatus === 'testing' && (
                        <Alert message={smtpMessage} type="info" showIcon />
                      )}
                      {smtpStatus === 'ok' && (
                        <Alert icon={<CheckCircleOutlined />} message={`✓ ${smtpMessage}`} type="success" showIcon />
                      )}
                      {smtpStatus === 'fail' && (
                        <Alert icon={<CloseCircleOutlined />} message={`✗ ${smtpMessage}`} type="error" showIcon />
                      )}
                    </Card>

                    {/* OAuth2 M365 setup guide */}
                    {authType === 'oauth2' && (
                      <Card
                        title={<Space><WindowsOutlined style={{ color: '#0078d4' }} />{t('integrationSettings.instructionsCreateAnAzureSubscriptionApp', 'Hướng dẫn: Tạo App đăng ký Azure')}</Space>}
                        variant="borderless"
                        style={{ marginBottom: 16, borderRadius: 8, background: '#f0f5ff', border: '1px solid #adc6ff' }}
                      >
                        <Steps
                          direction="vertical"
                          size="small"
                          current={-1}
                          style={{ fontSize: 12 }}
                          items={azureSteps.map(s => ({
                            title: <Text strong style={{ fontSize: 12 }}>{s.title}</Text>,
                            description: <Text type="secondary" style={{ fontSize: 11 }}>{s.description}</Text>,
                          }))}
                        />
                        <Divider style={{ margin: '12px 0' }} />
                        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          {t('integrationSettings.quickLinkToAzurePortal', 'Đường dẫn nhanh đến Azure Portal:')}
                        </Text>
                        <Text code copyable style={{ fontSize: 11, wordBreak: 'break-all' }}>
                          https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
                        </Text>
                      </Card>
                    )}

                    {/* Exchange On-Premise guide */}
                    {(authType === 'basic' || authType === 'ntlm' || authType === 'anonymous') && (
                      <Card
                        title={<Space><WindowsOutlined /> {t('integrationSettings.exchangeOnpremiseInstructions', 'Hướng dẫn Exchange On-Premise')}</Space>}
                        variant="borderless"
                        style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa' }}
                      >
                        <Paragraph style={{ fontSize: 12 }}>
                          <strong>{t('integrationSettings.informationToGetFromIt', '📋 Thông tin cần lấy từ IT:')}</strong>
                        </Paragraph>
                        {[
                          ['SMTP Host', t('integrationSettings.maillpbankcomvnOrIpExchangeServer', 'mail.lpbank.com.vn hoặc IP Exchange server')],
                          ['Port', t('integrationSettings.587StarttlsOr25InternalRelay', '587 (STARTTLS) hoặc 25 (relay nội bộ)')],
                          [t('integrationSettings.ntlmDomainName', 'Tên domain NTLM'), t('integrationSettings.lpbankOrLpbankcomvn', 'LPBANK hoặc lpbank.com.vn')],
                          [t('integrationSettings.emailSendingAccount', 'Tài khoản gửi mail'), 'ktnb-service@lpbank.com.vn'],
                        ].map(([label, ex]) => (
                          <div key={label} style={{ marginBottom: 6 }}>
                            <Text strong style={{ fontSize: 11 }}>{label}: </Text>
                            <Text code style={{ fontSize: 10 }}>{ex}</Text>
                          </div>
                        ))}

                        {authType === 'anonymous' && (
                          <>
                            <Divider style={{ margin: '8px 0' }} />
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                              {t('integrationSettings.configureReceiveConnectorOnExchange', 'Cấu hình Receive Connector trên Exchange:')}
                            </Text>
                            {[
                              t('integrationSettings.goToExchangeAdminCenterMail', 'Vào Exchange Admin Center → Mail flow → Receive connectors'),
                              t('integrationSettings.createANewConnectorOfType', 'Tạo connector mới loại: Custom'),
                              t('integrationSettings.remoteIpRangeAddTheIp', 'Remote IP range: thêm IP của server ứng dụng này'),
                              t('integrationSettings.authenticationTurnOnExternallySecured', 'Authentication: bật "Externally secured"'),
                              t('integrationSettings.permissionGroupsEnableAnonymousUsersExchange', 'Permission groups: bật "Anonymous users" + "Exchange servers"'),
                            ].map((s, i) => (
                              <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
                                <Text type="secondary">{i + 1}.</Text>
                                <Text type="secondary">{s}</Text>
                              </div>
                            ))}
                          </>
                        )}
                      </Card>
                    )}

                    {/* Auto-sent emails */}
                    <Card title={t('integrationSettings.emailIsSentAutomatically', '📨 Email được gửi tự động')} variant="borderless"
                      style={{ borderRadius: 8, background: '#fafafa' }}>
                      {[
                        t('integrationSettings.thePetitionIsAboutToExpire', 'Kiến nghị sắp hết hạn (7 ngày, 3 ngày, quá hạn)'),
                        t('integrationSettings.gtvlWaitingForApproval', 'GTVL chờ phê duyệt'),
                        t('integrationSettings.ktReportReleased', 'Báo cáo KT được phát hành'),
                        t('integrationSettings.passwordIsAboutToExpire7', 'Mật khẩu sắp hết hạn (7 ngày trước)'),
                        t('integrationSettings.reminderToDeclareCoiAnnuallyJanuary', 'Nhắc khai báo COI hàng năm (01/01)'),
                        t('integrationSettings.issueATemporaryPasswordToNew', 'Cấp mật khẩu tạm cho nhân sự mới'),
                        t('integrationSettings.notificationOfApprovalrejectionOfEconomicPlans', 'Thông báo phê duyệt/từ chối kế hoạch KT'),
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                          <CheckCircleOutlined style={{ color: '#52c41a', flexShrink: 0, marginTop: 2 }} />
                          <Text>{item}</Text>
                        </div>
                      ))}
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },

          // ════════════════════════════════════════════════
          // TAB 2: SSO / LDAP / AD
          // ════════════════════════════════════════════════
          {
            key: 'sso',
            label: <span><UserSwitchOutlined style={{ marginRight: 4 }} />SSO / LDAP / Active Directory</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Alert type="info" showIcon style={{ marginBottom: 20 }}
                  message={t('integrationSettings.ssoConnectionAllowsEmployeesToLog', 'Kết nối SSO cho phép nhân viên đăng nhập bằng tài khoản domain Windows (Active Directory / LDAP) thay vì mật khẩu riêng. Hệ thống sẽ tự động ánh xạ nhóm AD → Role trong ứng dụng.')}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0 }}>Danh sách Kết nối ({ssoProviders.length})</Title>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenSsoModal()}>
                    {t('integrationSettings.addNewConnection', 'Thêm kết nối mới')}
                  </Button>
                </div>

                <Table columns={ssoColumns} dataSource={ssoProviders} rowKey="id"
                  loading={ssoLoading} pagination={false}
                  locale={{
                    emptyText: (
                      <div style={{ padding: 40, textAlign: 'center' }}>
                        <UserSwitchOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                        <div>
                          <Text type="secondary">{t('integrationSettings.thereAreNoSsoldapConnectionsYet', 'Chưa có kết nối SSO/LDAP nào.')}</Text><br />
                          <Text type="secondary">{t('integrationSettings.clickAddNewConnectionToConfigure', 'Nhấn "Thêm kết nối mới" để cấu hình.')}</Text>
                        </div>
                      </div>
                    )
                  }}
                  style={{ borderRadius: 8 }}
                />

                <Divider />

                <Row gutter={24}>
                  <Col span={12}>
                    <Card title={<Space><InfoCircleOutlined />{t('integrationSettings.informationNeedsToBeObtainedFrom', 'Thông tin cần lấy từ IT')}</Space>}
                      variant="borderless" style={{ borderRadius: 8, background: '#fafafa' }}>
                      {[
                        ['LDAP/AD Server Host', t('integrationSettings.adlpbankcomvnOr1921681x', 'ad.lpbank.com.vn hoặc 192.168.1.x')],
                        ['Port', '389 (LDAP), 636 (LDAPS/TLS)'],
                        ['Base DN', 'DC=lpbank,DC=com,DC=vn'],
                        ['Bind DN', 'CN=ktnb-svc,OU=ServiceAccounts,DC=lpbank,DC=com,DC=vn'],
                        ['User Search Base', 'OU=NhanVien,DC=lpbank,DC=com,DC=vn'],
                        ['Group Search Base', 'OU=KTNB-Groups,DC=lpbank,DC=com,DC=vn'],
                      ].map(([label, ex]) => (
                        <div key={label} style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 12 }}>{label}:</Text><br />
                          <Text code style={{ fontSize: 11 }}>{ex}</Text>
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title={<Space><KeyOutlined />{t('integrationSettings.mapAdGroupSystemRole', 'Ánh xạ Nhóm AD → Role hệ thống')}</Space>}
                      variant="borderless" style={{ borderRadius: 8, background: '#fafafa' }}>
                      <Table size="small" pagination={false}
                        dataSource={[
                          { group: 'CN=KTNB-Admins', role: 'Admin' },
                          { group: 'CN=KTNB-TruongBan', role: t('processAnalysis.reportLeaderSign', 'Trưởng Ban KTNB') },
                          { group: 'CN=KTNB-TruongDoan', role: t('auditEngagements.cols.leadAuditor', 'Trưởng đoàn') },
                          { group: 'CN=KTNB-KTV', role: t('workingPapers.auditor', 'Kiểm toán viên') },
                          { group: 'CN=KTNB-BKS', role: t('integrationSettings.boardOfSupervisors', 'Ban Kiểm soát') },
                        ]}
                        columns={[
                          { title: t('integrationSettings.adGroupExample', 'Nhóm AD (ví dụ)'), dataIndex: 'group', key: 'group',
                            render: (g: string) => <Text code style={{ fontSize: 10 }}>{g}</Text> },
                          { title: 'Role', dataIndex: 'role', key: 'role',
                            render: (r: string) => <Tag color="blue">{r}</Tag> },
                        ]}
                      />
                      <Alert type="warning" showIcon style={{ marginTop: 12, fontSize: 11 }}
                        message={t('integrationSettings.theActualAdGroupNameNeeds', 'Tên nhóm AD thực tế cần xác nhận với bộ phận IT và cấu hình lại trong mục "Ánh xạ".')} />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />

      {/* ── Modal: SSO Provider ──────────────────────────────── */}
      <Modal
        title={editingProvider ? t('integrationSettings.editEditingprovidername', { p0: editingProvider.name }) : t('integrationSettings.addNewSsoldapConnection', 'Thêm Kết nối SSO/LDAP Mới')}
        open={ssoModalVisible}
        onOk={handleSaveSso}
        onCancel={() => setSsoModalVisible(false)}
        okText={t('integrationSettings.saveConnection', 'Lưu kết nối')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={720}
        confirmLoading={ssoLoading}
      >
        <Form form={ssoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="name" label={t('integrationSettings.connectionName', 'Tên kết nối')} rules={[{ required: true, message: t('integrationSettings.enterTheConnectionName', 'Nhập tên kết nối') }]}>
                <Input placeholder={t('integrationSettings.forExampleActiveDirectoryLpbankHo', 'VD: Active Directory LPBank HO, LDAP Chi nhánh')} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="type" label={t('auditEngagements.cols.type', 'Loại')} initialValue="keycloak">
                <Select>
                  <Option value="keycloak">Keycloak (OIDC)</Option>
                  <Option value="ad">Active Directory</Option>
                  <Option value="ldap">LDAP</Option>
                  <Option value="saml">SAML 2.0</Option>
                  <Option value="oauth2">OAuth 2.0</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="enabled" label={t('integrationSettings.turnOn', 'Bật')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const isKeycloak = getFieldValue('type') === 'keycloak';
              return (
                <>
                  <Divider orientation={"left" as any} style={{ fontSize: 13 }}>
                    {isKeycloak ? 'Thông số Máy chủ Keycloak (OpenID Connect)' : t('integrationSettings.server', 'Máy chủ')}
                  </Divider>
                  <Row gutter={12}>
                    <Col span={isKeycloak ? 24 : 16}>
                      <Form.Item
                        name="host"
                        label={isKeycloak ? 'Keycloak Server Base URL' : 'AD/LDAP Server Host'}
                        rules={[{ required: true, message: t('integrationSettings.enterTheServerAddress', 'Nhập địa chỉ server') }]}
                      >
                        <Input
                          placeholder={isKeycloak ? 'http://localhost:8080 hoặc https://sso.lpbank.com.vn' : t('integrationSettings.adlpbankcomvnOr1921681100', 'ad.lpbank.com.vn hoặc 192.168.1.100')}
                          prefix={<GlobalOutlined />}
                        />
                      </Form.Item>
                    </Col>
                    {!isKeycloak && (
                      <Col span={8}>
                        <Form.Item name="port" label="Port" initialValue={389}>
                          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    )}
                  </Row>

                  {!isKeycloak && (
                    <Form.Item name="tlsEnabled" label={t('integrationSettings.connectionSecurity', 'Bảo mật kết nối')} valuePropName="checked">
                      <Switch checkedChildren="LDAPS/TLS — Port 636" unCheckedChildren="Plain LDAP — Port 389" />
                    </Form.Item>
                  )}

                  <Divider orientation={"left" as any} style={{ fontSize: 13 }}>
                    {isKeycloak ? 'Thông số OIDC Realm & Client Credentials' : t('integrationSettings.authenticateServiceAccount', 'Xác thực Service Account')}
                  </Divider>
                  <Form.Item
                    name="baseDn"
                    label={isKeycloak ? 'Realm Name' : 'Base DN'}
                    rules={[{ required: true }]}
                  >
                    <Input placeholder={isKeycloak ? 'lpbank-audit' : 'DC=lpbank,DC=com,DC=vn'} />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        name="bindDn"
                        label={isKeycloak ? 'Client ID' : 'Bind DN (Service Account)'}
                        rules={[{ required: true }]}
                      >
                        <Input placeholder={isKeycloak ? 'lpbank-audit-client' : 'CN=ktnb-svc,OU=ServiceAccounts,DC=lpbank,DC=com,DC=vn'} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="bindPassword"
                        label={isKeycloak ? 'Client Secret' : 'Bind Password'}
                        rules={[{ required: true }]}
                      >
                        <Password placeholder={isKeycloak ? 'Client Secret (VD: lpbank-audit-secret-2026)' : t('integrationSettings.serviceAccountPassword', 'Mật khẩu service account')} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {!isKeycloak && (
                    <>
                      <Divider orientation={"left" as any} style={{ fontSize: 13 }}>{t('integrationSettings.searchUsers', 'Tìm kiếm Người dùng')}</Divider>
                      <Form.Item name="userSearchBase" label="User Search Base">
                        <Input placeholder="OU=NhanVien,DC=lpbank,DC=com,DC=vn" />
                      </Form.Item>
                      <Form.Item name="userSearchFilter"
                        label={<Space>User Search Filter <Tooltip title="{{username}} = tên đăng nhập người dùng"><InfoCircleOutlined /></Tooltip></Space>}
                        initialValue="(sAMAccountName={{username}})">
                        <Input placeholder="(sAMAccountName={{username}})" />
                      </Form.Item>
                      <Form.Item name="groupSearchBase" label="Group Search Base">
                        <Input placeholder="OU=KTNB-Groups,DC=lpbank,DC=com,DC=vn" />
                      </Form.Item>
                    </>
                  )}
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Ánh xạ Nhóm → Role ──────────────────────── */}
      <Modal
        title={t('integrationSettings.adGroupRoleMappingSelectedprovidername', { p0: selectedProvider?.name || '' })}
        open={mappingModalVisible}
        onOk={handleSaveMapping}
        onCancel={() => setMappingModalVisible(false)}
        okText={t('integrationSettings.saveMapping', 'Lưu ánh xạ')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={620}
      >
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message={t('integrationSettings.eachLineMapsAnAdGroup', 'Mỗi dòng ánh xạ một nhóm AD (Group DN hoặc CN) đến một Role trong hệ thống. Người dùng thuộc nhiều nhóm sẽ được gán role cao nhất.')} />
        <Form form={mappingForm} layout="vertical">
          <Form.List name="mapping">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row gutter={10} key={key} style={{ marginBottom: 8 }}>
                    <Col span={13}>
                      <Form.Item name={[name, 'group']} rules={[{ required: true, message: t('integrationSettings.enterTheAdGroupName', 'Nhập tên nhóm AD') }]} style={{ margin: 0 }}>
                        <Input placeholder="CN=KTNB-Admins,OU=Groups,DC=lpbank,DC=com,DC=vn" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[name, 'role']} rules={[{ required: true }]} style={{ margin: 0 }}>
                        <Select placeholder={t('integrationSettings.selectRole', 'Chọn Role')}>
                          {ROLE_OPTIONS.map(r => <Option key={r} value={r}>{r}</Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                  {t('integrationSettings.addGroupMapping', 'Thêm ánh xạ nhóm')}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default IntegrationSettings;
