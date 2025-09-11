import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CardDetailTable } from '../../components/CardDetailTable';
import axios from 'axios';
import './UserPages.css';
import './UserCardDetail.css';

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

interface PurchaseResponse {
  id: string;
  cardDetails: {
  number: string;
    expiryMonth: number;
    expiryYear: number;
  cvv: string;
  holderName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  };
  price: number;
  status: string;
  createdAt: string;
}

export function UserCardDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<PurchaseResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState('');
  const [refundRequested, setRefundRequested] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [cardVerificationStep, setCardVerificationStep] = useState<'3ds' | 'balance' | 'avs' | 'complete'>('3ds');

  useEffect(() => {
    fetchCardDetails();
  }, [id]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (purchaseComplete && !refundRequested && !refundSuccess) {
      // Set initial time remaining to 5 minutes (300 seconds)
      setTimeRemaining(300);
      
      // Update timer every second
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [purchaseComplete, refundRequested, refundSuccess]);

  const fetchCardDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`http://localhost:3000/api/cards/${id}/details`, { headers });
      
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

  const handlePurchase = async () => {
    if (!card) return;
    
    try {
      setIsPurchasing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post('http://localhost:3000/api/users/purchases', {
        cardId: card.id
      }, { headers });
      
      setPurchaseComplete(true);
      setPurchasedCard(response.data.data.purchase);
    } catch (err: any) {
      console.error('Error purchasing card:', err);
      setError(err.response?.data?.message || 'Failed to purchase card');
    } finally {
      setIsPurchasing(false);
    }
  };

  const verifyCard = async () => {
    if (!purchasedCard) return;
    
    try {
      setVerificationError('');
      setIsVerifying(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Verify the card with the API (basic check first)
      const response = await axios.post('http://localhost:3000/api/cards/verification/verify', {
        cardNumber: purchasedCard.cardDetails.number,
        expiryMonth: purchasedCard.cardDetails.expiryMonth,
        expiryYear: purchasedCard.cardDetails.expiryYear,
        cvv: purchasedCard.cardDetails.cvv
      }, { headers });
      
      if (!response.data.data.approved) {
        setVerificationResult({
          isValid: false,
          message: "Card verification failed. This card appears to be dead or invalid. You can request a refund.",
          details: response.data.data
        });
        setCardVerificationStep('complete');
      } else {
        // Card passed basic verification, proceed to balance check
        setVerificationResult({
          isValid: true,
          message: "Card passed basic verification. Checking balance...",
          details: response.data.data
        });
        setCardVerificationStep('balance');
      }
    } catch (err: any) {
      console.error('Error verifying card:', err);
      setVerificationError(err.response?.data?.message || 'Failed to verify card');
      // If API returns an error, consider the card dead
      setVerificationResult({
        isValid: false,
        message: "Card verification failed. You may request a refund.",
        details: null
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyBalance = async () => {
    if (!purchasedCard) return;
    
    try {
      setIsVerifying(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post('http://localhost:3000/api/cards/verification/balance', {
        cardNumber: purchasedCard.cardDetails.number,
        expiryMonth: purchasedCard.cardDetails.expiryMonth,
        expiryYear: purchasedCard.cardDetails.expiryYear,
        cvv: purchasedCard.cardDetails.cvv
      }, { headers });
      
      if (response.data.data.approved) {
        setVerificationResult((prev: any) => ({
          ...prev,
          balance: response.data.data,
          message: "Balance check passed. Proceeding to address verification..."
        }));
      setCardVerificationStep('avs');
      } else {
        setVerificationResult((prev: any) => ({
          ...prev,
          balance: response.data.data,
          message: "Balance check failed. Card may be invalid.",
          isValid: false
        }));
        setCardVerificationStep('complete');
      }
    } catch (err: any) {
      console.error('Error checking balance:', err);
      setVerificationResult((prev: any) => ({
        ...prev,
        balance: { approved: false, message: "Balance check failed" },
        isValid: false
      }));
      setCardVerificationStep('complete');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyAVS = async () => {
    if (!purchasedCard) return;
    
    try {
      setIsVerifying(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post('http://localhost:3000/api/cards/verification/avs', {
        cardNumber: purchasedCard.cardDetails.number,
        expiryMonth: purchasedCard.cardDetails.expiryMonth,
        expiryYear: purchasedCard.cardDetails.expiryYear,
        cvv: purchasedCard.cardDetails.cvv,
        address: purchasedCard.cardDetails.address,
        city: purchasedCard.cardDetails.city,
        state: purchasedCard.cardDetails.state,
        zip: purchasedCard.cardDetails.zip
      }, { headers });
      
      setVerificationResult((prev: any) => ({
        ...prev,
        avs: response.data.data,
        message: "Verification complete. All checks passed.",
        isValid: response.data.data.avsStreetMatch
      }));
      setCardVerificationStep('complete');
    } catch (err: any) {
      console.error('Error checking AVS:', err);
      setVerificationResult((prev: any) => ({
        ...prev,
        avs: { avsStreetMatch: false, message: "AVS check failed" },
        isValid: false
      }));
      setCardVerificationStep('complete');
    } finally {
      setIsVerifying(false);
    }
  };

  const requestRefund = async () => {
    if (!purchasedCard) return;
    
    try {
      setVerificationError('');
      setIsVerifying(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`http://localhost:3000/api/users/purchases/${purchasedCard.id}/refund`, {}, { headers });
      
      setRefundRequested(true);
      setRefundSuccess(true);
    } catch (err: any) {
      console.error('Error requesting refund:', err);
      setVerificationError(err.response?.data?.message || 'Failed to request refund');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (isLoading) {
    return <div className="loading">Loading card details...</div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <Link to="/user/cards" className="back-link">Back to Cards</Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="page-container">
        <div className="error-message">Card not found</div>
        <Link to="/user/cards" className="back-link">Back to Cards</Link>
      </div>
    );
  }

  if (purchaseComplete) {
    return (
      <div className="page-container">
        <header className="page-header">
          <h1>Card Purchased Successfully</h1>
          <div className="header-actions">
            <Link to="/user/purchases" className="btn btn-outline">View Purchases</Link>
            <Link to="/user/cards" className="btn btn-outline">Back to Cards</Link>
          </div>
        </header>

        <div className="purchased-card-container">
          {purchasedCard && (
            <div className="purchased-card-details">
              <h2>Card Information</h2>
              
              <div className="card-data-grid">
                <div className="card-data-item">
                  <span className="data-label">Card Number:</span>
                  <span className="data-value">{purchasedCard.cardDetails.number}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">Expiry:</span>
                  <span className="data-value">{purchasedCard.cardDetails.expiryMonth}/{purchasedCard.cardDetails.expiryYear}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">CVV:</span>
                  <span className="data-value">{purchasedCard.cardDetails.cvv}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">Holder Name:</span>
                  <span className="data-value">{purchasedCard.cardDetails.holderName}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">Address:</span>
                  <span className="data-value">{purchasedCard.cardDetails.address}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">City:</span>
                  <span className="data-value">{purchasedCard.cardDetails.city}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">State:</span>
                  <span className="data-value">{purchasedCard.cardDetails.state}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">Zip:</span>
                  <span className="data-value">{purchasedCard.cardDetails.zip}</span>
                </div>
                <div className="card-data-item">
                  <span className="data-label">Country:</span>
                  <span className="data-value">{purchasedCard.cardDetails.country}</span>
                </div>
              </div>
              
              {!refundRequested && !refundSuccess && (
                <div className="verification-timer">
                  <div className="timer-label">
                    Time remaining to verify card and request refund:
                  </div>
                  <div className="timer-value">
                    {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                  </div>
                </div>
              )}
              
              {refundSuccess && (
                <div className="refund-success">
                  <h3>Refund Processed Successfully</h3>
                  <p>Your refund has been processed and the funds have been returned to your wallet.</p>
                </div>
              )}
              
              {verificationError && (
                <div className="verification-error">
                  {verificationError}
                </div>
              )}
              
              <div className="card-verification-section">
                <h3>Card Verification</h3>
                
                {cardVerificationStep === '3ds' && (
                  <div className="verification-step">
                    <h4>Step 1: 3D Secure Check</h4>
                    <p>Verify if this card has 3D Secure protection.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={verifyCard}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Checking...' : 'Check 3D Secure'}
                    </button>
                  </div>
                )}
                
                {cardVerificationStep === 'balance' && (
                  <div className="verification-step">
                    <h4>Step 2: Balance Check</h4>
                    <p>Verify if this card has sufficient balance.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={verifyBalance}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Checking...' : 'Check Balance'}
                    </button>
                  </div>
                )}
                
                {cardVerificationStep === 'avs' && (
                  <div className="verification-step">
                    <h4>Step 3: Address Verification</h4>
                    <p>Verify if the address information matches.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={verifyAVS}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Checking...' : 'Check Address'}
                    </button>
                  </div>
                )}
                
                {cardVerificationStep === 'complete' && verificationResult && (
                  <div className="verification-results">
                    <h4>Verification Results</h4>
                    
                    <div className="result-item">
                      <span className="result-label">3D Secure:</span>
                      <span className={`result-value ${verificationResult.success ? 'success' : 'error'}`}>
                        {verificationResult.is3dsEnabled 
                          ? 'Enabled (Protected)' 
                          : 'Disabled (Not Protected)'}
                      </span>
                    </div>
                    
                    <div className="result-item">
                      <span className="result-label">Balance Check:</span>
                      <span className={`result-value ${verificationResult.balance?.success ? 'success' : 'error'}`}>
                        {verificationResult.balance?.approved 
                          ? 'Sufficient Balance' 
                          : 'Insufficient Balance'}
                      </span>
                    </div>
                    
                    <div className="result-item">
                      <span className="result-label">Address Verification:</span>
                      <span className={`result-value ${verificationResult.avs?.avsStreetMatch ? 'success' : 'warning'}`}>
                        {verificationResult.avs?.avsStreetMatch 
                          ? 'Address Verified' 
                          : 'Address Not Verified'}
                      </span>
                    </div>
                    
                    <div className="verification-summary">
                      <h5>Summary:</h5>
                      <p className={verificationResult.isValid ? 'success' : 'error'}>
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {!refundRequested && !refundSuccess && verificationResult && !verificationResult.isValid && timeRemaining && timeRemaining > 0 && (
        <div className="dead-card-alert">
          <div className="alert alert-danger">
            <h3>Card Verification Failed</h3>
            <p>{verificationResult.message}</p>
            <button 
              className="btn btn-danger" 
              onClick={requestRefund}
              disabled={isVerifying}
            >
              {isVerifying ? 'Processing...' : 'Request Refund'}
            </button>
            <div className="refund-timer">
              Time remaining: {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Card Details</h1>
        <Link to="/user/cards" className="back-link">Back to Cards</Link>
      </header>

      <div className="card-detail-container">
        <CardDetailTable 
          card={card}
          userType="user"
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
        />
      </div>
    </div>
  );
} 