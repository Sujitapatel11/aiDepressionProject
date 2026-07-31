/**
 * DORMANT WEBSOCKET CLIENT WRAPPER (Phase 1 Infrastructure)
 * 
 * NOTE: As per Phase 1 strict safety constraints:
 * - NO WebSocket connections are opened or attempted in Phase 1.
 * 
 * This file serves strictly as a structural placeholder wrapper for Phase 4+.
 */

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000';

export const wsClient = {
  getWsUrl: (connectionId) => `${WS_BASE_URL}/ws/chat/${connectionId}/`,
  
  // Dormant connect placeholder (inactive during Phase 1)
  connect: () => {
    console.warn('WebSocket connection attempt suppressed during Phase 1 Infrastructure phase.');
    return null;
  },
};

export default wsClient;
