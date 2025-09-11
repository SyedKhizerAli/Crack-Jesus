import React from 'react';
import './StaticPages.css';

export const FAQ = () => {
  return (
    <div className="container static-page">
      <h1 className="page-title">Frequently Asked Questions</h1>
      
      <div className="faq-section">
        <div className="faq-item">
          <h3>What is CrackJesus?</h3>
          <p>
            CrackJesus is a secure platform for managing card data. We provide services
            for vendors and users to safely conduct transactions.
          </p>
        </div>
        
        <div className="faq-item">
          <h3>How does the card verification system work?</h3>
          <p>
            Our system uses advanced verification techniques to ensure card data is valid.
            If a card fails verification within 5 minutes of purchase, users can request a refund.
          </p>
        </div>
        
        <div className="faq-item">
          <h3>What payment methods do you accept?</h3>
          <p>
            We currently support Bitcoin payments through BTCPay Server, ensuring secure
            and anonymous transactions.
          </p>
        </div>
        
        <div className="faq-item">
          <h3>How do I become a vendor?</h3>
          <p>
            You can register as a vendor through our vendor signup page. After registration,
            you'll need to set up your BTCPay Server connection to start selling.
          </p>
        </div>
        
        <div className="faq-item">
          <h3>What happens if a card doesn't work?</h3>
          <p>
            If a card doesn't work and is verified as invalid within 5 minutes of purchase,
            you can request a refund through our automated system.
          </p>
        </div>
        
        <div className="faq-item">
          <h3>How long are funds held before being released to vendors?</h3>
          <p>
            Funds are held for 5 minutes after purchase. During this time, the buyer can
            verify the card. If verified as valid, the funds are released to the vendor
            (minus platform fee if enabled).
          </p>
        </div>
      </div>
    </div>
  );
}; 