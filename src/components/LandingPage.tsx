/**
 * Landing Page Component
 * Modern landing page with hero section and features
 */

import React from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-icon">👁️</div>
          <h1 className="hero-title">PantryEye</h1>
          <p className="hero-subtitle">Privacy-First Inventory Management</p>
          <p className="hero-description">
            Smart pantry tracking that keeps your data secure. 
            Capture items with your camera, manage inventory effortlessly, 
            and never run out of essentials again.
          </p>
          <button className="cta-button" onClick={onGetStarted}>
            Get Started
            <span className="cta-arrow">→</span>
          </button>
        </div>

        {/* Features Grid */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h3>Smart Capture</h3>
            <p>Use your camera or upload images to automatically detect and track items</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Privacy First</h3>
            <p>All data stays on your device. No cloud storage, no tracking, complete privacy</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Smart Forecasting</h3>
            <p>AI-powered predictions help you know when to restock before you run out</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛒</div>
            <h3>Easy Ordering</h3>
            <p>Generate shopping carts automatically based on your inventory needs</p>
          </div>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p>Secure • Private • Offline-First</p>
        </div>
      </div>
    </div>
  );
};
