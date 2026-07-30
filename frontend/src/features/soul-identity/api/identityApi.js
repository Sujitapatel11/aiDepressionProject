/**
 * REST API Client for Soul Identity Subsystem (/api/identity/).
 * Handles network communication with backend.
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('sc_token') || localStorage.getItem('soulcare_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const fetchMyIdentity = async () => {
  const response = await fetch('/api/identity/me/', {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch Soul Identity');
  }
  return response.json();
};

export const updateMyIdentity = async (payload) => {
  const response = await fetch('/api/identity/me/', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update Soul Identity');
  }
  return response.json();
};

export const fetchPublicIdentity = async (userId) => {
  const response = await fetch(`/api/identity/public/${userId}/`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch public identity');
  }
  return response.json();
};

export const fetchCosmeticCatalog = async () => {
  const response = await fetch('/api/identity/cosmetics/', {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch cosmetic catalog');
  }
  return response.json();
};
