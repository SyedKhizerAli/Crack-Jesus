import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CardDetailTable } from '../../components/CardDetailTable';
import axios from 'axios';
import './AdminCards.css';

interface Card {
  id: string;
  type: string;
  cardType: string;
  bin: string;
  holderName: string;
  expiryMonth: number;
  expiryYear: number;
  address: {
    country: string;
    state: string;
    city: string;
    zip: string;
  };
  bank: string;
  base: string;
  additionalInfo: string;
  note: string;
  price: number;
  status: string;
  createdAt: string;
  vendor: {
    id?: string;
    username: string;
    verified?: boolean;
  };
  description?: string;
}

export function AdminCardDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchCardDetails();
  }, [id]);

  const fetchCardDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`http://localhost:3000/api/admin/cards/${id}`, { headers });
      
      if (response.data && response.data.data && response.data.data.card) {
        setCard(response.data.data.card);
      } else {
        setError('Invalid card data received');
      }
    } catch (err: any) {
      console.error('Error fetching card details:', err);
      setError('Failed to load card details: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!card) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`http://localhost:3000/api/admin/cards/${card.id}/approve`, {}, { headers });
      
      // Refresh card details
      await fetchCardDetails();
    } catch (err: any) {
      console.error('Error approving card:', err);
      setError(err.response?.data?.message || 'Failed to approve card');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!card) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`http://localhost:3000/api/admin/cards/${card.id}/reject`, {}, { headers });
      
      // Refresh card details
      await fetchCardDetails();
    } catch (err: any) {
      console.error('Error rejecting card:', err);
      setError(err.response?.data?.message || 'Failed to reject card');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHide = async () => {
    if (!card) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`http://localhost:3000/api/admin/cards/${card.id}/hide`, {}, { headers });
      
      // Refresh card details
      await fetchCardDetails();
    } catch (err: any) {
      console.error('Error hiding card:', err);
      setError(err.response?.data?.message || 'Failed to hide card');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnhide = async () => {
    if (!card) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`http://localhost:3000/api/admin/cards/${card.id}/unhide`, {}, { headers });
      
      // Refresh card details
      await fetchCardDetails();
    } catch (err: any) {
      console.error('Error unhiding card:', err);
      setError(err.response?.data?.message || 'Failed to unhide card');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading card details...</div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <Link to="/admin/cards" className="back-link">Back to Cards</Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="page-container">
        <div className="error-message">Card not found</div>
        <Link to="/admin/cards" className="back-link">Back to Cards</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Card Details</h1>
        <div className="header-actions">
          <Link to="/admin/cards" className="btn btn-outline">Back to Cards</Link>
          <Link to={`/admin/cards/${card.id}/edit`} className="btn btn-primary">Edit Card</Link>
        </div>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <CardDetailTable 
          card={card}
          userType="admin"
          onApprove={handleApprove}
          onReject={handleReject}
          onHide={handleHide}
          onUnhide={handleUnhide}
        />

        <div className="card-actions-section">
          <h3>Admin Actions</h3>
          <div className="action-buttons">
            {card.status === 'pending' && (
              <>
                <button 
                  className="btn btn-success" 
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Approve Card'}
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Reject Card'}
                </button>
              </>
            )}
            
            {card.status === 'available' && (
              <button 
                className="btn btn-warning" 
                onClick={handleHide}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Hide Card'}
              </button>
            )}
            
            {card.status === 'hidden' && (
              <button 
                className="btn btn-success" 
                onClick={handleUnhide}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Unhide Card'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 