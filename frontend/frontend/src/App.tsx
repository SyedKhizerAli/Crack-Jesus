import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { PublicRoute } from './components/PublicRoute';
import { RoleBasedRoute } from './components/RoleBasedRoute';
import { StaticRoute } from './components/StaticRoute';
import { Layout } from './components/Layout';
import { useEffect } from 'react';

// Auth pages
import { UserLogin } from './pages/auth/UserLogin';
import { UserSignup } from './pages/auth/UserSignup';
import { VendorLogin } from './pages/auth/VendorLogin';
import { VendorSignup } from './pages/auth/VendorSignup';
import { AdminLogin } from './pages/auth/AdminLogin';

// User pages
import { UserDashboard } from './pages/user/UserDashboard';
import { UserWallet } from './pages/user/UserWallet';
import { UserCards } from './pages/user/UserCards';
import { UserPurchases } from './pages/user/UserPurchases';
import { UserTickets } from './pages/user/UserTickets';
import { UserCardDetail } from './pages/user/UserCardDetail';

// Vendor pages
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { VendorCards } from './pages/vendor/VendorCards';
import { VendorSales } from './pages/vendor/VendorSales';
import { VendorBTCPaySetup } from './pages/vendor/VendorBTCPaySetup';
import { VendorTickets } from './pages/vendor/VendorTickets';
import { VendorCardDetail } from './pages/vendor/VendorCardDetail';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminUserDetail } from './pages/admin/AdminUserDetail';
import { AdminVendors } from './pages/admin/AdminVendors';
import { AdminCards } from './pages/admin/AdminCards';
import { AdminAddCard } from './pages/admin/AdminAddCard';
import { AdminSales } from './pages/admin/AdminSales';
import { AdminTickets } from './pages/admin/AdminTickets';
import { AdminCardDetail } from './pages/admin/AdminCardDetail';

// Static pages
import { FAQ } from './pages/FAQ';
import { Guide } from './pages/Guide';
import { Rules } from './pages/Rules';

// Add this import
const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    document.title = 'CrackJesus - Secure Card Management';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<UserLogin />} />
                <Route path="/signup" element={<UserSignup />} />
                <Route path="/vendor/login" element={<VendorLogin />} />
                <Route path="/vendor/signup" element={<VendorSignup />} />
                <Route path="/admin/login" element={<AdminLogin />} />
              </Route>
              
              {/* Static Pages - accessible to all users */}
              <Route element={<StaticRoute />}>
                <Route path="/faq" element={<FAQ />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/rules" element={<Rules />} />
              </Route>

              {/* User Routes */}
              <Route element={<RoleBasedRoute allowedRoles={['user']} />}>
                <Route path="/user/dashboard" element={<UserDashboard />} />
                <Route path="/user/wallet" element={<UserWallet />} />
                <Route path="/user/cards" element={<UserCards />} />
                <Route path="/user/cards/:id" element={<UserCardDetail />} />
                <Route path="/user/purchases" element={<UserPurchases />} />
                <Route path="/user/tickets" element={<UserTickets />} />
              </Route>

              {/* Vendor Routes */}
              <Route element={<RoleBasedRoute allowedRoles={['vendor']} />}>
                <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                <Route path="/vendor/cards" element={<VendorCards />} />
                <Route path="/vendor/cards/:id" element={<VendorCardDetail />} />
                <Route path="/vendor/sales" element={<VendorSales />} />
                <Route path="/vendor/btcpay-setup" element={<VendorBTCPaySetup />} />
                <Route path="/vendor/tickets" element={<VendorTickets />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:id" element={<AdminUserDetail />} />
                <Route path="/admin/vendors" element={<AdminVendors />} />
                <Route path="/admin/cards" element={<AdminCards />} />
                <Route path="/admin/cards/add" element={<AdminAddCard />} />
                <Route path="/admin/cards/:id" element={<AdminCardDetail />} />
                <Route path="/admin/sales" element={<AdminSales />} />
                <Route path="/admin/tickets" element={<AdminTickets />} />
              </Route>

              {/* Redirect root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Catch all - 404 */}
              <Route path="*" element={<div className="container text-center mt-4"><h1>404 - Page Not Found</h1></div>} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;

