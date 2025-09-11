import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './UserPages.css';
import './UserPurchases.css';

interface Purchase {
  id: string;
  cardType: string;
  cardNumber: string;
  amount: number;
  date: string;
  status: string;
  vendor: {
    id: string;
    name: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function UserPurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, [page, statusFilter]);

  const fetchPurchases = async () => {
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
      
      const response = await axios.get('http://localhost:3000/api/users/purchases', { 
        headers,
        params
      });
      
      setPurchases(response.data.data.purchases);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError('Failed to load purchase history');
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
    fetchPurchases();
  };

  if (isLoading && purchases.length === 0) {
    return <div className="loading">Loading purchase history...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Purchase History</h1>
        <Link to="/user/dashboard" className="back-link">Back to Dashboard</Link>
      </header>

      <div className="purchases-content">
        {error && <div className="error-message">{error}</div>}

        <div className="filters-bar">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by card number or vendor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select 
              id="status-filter" 
              value={statusFilter} 
              onChange={handleStatusFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {purchases.length > 0 ? (
          <div className="purchases-grid">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="purchase-card">
                <div className="purchase-header">
                  <h3>{purchase.cardType}</h3>
                  <span className={`status-badge status-${purchase.status}`}>
                    {purchase.status}
                  </span>
                </div>
                <div className="purchase-body">
                  <div className="purchase-detail">
                    <span className="detail-label">Card Number:</span>
                    <span className="detail-value">{purchase.cardNumber}</span>
                  </div>
                  <div className="purchase-detail">
                    <span className="detail-label">Vendor:</span>
                    <span className="detail-value">{purchase.vendor.name}</span>
                  </div>
                  <div className="purchase-detail">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{new Date(purchase.date).toLocaleDateString()}</span>
                  </div>
                  <div className="purchase-detail">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value">${purchase.amount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="purchase-footer">
                  <Link to={`/user/purchases/${purchase.id}`} className="btn">View Details</Link>
                  {purchase.status === 'completed' && (
                    <button className="btn btn-outline">Download</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <h3>No Purchases Found</h3>
            <p className="empty-state-message">You haven't made any purchases yet.</p>
            <Link to="/user/cards" className="btn">Browse Cards</Link>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => handlePageChange(page - 1)} 
              disabled={page === 1}
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={pageNum === page ? 'active' : ''}
              >
                {pageNum}
              </button>
            ))}
            
            <button 
              onClick={() => handlePageChange(page + 1)} 
              disabled={page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 