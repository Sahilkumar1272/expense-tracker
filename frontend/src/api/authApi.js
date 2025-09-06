// src/api/authApi.js (rename your previous api.js to this, and update to use apiUtils)
import { request, setToken, getToken, setRefreshToken, getRefreshToken, removeToken } from './apiUtils';

class AuthService {
  async register(userData) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyEmail(verificationData) {
    return request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  async login(credentials) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async resendOtp(userId) {
    return request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetToken(token) {
    return request('/auth/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resetPassword(data) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken() {
    return request('/auth/refresh', {
      method: 'POST',
      isRefresh: true,
    });
  }

  async getProfile() {
    return request('/auth/profile');
  }

  async googleLogin(id_token) {
    return request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token }),
    });
  }

  // Token helpers
  setToken = setToken;
  getToken = getToken;
  setRefreshToken = setRefreshToken;
  getRefreshToken = getRefreshToken;
  removeToken = removeToken;
}

export default new AuthService();