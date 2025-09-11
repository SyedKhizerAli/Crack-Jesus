import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './UserPages.css';
import './UserWallet.css';

interface WalletInfo {
  balance: number;
  transactions: any[];
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function UserWallet() {
  const { user } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState('');

  useEffect(() => {
    fetchWalletInfo();
  }, [page, transactionType]);

  const fetchWalletInfo = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params: any = { page, limit: 10 };
      if (transactionType) {
        params.type = transactionType;
      }
      
      // Get wallet balance
      const balanceResponse = await axios.get('http://localhost:3000/api/wallet/balance', { 
        headers
      });
      
      // Get transactions
      const transactionsResponse = await axios.get('http://localhost:3000/api/wallet/transactions', { 
        headers,
        params
      });
      
      setWalletInfo({
        balance: balanceResponse.data.data.balance,
        transactions: transactionsResponse.data.data.transactions
      });
      
      setPagination(transactionsResponse.data.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: transactionsResponse.data.data.transactions.length
      });
    } catch (err: any) {
      console.error('Error fetching wallet info:', err);
      setError('Failed to load wallet information');
      
      // Fallback to mock data if API fails
      setWalletInfo({
        balance: 1250.75,
        transactions: [
          { 
            id: '1', 
            type: 'deposit', 
            amount: 500, 
            date: new Date().toISOString(),
            description: 'Bitcoin deposit',
            status: 'completed'
          },
          { 
            id: '2', 
            type: 'withdrawal', 
            amount: -150, 
            date: new Date(Date.now() - 86400000).toISOString(),
            description: 'Withdrawal to Bitcoin wallet',
            status: 'completed'
          },
          { 
            id: '3', 
            type: 'purchase', 
            amount: -99.99, 
            date: new Date(Date.now() - 172800000).toISOString(),
            description: 'Card purchase - Visa',
            status: 'completed'
          }
        ]
      });
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 3
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTransactionType(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  if (isLoading && !walletInfo) {
    return <div className="loading">Loading wallet information...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>My Wallet</h1>
        <Link to="/user/dashboard" className="back-link">Back to Dashboard</Link>
      </header>

      <div className="wallet-content">
        {error && <div className="error-message">{error}</div>}

        <div className="wallet-balance-card">
          <h2>Current Balance</h2>
          <div className="balance-amount">
            <span className="currency">$</span>
            <span className="amount">{walletInfo?.balance.toFixed(2) || '0.00'}</span>
          </div>
          <div className="balance-actions">
            <button className="btn btn-primary">Add Funds</button>
            <button className="btn">Withdraw</button>
          </div>
        </div>

        <div className="transactions-section">
          <div className="section-header">
            <h2>Transaction History</h2>
            <div className="filter-group">
              <label htmlFor="transaction-type">Filter by:</label>
              <select 
                id="transaction-type" 
                value={transactionType} 
                onChange={handleTypeFilterChange}
              >
                <option value="">All Transactions</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="purchase">Purchases</option>
                <option value="refund">Refunds</option>
              </select>
            </div>
          </div>

          {walletInfo?.transactions && walletInfo.transactions.length > 0 ? (
            <div className="transactions-table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {walletInfo.transactions.map((transaction, index) => (
                    <tr key={index}>
                      <td>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>{transaction.description}</td>
                      <td>
                        <span className={`transaction-type ${transaction.type}`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className={`transaction-amount ${transaction.amount < 0 ? 'negative' : 'positive'}`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`status-badge status-${transaction.status}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>No Transactions Found</h3>
              <p className="empty-state-message">You don't have any transactions yet.</p>
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
    </div>
  );
} 