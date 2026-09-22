import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { Result, Button } from 'antd';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { t } = useTranslation();

  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = userRole.includes('admin') || userRole.includes(t('auditTemplates.administration', 'quản trị'));
    
    // ADMIN ALWAYS HAS ACCESS
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/error-boundaries
      return <Outlet />;
    }

    const matchRole = (allowedList: string[], currentRole: string): boolean => {
      const usr = currentRole.toLowerCase();
      const allowed = allowedList.map(r => r.toLowerCase());
      
      if (allowed.includes(usr)) return true;
      
      // Group 1: Ban kiểm soát (Supervisory Board)
      const bksRoles = [t('protectedRoute.controlBoard', 'ban kiểm soát'), t('protectedRoute.headOfControlBoard', 'trưởng ban kiểm soát'), t('protectedRoute.deputyHeadOfControlBoard', 'phó trưởng ban kiểm soát'), t('protectedRoute.memberOfTheSupervisoryBoard', 'thành viên ban kiểm soát')];
      if (allowed.includes(t('protectedRoute.controlBoard', 'ban kiểm soát')) && bksRoles.includes(usr)) {
        return true;
      }
      
      // Group 2: Lãnh đạo Khối KTNB
      const lanhDaoKtnbRoles = [t('auditTemplates.headOfInternalAuditCommittee', 'trưởng ban ktnb'), t('auditTemplates.ktnbLeader', 'lãnh đạo ktnb'), t('protectedRoute.directorOfInternalAuditDepartment', 'giám đốc khối kiểm toán nội bộ'), t('protectedRoute.deputyDirectorOfInternalAuditDepartment', 'phó giám đốc khối kiểm toán nội bộ')];
      if ((allowed.includes(t('auditTemplates.headOfInternalAuditCommittee', 'trưởng ban ktnb')) || allowed.includes(t('auditTemplates.ktnbLeader', 'lãnh đạo ktnb'))) && lanhDaoKtnbRoles.includes(usr)) {
        return true;
      }
      
      // Group 3: Trưởng đoàn (Audit Team Leader or Department Heads)
      const truongDoanRoles = [
        t('auditTemplates.delegationLeader', 'trưởng đoàn'),
        t('protectedRoute.auditTeamLeader', 'trưởng đoàn kiểm toán'),
        t('protectedRoute.deputyHeadOfTheAuditTeam', 'phó trưởng đoàn kiểm toán'),
        t('protectedRoute.auditTeamLeader', 'trưởng nhóm kiểm toán'),
        t('protectedRoute.headOfSystemHeadquartersAuditDepartment', 'trưởng phòng kiểm toán hội sở hệ thống'),
        t('protectedRoute.headOfBusinessUnitAuditDepartment', 'trưởng phòng kiểm toán đơn vị kinh doanh'),
        t('protectedRoute.expert', 'chuyên gia'),
        t('protectedRoute.seniorAuditor', 'kiểm toán viên cao cấp')
      ];
      if (allowed.includes(t('auditTemplates.delegationLeader', 'trưởng đoàn')) && (truongDoanRoles.includes(usr) || lanhDaoKtnbRoles.includes(usr))) {
        return true;
      }
      
      // Group 4: Kiểm toán viên (Auditor)
      const ktvRoles = [
        t('resourceCalendar.auditor', 'kiểm toán viên'),
        t('protectedRoute.principalAuditor', 'kiểm toán viên chính'),
        t('protectedRoute.seniorAuditor', 'kiểm toán viên cao cấp'),
        t('protectedRoute.expert', 'chuyên gia'),
        t('resourceCalendar.member', 'thành viên'),
        t('protectedRoute.deputyHeadOfAuditDepartmentOf', 'phó phòng kiểm toán hội sở hệ thống'),
        t('protectedRoute.deputyHeadOfBusinessUnitAudit', 'phó phòng kiểm toán đơn vị kinh doanh'),
        t('protectedRoute.unionSecretary', 'thư ký đoàn')
      ];
      if (allowed.includes(t('resourceCalendar.auditor', 'kiểm toán viên')) && (ktvRoles.includes(usr) || truongDoanRoles.includes(usr) || lanhDaoKtnbRoles.includes(usr))) {
        return true;
      }
      
      return false;
    };

    if (user && matchRole(allowedRoles, userRole)) {
      // eslint-disable-next-line react-hooks/error-boundaries
      return <Outlet />;
    }
    
    // Nếu không có quyền, hiển thị trang 403 Forbidden
    return (
      // eslint-disable-next-line react-hooks/error-boundaries
      <Result
        status="403"
        title="403 Forbidden"
        subTitle={t('protectedRoute.youDoNotHaveAccessTo', 'Bạn không có quyền truy cập vào chức năng này.')}
        // eslint-disable-next-line react-hooks/error-boundaries
        extra={<Button type="primary" href="/">{t('protectedRoute.returnToHomePage', 'Quay lại Trang chủ')}</Button>}
      />
    );
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
