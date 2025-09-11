import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminPages.css';
import './AdminTickets.css';

interface User {
  id: string | null;
  username?: string;
  role?: string;
  email?: string;
}

interface Ticket {
  id: string;
  subject: string;
  message?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  user: User;
  responses?: {
    id: string;
    message: string;
    createdAt: string;
    isAdmin: boolean;
  }[];
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function AdminTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, roleFilter]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params: any = { page, limit: 10 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (roleFilter) {
        params.role = roleFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await axios.get('http://localhost:3000/api/admin/tickets', { 
        headers,
        params
      });
      
      console.log('Tickets response:', response.data);
      
      // Check if the response has the expected structure
      if (response.data && response.data.data) {
        // Handle both possible response structures
        if (Array.isArray(response.data.data)) {
          setTickets(response.data.data);
        } else if (response.data.data.tickets && Array.isArray(response.data.data.tickets)) {
          setTickets(response.data.data.tickets);
          
          if (response.data.data.pagination) {
            setPagination(response.data.data.pagination);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Support Tickets</h1>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <div className="filters-bar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by subject"
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
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            
            <label htmlFor="role-filter">User Type:</label>
            <select 
              id="role-filter" 
              value={roleFilter} 
              onChange={handleRoleFilterChange}
            >
              <option value="">All Users</option>
              <option value="user">Regular Users</option>
              <option value="vendor">Vendors</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="loading">Loading tickets...</div>
        ) : tickets.length > 0 ? (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <div className="ticket-title">
                    <h3>{ticket.subject}</h3>
                    <span className={`role-badge role-${ticket.user?.role || 'unknown'}`}>
                      {ticket.user?.role || 'Unknown'}
                    </span>
                  </div>
                  <span className={`status-badge status-${ticket.status.replace(' ', '_').toLowerCase()}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="ticket-body">
                  <div className="ticket-user">
                    <span className="user-label">From:</span>
                    <span className="user-name">{ticket.user?.username || 'Unknown User'}</span>
                  </div>
                  {ticket.message && <p className="ticket-message">{ticket.message}</p>}
                  <div className="ticket-meta">
                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.updatedAt && <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>}
                    <span>Responses: {ticket.responses?.length || 0}</span>
                  </div>
                </div>
                <div className="ticket-footer">
                  <Link to={`/admin/tickets/${ticket.id}`} className="btn">View Details</Link>
                  {ticket.status === 'open' && (
                    <button className="btn btn-outline">Mark In Progress</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🎫</div>
            <h3>No Tickets Found</h3>
            <p className="empty-state-message">No tickets match your search criteria.</p>
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