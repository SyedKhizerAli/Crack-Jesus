import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, setAuthToken } from '../services/authService';

// Define user types
export type UserRole = 'user' | 'vendor' | 'admin';

// Define user interface
interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  [key: string]: any;
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<any>;
  signup: (username: string, email: string, password: string, role: UserRole) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    const initAuth = () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setAuthToken(token);
        } catch (error) {
          console.error('Failed to parse user data:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userRole');
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      let response;
      
      // Use the appropriate login method based on role
      if (role === 'admin') {
        response = await authService.adminLogin(email, password);
      } else if (role === 'vendor') {
        response = await authService.vendorLogin(email, password);
      } else {
        response = await authService.userLogin(email, password);
      }
      
      if (!response || !response.data) {
        throw new Error('Invalid response format from server');
      }
      
      const responseData = response.data;
      
      if (!responseData.data) {
        throw new Error('Invalid response data structure');
      }
      
      let userData;
      let accessToken;
      let refreshToken;
      
      // Extract user data based on role
      if (role === 'admin') {
        userData = responseData.data.admin;
        accessToken = responseData.data.accessToken;
        refreshToken = responseData.data.refreshToken;
      } else if (role === 'vendor') {
        userData = responseData.data.user || responseData.data.vendor;
        accessToken = responseData.data.accessToken;
        refreshToken = responseData.data.refreshToken;
      } else {
        userData = responseData.data.user;
        accessToken = responseData.data.accessToken;
        refreshToken = responseData.data.refreshToken;
      }
      
      if (!userData || !accessToken) {
        throw new Error('User data or token not found in response');
      }
      
      // Ensure role is set
      userData.role = userData.role || role;
      
      // Store auth data
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set auth token for future requests
      setAuthToken(accessToken);
      
      // Update state
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    setAuthToken(null);
    setUser(null);
  };

  const signup = async (username: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      let response;
      
      // Use the appropriate signup method based on role
      if (role === 'vendor') {
        response = await authService.vendorSignup(username, email, password);
      } else {
        response = await authService.userSignup(username, email, password);
      }
      
      if (!response || !response.data) {
        throw new Error('Invalid response format from server');
      }
      
      // After signup, automatically log in
      return login(email, password, role);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 