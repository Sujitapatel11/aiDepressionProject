/**
 * WebSocket Chat Client for SoulCare
 * Resolves WebSocket host dynamically from VITE_WS_BASE_URL or VITE_API_BASE_URL.
 * Requests a single-use authentication ticket for each connection and reconnect.
 * Includes close 4003 handling and exponential backoff reconnection.
 */
import { api } from './api.js';

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

export class ChatWebSocketClient {
  constructor(connectionId, callbacks = {}) {
    this.connectionId = connectionId;
    this.callbacks = callbacks;
    this.ws = null;
    this.pingInterval = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 6;
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

    const response = await api('POST', '/chat/ws-ticket/');
    if (this.isManualDisconnect) return;
    if (!response || !response.ok) {
      this.reportStatus('Session expired, please log in again', false);
      return;
    }

    let ticket;
    try {
      ticket = (await response.json()).ticket;
    } catch (e) {
      ticket = null;
    }
    if (typeof ticket !== 'string' || !ticket) {
      this.reportStatus('Unable to authenticate chat connection', false);
      return;
    }

    const host = getWsHost();
    const url = `${host}/ws/chat/${encodeURIComponent(this.connectionId)}/?ticket=${encodeURIComponent(ticket)}`;

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
        if (data.type === 'error') {
          if (this.callbacks.onError) {
            this.callbacks.onError(data.detail || 'Message could not be sent.');
          }
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

    if (code === 4003) {
      this.reportStatus('Unable to authenticate chat connection', false);
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
      return true;
    }
    return false;
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
