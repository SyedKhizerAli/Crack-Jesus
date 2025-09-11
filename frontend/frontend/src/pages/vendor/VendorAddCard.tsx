import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './VendorPages.css';
import './VendorAddCard.css';

export function VendorAddCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: '',
    price: '',
    description: '',
    stock: '1',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!formData.type || !formData.price || !formData.description || !formData.stock) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        type: formData.type,
        price: parseFloat(formData.price),
        description: formData.description,
        stock: parseInt(formData.stock),
        cardDetails: {
          cardNumber: formData.cardNumber,
          expiryDate: formData.expiryDate,
          cvv: formData.cvv
        }
      };
      
      await axios.post('http://localhost:3000/api/vendors/cards', payload, { headers });
      
      navigate('/vendor/cards');
    } catch (err: any) {
      console.error('Error adding card:', err);
      setError(err.response?.data?.message || 'Failed to add card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Add New Card</h1>
        <Link to="/vendor/cards" className="back-link">Back to Cards</Link>
      </header>

      <div className="vendor-content">
        {error && <div className="error-message">{error}</div>}

        <div className="card-form-container">
          <form onSubmit={handleSubmit} className="card-form">
            <div className="form-section">
              <h2>Card Information</h2>
              
              <div className="form-group">
                <label htmlFor="type">Card Type *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Card Type</option>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="American Express">American Express</option>
                  <option value="Discover">Discover</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="price">Price ($) *</label>
                <input
                  id="price"
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Enter price"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="stock">Stock *</label>
                <input
                  id="stock"
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="Enter stock quantity"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Enter card description"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="form-section">
              <h2>Card Details</h2>
              <p className="section-note">This information will be securely stored and only revealed to customers after purchase.</p>
              
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number *</label>
                <input
                  id="cardNumber"
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter card number"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiryDate">Expiry Date *</label>
                  <input
                    id="expiryDate"
                    type="text"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    required
                    placeholder="MM/YY"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="cvv">CVV *</label>
                  <input
                    id="cvv"
                    type="text"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleChange}
                    required
                    placeholder="CVV"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => navigate('/vendor/cards')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding Card...' : 'Add Card'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 