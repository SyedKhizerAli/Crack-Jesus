import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminDashboard.css';

interface SystemStats {
  totalUsers: number;
  totalVendors: number;
  totalCards: number;
  totalSales: number;
}

interface RecentActivity {
  activities: any[];
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch system stats
        const statsResponse = await axios.get('http://localhost:3000/api/admin/stats', { headers });
        
        // Fetch recent activity
        const activityResponse = await axios.get('http://localhost:3000/api/admin/activity', { headers });
        
        // Fetch pending tickets
        const ticketsResponse = await axios.get('http://localhost:3000/api/admin/tickets/pending', { headers });
        
        setSystemStats({
          totalUsers: statsResponse.data.data.totalUsers,
          totalVendors: statsResponse.data.data.totalVendors,
          totalCards: statsResponse.data.data.totalCards,
          totalSales: statsResponse.data.data.totalSales
        });
        
        setRecentActivity({
          activities: activityResponse.data.data.activities || []
        });
        
        setPendingTickets(ticketsResponse.data.data.count);
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
        <h1>Admin Dashboard</h1>
        <p className="dashboard-subtitle">System overview and management</p>
      </header>

      <div className="dashboard-grid">
        {/* System Stats Card */}
        <div className="dashboard-card system-stats">
          <div className="card-header">
            <h2>System Statistics</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{systemStats?.totalUsers || 0}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{systemStats?.totalVendors || 0}</div>
              <div className="stat-label">Total Vendors</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{systemStats?.totalCards || 0}</div>
              <div className="stat-label">Total Cards</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">${systemStats?.totalSales.toFixed(2) || '0.00'}</div>
              <div className="stat-label">Total Sales</div>
            </div>
          </div>
        </div>

        {/* Pending Tickets Card */}
        <div className="dashboard-card pending-tickets">
          <div className="card-header">
            <h2>Support Tickets</h2>
            <Link to="/admin/tickets" className="view-all">View All</Link>
          </div>
          <div className="ticket-summary">
            <div className="ticket-count">{pendingTickets}</div>
            <div className="ticket-label">Pending Tickets</div>
          </div>
          <div className="card-actions">
            <Link to="/admin/tickets" className="btn btn-primary">Manage Tickets</Link>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="dashboard-card recent-activity">
          <div className="card-header">
            <h2>Recent Activity</h2>
          </div>
          {recentActivity?.activities && recentActivity.activities.length > 0 ? (
            <ul className="activity-list">
              {recentActivity.activities.map((activity, index) => (
                <li key={index} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-details">
                    <div className="activity-message">{activity.message}</div>
                    <div className="activity-meta">
                      <span className="activity-user">{activity.user}</span>
                      <span className="activity-time">{formatActivityTime(activity.timestamp)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No recent activity</p>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="actions-grid">
            <Link to="/admin/users/add" className="action-item">
              <div className="action-icon">👤</div>
              <div className="action-label">Add User</div>
            </Link>
            <Link to="/admin/vendors/add" className="action-item">
              <div className="action-icon">🏪</div>
              <div className="action-label">Add Vendor</div>
            </Link>
            <Link to="/admin/cards/verify" className="action-item">
              <div className="action-icon">✅</div>
              <div className="action-label">Verify Cards</div>
            </Link>
            <Link to="/admin/system/settings" className="action-item">
              <div className="action-icon">⚙️</div>
              <div className="action-label">System Settings</div>
            </Link>
            <Link to="/admin/reports" className="action-item">
              <div className="action-icon">📊</div>
              <div className="action-label">Reports</div>
            </Link>
            <Link to="/admin/logs" className="action-item">
              <div className="action-icon">📝</div>
              <div className="action-label">System Logs</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getActivityIcon(type: string): string {
  switch (type) {
    case 'user_created':
      return '👤';
    case 'vendor_created':
      return '🏪';
    case 'card_added':
      return '💳';
    case 'card_sold':
      return '💰';
    case 'ticket_created':
      return '🎫';
    case 'ticket_resolved':
      return '✅';
    default:
      return '📝';
  }
}

function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
} 