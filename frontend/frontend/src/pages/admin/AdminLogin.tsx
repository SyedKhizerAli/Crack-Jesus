import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminLogin.css';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Direct API call instead of using AuthContext
      const response = await axios.post('http://localhost:3000/api/admin/login', {
        email,
        password
      });
      
      console.log('Admin login response:', response.data);
      
      if (response.data && response.data.data) {
        const { accessToken, refreshToken, admin } = response.data.data;
        
        // Store tokens and user info in localStorage
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('user', JSON.stringify(admin));
        
        // Force page reload to update auth state
        window.location.href = '/admin/dashboard';
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>CrackJesus Admin</h2>
        <p className="auth-subtitle">Welcome back! Please login to your admin account.</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Admin access only. Contact system administrator for access.</p>
          <div className="auth-links">
            <Link to="/login">User Login</Link>
            <Link to="/vendor/login">Vendor Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 