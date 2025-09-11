import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminPages.css';
import './AdminVendors.css';

interface Vendor {
  id: string;
  userId: {
    username: string;
    email: string;
  };
  btcPayStore: {
    verified: boolean;
    storeId: string;
  };
  businessDetails: {
    verified: boolean;
  };
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function AdminVendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
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
  const [verificationFilter, setVerificationFilter] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
  }, [page, statusFilter, verificationFilter]);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params: any = { page, limit: 10 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (verificationFilter) {
        params.verified = verificationFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      console.log('Fetching vendors with params:', params);
      const response = await axios.get('http://localhost:3000/api/admin/vendors', { 
        headers,
        params
      });
      
      console.log('API Response:', response.data);
      
      // Ensure vendors array exists and has items
      if (!response.data.data.vendors) {
        console.error('No vendors array in response', response.data);
        setVendors([]);
        setError('Invalid response format from server');
        return;
      }
      
      // Process vendor data to ensure it matches the interface
      const processedVendors = response.data.data.vendors.map((vendor: any) => {
        console.log('Processing vendor:', vendor);
        
        // Create a safe vendor object
        const safeVendor: Vendor = {
          id: vendor.id || vendor._id?.toString() || '',
          userId: {
            username: vendor.userId?.username || 'Unknown',
            email: vendor.userId?.email || 'No Email'
          },
          btcPayStore: {
            verified: vendor.btcPayStore?.verified || false,
            storeId: vendor.btcPayStore?.storeId || ''
          },
          businessDetails: {
            verified: vendor.businessDetails?.verified || false
          },
          status: (vendor.status as 'active' | 'suspended' | 'pending') || 'pending',
          createdAt: vendor.createdAt || new Date().toISOString()
        };
        
        return safeVendor;
      });
      
      console.log('Processed Vendors:', processedVendors);
      setVendors(processedVendors);
      setPagination(response.data.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: processedVendors.length
      });
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors');
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

  const handleVerificationFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVerificationFilter(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchVendors();
  };

  const handleVerifyVendor = async (vendorId: string) => {
    // Prevent multiple clicks
    if (actionInProgress) return;
    
    if (!window.confirm('Are you sure you want to verify this vendor?')) {
      return;
    }
    
    try {
      setActionInProgress(vendorId);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`http://localhost:3000/api/admin/vendors/${vendorId}/verify`, {}, { headers });
      
      // Refresh the vendor list
      fetchVendors();
    } catch (err: any) {
      console.error('Error verifying vendor:', err);
      setError(err.response?.data?.message || 'Failed to verify vendor');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleVendorStatus = async (vendorId: string, currentStatus: string) => {
    // Prevent multiple clicks
    if (actionInProgress) return;
    
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMessage = newStatus === 'suspended' 
      ? 'Are you sure you want to suspend this vendor?' 
      : 'Are you sure you want to activate this vendor?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setActionInProgress(vendorId);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`http://localhost:3000/api/admin/vendors/${vendorId}/status`, {
        status: newStatus
      }, { headers });
      
      // Refresh the vendor list
      fetchVendors();
    } catch (err: any) {
      console.error('Error updating vendor status:', err);
      setError(err.response?.data?.message || 'Failed to update vendor status');
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading && vendors.length === 0) {
    return <div className="loading">Loading vendors...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Vendor Management</h1>
        <div className="breadcrumb">
          <Link to="/admin/dashboard">Dashboard</Link> / Vendors
        </div>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <div className="filters-bar">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by name or email"
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
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="verification-filter">Verification:</label>
            <select 
              id="verification-filter" 
              value={verificationFilter} 
              onChange={handleVerificationFilterChange}
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
        </div>

        {vendors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏪</div>
            <h3>No Vendors Found</h3>
            <p className="empty-state-message">No vendors found matching your criteria.</p>
            {(statusFilter || verificationFilter) && 
              <button className="btn" onClick={() => {
                setStatusFilter('');
                setVerificationFilter('');
              }}>Clear Filters</button>
            }
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="vendors-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>BTCPay Setup</th>
                    <th>Business Verified</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>{vendor.userId.username}</td>
                      <td>{vendor.userId.email}</td>
                      <td>
                        <span className={`status-badge ${vendor.btcPayStore.verified ? 'verified' : 'unverified'}`}>
                          {vendor.btcPayStore.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${vendor.businessDetails.verified ? 'verified' : 'unverified'}`}>
                          {vendor.businessDetails.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${vendor.status}`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td>{new Date(vendor.createdAt).toLocaleDateString()}</td>
                      <td className="actions">
                        <Link to={`/admin/vendors/${vendor.id}`} className="btn btn-sm btn-primary">
                          View
                        </Link>
                        {!vendor.businessDetails.verified && (
                          <button 
                            onClick={() => handleVerifyVendor(vendor.id)} 
                            className="btn btn-sm btn-success"
                            disabled={actionInProgress === vendor.id}
                          >
                            {actionInProgress === vendor.id ? 'Processing...' : 'Verify'}
                          </button>
                        )}
                        <button 
                          onClick={() => handleToggleVendorStatus(vendor.id, vendor.status)} 
                          className={`btn btn-sm ${vendor.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                          disabled={actionInProgress === vendor.id}
                        >
                          {actionInProgress === vendor.id ? 'Processing...' : 
                           (vendor.status === 'active' ? 'Suspend' : 'Activate')}
                        </button>
                        <Link to={`/admin/vendors/${vendor.id}/sales`} className="btn btn-sm sales-btn">
                          Sales
                        </Link>
                      </td>
                    </tr>
                  ))}
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