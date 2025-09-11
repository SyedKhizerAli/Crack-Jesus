import React from 'react';
import './StaticPages.css';

export const Rules = () => {
  return (
    <div className="container static-page">
      <h1 className="page-title">Platform Rules</h1>
      
      <div className="rules-section">
        <h2>General Rules</h2>
        <ol className="rules-list">
          <li>
            Respect all users on the platform. Harassment, threats, or abusive behavior will not be tolerated.
          </li>
          <li>
            Do not attempt to bypass our security features or exploit vulnerabilities in our system.
          </li>
          <li>
            Multiple accounts per user are not allowed.
          </li>
          <li>
            All transactions are final after the 5-minute verification window.
          </li>
          <li>
            The platform assumes no responsibility for how the information obtained is used.
          </li>
        </ol>
      </div>
      
      <div className="rules-section">
        <h2>Vendor Rules</h2>
        <ol className="rules-list">
          <li>
            Vendors must provide accurate information for all listed cards.
          </li>
          <li>
            Card details must be valid at the time of listing.
          </li>
          <li>
            Vendors are responsible for ensuring their BTCPay Server integration is properly configured.
          </li>
          <li>
            Excessive invalid cards or customer complaints will result in account review or suspension.
          </li>
          <li>
            Platform fees will be deducted automatically from sales as per the current rate.
          </li>
          <li>
            Funds will be held for 5 minutes after purchase to allow for card verification.
          </li>
        </ol>
      </div>
      
      <div className="rules-section">
        <h2>Buyer Rules</h2>
        <ol className="rules-list">
          <li>
            Card verification must be completed within 5 minutes of purchase for refund eligibility.
          </li>
          <li>
            Refunds are only processed if the card is determined to be invalid by our verification system.
          </li>
          <li>
            Disputes must be submitted through the appropriate channels on the platform.
          </li>
          <li>
            Buyers are responsible for maintaining the security of their own accounts.
          </li>
          <li>
            Attempting to charge back or reverse Bitcoin transactions is not possible and will not be honored.
          </li>
        </ol>
      </div>
      
      <div className="rules-section">
        <h2>Terms Violations</h2>
        <p>
          Violations of these rules may result in warnings, temporary suspension, or permanent banning of accounts
          depending on the severity and frequency of violations. The platform administration reserves the right
          to make final decisions regarding rule violations and consequences.
        </p>
      </div>
    </div>
  );
}; 