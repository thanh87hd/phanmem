import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { Result, Button } from 'antd';
import { hasRouteAccess, type RoleGroup, type LegacyRoleGroup } from '../utils/roleAccess';

interface ProtectedRouteProps {
  allowedRoles?: (RoleGroup | LegacyRoleGroup | string)[];
  allowGroups?: (RoleGroup | LegacyRoleGroup)[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, allowGroups }) => {
  const { t } = useTranslation();

  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userRole = user?.role || '';
    const rolesToCheck = allowGroups || allowedRoles || [];

    if (user && hasRouteAccess(rolesToCheck, userRole)) {
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
