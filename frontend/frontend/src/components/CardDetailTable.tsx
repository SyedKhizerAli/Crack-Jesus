import React from 'react';
import { Link } from 'react-router-dom';
import './CardDetailTable.css';

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
  stock?: number;
  description?: string;
}

interface CardDetailTableProps {
  card: Card;
  userType: 'user' | 'admin' | 'vendor';
  onPurchase?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onHide?: () => void;
  onUnhide?: () => void;
  isPurchasing?: boolean;
}

export function CardDetailTable({ 
  card, 
  userType, 
  onPurchase, 
  onEdit, 
  onApprove, 
  onReject, 
  onHide, 
  onUnhide,
  isPurchasing = false 
}: CardDetailTableProps) {
  
  const formatAddress = (address: Card['address']) => {
    const parts = [];
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    if (address.zip) parts.push(address.zip);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getActionButtons = () => {
    switch (userType) {
      case 'user':
        return (
          <>
            <button 
              className="btn btn-sm btn-primary" 
              onClick={onPurchase}
              disabled={isPurchasing || card.status !== 'available'}
            >
              {isPurchasing ? 'Processing...' : card.status === 'available' ? 'Buy' : 'Unavailable'}
            </button>
          </>
        );
      
      case 'admin':
        return (
          <>
            <Link to={`/admin/cards/${card.id}`} className="btn btn-sm">View</Link>
            {card.status === 'pending' && (
              <>
                <button className="btn btn-sm btn-success" onClick={onApprove}>Approve</button>
                <button className="btn btn-sm btn-danger" onClick={onReject}>Reject</button>
              </>
            )}
            {card.status === 'available' && (
              <button className="btn btn-sm btn-warning" onClick={onHide}>Hide</button>
            )}
            {card.status === 'hidden' && (
              <button className="btn btn-sm btn-success" onClick={onUnhide}>Unhide</button>
            )}
          </>
        );
      
      case 'vendor':
        return (
          <>
            <Link to={`/vendor/cards/${card.id}`} className="btn btn-sm">View</Link>
            <Link to={`/vendor/cards/${card.id}/edit`} className="btn btn-sm btn-outline">Edit</Link>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="card-detail-table-container">
      <div className="card-detail-header">
        <h2>Card Details</h2>
        <div className="card-status">
          <span className={`status-badge status-${card.status.toLowerCase()}`}>
            {card.status}
          </span>
        </div>
      </div>

      <div className="card-detail-table-wrapper">
        <table className="card-detail-table">
          <thead>
            <tr>
              <th>BIN</th>
              <th>Type</th>
              <th>Exp</th>
              <th>Holder</th>
              <th>Address</th>
              <th>Additional Info</th>
              <th>Note</th>
              <th>Base</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{card.bin || 'N/A'}</td>
              <td>
                <div className="card-type-info">
                  <span className="card-brand">{card.type}</span>
                  <span className="card-category">({card.cardType || 'credit'})</span>
                </div>
              </td>
              <td>
                {card.expiryMonth && card.expiryYear 
                  ? `${card.expiryMonth.toString().padStart(2, '0')}/${card.expiryYear}`
                  : 'N/A'
                }
              </td>
              <td>{card.holderName || 'N/A'}</td>
              <td>{formatAddress(card.address)}</td>
              <td>{card.additionalInfo || 'N/A'}</td>
              <td>{card.note || 'N/A'}</td>
              <td>{card.base || 'Standard'}</td>
              <td>
                <div className="seller-info">
                  <span className="seller-name">{card.vendor.username}</span>
                  {card.vendor.verified && (
                    <span className="verified-badge" title="Verified Vendor">✓</span>
                  )}
                </div>
              </td>
              <td>
                <span className="price">${card.price.toFixed(2)}</span>
                {card.stock !== undefined && (
                  <div className="stock-info">
                    <span className="stock-label">Stock:</span>
                    <span className="stock-value">{card.stock}</span>
                  </div>
                )}
              </td>
              <td>
                <div className="action-buttons">
                  {getActionButtons()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {card.description && (
        <div className="card-description-section">
          <h3>Description</h3>
          <p>{card.description}</p>
        </div>
      )}

      <div className="card-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Created:</span>
          <span className="metadata-value">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        </div>
        {card.bank && card.bank !== 'Unknown' && (
          <div className="metadata-item">
            <span className="metadata-label">Bank:</span>
            <span className="metadata-value">{card.bank}</span>
          </div>
        )}
      </div>
    </div>
  );
} 