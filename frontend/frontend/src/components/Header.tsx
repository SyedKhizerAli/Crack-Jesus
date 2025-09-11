import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="main-header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link to="/">
              <h1>CrackJesus</h1>
            </Link>
          </div>
          
          <nav className="main-nav">
            {/* Navigation links based on user role */}
            {!user && (
              <>
                <Link to="/browse">Browse Cards</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/about">About</Link>
              </>
            )}
            
            {user && user.role === 'admin' && (
              <>
                <Link to="/admin/dashboard">Dashboard</Link>
                <Link to="/admin/users">Users</Link>
                <Link to="/admin/vendors">Vendors</Link>
                <Link to="/admin/cards">Cards</Link>
                <Link to="/admin/tickets">Support</Link>
                <Link to="/admin/settings">Settings</Link>
              </>
            )}
            
            {user && user.role === 'vendor' && (
              <>
                <Link to="/vendor/dashboard">Dashboard</Link>
                <Link to="/vendor/cards">My Cards</Link>
                <Link to="/vendor/sales">Sales</Link>
                <Link to="/vendor/tickets">Support</Link>
                <Link to="/vendor/profile">Profile</Link>
              </>
            )}
            
            {user && user.role === 'user' && (
              <>
                <Link to="/browse">Browse Cards</Link>
                <Link to="/orders">My Orders</Link>
                <Link to="/tickets">Support</Link>
              </>
            )}
          </nav>
          
          <div className="auth-actions">
            {!user ? (
              <>
                <Link to="/login" className="btn btn-outline">Login</Link>
                <Link to="/signup" className="btn btn-primary">Sign Up</Link>
              </>
            ) : (
              <div className="user-menu">
                <span className="username">{user.username}</span>
                <button onClick={logout} className="btn btn-outline">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 