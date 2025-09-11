import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface Sale {
  id: string;
  cardId: {
    cardDetails: {
      type: string;
      lastFour: string;
    }
  };
  buyerId: {
    username: string;
  };
  btcAmount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function VendorSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchSales();
  }, [page, statusFilter, dateRange]);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params: any = { page, limit: 10 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (dateRange.start) {
        params.startDate = dateRange.start;
      }
      if (dateRange.end) {
        params.endDate = dateRange.end;
      }
      
      const response = await axios.get('http://localhost:3000/api/vendors/sales', { 
        headers,
        params
      });
      
      setSales(response.data.data.sales);
      setPagination(response.data.data.pagination);
      setTotalRevenue(response.data.data.totalRevenue || 0);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales history');
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateRange({ start: '', end: '' });
    setPage(1);
  };

  if (isLoading && sales.length === 0) {
    return <div className="loading">Loading sales history...</div>;
  }

  return (
    <div className="vendor-sales-container">
      <header className="page-header">
        <h1>Sales History</h1>
        <nav className="breadcrumb">
          <Link to="/vendor/dashboard">Dashboard</Link> / Sales
        </nav>
      </header>

      <div className="sales-content">
        {error && <div className="error-message">{error}</div>}

        <div className="sales-summary">
          <div className="summary-card">
            <h2>Total Revenue</h2>
            <p className="revenue-amount">{totalRevenue} BTC</p>
          </div>
          <div className="summary-card">
            <h2>Total Sales</h2>
            <p className="sales-count">{pagination.totalItems}</p>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select 
              id="status-filter" 
              value={statusFilter} 
              onChange={handleStatusFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="start-date">From:</label>
            <input 
              type="date" 
              id="start-date" 
              name="start" 
              value={dateRange.start} 
              onChange={handleDateChange} 
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date">To:</label>
            <input 
              type="date" 
              id="end-date" 
              name="end" 
              value={dateRange.end} 
              onChange={handleDateChange} 
            />
          </div>

          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="no-sales">
            <p>No sales found matching your criteria.</p>
          </div>
        ) : (
          <>
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Card Type</th>
                  <th>Last Four</th>
                  <th>Buyer</th>
                  <th>Amount (BTC)</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className={sale.status}>
                    <td>{sale.cardId.cardDetails.type}</td>
                    <td>****{sale.cardId.cardDetails.lastFour}</td>
                    <td>{sale.buyerId.username}</td>
                    <td>{sale.btcAmount}</td>
                    <td>
                      <span className={`status-badge ${sale.status}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/vendor/sales/${sale.id}`} className="view-btn">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button 
                onClick={() => handlePageChange(page - 1)} 
                disabled={page === 1}
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={i + 1 === page ? 'active' : ''}
                >
                  {i + 1}
                </button>
              ))}
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