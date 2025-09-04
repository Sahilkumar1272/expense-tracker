import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../api/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app load
  useEffect(() => {
    const initAuth = async () => {
      const token = ApiService.getToken();
      if (token) {
        try {
          const userData = await ApiService.getProfile();
          setUser(userData.user);
          setIsAuthenticated(true);
        } catch (error) {
          // Token might be expired
          ApiService.removeToken();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await ApiService.login(credentials);
      if (credentials.remember) {
        ApiService.setToken(response.access_token); // Uses localStorage
      } else {
        sessionStorage.setItem('access_token', response.access_token); // Temporary session
      }
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await ApiService.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyEmail = async (verificationData) => {
    try {
      const response = await ApiService.verifyEmail(verificationData);
      ApiService.setToken(response.access_token);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await ApiService.forgotPassword(email);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyResetToken = async (token) => {
    try {
      const response = await ApiService.verifyResetToken(token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (data) => {
    try {
      const response = await ApiService.resetPassword(data);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    ApiService.removeToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    verifyEmail,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};