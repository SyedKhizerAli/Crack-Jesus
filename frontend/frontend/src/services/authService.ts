import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Create axios instance with interceptors for token refresh
const api = axios.create({
  baseURL: API_URL,
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check for token expired by status or custom code
    const isTokenExpired =
      (error.response?.status === 401) ||
      (error.response?.data?.code === 'TOKEN_EXPIRED');
    
    if (isTokenExpired && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get the refresh token and user role
        const refreshToken = localStorage.getItem('refreshToken');
        const userRole = localStorage.getItem('userRole');
        
        if (!refreshToken || !userRole) {
          // If no refresh token or role, force logout
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Attempt to refresh the token
        let response;
        if (userRole === 'admin') {
          response = await authService.adminRefreshToken(refreshToken);
        } else if (userRole === 'vendor') {
          response = await authService.vendorRefreshToken(refreshToken);
        } else {
          response = await authService.userRefreshToken(refreshToken);
        }
        
        console.log('Token refresh response:', response);
        
        // Extract tokens from response
        const accessToken = response?.data?.accessToken || response?.accessToken;
        const newRefreshToken = response?.data?.refreshToken || response?.refreshToken;
        
        if (!accessToken) {
          console.error('No access token in response:', response);
          throw new Error('No access token received');
        }
        
        // Update tokens in localStorage
        localStorage.setItem('token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        // Update auth header for future requests
        setAuthToken(accessToken);
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// User authentication
export const userLogin = async (email: string, password: string) => {
  return axios.post(`${API_URL}/users/login`, { email, password });
};

// Admin authentication
export const adminLogin = async (email: string, password: string) => {
  return axios.post(`${API_URL}/admin/login`, { email, password });
};

// Vendor authentication
export const vendorLogin = async (email: string, password: string) => {
  return axios.post(`${API_URL}/vendors/login`, { email, password });
};

// Register new user
export const register = async (userData: any) => {
  return axios.post(`${API_URL}/users/register`, userData);
};

// Set auth token for future requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Refresh token
export const refreshToken = async (refreshToken: string) => {
  return axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
};

// Check if token is valid (without making an API call)
export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  // Simple check - in a real app you might want to decode and check expiration
  return true;
};

export const authService = {
  // User authentication
  async userLogin(email: string, password: string) {
    const response = await axios.post(`${API_URL}/users/login`, {
      email,
      password,
    });
    return response;
  },

  async userSignup(username: string, email: string, password: string) {
    const response = await axios.post(`${API_URL}/users/signup`, {
      username,
      email,
      password,
    });
    return response;
  },

  async getCurrentUser() {
    const role = localStorage.getItem('userRole');
    let endpoint;
    
    if (role === 'admin') {
      endpoint = `${API_URL}/admin/me`;
    } else if (role === 'vendor') {
      endpoint = `${API_URL}/vendors/me`;
    } else {
      endpoint = `${API_URL}/users/me`;
    }
    
    const response = await api.get(endpoint);
    return response.data;
  },

  async userLogout(refreshToken: string | null) {
    if (!refreshToken) return;
    return await api.post(`${API_URL}/users/logout`, { refreshToken });
  },

  async userRefreshToken(refreshToken: string) {
    const response = await axios.post(`${API_URL}/users/refresh-token`, {
      refreshToken,
    });
    
    // Return the data.data or fall back to data if needed
    return response.data?.data || response.data;
  },

  // Vendor authentication
  async vendorLogin(email: string, password: string) {
    const response = await axios.post(`${API_URL}/vendors/login`, {
      email,
      password,
    });
    return response;
  },

  async vendorSignup(username: string, email: string, password: string) {
    const response = await axios.post(`${API_URL}/vendors/signup`, {
      username,
      email,
      password,
    });
    return response;
  },

  async vendorLogout(refreshToken: string | null) {
    if (!refreshToken) return;
    return await api.post(`${API_URL}/vendors/logout`, { refreshToken });
  },

  async vendorRefreshToken(refreshToken: string) {
    const response = await axios.post(`${API_URL}/vendors/refresh-token`, {
      refreshToken,
    });
    
    // Return the data.data or fall back to data if needed
    return response.data?.data || response.data;
  },

  // Admin authentication
  async adminLogin(email: string, password: string) {
    try {
      const response = await axios.post(`${API_URL}/admin/login`, {
        email,
        password,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  async adminLogout(refreshToken: string | null) {
    if (!refreshToken) return;
    return await api.post(`${API_URL}/admin/logout`, { refreshToken });
  },

  async adminRefreshToken(refreshToken: string) {
    const response = await axios.post(`${API_URL}/admin/refresh-token`, {
      refreshToken,
    });
    
    // Return the data.data or fall back to data if needed
    return response.data?.data || response.data;
  },
}; 