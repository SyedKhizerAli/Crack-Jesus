import React from 'react';
import './StaticPages.css';

export const Guide = () => {
  return (
    <div className="container static-page">
      <h1 className="page-title">User Guide</h1>
      
      <div className="guide-section">
        <h2>Getting Started</h2>
        <p>
          Welcome to CrackJesus! This guide will help you navigate our platform
          and make the most of our services.
        </p>
        
        <h3>For Buyers</h3>
        <ol className="guide-list">
          <li>
            <strong>Create an Account</strong>: Sign up using our simple registration form.
          </li>
          <li>
            <strong>Fund Your Wallet</strong>: Add Bitcoin to your wallet through our secure BTC Pay Server.
          </li>
          <li>
            <strong>Browse Cards</strong>: Explore our extensive collection of available cards.
          </li>
          <li>
            <strong>Purchase</strong>: Select the cards you need and complete your purchase using your wallet balance.
          </li>
          <li>
            <strong>Verify Cards</strong>: After purchase, you have 5 minutes to verify card validity using our checker.
          </li>
          <li>
            <strong>Request Refunds</strong>: If a card is invalid, request a refund within the 5-minute window.
          </li>
        </ol>
        
        <h3>For Vendors</h3>
        <ol className="guide-list">
          <li>
            <strong>Register as Vendor</strong>: Create a vendor account to start selling.
          </li>
          <li>
            <strong>Set Up BTCPay</strong>: Configure your BTCPay Server connection for receiving payments.
          </li>
          <li>
            <strong>Add Cards</strong>: Upload individual cards or use bulk upload for multiple listings.
          </li>
          <li>
            <strong>Monitor Sales</strong>: Track your sales and customer details through the dashboard.
          </li>
          <li>
            <strong>Withdraw Funds</strong>: Transfer your earnings to your BTCPay wallet.
          </li>
        </ol>
      </div>
      
      <div className="guide-section">
        <h2>Using the Card Checker</h2>
        <p>
          Our card checker allows you to verify card validity by testing:
        </p>
        <ul className="guide-list">
          <li>Basic validation (expiry date, format)</li>
          <li>3D Secure status</li>
          <li>Balance verification</li>
          <li>AVS (Address Verification System)</li>
        </ul>
        <p>
          To verify a card, simply go to the card details page after purchase and click
          the "Verify Card" button. The system will automatically check the card and display
          the results.
        </p>
      </div>
    </div>
  );
}; 