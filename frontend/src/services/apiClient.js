/**
 * DORMANT API CLIENT WRAPPER (Phase 1 Infrastructure)
 * 
 * NOTE: As per Phase 1 strict safety constraints:
 * - NO network calls are executed in Phase 1.
 * - NO authentication, JWT tokens, or refresh logic is executed.
 * 
 * This file serves strictly as a structural placeholder wrapper for Phase 2+.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const apiClient = {
  getApiUrl: (path) => `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`,
  
  // Dormant request wrapper placeholder (inactive during Phase 1)
  request: async () => {
    throw new Error('API network calls are disabled during Phase 1 Infrastructure phase.');
  },
};

export default apiClient;
