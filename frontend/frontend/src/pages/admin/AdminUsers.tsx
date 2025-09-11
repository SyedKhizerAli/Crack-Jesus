import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminPages.css';
import './AdminUsers.css';

interface User {
  id: string;
  username: string;
  email: string;
  wallet: {
    btcBalance: number;
    status: 'active' | 'suspended' | 'locked';
  };
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params: any = { page, limit: 10 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await axios.get('http://localhost:3000/api/admin/users', { 
        headers,
        params
      });
      
      console.log('Raw API Response:', response.data);
      
      // Make sure we have a valid id field for each user
      const processedUsers = response.data.data.users.map((user: any) => {
        // Create a new user object to avoid mutating the original
        const processedUser = { ...user };
        
        // Handle MongoDB ObjectId - if it's an object with $oid, extract the string value
        if (user._id && typeof user._id === 'object' && user._id.$oid) {
          processedUser.id = user._id.$oid;
        } 
        // Handle string _id
        else if (user._id && typeof user._id === 'string') {
          processedUser.id = user._id;
        }
        // Handle string id
        else if (user.id && typeof user.id === 'string') {
          processedUser.id = user.id;
        }
        // Handle object id
        else if (user.id && typeof user.id === 'object' && user.id.$oid) {
          processedUser.id = user.id.$oid;
        }
        // Last resort - stringify whatever we have
        else if (user._id) {
          processedUser.id = String(user._id);
        }
        
        // Convert id to string and clean it
        if (processedUser.id) {
          processedUser.id = String(processedUser.id).trim();
        }
        
        console.log('Processed user:', processedUser.username, 'ID:', processedUser.id);
        return processedUser;
      });
      
      setUsers(processedUsers);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchUsers();
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    // Prevent multiple clicks
    if (actionInProgress) return;
    
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMessage = newStatus === 'suspended' 
      ? 'Are you sure you want to suspend this user?' 
      : 'Are you sure you want to activate this user?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setActionInProgress(userId);
      
      // Check if userId is defined and valid
      if (!userId) {
        setError('Invalid user ID. Cannot update status.');
        console.error('Attempted to update status with invalid userId:', userId);
        return;
      }

      console.log('Updating status for user ID:', userId);
      console.log('Current status:', currentStatus);
      console.log('New status:', newStatus);
      
      // Make sure the userId is a clean string with no quotes or extra characters
      const userIdString = String(userId).trim();
      
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Making API call to update status with ID:', userIdString);
      const response = await axios.patch(`http://localhost:3000/api/admin/users/${userIdString}/status`, {
        status: newStatus
      }, { headers });
      
      console.log('Status update response:', response.data);
      
      // Refresh the user list
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Manage Users</h1>
        <div className="breadcrumb">
          <Link to="/admin/dashboard">Dashboard</Link> / Users
        </div>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <div className="filters-bar">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by username or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn">Search</button>
          </form>

          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select 
              id="status-filter" 
              value={statusFilter} 
              onChange={handleStatusFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>No Users Found</h3>
            <p className="empty-state-message">No users found matching your criteria.</p>
            {statusFilter && <button className="btn" onClick={() => setStatusFilter('')}>Clear Filters</button>}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Balance (BTC)</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    // Get the user ID in string format
                    const userId = user.id?.toString() || (user as any)._id?.toString();
                    const userIdStr = String(userId || '');
                    
                    return (
                      <tr key={userIdStr}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.wallet.btcBalance}</td>
                        <td>
                          <span className={`status-badge status-${user.wallet.status}`}>
                            {user.wallet.status}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="actions">
                          <Link to={`/admin/users/${userIdStr}`} className="btn btn-sm btn-primary">
                            View
                          </Link>
                          <button 
                            onClick={() => handleToggleUserStatus(userIdStr, user.wallet.status)}
                            className={`btn btn-sm ${user.wallet.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                            disabled={actionInProgress === userIdStr}
                          >
                            {actionInProgress === userIdStr ? 'Processing...' : 
                             (user.wallet.status === 'active' ? 'Suspend' : 'Activate')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button 
                onClick={() => handlePageChange(page - 1)} 
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(page + 1)} 
                disabled={page === pagination.totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 