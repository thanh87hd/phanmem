import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Card, Typography, message, Spin, Modal, Alert, Divider, Tabs, Space, Row, Col } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  UserAddOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LanguageSelector from '../components/LanguageSelector';
import LPBankLogo, { LPBANK_BRAND_GOLD } from '../components/LPBankLogo';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Force Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordReason, setChangePasswordReason] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwForm] = Form.useForm();

  // Forgot Password State
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotForm] = Form.useForm();

  // 2FA Login State
  const [show2FaOtp, setShow2FaOtp] = useState(false);
  const [temp2FaToken, setTemp2FaToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpForm] = Form.useForm();

  // Auth Modes & Keycloak Config State
  const [authConfig, setAuthConfig] = useState<{
    localEnabled: boolean;
    ldapEnabled: boolean;
    keycloakEnabled: boolean;
    defaultMode: string;
    allowSelfRegistration: boolean;
    keycloak?: { enabled: boolean; loginUrl: string } | null;
    ldapDomain?: string;
  }>({
    localEnabled: true,
    ldapEnabled: true,
    keycloakEnabled: true,
    defaultMode: 'ALL',
    allowSelfRegistration: true,
  });
  const [activeAuthTab, setActiveAuthTab] = useState<'local' | 'ldap'>('local');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  // Self-Registration Modal State
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerForm] = Form.useForm();

  useEffect(() => {
    // 1. Fetch Auth Config (Local, LDAP, Keycloak modes)
    api.get('/auth/config')
      .then((res) => {
        setAuthConfig(res.data);
        if (!res.data.localEnabled && res.data.ldapEnabled) {
          setActiveAuthTab('ldap');
        }
      })
      .catch(() => {
        setAuthConfig({
          localEnabled: true,
          ldapEnabled: true,
          keycloakEnabled: false,
          defaultMode: 'ALL',
          allowSelfRegistration: true,
        });
      });

    // 2. Check SSO query params (redirect callback)
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    const ssoUserJson = params.get('user');
    const ssoCode = params.get('code');

    if (ssoToken && ssoUserJson) {
      try {
        const parsedUser = JSON.parse(ssoUserJson);
        localStorage.setItem('token', ssoToken);
        localStorage.setItem('user', JSON.stringify(parsedUser));
        message.success(`Đăng nhập SSO thành công! Chào mừng, ${parsedUser.fullName || parsedUser.username}!`);
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/');
        return;
      } catch (err) {
        console.error('Failed to parse SSO user', err);
      }
    }

    if (ssoCode) {
      setSsoLoading(true);
      const redirectUri = window.location.origin + window.location.pathname;
      api.post('/auth/sso/keycloak/exchange', { code: ssoCode, redirectUri })
        .then((response) => {
          const { access_token, user } = response.data;
          localStorage.setItem('token', access_token);
          localStorage.setItem('user', JSON.stringify(user));
          message.success(`Đăng nhập SSO thành công! Chào mừng, ${user.fullName || user.username}!`);
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/');
        })
        .catch((err) => {
          const msg = err.response?.data?.message || 'Xác thực tài khoản qua LPBank SSO thất bại.';
          setSsoError(msg);
          message.error(msg);
        })
        .finally(() => setSsoLoading(false));
    }
  }, [navigate]);

  const handleKeycloakLogin = () => {
    if (authConfig.keycloak?.loginUrl) {
      window.location.href = authConfig.keycloak.loginUrl;
    } else {
      window.location.href = '/api/auth/sso/keycloak/login';
    }
  };

  const handleRegister = async (values: any) => {
    if (values.password !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp!');
      return;
    }
    setRegisterLoading(true);
    try {
      const response = await api.post('/auth/register', {
        username: values.username,
        password: values.password,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        department: values.department,
      });
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      message.success(`Đăng ký thành công! Chào mừng, ${user.fullName || user.username}!`);
      setIsRegisterModalVisible(false);
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Đăng ký tài khoản thất bại.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = async (values: { username: string; reason?: string }) => {
    setForgotLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        username: values.username,
        reason: values.reason,
      });
      message.success(response.data.message || 'Đã gửi yêu cầu khôi phục mật khẩu thành công. Vui lòng liên hệ Admin để duyệt.');
      setIsForgotModalVisible(false);
      forgotForm.resetFields();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gửi yêu cầu thất bại. Vui lòng kiểm tra lại tên đăng nhập.';
      message.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      // Dọn sạch token cũ trước khi thực hiện phiên đăng nhập mới
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const response = await api.post('/auth/login', {
        ...values,
        authMode: activeAuthTab,
      });
      
      // Check if 2FA verification is required
      if (response.data.require2FA) {
        setTemp2FaToken(response.data.tempToken);
        setShow2FaOtp(true);
        otpForm.resetFields();
        return;
      }

      const { access_token, user } = response.data;

      // Check if user must change password
      if (user.mustChangePassword || user.isPasswordExpired) {
        setTempToken(access_token);
        setTempUser(user);
        // Lưu ngay token và user vào localStorage để các request tiếp theo sử dụng token hợp lệ vừa cấp
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        setChangePasswordReason(
          user.isPasswordExpired
            ? 'Mật khẩu của bạn đã hết hạn (90 ngày). Vui lòng đổi mật khẩu để tiếp tục.'
            : 'Admin yêu cầu bạn đổi mật khẩu trước khi sử dụng hệ thống.'
        );
        setShowChangePassword(true);
        return;
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      message.success(`Chào mừng, ${user.fullName || user.username}!`);
      navigate('/');
    } catch (error: any) {
      if (error.response?.status === 401) {
        const msg = error.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!';
        message.error(msg);
      } else {
        message.error('Lỗi kết nối máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2Fa = async (values: { code: string }) => {
    setOtpLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', {
        tempToken: temp2FaToken,
        code: values.code,
      });
      const { access_token, user } = response.data;

      // Check if user must change password
      if (user.mustChangePassword || user.isPasswordExpired) {
        setTempToken(access_token);
        setTempUser(user);
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        setChangePasswordReason(
          user.isPasswordExpired
            ? 'Mật khẩu của bạn đã hết hạn (90 ngày). Vui lòng đổi mật khẩu để tiếp tục.'
            : 'Admin yêu cầu bạn đổi mật khẩu trước khi sử dụng hệ thống.'
        );
        setShowChangePassword(true);
        setShow2FaOtp(false);
        return;
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      message.success(`Chào mừng, ${user.fullName || user.username}!`);
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn!';
      message.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    setChangePwLoading(true);
    try {
      const activeToken = tempToken || localStorage.getItem('token');
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
      });

      // Sau khi đổi mật khẩu thành công, cập nhật thông tin và điều hướng vào trang chủ
      if (activeToken) {
        localStorage.setItem('token', activeToken);
      }
      localStorage.setItem('user', JSON.stringify({ ...tempUser, mustChangePassword: false, isPasswordExpired: false }));
      message.success('Đổi mật khẩu thành công! Chào mừng bạn vào hệ thống.');
      setShowChangePassword(false);
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setChangePwLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, #fef08a 0%, #fbbf24 35%, #f59e0b 70%, #d97706 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Banner Branding - LPBank White & Gold */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 38,
        backgroundColor: '#ffffff', borderBottom: '2px solid #f59e0b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 10, color: '#0f172a', fontSize: 12,
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LPBankLogo variant="full" height={20} color={LPBANK_BRAND_GOLD} />
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ color: '#334155', fontWeight: 600 }}>Ngân hàng Thương mại Cổ phần Lộc Phát Việt Nam</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="hidden sm:inline" style={{ color: '#475569' }}>Tổng đài CSKH: <strong style={{ color: LPBANK_BRAND_GOLD, fontWeight: 800 }}>1800 577 758</strong></span>
          <LanguageSelector />
        </div>
      </div>

      {/* Decorative LPBank Imperial Gold Ambient Glows */}
      <div style={{
        position: 'absolute', width: 550, height: 550, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 70%)', top: -120, right: -120,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 450, height: 450, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(254, 240, 138, 0.6) 0%, rgba(254, 240, 138, 0) 70%)', bottom: -100, left: -100,
        pointerEvents: 'none',
      }} />

      {/* Force Change Password Modal */}
      <Modal
        open={showChangePassword}
        closable={false}
        footer={null}
        width={480}
        centered
        mask={{ closable: false }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ExclamationCircleOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 12 }} />
          <Title level={4} style={{ margin: 0 }}>Đổi mật khẩu bắt buộc</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>{changePasswordReason}</Text>
        </div>

        <Alert
          message="Yêu cầu mật khẩu mới (PCI DSS 8.3)"
          description={
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              <li>Tối thiểu <strong>12 ký tự</strong></li>
              <li>Chứa chữ hoa (A-Z), chữ thường (a-z), số (0-9)</li>
              <li>Chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)</li>
              <li>Không được trùng 4 mật khẩu gần nhất</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <Spin spinning={changePwLoading}>
          <Form
            form={changePwForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="currentPassword"
              label={<span style={{ fontWeight: 600 }}>Mật khẩu hiện tại</span>}
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#999' }} />}
                placeholder="Nhập mật khẩu hiện tại (hoặc mật khẩu tạm thời Admin cung cấp)"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label={<span style={{ fontWeight: 600 }}>Mật khẩu mới</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                { min: 12, message: 'Tối thiểu 12 ký tự' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#ea9105' }} />}
                placeholder="Nhập mật khẩu mới (≥12 ký tự, đầy đủ complexity)"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span style={{ fontWeight: 600 }}>Xác nhận mật khẩu mới</span>}
              rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#52c41a' }} />}
                placeholder="Nhập lại mật khẩu mới"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={changePwLoading}
                style={{
                  height: 46, borderRadius: 10, fontWeight: 600, fontSize: 15,
                  background: 'linear-gradient(135deg, #ea9105, #d97706)',
                  color: '#ffffff',
                  border: 'none', boxShadow: '0 4px 16px rgba(234, 145, 5, 0.35)',
                }}
              >
                Xác nhận Đổi mật khẩu
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        title={
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 16 }}>
            <SafetyOutlined style={{ color: '#ea9105', marginRight: 8 }} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>Yêu cầu Khôi phục Mật khẩu</span>
          </div>
        }
        open={isForgotModalVisible}
        onCancel={() => {
          if (!forgotLoading) {
            setIsForgotModalVisible(false);
          }
        }}
        footer={null}
        width={440}
        centered
      >
        <Spin spinning={forgotLoading}>
          <Form
            form={forgotForm}
            layout="vertical"
            onFinish={handleForgotPassword}
          >
            <Form.Item
              name="username"
              label={<span style={{ fontWeight: 600 }}>Tên đăng nhập cần reset</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập cần reset!' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ea9105' }} />}
                placeholder="Nhập tên đăng nhập của bạn"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="reason"
              label={<span style={{ fontWeight: 600 }}>Lý do / Bộ phận làm việc</span>}
              rules={[{ required: false }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="VD: Quên mật khẩu. Thuộc phòng Kiểm toán Đơn vị Kinh doanh..."
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Alert
              message="Lưu ý Bảo mật"
              description="Yêu cầu khôi phục mật khẩu sẽ được gửi đến Admin hệ thống để phê duyệt và cấp mật khẩu tạm. Vui lòng liên hệ Admin để nhận mật khẩu mới sau khi gửi."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button 
                onClick={() => setIsForgotModalVisible(false)} 
                disabled={forgotLoading}
                style={{ borderRadius: 8 }}
              >
                Hủy
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={forgotLoading}
                style={{
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #ea9105, #d97706)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(234, 145, 5, 0.3)',
                }}
              >
                Gửi yêu cầu
              </Button>
            </div>
          </Form>
        </Spin>
      </Modal>

      <Card
        style={{
          width: '92%',
          maxWidth: 440,
          borderRadius: 22,
          boxShadow: '0 20px 50px -10px rgba(180, 83, 9, 0.35), 0 8px 20px -4px rgba(0, 0, 0, 0.04)',
          border: '1px solid #fef08a',
          background: '#ffffff',
        }}
        styles={{ body: { padding: '36px 32px' } }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 18,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 8px 24px rgba(245, 158, 11, 0.45)',
            transition: 'all 0.3s ease',
          }}>
            <LPBankLogo variant="emblem" height={36} color="#ffffff" />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 900, fontFamily: '"Outfit", sans-serif' }}>
            <span style={{ color: LPBANK_BRAND_GOLD }}>LPBank</span> <span style={{ color: '#0f172a' }}>Smart Audit</span>
          </Title>
          <Text type="secondary" style={{ fontSize: 13, color: '#475569', fontWeight: 500, display: 'block', marginTop: 4 }}>
            {show2FaOtp ? 'Bảo mật 2 lớp OTP — Xác thực an toàn' : 'Hệ thống Quản trị & Kiểm toán Nội bộ 4.0'}
          </Text>
        </div>

        <Spin spinning={ssoLoading || (show2FaOtp ? otpLoading : loading)}>
          {ssoError && (
            <Alert
              type="error"
              showIcon
              message={ssoError}
              closable
              onClose={() => setSsoError(null)}
              style={{ marginBottom: 16 }}
            />
          )}

          {ssoLoading ? (
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0369a1', marginBottom: 8 }}>
                Đang xác thực tài khoản qua LPBank SSO...
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Hệ thống đang đồng bộ phiên đăng nhập từ Keycloak. Vui lòng chờ...
              </Text>
            </div>
          ) : show2FaOtp ? (
            <Form
              form={otpForm}
              name="otp-verify"
              onFinish={handleVerify2Fa}
              layout="vertical"
              size="large"
            >
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0, color: '#ea9105' }}>Mã OTP (App Authenticator)</Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 8 }}>
                  Vui lòng mở ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Microsoft Authenticator</strong> để lấy mã OTP gồm 6 chữ số.
                </Text>
              </div>

              <Form.Item
                name="code"
                label={<span style={{ fontWeight: 600 }}>Mã OTP 6 chữ số</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mã OTP!' },
                  { pattern: /^[0-9]{6}$/, message: 'Mã OTP phải gồm 6 chữ số!' }
                ]}
              >
                <Input
                  prefix={<SafetyOutlined style={{ color: '#ea9105' }} />}
                  placeholder="VD: 123456"
                  maxLength={6}
                  style={{ borderRadius: 8, letterSpacing: '4px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={otpLoading}
                  style={{
                    height: 46, borderRadius: 10, fontWeight: 700, fontSize: 15,
                    background: 'linear-gradient(135deg, #ea9105, #d97706)',
                    color: '#ffffff',
                    border: 'none', boxShadow: '0 4px 16px rgba(234,145,5,0.35)',
                    letterSpacing: '0.2px',
                  }}
                >
                  Xác nhận và Đăng nhập
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Button
                  type="link"
                  onClick={() => {
                    setShow2FaOtp(false);
                    setTemp2FaToken('');
                  }}
                  style={{ fontSize: 13, color: '#78604f' }}
                >
                  Quay lại đăng nhập
                </Button>
              </div>
            </Form>
          ) : (
            <Form
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              {/* Tab chuyển đổi giữa Local và LDAP nếu cả 2 cùng bật */}
              {authConfig.localEnabled && authConfig.ldapEnabled && (
                <Tabs
                  activeKey={activeAuthTab}
                  onChange={(k) => setActiveAuthTab(k as any)}
                  centered
                  style={{ marginBottom: 16 }}
                  items={[
                    {
                      key: 'local',
                      label: (
                        <span>
                          <UserOutlined style={{ marginRight: 4 }} />
                          Tài khoản Nội bộ
                        </span>
                      ),
                    },
                    {
                      key: 'ldap',
                      label: (
                        <span>
                          <GlobalOutlined style={{ marginRight: 4 }} />
                          Domain / LDAP
                        </span>
                      ),
                    },
                  ]}
                />
              )}

              {/* Thông báo nếu chỉ bật duy nhất LDAP */}
              {!authConfig.localEnabled && authConfig.ldapEnabled && (
                <Alert
                  type="info"
                  showIcon
                  message="Đăng nhập bằng tài khoản Windows Domain (Active Directory LPBank)"
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item
                name="username"
                label={
                  <span style={{ fontWeight: 600 }}>
                    {activeAuthTab === 'ldap'
                      ? 'Tên đăng nhập Domain LPBank'
                      : 'Tên đăng nhập'}
                  </span>
                }
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
              >
                <Input
                  prefix={
                    activeAuthTab === 'ldap' ? (
                      <GlobalOutlined style={{ color: '#0284c7' }} />
                    ) : (
                      <UserOutlined style={{ color: '#ea9105' }} />
                    )
                  }
                  placeholder={
                    activeAuthTab === 'ldap'
                      ? 'VD: user hoặc user@lpbank.com.vn'
                      : 'Nhập tên đăng nhập'
                  }
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontWeight: 600 }}>Mật khẩu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                style={{ marginBottom: 8 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#ea9105' }} />}
                  placeholder="Nhập mật khẩu"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <Button
                  type="link"
                  onClick={() => {
                    forgotForm.resetFields();
                    setIsForgotModalVisible(true);
                  }}
                  style={{ padding: 0, height: 'auto', fontSize: 13, color: '#ea9105', fontWeight: 600 }}
                >
                  Quên mật khẩu?
                </Button>
              </div>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{
                    height: 46, borderRadius: 10, fontWeight: 700, fontSize: 15,
                    background: 'linear-gradient(135deg, #ea9105, #d97706)',
                    color: '#ffffff',
                    border: 'none', boxShadow: '0 4px 16px rgba(234,145,5,0.35)',
                    letterSpacing: '0.3px',
                  }}
                >
                  {activeAuthTab === 'ldap' ? 'Đăng nhập Domain' : 'Đăng nhập'}
                </Button>
              </Form.Item>

              {/* Tùy chọn Tự đăng ký tài khoản */}
              {authConfig.allowSelfRegistration && authConfig.localEnabled && (
                <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Chưa có tài khoản?{' '}
                  </Text>
                  <Button
                    type="link"
                    onClick={() => {
                      registerForm.resetFields();
                      setIsRegisterModalVisible(true);
                    }}
                    style={{ padding: 0, fontWeight: 700, color: '#ea9105', fontSize: 13 }}
                  >
                    Đăng ký ngay
                  </Button>
                </div>
              )}

              {/* Nút Đăng nhập Keycloak SSO */}
              {authConfig.keycloakEnabled && (
                <>
                  <Divider style={{ margin: '18px 0', fontSize: 12, color: '#9ca3af' }}>
                    HOẶC
                  </Divider>
                  <Button
                    block
                    size="large"
                    icon={<SafetyOutlined style={{ color: '#0284c7' }} />}
                    onClick={handleKeycloakLogin}
                    style={{
                      height: 46,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      borderColor: '#bae6fd',
                      backgroundColor: '#f0f9ff',
                      color: '#0369a1',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    Đăng nhập bằng LPBank SSO (Keycloak)
                  </Button>
                </>
              )}
            </Form>
          )}
        </Spin>
      </Card>

      {/* Modal: Tự đăng ký tài khoản cục bộ */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: '#ea9105' }} />
            <span>Đăng ký Tài khoản Mới (Local User)</span>
          </Space>
        }
        open={isRegisterModalVisible}
        onCancel={() => setIsRegisterModalVisible(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form
          form={registerForm}
          layout="vertical"
          onFinish={handleRegister}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="VD: Nguyễn Văn An" />
          </Form.Item>

          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[
              { required: true, message: 'Vui lòng nhập tên đăng nhập' },
              { min: 4, message: 'Tối thiểu 4 ký tự' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="VD: an.nguyen" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email công vụ / cá nhân"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không đúng định dạng' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="VD: an.nguyen@lpbank.com.vn" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input prefix={<PhoneOutlined />} placeholder="0912345678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Phòng ban / Đơn vị" initialValue="Khối Kiểm toán Nội bộ">
                <Input prefix={<BankOutlined />} placeholder="VD: Phòng KTNB Miền Bắc" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Tối thiểu 8 ký tự, gồm số, chữ hoa, chữ thường" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsRegisterModalVisible(false)}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerLoading}
              style={{
                background: 'linear-gradient(135deg, #ea9105, #d97706)',
                borderColor: '#ea9105',
                fontWeight: 600,
              }}
            >
              Hoàn tất Đăng ký
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;
