import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Button, Alert, Progress, message, Tabs, Space, Divider, Tag } from 'antd';
import { LockOutlined, SafetyOutlined, QrcodeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  isMandatory?: boolean; // true nếu người dùng BẮT BUỘC phải đổi
}



const ChangePasswordModal: React.FC<Props> = ({ open, onClose, isMandatory = false }) => {
  const { t } = useTranslation();

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: '', color: 'default' };
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    if (score < 40) return { score, label: t('changePasswordModal.weak', 'Yếu'), color: '#ff4d4f' };
    if (score < 70) return { score, label: t('auditPlan.tabs2.filterRisk.medium', 'Trung bình'), color: '#fa8c16' };
    return { score, label: t('changePasswordModal.strong', 'Mạnh'), color: '#52c41a' };
  };

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const strength = getPasswordStrength(newPassword);

  const hasLength = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  // 2FA states
  const [activeTab, setActiveTab] = useState('password');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  // Get current user details
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    if (open) {
      // Sync 2FA state from local storage / currentUser
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTwoFactorEnabled(currentUser?.twoFactorEnabled || false);
      // Reset states
      setShowSetup(false);
      setShowDisable(false);
      setQrCodeDataUrl('');
      setSecretKey('');
      setOtpCode('');
      setErrorMessage(null);
      setActiveTab('password');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmitPassword = async () => {
    setErrorMessage(null);
    try {
      const values = await form.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error(t('changePasswordModal.confirmationPasswordDoesNotMatch', 'Mật khẩu xác nhận không khớp'));
        return;
      }
      setLoading(true);
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success(t('changePasswordModal.passwordChangedSuccessfully', 'Đổi mật khẩu thành công!'));
      
      // Update localStorage to clear flags
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.mustChangePassword = false;
        user.isPasswordExpired = false;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      form.resetFields();
      setNewPassword('');
      setErrorMessage(null);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      const rawMsg = err.response?.data?.message || err?.message || t('changePasswordModal.errorChangingPassword', 'Lỗi đổi mật khẩu');
      const formattedMsg = Array.isArray(rawMsg) ? rawMsg.join('\n') : rawMsg;
      setErrorMessage(formattedMsg);
      message.error(Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 2FA SERVICE METHODS ====================

  const handleGenerate2Fa = async () => {
    setSetupLoading(true);
    try {
      const res = await api.post('/auth/2fa/generate');
      setQrCodeDataUrl(res.data.qrCodeDataUrl);
      setSecretKey(res.data.secret);
      setShowSetup(true);
    } catch (err: any) {
      message.error(t('changePasswordModal.unableToInitialize2faCode', 'Không thể khởi tạo mã 2FA'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirm2Fa = async () => {
    if (!otpCode || otpCode.length !== 6) {
      message.warning(t('changePasswordModal.pleaseEnterThe6digitOtpCode', 'Vui lòng nhập mã OTP gồm 6 chữ số'));
      return;
    }
    setSetupLoading(true);
    try {
      await api.post('/auth/2fa/turn-on', { code: otpCode });
      message.success(t('changePasswordModal.2factorAuthenticationSuccessfullyEnabled', 'Đã kích hoạt xác thực 2 yếu tố thành công!'));
      
      // Update local storage user state
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.twoFactorEnabled = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setTwoFactorEnabled(true);
      setShowSetup(false);
      setOtpCode('');
    } catch (err: any) {
      message.error(err.response?.data?.message || t('changePasswordModal.otpAuthenticationCodeIsIncorrect', 'Mã xác thực OTP không chính xác'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable2Fa = async () => {
    if (!otpCode || otpCode.length !== 6) {
      message.warning(t('changePasswordModal.pleaseEnterOtpCodeToConfirm', 'Vui lòng nhập mã OTP để xác nhận hủy'));
      return;
    }
    setSetupLoading(true);
    try {
      await api.post('/auth/2fa/turn-off', { code: otpCode });
      message.success(t('changePasswordModal.deactivated2factorAuthentication', 'Đã hủy kích hoạt xác thực 2 yếu tố.'));
      
      // Update local storage user state
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.twoFactorEnabled = false;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setTwoFactorEnabled(false);
      setShowDisable(false);
      setOtpCode('');
    } catch (err: any) {
      message.error(err.response?.data?.message || t('changePasswordModal.otpAuthenticationCodeIsIncorrect', 'Mã xác thực OTP không chính xác'));
    } finally {
      setSetupLoading(false);
    }
  };

  const passwordTab = (
    <div style={{ marginTop: 8 }}>
      {isMandatory && (
        <Alert
          type="warning"
          icon={<SafetyOutlined />}
          message={t('changePasswordModal.youNeedToChangeYourPassword', 'Bạn cần đổi mật khẩu trước khi sử dụng hệ thống')}
          description={t('changePasswordModal.accordingToTheSecurityPolicyDefault', 'Theo chính sách bảo mật, mật khẩu mặc định hoặc đã hết hạn cần được thay đổi.')}
          showIcon
          className="mb-4"
        />
      )}

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          message={<span className="font-semibold text-rose-800">Không thể đổi mật khẩu</span>}
          description={<div className="whitespace-pre-line text-xs mt-1 text-rose-700">{errorMessage}</div>}
          className="mb-4 rounded-xl border-rose-300 bg-rose-50"
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="currentPassword"
          label={t('login.currentPwd', 'Mật khẩu hiện tại')}
          rules={[{ required: true, message: t('changePasswordModal.pleaseEnterYourCurrentPassword', 'Vui lòng nhập mật khẩu hiện tại') }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={t('login.currentPwd', 'Mật khẩu hiện tại')} />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={t('login.newPwd', 'Mật khẩu mới')}
          rules={[
            { required: true, message: t('changePasswordModal.pleaseEnterANewPassword', 'Vui lòng nhập mật khẩu mới') },
            { min: 12, message: t('changePasswordModal.newPasswordMustBeAtLeast', 'Mật khẩu mới phải có ít nhất 12 ký tự (PCI DSS 8.3.6)') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('login.pwdReq1', 'Tối thiểu 12 ký tự')}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
          />
        </Form.Item>

        {/* Real-time Password Complexity Checklist */}
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 font-semibold">{t('changePasswordModal.passwordStrength', 'Độ mạnh mật khẩu:')}</span>
            <span className="font-bold" style={{ color: strength.color }}>
              {strength.label || 'Chưa nhập'}
            </span>
          </div>
          <Progress
            percent={strength.score}
            strokeColor={strength.color}
            showInfo={false}
            size="small"
          />
          <div className="grid grid-cols-2 gap-1.5 pt-2 text-[11px]">
            <div className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
              {hasLength ? <CheckCircleOutlined className="text-emerald-600" /> : <CloseCircleOutlined className="text-slate-400" />}
              <span>Độ dài ≥ 12 ký tự ({newPassword.length}/12)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
              {hasUpper ? <CheckCircleOutlined className="text-emerald-600" /> : <CloseCircleOutlined className="text-slate-400" />}
              <span>Chữ IN HOA (A-Z)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
              {hasLower ? <CheckCircleOutlined className="text-emerald-600" /> : <CloseCircleOutlined className="text-slate-400" />}
              <span>Chữ thường (a-z)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
              {hasNumber ? <CheckCircleOutlined className="text-emerald-600" /> : <CloseCircleOutlined className="text-slate-400" />}
              <span>Chữ số (0-9)</span>
            </div>
            <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
              {hasSpecial ? <CheckCircleOutlined className="text-emerald-600" /> : <CloseCircleOutlined className="text-slate-400" />}
              <span>Ký tự đặc biệt (!@#$%^&*...)</span>
            </div>
          </div>
        </div>

        <Form.Item
          name="confirmPassword"
          label={t('login.confirmNewPwd', 'Xác nhận mật khẩu mới')}
          rules={[{ required: true, message: t('changePasswordModal.pleaseConfirmNewPassword', 'Vui lòng xác nhận mật khẩu mới') }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={t('login.confirmNewPwdPlaceholder', 'Nhập lại mật khẩu mới')} />
        </Form.Item>
      </Form>
    </div>
  );

  const twoFactorTab = (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space orientation="vertical" size={2}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Google Authenticator OTP</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{t('changePasswordModal.2factorSecurityForEveryLogin', 'Bảo mật 2 yếu tố cho mỗi lần đăng nhập')}</span>
        </Space>
        {twoFactorEnabled ? (
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '2px 8px', borderRadius: 12 }}>{t('changePasswordModal.protected', 'Đã bảo vệ')}</Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />} style={{ padding: '2px 8px', borderRadius: 12 }}>{t('changePasswordModal.notActivatedYet', 'Chưa kích hoạt')}</Tag>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {!twoFactorEnabled ? (
        // NOT ENABLED YET
        !showSetup ? (
          <div>
            <p style={{ fontSize: 13, color: '#475569' }}>
              Xác thực hai yếu tố (2FA) bổ sung thêm một lớp bảo mật cực mạnh cho tài khoản của bạn. 
              Khi đăng nhập, bạn sẽ được yêu cầu cung cấp mã xác thực 6 chữ số từ ứng dụng Google Authenticator trên điện thoại.
            </p>
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              onClick={handleGenerate2Fa}
              loading={setupLoading}
              block
              style={{ marginTop: 16, height: 40, borderRadius: 8 }}
            >
              {t('changePasswordModal.setUpGoogleAuthenticator', 'Thiết lập Google Authenticator')}
            </Button>
          </div>
        ) : (
          // SETUP PROCESS
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={t('changePasswordModal.scanTheQrCodeToSet', 'Quét mã QR để thiết lập')}
              description={t('changePasswordModal.useTheGoogleAuthenticatorOrMicrosoft', 'Sử dụng ứng dụng Google Authenticator hoặc Microsoft Authenticator trên điện thoại cá nhân quét mã QR bên dưới.')}
            />
            
            <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
              {qrCodeDataUrl && (
                <div style={{ padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <img src={qrCodeDataUrl} alt="2FA QR Code" style={{ width: 180, height: 180 }} />
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{t('changePasswordModal.ifScanningFailsEnterTheKey', 'Nếu không quét được, nhập khóa thủ công:')}</div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14, color: '#ea9105' }}>{secretKey}</span>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t('changePasswordModal.enterThe6digitConfirmationCodeFrom', 'Nhập mã xác nhận 6 số từ App:')}</div>
              <Input
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('changePasswordModal.enterThe6digitCodeToActivate', 'Nhập mã 6 số để kích hoạt (ví dụ: 123456)')}
                size="large"
                style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: 'bold', borderRadius: 8 }}
                onPressEnter={handleConfirm2Fa}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button onClick={() => setShowSetup(false)} style={{ flex: 1, height: 38, borderRadius: 8 }}>{t('findingKB.modal.cancelText', 'Hủy')}</Button>
              <Button type="primary" onClick={handleConfirm2Fa} loading={setupLoading} style={{ flex: 1, height: 38, borderRadius: 8 }}>{t('changePasswordModal.confirmActivate', 'Xác nhận & Kích hoạt')}</Button>
            </div>
          </Space>
        )
      ) : (
        // ALREADY ENABLED
        !showDisable ? (
          <div>
            <Alert
              type="success"
              showIcon
              message={t('changePasswordModal.yourAccountIsSafe', 'Tài khoản của bạn đã an toàn')}
              description={t('changePasswordModal.theGoogleAuthenticator2factorSecurityLayer', 'Lớp bảo mật 2 yếu tố Google Authenticator đang hoạt động tích cực trên tài khoản này để bảo vệ dữ liệu kiểm toán ngân hàng.')}
              className="mb-4"
            />
            <Button
              danger
              type="dashed"
              onClick={() => { setShowDisable(true); setOtpCode(''); }}
              block
              style={{ marginTop: 12, height: 38, borderRadius: 8 }}
            >
              {t('changePasswordModal.deactivate2faSecurity', 'Hủy kích hoạt bảo mật 2FA')}
            </Button>
          </div>
        ) : (
          // DISABLE CONFIRMATION
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              message={t('changePasswordModal.confirmDeactivationOf2fa', 'Xác nhận hủy kích hoạt 2FA')}
              description={t('changePasswordModal.toCancelPleaseEnterTheCurrent', 'Để hủy bỏ, vui lòng nhập mã xác thực OTP 6 số hiện tại từ điện thoại của bạn.')}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t('changePasswordModal.currentOtpAuthenticationCode', 'Mã xác thực OTP hiện tại:')}</div>
              <Input
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('changePasswordModal.enterTheCurrent6digitCode', 'Nhập mã 6 số hiện tại')}
                size="large"
                style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: 'bold', borderRadius: 8 }}
                onPressEnter={handleDisable2Fa}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button onClick={() => setShowDisable(false)} style={{ flex: 1, height: 38, borderRadius: 8 }}>{t('findingKB.modal.cancelText', 'Hủy')}</Button>
              <Button type="primary" danger onClick={handleDisable2Fa} loading={setupLoading} style={{ flex: 1, height: 38, borderRadius: 8 }}>{t('changePasswordModal.confirmCancel2fa', 'Xác nhận Hủy 2FA')}</Button>
            </div>
          </Space>
        )
      )}
    </div>
  );

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <SafetyOutlined className="text-orange-500" style={{ fontSize: 20 }} />
          <span style={{ fontWeight: 800 }}>{t('changePasswordModal.setUpAccountSecurity', 'Thiết lập Bảo mật tài khoản')}</span>
        </span>
      }
      open={open}
      onOk={activeTab === 'password' ? handleSubmitPassword : CloseEvent as any}
      onCancel={isMandatory ? undefined : onClose}
      closable={!isMandatory}
      maskClosable={!isMandatory}
      destroyOnClose
      footer={
        activeTab === 'password' ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '0 8px 8px 0' }}>
            {!isMandatory && <Button onClick={onClose}>{t('findingKB.modal.cancelText', 'Hủy')}</Button>}
            <Button type="primary" onClick={handleSubmitPassword} loading={loading}>{t('changePasswordModal.saveAndChangePassword', 'Lưu đổi mật khẩu')}</Button>
          </div>
        ) : (
          null // Footer handles internally inside the 2FA forms
        )
      }
      width={480}
    >
      {isMandatory ? (
        passwordTab
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="middle"
          items={[
            {
              key: 'password',
              label: <span><LockOutlined />{t('header.changePassword', 'Đổi mật khẩu')}</span>,
              children: passwordTab
            },
            {
              key: 'twofactor',
              label: <span><SafetyOutlined />{t('changePasswordModal.2factorAuthentication2fa', 'Xác thực 2 yếu tố (2FA)')}</span>,
              children: twoFactorTab
            }
          ]}
        />
      )}
    </Modal>
  );
};

export default ChangePasswordModal;
