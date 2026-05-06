import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const user = await register(name, email, password, role);
      navigate(user.role === 'ORG' ? '/dashboard' : '/queues');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const user = await loginWithGoogle(credentialResponse.credential, role);
      navigate(user.role === 'ORG' ? '/dashboard' : '/queues');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-up was cancelled or failed.');
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <h1 className="auth-logo">QueueX</h1>
          <p className="auth-subtitle">Create your account to get started.</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="register-name"
                className="form-input form-input-icon"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="register-email"
                className="form-input form-input-icon"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="register-password"
                className="form-input form-input-icon"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-role">I am a</label>
            <div className="role-toggle">
              <button
                type="button"
                id="role-user"
                className={`role-btn ${role === 'USER' ? 'active' : ''}`}
                onClick={() => setRole('USER')}
              >
                👤 Customer
              </button>
              <button
                type="button"
                id="role-org"
                className={`role-btn ${role === 'ORG' ? 'active' : ''}`}
                onClick={() => setRole('ORG')}
              >
                🏢 Organization
              </button>
            </div>
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* ─── Divider ───────────────────────────────── */}
        <div className="auth-divider">
          <span>or sign up with</span>
        </div>

        {/* ─── Google Sign-Up ────────────────────────── */}
        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            size="large"
            width="100%"
            text="signup_with"
            shape="pill"
          />
        </div>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
