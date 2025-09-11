import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CardDetailTable } from '../../components/CardDetailTable';
import axios from 'axios';
import './VendorPages.css';

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
  stock: number;
  description?: string;
}

export function VendorCardDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCardDetails();
  }, [id]);

  const fetchCardDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`http://localhost:3000/api/vendors/cards/${id}`, { headers });
      
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

  if (isLoading) {
    return <div className="loading">Loading card details...</div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <Link to="/vendor/cards" className="back-link">Back to Cards</Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="page-container">
        <div className="error-message">Card not found</div>
        <Link to="/vendor/cards" className="back-link">Back to Cards</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Card Details</h1>
        <div className="header-actions">
          <Link to="/vendor/cards" className="btn btn-outline">Back to Cards</Link>
          <Link to={`/vendor/cards/${card.id}/edit`} className="btn btn-primary">Edit Card</Link>
        </div>
      </header>

      <div className="vendor-content">
        {error && <div className="error-message">{error}</div>}

        <CardDetailTable 
          card={card}
          userType="vendor"
        />

        <div className="card-stats-section">
          <h3>Card Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Status:</span>
              <span className={`stat-value status-${card.status}`}>
                {card.status}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Stock:</span>
              <span className="stat-value">{card.stock}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Price:</span>
              <span className="stat-value">${card.price.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Created:</span>
              <span className="stat-value">
                {new Date(card.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {card.description && (
          <div className="card-description-section">
            <h3>Description</h3>
            <p>{card.description}</p>
          </div>
        )}
      </div>
    </div>
  );
} 