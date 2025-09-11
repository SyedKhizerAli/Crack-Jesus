import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <div className="navbar-brand">
          <Link to="/">CrackJesus</Link>
        </div>
        
        <div className="navbar-menu">
          {isAuthenticated && user ? (
            <>
              <div className="navbar-links">
                {user.role === 'admin' && (
                  <>
                    <Link to="/admin/dashboard">Dashboard</Link>
                    <Link to="/admin/users">Users</Link>
                    <Link to="/admin/vendors">Vendors</Link>
                    <Link to="/admin/cards">Cards</Link>
                    <Link to="/admin/sales">Sales</Link>
                    <Link to="/admin/tickets">Tickets</Link>
                  </>
                )}
                
                {user.role === 'vendor' && (
                  <>
                    <Link to="/vendor/dashboard">Dashboard</Link>
                    <Link to="/vendor/cards">Cards</Link>
                    <Link to="/vendor/sales">Sales</Link>
                    <Link to="/vendor/btcpay-setup">BTCPay Setup</Link>
                    <Link to="/vendor/tickets">Tickets</Link>
                  </>
                )}
                
                {user.role === 'user' && (
                  <>
                    <Link to="/user/dashboard">Dashboard</Link>
                    <Link to="/user/wallet">Wallet</Link>
                    <Link to="/user/cards">Cards</Link>
                    <Link to="/user/purchases">Purchases</Link>
                    <Link to="/user/tickets">Tickets</Link>
                  </>
                )}

                {/* Static pages - visible to all users */}
                <div className="navbar-static-links">
                  <Link to="/faq">FAQ</Link>
                  <Link to="/guide">Guide</Link>
                  <Link to="/rules">Rules</Link>
                </div>
              </div>
              
              <div className="navbar-user">
                <span className="user-greeting">Hello, {user.username}</span>
                <button className="btn-outline" onClick={handleLogout}>Logout</button>
              </div>
            </>
          ) : (
            <>
              <div className="navbar-static-links-public">
                <Link to="/faq">FAQ</Link>
                <Link to="/guide">Guide</Link>
                <Link to="/rules">Rules</Link>
              </div>
              <div className="navbar-auth">
                <Link to="/login" className="btn-outline">Login</Link>
                <Link to="/signup" className="btn">Sign Up</Link>
              </div>
            </>
          )}
        </div>
        
        <button className="navbar-burger" aria-label="menu" aria-expanded="false">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
      </div>
    </nav>
  );
} 