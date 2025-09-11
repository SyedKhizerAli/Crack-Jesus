import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminPages.css';
import './AdminSales.css';

interface Sale {
  id: string;
  card: {
    id: string;
    type: string;
    price: number;
  };
  buyer: {
    username: string;
    email: string;
  };
  vendor: {
    id: string;
    username: string;
    email: string;
  };
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  commissionSplit?: {
    applied: boolean;
    adminAmount: number;
    vendorAmount: number;
    percentage: number;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function AdminSales() {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Summary statistics
  const [summary, setSummary] = useState({
    totalSales: 0,
    completedSales: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    averageSaleValue: 0
  });

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
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await axios.get('http://localhost:3000/api/admin/sales', { 
        headers,
        params
      });
      
      setSales(response.data.data.sales);
      setPagination(response.data.data.pagination);
      setTotalRevenue(response.data.data.totalRevenue || 0);
      
      // Calculate summary statistics
      const allSales = response.data.data.sales;
      const completed = allSales.filter((sale: Sale) => sale.status === 'completed');
      const totalRevenue = completed.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
      const totalCommissions = completed.reduce((sum: number, sale: Sale) => {
        return sum + (sale.commissionSplit?.adminAmount || 0);
      }, 0);
      
      setSummary({
        totalSales: allSales.length,
        completedSales: completed.length,
        totalRevenue,
        totalCommissions,
        averageSaleValue: completed.length ? totalRevenue / completed.length : 0
      });
      
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
    setPage(1); // Reset to first page when date changes
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchSales();
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    setPage(1);
  };

  // Format BTC amount to 8 decimal places
  const formatBTC = (amount: number) => {
    return amount.toFixed(8);
  };

  if (isLoading && sales.length === 0) {
    return <div className="loading">Loading sales history...</div>;
  }

  return (
    <div className="admin-sales-container">
      <header className="page-header">
        <h1>Sales Management</h1>
        <Link to="/admin/dashboard" className="back-link">Back to Dashboard</Link>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <div className="summary-stats">
          <div className="stat-card">
            <h3>Total Sales</h3>
            <p className="stat-value">{pagination.totalItems}</p>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p className="stat-value">{totalRevenue} BTC</p>
          </div>
        </div>

        <div className="filters-bar">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by vendor or buyer"
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
                  <th>Vendor</th>
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
                    <td>{sale.card.type}</td>
                    <td>
                      <Link to={`/admin/vendors/${sale.vendor.id}`}>
                        {sale.vendor.username}
                      </Link>
                    </td>
                    <td>{sale.buyer.username}</td>
                    <td>{formatBTC(sale.amount)}</td>
                    <td>
                      <span className={`status-badge ${sale.status}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/admin/sales/${sale.id}`} className="view-btn">
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