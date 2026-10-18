/**
 * WebSocket Chat Client for SoulCare
 * Resolves WebSocket host dynamically from VITE_WS_BASE_URL or VITE_API_BASE_URL.
 * Includes proactive token validation, single-flight refresh, close 4003 handling,
 * and exponential backoff reconnection.
 */
import { refreshAccessToken, getStoredToken } from './api.js';

export function getWsHost() {
  const envWs = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_BASE_URL || '').trim();
  if (envWs) {
    return envWs.replace(/\/+$/, '');
  }

  const envApi = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envApi.startsWith('http')) {
    try {
      const parsed = new URL(envApi);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${parsed.host}`;
    } catch (e) {}
  }

  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' && window.location.host ? window.location.host : 'localhost:8000';
  return `${proto}//${host}`;
}

export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload;
    if (typeof atob === 'function') {
      jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } else if (typeof Buffer !== 'undefined') {
      jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    } else {
      return null;
    }
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function isTokenExpiringSoon(token, bufferSeconds = 60) {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) {
    return true;
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= (nowInSeconds + bufferSeconds);
}

export class ChatWebSocketClient {
  constructor(connectionId, token, callbacks = {}) {
    this.connectionId = connectionId;
    this.token = token || getStoredToken();
    this.callbacks = callbacks;
    this.ws = null;
    this.pingInterval = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 6;
    this.auth4003Retried = false;
    this.isManualDisconnect = false;
  }

  reportStatus(statusText, isOnline) {
    if (this.callbacks && typeof this.callbacks.onStatusChange === 'function') {
      this.callbacks.onStatusChange(statusText, isOnline);
    }
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async ensureValidToken() {
    let token = this.token || getStoredToken();
    if (!token || isTokenExpiringSoon(token, 60)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = refreshed;
        this.token = refreshed;
      }
    }
    return token;
  }

  async connect() {
    if (this.isManualDisconnect) return;
    this.clearReconnectTimer();

    if (this.ws) {
      this.stopHeartbeat();
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.reportStatus('Connecting...', false);

    // Requirement 4: Ensure access token is valid before connect & reconnect
    const validToken = await this.ensureValidToken();
    if (!validToken || isTokenExpiringSoon(validToken, 0)) {
      console.warn('[WebSocket] Cannot connect: access token expired and refresh failed.');
      this.reportStatus('Session expired, please log in again', false);
      return;
    }
    this.token = validToken;

    const host = getWsHost();
    const url = `${host}/ws/chat/${this.connectionId}/?token=${encodeURIComponent(this.token)}`;

    // Note: NEVER log tokens (Requirement 7)
    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error('[WebSocket] Failed to instantiate WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.auth4003Retried = false;
      this.reportStatus('Online', true);
      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (this.isManualDisconnect) return;
      this.handleClose(event);
    };

    this.ws.onerror = () => {
      console.error('[WebSocket] Error encountered');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping' || data.type === 'pong') {
          return;
        }
        if (data.type === 'typing') {
          if (this.callbacks.onTyping) {
            this.callbacks.onTyping(data.sender_id, data.is_typing);
          }
        } else if (data.type === 'message' || data.type === 'chat.message') {
          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(data);
          }
        } else if (this.callbacks.onMessage) {
          this.callbacks.onMessage(data);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };
  }

  async handleClose(event) {
    const code = event ? event.code : null;

    // Requirement 5: Handle close code 4003 - refresh token and reconnect ONCE
    if (code === 4003) {
      if (!this.auth4003Retried) {
        this.auth4003Retried = true;
        this.reportStatus('Refreshing session...', false);
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          this.token = refreshed;
          this.connect();
          return;
        }
      }
      console.warn('[WebSocket] Closed with code 4003; session expired.');
      this.reportStatus('Session expired, please log in again', false);
      return;
    }

    // Requirement 6: Reconnect with exponential backoff (1s, 2s, 4s... capped at 30s, max 6 attempts)
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.isManualDisconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`[WebSocket] Max reconnect attempts (${this.maxReconnectAttempts}) reached.`);
      this.reportStatus('Disconnected', false);
      return;
    }

    const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts += 1;
    this.reportStatus(`Reconnecting in ${Math.round(delayMs / 1000)}s...`, false);

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delayMs);
  }

  sendMessage(messageText) {
    const openState = typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1;
    if (this.ws && this.ws.readyState === openState) {
      this.ws.send(JSON.stringify({ message: messageText }));
    }
  }

  sendTyping(isTyping = true) {
    const openState = typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1;
    if (this.ws && this.ws.readyState === openState) {
      this.ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      const openState = typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1;
      if (this.ws && this.ws.readyState === openState) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
