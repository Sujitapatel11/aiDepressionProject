/**
 * DORMANT API CLIENT WRAPPER (Phase 1 Infrastructure)
 */

import { getApiUrl } from './api';

export { getApiUrl };

export const apiClient = {
  getApiUrl: (path) => getApiUrl(path),
  
  // Dormant request wrapper placeholder (inactive during Phase 1)
  request: async () => {
    throw new Error('API network calls are disabled during Phase 1 Infrastructure phase.');
  },
};

export default apiClient;
