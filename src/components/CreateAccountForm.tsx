/**
 * Create Account Form Component
 * Requirements: 1.1, 1.4
 * Allows users to create a new account with password and household metadata
 */

import React, { useState } from 'react';
import { UserMetadata } from '../types';
import { authService } from '../services/auth/auth';

interface CreateAccountFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const CreateAccountForm: React.FC<CreateAccountFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [householdMembers, setHouseholdMembers] = useState('1');
  const [spendingCap, setSpendingCap] = useState('');
  const [vendors, setVendors] = useState<string[]>(['amazon']);
  const [brandPreferences, setBrandPreferences] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVendorToggle = (vendor: string) => {
    setVendors((prev) =>
      prev.includes(vendor)
        ? prev.filter((v) => v !== vendor)
        : [...prev, vendor]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (vendors.length === 0) {
      setError('Please select at least one vendor');
      return;
    }

    const members = parseInt(householdMembers, 10);
    if (isNaN(members) || members < 1) {
      setError('Household members must be at least 1');
      return;
    }

    setLoading(true);

    try {
      // Parse brand preferences (format: "category:brand1,brand2;category2:brand3")
      const brandPrefsMap = new Map<string, string[]>();
      if (brandPreferences.trim()) {
        const entries = brandPreferences.split(';');
        for (const entry of entries) {
          const [category, brands] = entry.split(':');
          if (category && brands) {
            brandPrefsMap.set(
              category.trim(),
              brands.split(',').map((b) => b.trim())
            );
          }
        }
      }

      const metadata: UserMetadata = {
        householdMembers: members,
        brandPreferences: brandPrefsMap,
        spendingCap: spendingCap ? parseFloat(spendingCap) : undefined,
        vendorAllowlist: vendors,
      };

      await authService.createAccount(password, metadata);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="householdMembers">Household Members *</label>
          <input
            id="householdMembers"
            type="number"
            min="1"
            value={householdMembers}
            onChange={(e) => setHouseholdMembers(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="spendingCap">Monthly Spending Cap (optional)</label>
          <input
            id="spendingCap"
            type="number"
            min="0"
            step="0.01"
            value={spendingCap}
            onChange={(e) => setSpendingCap(e.target.value)}
            placeholder="e.g., 500.00"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Allowed Vendors *</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={vendors.includes('amazon')}
                onChange={() => handleVendorToggle('amazon')}
                disabled={loading}
              />
              Amazon
            </label>
            <label>
              <input
                type="checkbox"
                checked={vendors.includes('walmart')}
                onChange={() => handleVendorToggle('walmart')}
                disabled={loading}
              />
              Walmart
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="brandPreferences">
            Brand Preferences (optional)
          </label>
          <input
            id="brandPreferences"
            type="text"
            value={brandPreferences}
            onChange={(e) => setBrandPreferences(e.target.value)}
            placeholder="e.g., dairy:Organic Valley,Horizon;bread:Dave's Killer Bread"
            disabled={loading}
          />
          <small>Format: category:brand1,brand2;category2:brand3</small>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="primary-button">
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          disabled={loading}
          className="secondary-button"
        >
          Already have an account? Login
        </button>
      </form>
    </div>
  );
};
