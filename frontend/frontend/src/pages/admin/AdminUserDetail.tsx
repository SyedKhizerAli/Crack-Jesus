import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminPages.css';

interface UserDetail {
  id: string;
  username: string;
  email: string;
  role: string;
  wallet: {
    btcBalance: number;
    status: 'active' | 'suspended' | 'locked';
    transactions: Transaction[];
  };
  createdAt: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'payment' | 'refund' | 'withdrawal';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

interface Purchase {
  id: string;
  cardId: {
    id: string;
    cardDetails: {
      type: string;
    };
    price: number;
  };
  status: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'locked' | ''>('');

  useEffect(() => {
    if (id) {
      fetchUserDetails();
    } else {
      setError('User ID is missing');
      setIsLoading(false);
    }
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Fetching user details for ID:', id);
      const response = await axios.get(`http://localhost:3000/api/admin/users/${id}`, { headers });
      
      setUserDetail(response.data.data.user);
      setPurchases(response.data.data.purchases || []);
      setTickets(response.data.data.tickets || []);
      
      // Set initial value for status dropdown
      if (response.data.data.user?.wallet?.status) {
        setNewStatus(response.data.data.user.wallet.status);
      }
    } catch (err: any) {
      console.error('Error fetching user details:', err);
      setError(err.response?.data?.message || 'Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !userDetail) return;
    if (!id) {
      setError('User ID is missing');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Updating status for user ID:', id);
      console.log('New status:', newStatus);
      
      await axios.patch(`http://localhost:3000/api/admin/users/${id}/status`, {
        status: newStatus
      }, { headers });
      
      // Refresh user details
      fetchUserDetails();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  if (isLoading) {
    return <div className="loading">Loading user details...</div>;
  }

  if (!userDetail) {
    return (
      <div className="page-container">
        <div className="error-message">{error || 'User not found'}</div>
        <Link to="/admin/users" className="btn btn-primary">Back to Users</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>User Details</h1>
        <nav className="breadcrumb">
          <Link to="/admin/dashboard">Dashboard</Link> / 
          <Link to="/admin/users">Users</Link> / {userDetail.username}
        </nav>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <div className="user-detail-container">
          <div className="user-detail-header">
            <div className="user-info">
              <h2>{userDetail.username}</h2>
              <span className={`status-badge ${userDetail.wallet.status}`}>
                {userDetail.wallet.status}
              </span>
            </div>
            
            <div className="user-actions">
              <div className="status-change">
                <select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="locked">Locked</option>
                </select>
                <button 
                  onClick={handleStatusChange}
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>

          <div className="user-detail-body">
            <div className="detail-section">
              <h3>Profile Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{userDetail.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">{userDetail.role}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{new Date(userDetail.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">BTC Balance:</span>
                  <span className="detail-value">{userDetail.wallet.btcBalance}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Recent Transactions</h3>
              {userDetail.wallet.transactions.length === 0 ? (
                <p>No transactions found.</p>
              ) : (
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetail.wallet.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.type}</td>
                        <td>{transaction.amount}</td>
                        <td>{transaction.status}</td>
                        <td>{transaction.description}</td>
                        <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="detail-section">
              <h3>Recent Purchases</h3>
              {purchases.length === 0 ? (
                <p>No purchases found.</p>
              ) : (
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Card Type</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td>{purchase.id}</td>
                        <td>{purchase.cardId.cardDetails.type}</td>
                        <td>{purchase.cardId.price}</td>
                        <td>{purchase.status}</td>
                        <td>{new Date(purchase.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="detail-section">
              <h3>Support Tickets</h3>
              {tickets.length === 0 ? (
                <p>No tickets found.</p>
              ) : (
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>{ticket.subject}</td>
                        <td>{ticket.status}</td>
                        <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td>{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 