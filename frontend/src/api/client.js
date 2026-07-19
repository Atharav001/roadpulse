const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Get JWT token from localStorage
 */
function getToken() {
  return localStorage.getItem('jwt_token');
}

/**
 * Generic fetch wrapper with JWT token
 */
async function fetchAPI(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'API request failed');
  }

  return response.json();
}

/**
 * Auth endpoints
 */
export const authAPI = {
  login: (email, password) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, password, role = 'citizen') =>
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),
};

/**
 * Reports endpoints
 */
export const reportsAPI = {
  submit: (reportData) =>
    fetchAPI('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    }),

  previewLandmark: (latitude, longitude) =>
    fetchAPI('/reports/preview-landmark', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }),

  getById: (reportId) =>
    fetchAPI(`/reports/${reportId}`, {
      method: 'GET',
    }),

  getByUser: (userId, limit = 50, offset = 0) =>
    fetchAPI(`/reports/user/${userId}?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    }),
};

/**
 * Incidents endpoints
 */
export const incidentsAPI = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.ward_id) params.append('ward_id', filters.ward_id);
    if (filters.department) params.append('department', filters.department);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    return fetchAPI(`/incidents?${params.toString()}`, {
      method: 'GET',
    });
  },

  getById: (incidentId) =>
    fetchAPI(`/incidents/${incidentId}`, {
      method: 'GET',
    }),

  updateStatus: (incidentId, status) =>
    fetchAPI(`/incidents/${incidentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

/**
 * Dashboard endpoints
 */
export const dashboardAPI = {
  getWardStats: (wardId) =>
    fetchAPI(`/dashboard/ward/${wardId}`, {
      method: 'GET',
    }),

  getPendingIncidents: () =>
    fetchAPI('/dashboard/pending', {
      method: 'GET',
    }),
};

/**
 * Utility function to store token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('jwt_token', token);
  } else {
    localStorage.removeItem('jwt_token');
  }
}

/**
 * Utility function to get current auth user from localStorage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('current_user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Utility function to store current user
 */
export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('current_user');
  }
}

/**
 * Utility function to check if user is authenticated
 */
export function isAuthenticated() {
  return !!getToken();
}
