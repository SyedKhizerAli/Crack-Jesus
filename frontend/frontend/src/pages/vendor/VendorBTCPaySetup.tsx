import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface BTCPayStatus {
  verified: boolean;
  storeId: string;
  createdAt: string;
}

export function VendorBTCPaySetup() {
  const { user } = useAuth();
  const [btcPayStatus, setBtcPayStatus] = useState<BTCPayStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    fetchBTCPayStatus();
  }, []);

  const fetchBTCPayStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('http://localhost:3000/api/btcpay/store/status', { headers });
      
      setBtcPayStatus(response.data.data);
      
      // If not verified, get the authorization URL
      if (!response.data.data.verified) {
        const authResponse = await axios.get('http://localhost:3000/api/btcpay/auth-url', { headers });
        setAuthUrl(authResponse.data.data.url);
      }
    } catch (err: any) {
      console.error('Error fetching BTCPay status:', err);
      setError('Failed to load BTCPay status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const storeId = formData.get('storeId') as string;
    const apiKey = formData.get('apiKey') as string;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('http://localhost:3000/api/btcpay/store/setup', {
        storeId,
        apiKey
      }, { headers });
      
      // Refresh status
      fetchBTCPayStatus();
    } catch (err: any) {
      console.error('Error setting up BTCPay store:', err);
      setError(err.response?.data?.message || 'Failed to set up BTCPay store');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !btcPayStatus) {
    return <div className="loading">Loading BTCPay status...</div>;
  }

  return (
    <div className="btcpay-setup-container">
      <header className="page-header">
        <h1>BTCPay Store Setup</h1>
        <nav className="breadcrumb">
          <Link to="/vendor/dashboard">Dashboard</Link> / BTCPay Setup
        </nav>
      </header>

      <div className="btcpay-content">
        {error && <div className="error-message">{error}</div>}

        <div className="status-card">
          <h2>BTCPay Integration Status</h2>
          <div className="status-info">
            <p className="status">
              Status: 
              <span className={btcPayStatus?.verified ? 'verified' : 'not-verified'}>
                {btcPayStatus?.verified ? 'Verified' : 'Not Verified'}
              </span>
            </p>
            {btcPayStatus?.storeId && (
              <p className="store-id">Store ID: {btcPayStatus.storeId}</p>
            )}
            {btcPayStatus?.createdAt && (
              <p className="created-at">
                Connected on: {new Date(btcPayStatus.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {!btcPayStatus?.verified ? (
          <div className="setup-options">
            <div className="setup-card">
              <h3>Option 1: Automatic Setup (Recommended)</h3>
              <p>
                Connect your BTCPay store with a single click. You'll be redirected to BTCPay Server
                to authorize access.
              </p>
              {authUrl && (
                <a href={authUrl} className="auth-button" target="_blank" rel="noopener noreferrer">
                  Connect to BTCPay Server
                </a>
              )}
            </div>

            <div className="setup-card">
              <h3>Option 2: Manual Setup</h3>
              <p>
                If you prefer, you can manually enter your BTCPay store details.
              </p>
              <form onSubmit={handleManualSetup} className="manual-setup-form">
                <div className="form-group">
                  <label htmlFor="storeId">Store ID</label>
                  <input 
                    type="text" 
                    id="storeId" 
                    name="storeId" 
                    placeholder="Your BTCPay Store ID"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="apiKey">API Key</label>
                  <input 
                    type="text" 
                    id="apiKey" 
                    name="apiKey" 
                    placeholder="Your BTCPay API Key"
                    required 
                  />
                </div>
                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Setting up...' : 'Set Up Store'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="setup-success">
            <div className="success-message">
              <h3>Your BTCPay store is successfully connected!</h3>
              <p>You can now start selling cards and receive payments directly to your BTCPay store.</p>
            </div>
            <div className="next-steps">
              <h3>Next Steps</h3>
              <ul>
                <li>
                  <Link to="/vendor/cards/add">Add cards to your inventory</Link>
                </li>
                <li>
                  <Link to="/vendor/dashboard">View your dashboard</Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="help-section">
          <h3>Need Help?</h3>
          <p>
            If you're having trouble setting up your BTCPay store, check out our 
            <a href="#" target="_blank" rel="noopener noreferrer"> setup guide</a> or 
            <Link to="/vendor/tickets/create"> contact support</Link>.
          </p>
        </div>
      </div>
    </div>
  );
} 