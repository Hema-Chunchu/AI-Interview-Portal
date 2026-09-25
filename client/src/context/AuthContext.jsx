import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    return savedName && savedEmail ? { name: savedName, email: savedEmail } : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem('userName', data.user.name);
          localStorage.setItem('userEmail', data.user.email);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.error('Error verifying auth token:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);

      setToken(data.token);
      setUser(data.user);

      return { success: true, data };
    } catch (err) {
      const message = err.message === 'Failed to fetch' || err.name === 'TypeError'
        ? 'Cannot connect to server. Please make sure the backend is running on port 5000 (cd server && node server.js).'
        : err.message;
      return { success: false, message };
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);

      setToken(data.token);
      setUser(data.user);

      return { success: true, data };
    } catch (err) {
      const message = err.message === 'Failed to fetch' || err.name === 'TypeError'
        ? 'Cannot connect to server. Please make sure the backend is running on port 5000 (cd server && node server.js).'
        : err.message;
      return { success: false, message };
    }
  };

  const loginWithSocial = (userData = {}, customToken = null) => {
    const tokenToSet = customToken || `social_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const userToSet = {
      name: userData.name || 'Candidate',
      email: userData.email || 'candidate@example.com'
    };

    localStorage.setItem('token', tokenToSet);
    localStorage.setItem('userName', userToSet.name);
    localStorage.setItem('userEmail', userToSet.email);

    setToken(tokenToSet);
    setUser(userToSet);

    return { success: true, data: { user: userToSet, token: tokenToSet } };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    loginWithSocial,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
