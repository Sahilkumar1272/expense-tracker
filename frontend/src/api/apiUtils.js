// src/api/apiUtils.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = options.isRefresh ? getRefreshToken() : getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.msg || data.error || 'An error occurred');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export function setToken(token, isPersistent = true) {
  if (isPersistent) {
    localStorage.setItem('access_token', token);
  } else {
    sessionStorage.setItem('access_token', token);
  }
}

export function getToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

export function setRefreshToken(token, isPersistent = true) {
  if (isPersistent) {
    localStorage.setItem('refresh_token', token);
  } else {
    sessionStorage.setItem('refresh_token', token);
  }
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

export function removeToken() {
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('refresh_token');
}