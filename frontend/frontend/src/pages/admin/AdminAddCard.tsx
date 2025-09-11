import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CardForm } from '../../components/CardForm';
import axios from 'axios';
import './AdminPages.css';

export function AdminAddCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (formData: any) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      
      // Prepare the data for API request
      const cardData = {
        cardDetails: formData.cardDetails,
        price: formData.price
      };
      
      console.log('Submitting card data:', cardData);
      
      // Make the API request to add card
      const response = await axios.post(
        'http://localhost:3000/api/admin/cards', 
        cardData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Card added successfully:', response.data);
      
      setSuccess('Card added successfully!');
      
      // Redirect to cards list after a short delay
      setTimeout(() => {
        navigate('/admin/cards');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error adding card:', err);
      setError(err.response?.data?.message || 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Add New Card</h1>
        <Link to="/admin/cards" className="back-link">Back to Cards</Link>
      </header>
      
      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <CardForm 
          onSubmit={handleSubmit} 
          isLoading={isLoading}
          submitButtonText="Add Card"
        />
      </div>
    </div>
  );
} 