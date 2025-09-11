import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="main-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>CrackJesus</h2>
            <p>Your secure platform for card management and transactions.</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/user/cards">Browse Cards</Link></li>
                <li><Link to="/faq">FAQ</Link></li>
                <li><Link to="/guide">User Guide</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Legal</h3>
              <ul>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/rules">Platform Rules</Link></li>
                <li><Link to="/refund">Refund Policy</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Connect With Us</h3>
              <div className="social-links">
                <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                <a href="#" aria-label="Facebook"><i className="fab fa-facebook"></i></a>
                <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} CrackJesus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 