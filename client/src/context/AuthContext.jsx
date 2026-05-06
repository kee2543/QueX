import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('queuex_token');
    const savedUser = localStorage.getItem('queuex_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const _saveSession = (userData, jwtToken) => {
    localStorage.setItem('queuex_token', jwtToken);
    localStorage.setItem('queuex_user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, token: jwtToken } = res.data;
    _saveSession(userData, jwtToken);
    return userData;
  };

  const register = async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    const { user: userData, token: jwtToken } = res.data;
    _saveSession(userData, jwtToken);
    return userData;
  };

  // ─── OTP Methods ────────────────────────────────────────

  const sendOtp = async (email) => {
    const res = await api.post('/auth/otp/send', { email });
    return res.data;
  };

  const verifyOtp = async (email, code) => {
    const res = await api.post('/auth/otp/verify', { email, code });
    const { user: userData, token: jwtToken } = res.data;
    _saveSession(userData, jwtToken);
    return userData;
  };

  // ─── Google OAuth ───────────────────────────────────────

  const loginWithGoogle = async (idToken, role) => {
    const res = await api.post('/auth/google', { idToken, role });
    const { user: userData, token: jwtToken } = res.data;
    _saveSession(userData, jwtToken);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('queuex_token');
    localStorage.removeItem('queuex_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isOrg: user?.role === 'ORG',
    isUser: user?.role === 'USER',
    login,
    register,
    sendOtp,
    verifyOtp,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
