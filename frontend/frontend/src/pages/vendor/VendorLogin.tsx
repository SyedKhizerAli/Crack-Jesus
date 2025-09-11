import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../auth/Auth.css';

export function VendorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const errorDivRef = useRef<HTMLDivElement>(null);
  
  // Clear any existing error messages when component mounts
  useEffect(() => {
    // Force remove any error messages that might be persisting
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Manually clear any error messages
    if (errorDivRef.current) {
      errorDivRef.current.textContent = '';
      errorDivRef.current.classList.add('hidden');
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Direct API call
      const response = await axios.post('http://localhost:3000/api/vendors/login', {
        email,
        password
      });
      
      console.log('Login successful:', response.data);
      
      if (response.data && response.data.data) {
        const { accessToken, refreshToken, vendor } = response.data.data;
        
        // Store tokens and user info in localStorage
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userRole', 'vendor');
        localStorage.setItem('user', JSON.stringify(vendor));
        
        // Force redirect without using React Router
        window.location.href = '/vendor/dashboard';
        return; // Exit early to prevent further execution
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to login';
      setError(errorMessage);
      
      // Manually set error message
      if (errorDivRef.current) {
        errorDivRef.current.textContent = errorMessage;
        errorDivRef.current.classList.remove('hidden');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Vendor Login</h2>
          <p>Welcome back! Please login to your vendor account.</p>
        </div>
        
        <div 
          ref={errorDivRef} 
          className={`error-message ${!error ? 'hidden' : ''}`}
        >
          {error}
        </div>
        
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
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        
        <div className="auth-footer">
          <p>Don't have a vendor account? <Link to="/vendor/signup">Apply Now</Link></p>
          <div className="auth-options">
            <Link to="/login">User Login</Link>
            <Link to="/admin/login">Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 