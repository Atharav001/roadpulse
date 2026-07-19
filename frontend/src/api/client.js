const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  'http://localhost:5001';

function getToken() {
  return localStorage.getItem('jwt_token');
}

async function fetchAPI(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'API request failed';
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json();
}

export const authAPI = {
  login: (email, password) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  deviceLogin: (deviceId) =>
    fetchAPI('/auth/device-login', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    }),

  register: (email, password, role = 'citizen') =>
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),

  googleLogin: ({ email, name, google_id }) =>
    fetchAPI('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, google_id }),
    }),
};

export const reportsAPI = {
  submit: (reportData) =>
    fetchAPI('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    }),

  previewLandmark: (latitude, longitude, ward_id) =>
    fetchAPI('/reports/preview-landmark', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, ward_id }),
    }),

  getById: (reportId) => fetchAPI(`/reports/${reportId}`, { method: 'GET' }),

  getByUser: (userId, limit = 50, offset = 0) =>
    fetchAPI(`/reports/user/${userId}?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    }),
};

export const incidentsAPI = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.ward_id) params.append('ward_id', filters.ward_id);
    if (filters.department) params.append('department', filters.department);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    return fetchAPI(`/incidents?${params.toString()}`, { method: 'GET' });
  },

  getById: (incidentId) => fetchAPI(`/incidents/${incidentId}`, { method: 'GET' }),

  updateStatus: (incidentId, status) =>
    fetchAPI(`/incidents/${incidentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

export const dashboardAPI = {
  getOverview: () => fetchAPI('/dashboard/overview', { method: 'GET' }),

  getWardStats: (wardId) =>
    fetchAPI(`/dashboard/ward/${wardId}`, { method: 'GET' }),

  getPendingIncidents: (days = 60) =>
    fetchAPI(`/dashboard/pending?days=${days}`, { method: 'GET' }),
};

export const wardsAPI = {
  list: () => fetchAPI('/wards', { method: 'GET' }),
};

export function setAuthToken(token) {
  if (token) localStorage.setItem('jwt_token', token);
  else localStorage.removeItem('jwt_token');
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('current_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) localStorage.setItem('current_user', JSON.stringify(user));
  else localStorage.removeItem('current_user');
}

export function isAuthenticated() {
  return !!getToken();
}

export function getApiBaseUrl() {
  return API_URL;
}
