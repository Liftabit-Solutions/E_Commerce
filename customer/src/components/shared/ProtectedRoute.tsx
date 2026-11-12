import React, { useEffect } from 'react';
import { useApp } from '../../core/context/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { curUser, setCurPage, showToast } = useApp();

  useEffect(() => {
    if (!curUser) {
      showToast('Authentication required. Please sign in.');
      setCurPage('login');
    } else if (requireAdmin && !curUser.isAdmin) {
      showToast('Access Denied: Administrative privileges required.');
      setCurPage('home');
    }
  }, [curUser, requireAdmin, setCurPage, showToast]);

  if (!curUser || (requireAdmin && !curUser.isAdmin)) {
    return null; // Redirection is handled by the useEffect above
  }

  return <>{children}</>;
};

export default ProtectedRoute;
