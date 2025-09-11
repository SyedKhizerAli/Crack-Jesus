import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

export function Login() {
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
      const response = await axios.post('http://localhost:3000/api/users/login', {
        email,
        password
      });
      
      console.log('Login successful:', response.data);
      
      if (response.data && response.data.data) {
        const { accessToken, refreshToken, user } = response.data.data;
        
        // Store tokens and user info in localStorage
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Force redirect without using React Router
        window.location.href = '/dashboard';
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
        <h2>Welcome to CrackJesus</h2>
        <p className="auth-subtitle">Please login to your account</p>
        
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
            <div className="remember-forgot">
              <label className="checkbox-label">
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>
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
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          <div className="auth-links">
            <Link to="/vendor/login">Vendor Login</Link>
            <Link to="/admin/login">Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 