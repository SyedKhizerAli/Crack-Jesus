import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export function Home() {
  return (
    <div className="home-container">
      <section className="hero">
        <div className="hero-content">
          <h1>Secure Card Management Platform</h1>
          <p className="hero-subtitle">Buy, sell, and manage digital cards with ease and security</p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-outline">Login</Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose CrackJesus</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Transactions</h3>
              <p>All transactions are encrypted and secured with the latest technology</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Wide Selection</h3>
              <p>Access a diverse range of cards from trusted vendors</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3>Vendor Platform</h3>
              <p>Sell your cards on our secure marketplace with low fees</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Detailed Analytics</h3>
              <p>Track your purchases, sales, and wallet activity</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to get started?</h2>
            <p>Join thousands of users who trust CrackJesus for their card needs</p>
            <Link to="/signup" className="btn btn-primary">Create Account</Link>
          </div>
        </div>
      </section>
    </div>
  );
} 