import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './VendorPages.css';
import './VendorTickets.css';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  responses: {
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

export function VendorTickets() {
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
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

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
      
      const response = await axios.get('http://localhost:3000/api/vendors/tickets', { 
        headers,
        params
      });
      
      setTickets(response.data.data.tickets);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets');
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

  const handleNewTicketChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTicket(prev => ({ ...prev, [name]: value }));
  };

  const handleNewTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTicket.subject || !newTicket.message) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('http://localhost:3000/api/vendors/tickets', newTicket, { headers });
      
      // Reset form and refresh tickets
      setNewTicket({ subject: '', message: '' });
      setShowNewTicketForm(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  if (isLoading && tickets.length === 0) {
    return <div className="loading">Loading tickets...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Support Tickets</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewTicketForm(!showNewTicketForm)}
          >
            {showNewTicketForm ? 'Cancel' : 'New Ticket'}
          </button>
        </div>
      </header>

      <div className="vendor-content">
        {error && <div className="error-message">{error}</div>}

        {showNewTicketForm && (
          <div className="new-ticket-form-container">
            <h2>Create New Support Ticket</h2>
            <form onSubmit={handleNewTicketSubmit} className="new-ticket-form">
              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  id="subject"
                  type="text"
                  name="subject"
                  value={newTicket.subject}
                  onChange={handleNewTicketChange}
                  required
                  placeholder="Enter ticket subject"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <div className="textarea-container">
                  <textarea
                    id="message"
                    name="message"
                    value={newTicket.message}
                    onChange={handleNewTicketChange}
                    required
                    placeholder="Describe your issue in detail"
                    rows={6}
                    maxLength={1000}
                  />
                  <div className="char-count">
                    {newTicket.message.length}/1000
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => {
                    setShowNewTicketForm(false);
                    setNewTicket({ subject: '', message: '' });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="filters-bar">
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
          </div>
        </div>

        {tickets.length > 0 ? (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <h3>{ticket.subject}</h3>
                  <span className={`status-badge status-${ticket.status}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="ticket-body">
                  <p className="ticket-message">{ticket.message}</p>
                  <div className="ticket-meta">
                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ticket-footer">
                  <Link to={`/vendor/tickets/${ticket.id}`} className="btn">View Details</Link>
                  {ticket.status !== 'closed' && (
                    <button className="btn btn-outline">Close Ticket</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🎫</div>
            <h3>No Tickets Found</h3>
            <p className="empty-state-message">You haven't created any support tickets yet.</p>
            <button 
              className="btn"
              onClick={() => setShowNewTicketForm(true)}
            >
              Create Your First Ticket
            </button>
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