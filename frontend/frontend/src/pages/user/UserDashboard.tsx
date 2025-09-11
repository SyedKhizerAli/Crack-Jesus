import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './UserDashboard.css';

interface WalletInfo {
  balance: number;
  recentTransactions: any[];
}

interface AvailableCards {
  total: number;
  cards: any[];
}

export function UserDashboard() {
  const { user } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({ balance: 0, recentTransactions: [] });
  const [availableCards, setAvailableCards] = useState<AvailableCards>({ total: 0, cards: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Use mock data for wallet since the endpoint doesn't exist yet
        // In a real app, you would uncomment this when the endpoint is ready
        /*
        // Fetch wallet info
        const walletResponse = await axios.get('http://localhost:3000/api/users/wallet', { headers });
        setWalletInfo({
          balance: walletResponse.data.data.balance,
          recentTransactions: walletResponse.data.data.recentTransactions || []
        });
        */
        
        // Mock wallet data
        setWalletInfo({
          balance: 1250.75,
          recentTransactions: [
            { type: 'deposit', amount: 500, date: new Date().toISOString() },
            { type: 'withdrawal', amount: 150, date: new Date(Date.now() - 86400000).toISOString() }
          ]
        });
        
        try {
          // Try to fetch available cards
          const cardsResponse = await axios.get('http://localhost:3000/api/cards?limit=5', { headers });
          setAvailableCards({
            total: cardsResponse.data.data.pagination.totalItems,
            cards: cardsResponse.data.data.cards
          });
        } catch (cardErr) {
          console.log('Cards API not available yet, using mock data');
          // Mock card data
          setAvailableCards({
            total: 25,
            cards: [
              { id: 1, type: 'Visa', price: 99.99 },
              { id: 2, type: 'Mastercard', price: 89.99 },
              { id: 3, type: 'American Express', price: 129.99 }
            ]
          });
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        // Don't show error to user, just use mock data
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
        <h1>Welcome, {user?.username || 'User'}!</h1>
        <p className="dashboard-subtitle">Your card management dashboard</p>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-grid">
        {/* Wallet Summary Card */}
        <div className="dashboard-card wallet-summary">
          <div className="card-header">
            <h2>Wallet Balance</h2>
            <Link to="/user/wallet" className="view-all">View Details</Link>
          </div>
          <div className="wallet-balance">
            <span className="currency">$</span>
            <span className="amount">{walletInfo?.balance.toFixed(2) || '0.00'}</span>
          </div>
          <div className="card-actions">
            <Link to="/user/wallet/deposit" className="btn">Deposit</Link>
            <Link to="/user/wallet/withdraw" className="btn btn-outline">Withdraw</Link>
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="dashboard-card recent-transactions">
          <div className="card-header">
            <h2>Recent Transactions</h2>
            <Link to="/user/wallet" className="view-all">View All</Link>
          </div>
          {walletInfo?.recentTransactions && walletInfo.recentTransactions.length > 0 ? (
            <ul className="transaction-list">
              {walletInfo.recentTransactions.map((transaction, index) => (
                <li key={index} className="transaction-item">
                  <div className="transaction-info">
                    <span className="transaction-type">{transaction.type}</span>
                    <span className="transaction-date">{new Date(transaction.date).toLocaleDateString()}</span>
                  </div>
                  <span className={`transaction-amount ${transaction.type === 'deposit' ? 'positive' : 'negative'}`}>
                    {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No recent transactions</p>
          )}
        </div>

        {/* Available Cards Card */}
        <div className="dashboard-card available-cards">
          <div className="card-header">
            <h2>Available Cards</h2>
            <Link to="/user/cards" className="view-all">View All</Link>
          </div>
          {availableCards?.cards && availableCards.cards.length > 0 ? (
            <div className="cards-grid">
              {availableCards.cards.map((card, index) => (
                <div key={index} className="card-item">
                  <div className="card-type">{card.type}</div>
                  <div className="card-price">${card.price.toFixed(2)}</div>
                  <Link to={`/user/cards/${card.id}`} className="btn btn-sm">View Details</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No cards available</p>
          )}
          <div className="card-footer">
            <p>Total available cards: <strong>{availableCards?.total || 0}</strong></p>
          </div>
        </div>

        {/* Recent Purchases Card */}
        <div className="dashboard-card recent-purchases">
          <div className="card-header">
            <h2>Recent Purchases</h2>
            <Link to="/user/purchases" className="view-all">View All</Link>
          </div>
          <p className="no-data">No recent purchases</p>
          <div className="card-actions">
            <Link to="/user/cards" className="btn">Browse Cards</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 