import { Outlet } from 'react-router-dom';

// This route is for static pages that should be accessible to all users,
// regardless of authentication status
export function StaticRoute() {
  return <Outlet />;
} 