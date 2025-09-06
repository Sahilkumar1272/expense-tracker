import React, { createContext, useContext, useState, useEffect } from "react";
import ApiService from "../api/authApi";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
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
      console.log("Token on init:", token); // Debug: Check if token exists
      if (token) {
        try {
          const userData = await ApiService.getProfile();
          setUser(userData.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Profile fetch error:", error.message); // Debug: Log error
          if (error.message === "Token has expired") {
            const refreshToken = ApiService.getRefreshToken();
            console.log("Refresh token:", refreshToken); // Debug: Check if refresh token exists
            if (refreshToken) {
              try {
                const response = await ApiService.refreshToken();
                const isPersistent =
                  localStorage.getItem("access_token") !== null;
                if (isPersistent) {
                  ApiService.setToken(response.access_token);
                } else {
                  sessionStorage.setItem("access_token", response.access_token);
                }
                const userData = await ApiService.getProfile();
                setUser(userData.user);
                setIsAuthenticated(true);
              } catch (refreshError) {
                console.error("Refresh token error:", refreshError.message); // Debug: Log refresh error
                ApiService.removeToken();
                setUser(null);
                setIsAuthenticated(false);
              }
            } else {
              ApiService.removeToken();
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            ApiService.removeToken();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        console.log("No token found"); // Debug: Log if no token
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await ApiService.login(credentials);
      if (credentials.remember) {
        ApiService.setToken(response.access_token);
        ApiService.setRefreshToken(response.refresh_token);
      } else {
        sessionStorage.setItem("access_token", response.access_token);
        sessionStorage.setItem("refresh_token", response.refresh_token);
      }
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      console.error("Login error:", error.message); // Debug: Log login error
      throw error;
    }
  };

  const googleLogin = async (id_token, remember = true) => {
    try {
      const response = await ApiService.googleLogin(id_token);
      if (remember) {
        ApiService.setToken(response.access_token);
        ApiService.setRefreshToken(response.refresh_token);
      } else {
        sessionStorage.setItem("access_token", response.access_token);
        sessionStorage.setItem("refresh_token", response.refresh_token);
      }
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      console.error("Google login error:", error.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await ApiService.register(userData);
      return response;
    } catch (error) {
      console.error("Register error:", error.message); // Debug: Log register error
      throw error;
    }
  };

  const verifyEmail = async (verificationData) => {
    try {
      const response = await ApiService.verifyEmail(verificationData);
      ApiService.setToken(response.access_token);
      ApiService.setRefreshToken(response.refresh_token);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      console.error("Verify email error:", error.message); // Debug: Log verify error
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await ApiService.forgotPassword(email);
      return response;
    } catch (error) {
      console.error("Forgot password error:", error.message); // Debug: Log forgot password error
      throw error;
    }
  };

  const verifyResetToken = async (token) => {
    try {
      const response = await ApiService.verifyResetToken(token);
      return response;
    } catch (error) {
      console.error("Verify reset token error:", error.message); // Debug: Log verify reset token error
      throw error;
    }
  };

  const resetPassword = async (data) => {
    try {
      const response = await ApiService.resetPassword(data);
      return response;
    } catch (error) {
      console.error("Reset password error:", error.message); // Debug: Log reset password error
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
    googleLogin,
    register,
    verifyEmail,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
