import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles = [] }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Show loading state
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }
  
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    } else if (user.role === 'vendor') {
      return <Navigate to="/vendor/dashboard" />;
    } else {
      return <Navigate to="/dashboard" />;
    }
  }
  
  return <>{children}</>;
} 