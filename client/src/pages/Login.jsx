import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Shield, KeyRound } from 'lucide-react';

const TABS = [
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'otp', label: 'Email OTP', icon: KeyRound },
];

export default function Login() {
  const [activeTab, setActiveTab] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login, sendOtp, verifyOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetState = () => {
    setError('');
    setSuccess('');
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    setCountdown(0);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    resetState();
  };

  // ─── Password Login ─────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email.trim(), password);
      navigate(user.role === 'ORG' ? '/dashboard' : '/queues');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Flow ───────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendOtp(email);
      setOtpSent(true);
      setSuccess('Verification code sent! Check your email.');
      setCountdown(60);
      // Focus the first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only the last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const newOtp = paste.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      setLoading(false);
      return;
    }

    try {
      const user = await verifyOtp(email, code);
      navigate(user.role === 'ORG' ? '/dashboard' : '/queues');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ─── Google OAuth ───────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const user = await loginWithGoogle(credentialResponse.credential);
      navigate(user.role === 'ORG' ? '/dashboard' : '/queues');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed.');
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <h1 className="auth-logo">QueueX</h1>
          <p className="auth-subtitle">Welcome back! Sign in to continue.</p>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* ─── Auth Tabs ──────────────────────────────── */}
        <div className="auth-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`auth-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
                type="button"
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── Password Tab ──────────────────────────── */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
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
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  className="form-input form-input-icon"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── OTP Tab ───────────────────────────────── */}
        {activeTab === 'otp' && !otpSent && (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="otp-intro">
              <Shield size={32} className="otp-intro-icon" />
              <p>We'll send a 6-digit code to your email for passwordless sign-in.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="otp-email">Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="otp-email"
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

            <button
              id="send-otp-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Sending code...
                </>
              ) : (
                <>
                  Send Code
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === 'otp' && otpSent && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="otp-intro">
              <KeyRound size={32} className="otp-intro-icon" />
              <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
            </div>

            <div className="otp-input-group" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  className="otp-digit"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              id="verify-otp-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="otp-resend">
              {countdown > 0 ? (
                <span className="otp-countdown">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ─── Divider ───────────────────────────────── */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* ─── Google Sign-In ────────────────────────── */}
        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            size="large"
            width="100%"
            text="signin_with"
            shape="pill"
          />
        </div>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
