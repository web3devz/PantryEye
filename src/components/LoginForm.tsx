/**
 * Login Form Component
 * Requirements: 1.5
 * Allows users to authenticate with their password
 */

import React, { useState } from 'react';
import { authService } from '../services/auth/auth';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToCreate: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToCreate,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
            autoFocus
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="primary-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <button
          type="button"
          onClick={onSwitchToCreate}
          disabled={loading}
          className="secondary-button"
        >
          Don't have an account? Create one
        </button>
      </form>
    </div>
  );
};
