import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, Menu, Typography, Dropdown, Avatar, Badge, Alert, Button, Tooltip, Drawer, Tag } from 'antd';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { hasPermission } from '../utils/permission';
import { 
  DashboardOutlined, 
  AppstoreOutlined, 
  CalculatorOutlined, 
  CalendarOutlined, 
  BugOutlined, 
  FilePdfOutlined, 
  SendOutlined, 
  LogoutOutlined, 
  UserOutlined, 
  TeamOutlined, 
  KeyOutlined, 
  ProjectOutlined, 
  AuditOutlined, 
  SafetyCertificateOutlined, 
  RadarChartOutlined, 
  SettingOutlined, 
  MenuOutlined, 
  BookOutlined, 
  GlobalOutlined, 
  CheckCircleOutlined,
  LockOutlined,
  BankOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  TrophyOutlined,
  SolutionOutlined,
  FolderOpenOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NotificationBell from '../components/NotificationBell';
import LanguageSelector, { VietnamFlag, UsFlag } from '../components/LanguageSelector';
import KitaAssistant from '../components/KitaAssistant';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import LPBankLogo, { LPBANK_BRAND_GOLD } from '../components/LPBankLogo';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 992);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Read logged-in user info
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  // Auto-open change password if mandatory
  const isMandatoryPwdChange = currentUser?.mustChangePassword || currentUser?.isPasswordExpired;

  const handleMenuClick = ({ key }: { key: string }) => {
    // Key có thể chứa query string (ví dụ: "/risk-and-planning?tab=universe")
    // navigate() hỗ trợ cả path có query string
    navigate(key);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) { console.error('Logout error', e); }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };


  const menuItems = useMemo(() => [
    // ═══ 1. BÀN LÀM VIỆC & ĐIỀU HÀNH ═══
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('menu.workbench', '1. Bàn Làm Việc & Điều Hành'),
    },
    // ═══ CỔNG BAN KIỂM SOÁT (AUDIT COMMITTEE PORTAL - IIA STANDARD 1000) ═══
    {
      key: '/audit-committee-portal',
      icon: <BankOutlined />,
      label: t('menu.auditCommittee', '🏛️ Cổng Ban Kiểm Soát'),
      roles: ['Ban kiểm soát', 'Admin', 'Trưởng Ban KTNB'],
      children: [
        {
          key: '/audit-committee-portal',
          icon: <BankOutlined />,
          label: t('menu.auditCommitteeOverview', 'Tổng quan BKS & Điều lệ 3 Tuyến'),
        },
        {
          key: '/regulatory-exams',
          icon: <FileSearchOutlined />,
          label: t('menu.regulatoryExams', 'Giám sát Đoàn Thanh tra NHNN'),
        },
      ],
    },
    // ═══ CỔNG ĐƠN VỊ ĐƯỢC KIỂM TOÁN (AUDITEE PORTAL - TUYẾN 1 & 2) ═══
    {
      key: '/auditee-portal',
      icon: <SolutionOutlined />,
      label: t('menu.auditeePortal', '🏢 Cổng Đơn Vị Được KT'),
      roles: ['Admin', 'Đơn vị được kiểm toán', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban kiểm soát'],
    },
    // ═══ 2. QUẢN TRỊ RỦI RO & KẾ HOẠCH NĂM (RISK & PLANNING HUB) ═══
    {
      key: '/risk-and-planning',
      icon: <SafetyCertificateOutlined />,
      label: t('menu.groupPlan', '2. Rủi Ro & Kế Hoạch Năm'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban kiểm soát'],
      children: [
        {
          key: '/risk-and-planning?step=scope',
          icon: <AppstoreOutlined />,
          label: t('menu.stepScope', '1. Phạm vi kiểm toán'),
        },
        {
          key: '/risk-and-planning?step=library',
          icon: <SafetyCertificateOutlined />,
          label: t('menu.stepLibrary', '2. Thư viện rủi ro & kiểm soát'),
        },
        {
          key: '/risk-and-planning?step=prioritization',
          icon: <CalculatorOutlined />,
          label: t('menu.stepPrioritization', '3. Đánh giá & ưu tiên'),
        },
        {
          key: '/risk-and-planning?step=plan',
          icon: <CalendarOutlined />,
          label: t('menu.stepPlan', '4. Kế hoạch & nguồn lực'),
        },
      ],
    },
    // ═══ 3. THỰC HIỆN CUỘC KIỂM TOÁN TẬP TRUNG (ENGAGEMENT WORKSPACE) ═══
    {
      key: '/audit-engagements',
      icon: <ProjectOutlined />,
      label: t('menu.groupExec', '3. Cuộc Kiểm Toán Thực Địa'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên'],
      children: [
        {
          key: '/audit-engagements',
          icon: <ProjectOutlined />,
          label: t('menu.engagementsList', 'Danh sách Cuộc kiểm toán'),
        },
        {
          key: '/engagement-change-requests',
          icon: <CheckCircleOutlined />,
          label: t('menu.changeRequests', 'Phê duyệt Thay đổi Cuộc KT'),
        },
        {
          key: '/working-papers',
          icon: <FileTextOutlined />,
          label: t('menu.workingPapers', 'Mẫu biểu & Giấy tờ làm việc'),
        },
      ],
    },
    // ═══ 4. TRUNG TÂM PHÁT HIỆN, BÁO CÁO & KHẮC PHỤC (FINDINGS & REPORTING HUB) ═══
    {
      key: '/findings-hub',
      icon: <BugOutlined />,
      label: t('menu.groupReport', '4. Phát Hiện & Báo Cáo KT'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Đơn vị được kiểm toán', 'Ban kiểm soát'],
      children: [
        {
          key: '/findings-hub?tab=findings',
          icon: <BugOutlined />,
          label: t('menu.auditFindings', 'Phát hiện 5C & Thống kê'),
        },
        {
          key: '/findings-hub?tab=reports',
          icon: <FilePdfOutlined />,
          label: t('menu.auditReports', 'Báo cáo KT & Xếp hạng KSNB'),
        },
        {
          key: '/findings-hub?tab=recommendations',
          icon: <SendOutlined />,
          label: t('menu.recommendations', 'Khắc phục Kiến nghị & SLA'),
        },
      ],
    },
    // ═══ 5. GIÁM SÁT LIÊN TỤC & PHÂN TÍCH DỮ LIỆU CAATs ═══
    {
      key: '/continuous-monitoring',
      icon: <RadarChartOutlined />,
      label: t('menu.continuousMonitoring', '5. Giám Sát Liên Tục & CAATs'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban kiểm soát'],
    },
    // ═══ 6. VIỆC NGOÀI ĐOÀN & TIẾN ĐỘ PHÒNG ═══
    {
      key: '/general-tasks',
      icon: <ScheduleOutlined />,
      label: t('menu.generalTasks', '6. Việc Ngoài Đoàn & Tiến Độ Phòng'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban kiểm soát'],
    },
    // ═══ 7. ĐÁNH GIÁ BSC-KPI & NHÂN SỰ ═══
    {
      key: '/bsc-kpi',
      icon: <TrophyOutlined />,
      label: t('menu.bscKpi', '7. Đánh Giá BSC-KPI & Nhân Sự'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban kiểm soát'],
    },
    // ═══ 8. QUẢN LÝ HỒ SƠ & MẪU BIỂU TẬP TRUNG ═══
    {
      key: '/document-manager',
      icon: <FolderOpenOutlined />,
      label: t('menu.documentManager', '8. Quản Lý Hồ Sơ & Mẫu Biểu'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên'],
    },
    // ═══ 9. CƠ SỞ PHÁP LÝ & KHO TRI THỨC AI ═══
    {
      key: '/regulatory-kb',
      icon: <ReadOutlined />,
      label: t('menu.knowledgeHub', '9. Pháp Quy & Tri Thức AI'),
      roles: ['Admin', 'Trưởng Ban KTNB', 'Trưởng đoàn', 'Kiểm toán viên', 'Ban kiểm soát', 'Đơn vị được kiểm toán'],
      children: [
        {
          key: '/regulatory-kb',
          icon: <BookOutlined />,
          label: t('menu.regulatoryKb', 'Cơ sở Pháp lý & TT NHNN'),
        },
        {
          key: '/ai-knowledge',
          icon: <BugOutlined />,
          label: t('menu.aiKnowledge', 'Kho Tri Thức Phát Hiện AI'),
        },
      ],
    },
    // ═══ 10. QUẢN TRỊ HỆ THỐNG & NGUỒN LỰC (SYSTEM ADMIN & SETTINGS) ═══
    {
      key: '/system-admin',
      icon: <SettingOutlined />,
      label: t('menu.groupAdmin', '10. Quản Trị Hệ Thống & KTV'),
      roles: ['Admin', 'Trưởng Ban KTNB'],
      children: [
        {
          key: '/methodology',
          icon: <BookOutlined />,
          label: 'Quản trị Phương pháp luận & HSRR',
        },
        {
          key: '/system-admin?tab=roles',
          icon: <KeyOutlined />,
          label: t('menu.roles', 'Phân quyền & Vai trò CASL'),
        },
        {
          key: '/system-admin?tab=personnel',
          icon: <TeamOutlined />,
          label: t('menu.personnel', 'Đội ngũ KTV, Timesheet & CPE'),
        },
        {
          key: '/system-admin?tab=personnel&subTab=sub5',
          icon: <AuditOutlined />,
          label: t('menu.independenceTracker', 'Giám sát Độc lập KTV (IIA 1100)'),
        },
        {
          key: '/system-admin?tab=audit-trail',
          icon: <AuditOutlined />,
          label: t('menu.auditTrail', 'Nhật ký Hệ thống (SHA-256)'),
        },
        {
          key: '/system-admin?tab=config',
          icon: <SettingOutlined />,
          label: t('menu.systemManagement', 'Tham số & Tích hợp'),
        },
        {
          key: '/system-admin?tab=config&subTab=sub3',
          icon: <SettingOutlined />,
          label: t('menu.masterData', 'Quản trị Dữ liệu Cốt lõi'),
        },
      ],
    },
    // ═══ HƯỚNG DẪN SỬ DỤNG ═══
    {
      key: '/user-guide',
      icon: <BookOutlined />,
      label: t('menu.userGuide', 'Hướng dẫn Sử dụng'),
    },
  ], [t]);

  // Tính selectedKeys có hỗ trợ Hub query-string matching
  // Ví dụ: khi URL = /risk-and-planning?tab=rcm, key cần match = "/risk-and-planning?tab=rcm"
  const selectedMenuKeys = useMemo(() => {
    const fullPath = location.pathname + location.search;
    const allKeys: string[] = [];
    menuItems.forEach((item: any) => {
      if (item.children) {
        item.children.forEach((child: any) => allKeys.push(child.key));
      } else {
        allKeys.push(item.key);
      }
    });
    // Tìm key khớp chính xác, hoặc fallback về pathname
    const matched = allKeys.find(k => {
      if (k === fullPath) return true;
      const [kPath, kQuery] = k.split('?');
      if (location.pathname === kPath && kQuery && location.search.includes(kQuery)) return true;
      return false;
    });
    return matched ? [matched] : [location.pathname];
  }, [location.pathname, location.search, menuItems]);

  // Filter menu items based on user role (robust extraction supporting string, object, and null/undefined)
  const roleName = typeof currentUser?.role === 'string'
    ? currentUser.role
    : (currentUser?.role?.name || '');
  const userRole = roleName.toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('quản trị') || currentUser?.username?.toLowerCase() === 'admin';
  
  const matchRole = useCallback((allowedList: string[], currentRole: string): boolean => {
    const usr = currentRole.toLowerCase();
    const allowed = allowedList.map(r => r.toLowerCase());
    
    if (allowed.includes(usr)) return true;
    
    // Group 1: Ban kiểm soát (Supervisory Board)
    const bksRoles = ['ban kiểm soát', 'trưởng ban kiểm soát', 'phó trưởng ban kiểm soát', 'thành viên ban kiểm soát'];
    if (allowed.includes('ban kiểm soát') && bksRoles.includes(usr)) {
      return true;
    }
    
    // Group 2: Lãnh đạo Khối KTNB
    const lanhDaoKtnbRoles = ['trưởng ban ktnb', 'lãnh đạo ktnb', 'giám đốc khối kiểm toán nội bộ', 'phó giám đốc khối kiểm toán nội bộ'];
    if ((allowed.includes('trưởng ban ktnb') || allowed.includes('lãnh đạo ktnb')) && lanhDaoKtnbRoles.includes(usr)) {
      return true;
    }
    
    // Group 3: Trưởng đoàn (Audit Team Leader or Department Heads)
    const truongDoanRoles = [
      'trưởng đoàn',
      'trưởng đoàn kiểm toán',
      'phó trưởng đoàn kiểm toán',
      'trưởng nhóm kiểm toán',
      'trưởng phòng kiểm toán hội sở hệ thống',
      'trưởng phòng kiểm toán đơn vị kinh doanh',
      'chuyên gia',
      'kiểm toán viên cao cấp'
    ];
    if (allowed.includes('trưởng đoàn') && (truongDoanRoles.includes(usr) || lanhDaoKtnbRoles.includes(usr))) {
      return true;
    }
    
    // Group 4: Kiểm toán viên (Auditor)
    const ktvRoles = [
      'kiểm toán viên',
      'kiểm toán viên chính',
      'kiểm toán viên cao cấp',
      'chuyên gia',
      'thành viên',
      'phó phòng kiểm toán hội sở hệ thống',
      'phó phòng kiểm toán đơn vị kinh doanh',
      'thư ký đoàn'
    ];
    if (allowed.includes('kiểm toán viên') && (ktvRoles.includes(usr) || truongDoanRoles.includes(usr) || lanhDaoKtnbRoles.includes(usr))) {
      return true;
    }
    
    return false;
  }, []);

  const filteredMenuItems = useMemo(() => {
    return menuItems.map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          const cleanKey = child.key.split('?')[0].replace('/', '');
          
          // Failsafe Bypass: Luôn hiển thị các Hub tập trung và hướng dẫn sử dụng
          const isAlwaysAllowedPage =
            cleanKey.includes('system-admin') ||
            cleanKey.includes('risk-and-planning') ||
            cleanKey.includes('findings-hub') ||
            cleanKey.includes('methodology') ||
            cleanKey.includes('general-tasks') ||
            cleanKey.includes('bsc-kpi') ||
            cleanKey.includes('audit-committee') ||
            cleanKey.includes('auditee-portal') ||
            cleanKey.includes('document-manager') ||
            cleanKey.includes('regulatory-exams') ||
            cleanKey.includes('regulatory-kb') ||
            cleanKey.includes('ai-knowledge') ||
            cleanKey.includes('audit-engagements') ||
            cleanKey.includes('engagement-change-requests') ||
            cleanKey.includes('working-papers') ||
            cleanKey.includes('defect-codes') ||
            cleanKey.includes('independence-tracker') ||
            cleanKey.includes('master-data') ||
            cleanKey.includes('user-guide');
          if (isAlwaysAllowedPage) {
            return true;
          }

          // 1. Strict dynamic switch check from backend role configurations
          if (!hasPermission(currentUser, `view:${cleanKey}`)) {
            return false;
          }

          // 2. Legacy static exclusion check for KTV
          const roleLower = userRole.toLowerCase();
          const isKtv = roleLower.includes('kiểm toán viên') || roleLower.includes('ktv') || roleLower === 'thành viên';
          
          if (isKtv) {
            const excludedPagesForKtv = ['departments', 'personnel', 'roles', 'summary-reports'];
            if (excludedPagesForKtv.includes(cleanKey)) return false;
          }
          return true;
        });
        return { ...item, children: filteredChildren };
      }
      return item;
    }).filter(item => {
      // Admin always sees everything
      if (isAdmin) return true;
      
      // Check if this is the Dashboard menu item
      if (item.key === '/') {
        return hasPermission(currentUser, 'view:dashboard');
      }
      
      // If it's a group or item with role restrictions
      if ((item as any).roles) {
        const hasAccess = matchRole((item as any).roles, userRole);
        if (item.children) {
          return hasAccess && item.children.length > 0;
        }
        return hasAccess;
      }
      
      // Non-group items or groups without restrictions are visible to all authenticated users
      return true;
    });
  }, [menuItems, currentUser, userRole, isAdmin, matchRole]);

  // Redirect if they have no dashboard permission and try to access /
  useEffect(() => {
    if (!storedUser || !currentUser) return;
    if (location.pathname === '/' && !hasPermission(currentUser, 'view:dashboard')) {
      let firstAllowedRoute = '';
      for (const item of filteredMenuItems) {
        if (item.key && item.key !== '/' && !item.type) {
          firstAllowedRoute = item.key;
          break;
        }
        if (item.children && item.children.length > 0) {
          const firstChild = item.children.find((child: any) => child.key);
          if (firstChild) {
            firstAllowedRoute = firstChild.key;
            break;
          }
        }
      }
      if (firstAllowedRoute) {
        navigate(firstAllowedRoute, { replace: true });
      }
    }
  }, [location.pathname, currentUser, filteredMenuItems, navigate, storedUser]);

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: t('menu.profile', 'Hồ sơ cá nhân'),
      },
      {
        key: 'change-password',
        icon: <LockOutlined />,
        label: t('menu.changePassword', 'Đổi mật khẩu'),
        onClick: () => setChangePwdOpen(true),
      },
      {
        key: 'language-toggle',
        icon: <GlobalOutlined />,
        label: (
          <span className="flex items-center gap-2">
            {i18n.language?.startsWith('en') ? (
              <>
                <VietnamFlag width={18} height={12} />
                <span>Chuyển sang Tiếng Việt</span>
              </>
            ) : (
              <>
                <UsFlag width={18} height={12} />
                <span>Switch to English</span>
              </>
            )}
          </span>
        ),
        onClick: () => {
          const nextLang = i18n.language?.startsWith('en') ? 'vi' : 'en';
          i18n.changeLanguage(nextLang);
          localStorage.setItem('i18nextLng', nextLang);
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('menu.logout', 'Đăng xuất'),
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  // Redirect to login if not authenticated (safely called after all hooks)
  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout className="h-screen w-full overflow-hidden">
      {/* Mandatory password change modal */}
      <ChangePasswordModal
        open={changePwdOpen || isMandatoryPwdChange}
        onClose={() => setChangePwdOpen(false)}
        isMandatory={isMandatoryPwdChange}
      />

      {/* 📱 Mobile Drawer Navigation (< 992px) */}
      {isMobile ? (
        <Drawer
          placement="left"
          open={!collapsed}
          onClose={() => setCollapsed(true)}
          styles={{
            body: { padding: 0, backgroundColor: '#ffffff' },
            header: { backgroundColor: '#fffbeb', borderBottom: '2px solid #f59e0b', padding: '12px 16px' },
          }}
          title={
            <div className="flex items-center gap-2">
              <LPBankLogo variant="full" height={22} color={LPBANK_BRAND_GOLD} />
              <span className="text-slate-800 font-bold text-sm">| {t('common.appTitle', 'Kiểm toán Nội bộ')}</span>
            </div>
          }
          width={280}
          zIndex={1100}
        >
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={selectedMenuKeys}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items={filteredMenuItems as any}
            onClick={({ key }) => {
              setCollapsed(true);
              handleMenuClick({ key });
            }}
            style={{
              overflowY: 'auto',
              height: '100%',
              paddingBottom: 32,
              backgroundColor: '#ffffff',
            }}
          />
        </Drawer>
      ) : (
        /* 💻 Desktop Sider Navigation (>= 992px) - LPBank Imperial Light Gold */
        <Sider
          breakpoint="lg"
          collapsedWidth="0"
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
          className="shadow-sm z-30"
          width={240}
          style={{
            height: '100vh',
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #fde68a',
          }}
        >
          <div className="h-16 flex items-center justify-between px-3 border-b" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
            {collapsed ? (
              <div className="w-full flex justify-center py-1">
                <LPBankLogo variant="emblem" height={26} color={LPBANK_BRAND_GOLD} />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#fde68a] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <LPBankLogo variant="emblem" height={20} color={LPBANK_BRAND_GOLD} />
                </div>
                <div className="flex flex-col truncate">
                  <span style={{ color: LPBANK_BRAND_GOLD, fontWeight: 900, fontSize: 16, letterSpacing: '-0.3px', fontFamily: '"Outfit", sans-serif', lineHeight: 1.1 }}>
                    LPBank
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 truncate">
                    {t('common.appTitle', 'Kiểm toán Nội bộ')}
                  </span>
                </div>
              </div>
            )}
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={selectedMenuKeys}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items={filteredMenuItems as any}
            onClick={handleMenuClick}
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              height: 'calc(100vh - 64px - 48px)',
              paddingBottom: 8,
              backgroundColor: '#ffffff',
            }}
          />
        </Sider>
      )}

      <Layout style={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 🏦 Tier 1: LPBank Top Utility Bar (Imperial Gold Gradient - Inspired by LPBank Official Portal) */}
        <div 
          className="w-full flex items-center justify-between px-3 md:px-6 text-xs shadow-xs"
          style={{
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 45%, #ea580c 100%)',
            color: '#ffffff',
            height: 36,
            flexShrink: 0,
            borderBottom: '1px solid rgba(254, 240, 138, 0.4)',
            zIndex: 10
          }}
        >
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button 
              onClick={() => navigate('/')}
              className={`px-3 py-1 rounded-md transition-all text-[11px] md:text-xs font-bold cursor-pointer ${
                location.pathname === '/' ? 'bg-white text-[#d97706] shadow-sm' : 'text-amber-50 hover:text-white hover:bg-black/10'
              }`}
            >
              {t('menu.topNav.system', 'Hệ thống KTNB')}
            </button>
            <button 
              onClick={() => navigate('/risk-and-planning?step=plan')}
              className={`px-3 py-1 rounded-md transition-all text-[11px] md:text-xs font-bold cursor-pointer ${
                location.pathname.startsWith('/risk-and-planning') ? 'bg-white text-[#d97706] shadow-sm' : 'text-amber-50 hover:text-white hover:bg-black/10'
              }`}
            >
              {t('menu.topNav.planning', 'Kế hoạch & Rủi ro')}
            </button>
            <button 
              onClick={() => navigate('/audit-engagements')}
              className={`px-3 py-1 rounded-md transition-all text-[11px] md:text-xs font-bold cursor-pointer ${
                location.pathname.startsWith('/audit-engagements') || location.pathname.startsWith('/working-papers') ? 'bg-white text-[#d97706] shadow-sm' : 'text-amber-50 hover:text-white hover:bg-black/10'
              }`}
            >
              {t('menu.topNav.execution', 'Thực hiện kiểm toán')}
            </button>
            <button 
              onClick={() => navigate('/findings-hub?tab=reports&subTab=sub1')}
              className={`px-3 py-1 rounded-md transition-all text-[11px] md:text-xs font-bold cursor-pointer ${
                location.pathname.startsWith('/findings-hub') ? 'bg-white text-[#d97706] shadow-sm' : 'text-amber-50 hover:text-white hover:bg-black/10'
              }`}
            >
              {t('menu.topNav.reporting', 'Báo cáo & Giám sát')}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-[11px] text-amber-50 flex-shrink-0">
            <span className="hover:text-white font-medium cursor-pointer transition-colors" onClick={() => navigate('/user-guide')}>{t('menu.topNav.guide', 'Cẩm nang KTNB')}</span>
            <span className="opacity-50">|</span>
            <span>{t('menu.topNav.hotline', 'Tổng đài CSKH:')} <strong className="text-white font-black drop-shadow-xs">1800 577 758</strong></span>
          </div>
        </div>

        {/* 🏛️ Tier 2: LPBank Main Header Bar (Clean White with LPBank Signature Gold Pill) */}
        <Header 
          className="px-3 md:px-6 shadow-xs flex items-center justify-between" 
          style={{ 
            zIndex: 9, 
            backgroundColor: '#ffffff', 
            borderBottom: '2px solid #f59e0b', 
            height: 60, 
            flexShrink: 0 
          }}
        >
          <div className="flex items-center gap-2.5">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: '#d97706', fontSize: 20 }} />}
                onClick={() => setCollapsed(false)}
                style={{ color: '#d97706', padding: '4px', marginRight: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              />
            )}
            
            {/* LPBank Logo Brand Mark */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-white border border-[#fde68a] flex items-center justify-center shadow-xs flex-shrink-0">
                <LPBankLogo variant="emblem" height={20} color={LPBANK_BRAND_GOLD} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: LPBANK_BRAND_GOLD, fontWeight: 900, fontSize: 20, letterSpacing: '-0.3px', fontFamily: '"Outfit", sans-serif' }}>
                    LPBank
                  </span>
                  <span className="text-gray-300 font-light hidden sm:inline">|</span>
                  <span className="hidden sm:inline font-bold text-xs uppercase tracking-wider text-slate-800">
                    Smart Audit 4.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium hidden md:block -mt-0.5">
                  {t('common.bankName', 'Ngân hàng Thương mại Cổ phần Lộc Phát Việt Nam')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-shrink-0">
            {currentUser?.role && (
              <Tag 
                color="#fff7ed" 
                className="text-[#c2410c] border-[#fed7aa] font-bold text-xs hidden xl:inline-flex rounded-full px-2.5 py-0.5 m-0"
              >
                {currentUser.role}
              </Tag>
            )}

            <Tooltip title="Hướng dẫn Sử dụng">
              <Button 
                type="text" 
                icon={<BookOutlined style={{ color: '#f59e0b', fontSize: 16 }} />} 
                className="text-slate-700 hover:!bg-amber-50 flex items-center font-bold text-xs border border-[#fde68a] rounded-lg px-2 sm:px-3"
                style={{ height: 34 }}
                onClick={() => navigate('/user-guide')}
              >
                <span className="hidden md:inline ml-1">Hướng dẫn</span>
              </Button>
            </Tooltip>
            
            <div className="flex items-center flex-shrink-0">
              <NotificationBell onNavigate={(path) => navigate(path)} />
            </div>

            <div className="flex items-center flex-shrink-0">
              <LanguageSelector />
            </div>

            {/* LPBank Signature Pill Action Button */}
            <Dropdown menu={userMenu as any} placement="bottomRight" trigger={['click']}>
              <button 
                className="lpbank-gold-pill-btn cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                style={{ height: 34, padding: '0 14px 0 6px' }}
              >
                <Badge dot={isMandatoryPwdChange} color="red">
                  <Avatar 
                    size={24} 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }} 
                  />
                </Badge>
                <span className="text-xs sm:text-sm font-bold truncate max-w-[120px] text-white">
                  {currentUser?.fullName || currentUser?.username || 'Đăng nhập'}
                </span>
              </button>
            </Dropdown>
          </div>
        </Header>

        {/* Password expiry warning bar */}
        {currentUser?.isPasswordExpired && !currentUser?.mustChangePassword && (
          <Alert
            type="warning"
            message="Mật khẩu đã hết hạn (>90 ngày). Vui lòng đổi mật khẩu."
            banner
            closable
            action={
              <span
                className="text-amber-600 font-bold cursor-pointer text-sm underline"
                onClick={() => setChangePwdOpen(true)}
              >
                Đổi ngay
              </span>
            }
          />
        )}
        
        <Content className="m-1.5 p-2 sm:m-2.5 sm:p-3 md:m-3 md:p-4 bg-[#faf8f5] shadow-xs rounded-xl overflow-y-auto overflow-x-hidden flex-1 min-w-0 border border-[#fde68a]">
          <Outlet />
        </Content>
        <KitaAssistant />
      </Layout>
    </Layout>
  );
};

export default MainLayout;
