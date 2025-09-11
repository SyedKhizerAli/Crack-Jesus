import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './VendorDashboard.css';

interface SalesInfo {
  totalSales: number;
  recentSales: any[];
}

interface CardStats {
  total: number;
  available: number;
  sold: number;
  pending: number;
}

export function VendorDashboard() {
  const { user } = useAuth();
  const [salesInfo, setSalesInfo] = useState<SalesInfo | null>(null);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch sales info
        const salesResponse = await axios.get('http://localhost:3000/api/vendors/sales/summary', { headers });
        
        // Fetch card stats
        const cardsResponse = await axios.get('http://localhost:3000/api/vendors/cards/stats', { headers });
        
        setSalesInfo({
          totalSales: salesResponse.data.data.totalSales,
          recentSales: salesResponse.data.data.recentSales || []
        });
        
        setCardStats({
          total: cardsResponse.data.data.total,
          available: cardsResponse.data.data.available,
          sold: cardsResponse.data.data.sold,
          pending: cardsResponse.data.data.pending
        });
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome, {user?.username}!</h1>
        <p className="dashboard-subtitle">Your vendor dashboard</p>
      </header>

      <div className="dashboard-grid">
        {/* Sales Summary Card */}
        <div className="dashboard-card sales-summary">
          <div className="card-header">
            <h2>Sales Summary</h2>
            <Link to="/vendor/sales" className="view-all">View All Sales</Link>
          </div>
          <div className="sales-total">
            <span className="currency">$</span>
            <span className="amount">{salesInfo?.totalSales.toFixed(2) || '0.00'}</span>
          </div>
          <p className="summary-label">Total Sales</p>
          <div className="card-actions">
            <Link to="/vendor/sales" className="btn">View Sales History</Link>
          </div>
        </div>

        {/* Card Stats Card */}
        <div className="dashboard-card card-stats">
          <div className="card-header">
            <h2>Card Statistics</h2>
            <Link to="/vendor/cards" className="view-all">Manage Cards</Link>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{cardStats?.total || 0}</div>
              <div className="stat-label">Total Cards</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{cardStats?.available || 0}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{cardStats?.sold || 0}</div>
              <div className="stat-label">Sold</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{cardStats?.pending || 0}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="card-actions">
            <Link to="/vendor/cards/add" className="btn btn-primary">Add New Card</Link>
            <Link to="/vendor/cards" className="btn">Manage Inventory</Link>
          </div>
        </div>

        {/* Recent Sales Card */}
        <div className="dashboard-card recent-sales">
          <div className="card-header">
            <h2>Recent Sales</h2>
            <Link to="/vendor/sales" className="view-all">View All</Link>
          </div>
          {salesInfo?.recentSales && salesInfo.recentSales.length > 0 ? (
            <ul className="sales-list">
              {salesInfo.recentSales.map((sale, index) => (
                <li key={index} className="sale-item">
                  <div className="sale-info">
                    <span className="sale-card">{sale.cardType}</span>
                    <span className="sale-date">{new Date(sale.date).toLocaleDateString()}</span>
                  </div>
                  <span className="sale-amount">${sale.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No recent sales</p>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="actions-grid">
            <Link to="/vendor/cards/add" className="action-item">
              <div className="action-icon">➕</div>
              <div className="action-label">Add Card</div>
            </Link>
            <Link to="/vendor/btcpay-setup" className="action-item">
              <div className="action-icon">💰</div>
              <div className="action-label">BTCPay Setup</div>
            </Link>
            <Link to="/vendor/tickets/create" className="action-item">
              <div className="action-icon">🎫</div>
              <div className="action-label">Create Ticket</div>
            </Link>
            <Link to="/vendor/profile" className="action-item">
              <div className="action-icon">👤</div>
              <div className="action-label">Edit Profile</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 