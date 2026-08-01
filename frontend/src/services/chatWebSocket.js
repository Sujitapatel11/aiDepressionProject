/**
 * WebSocket Chat Client for SoulCare
 * Resolves WebSocket host dynamically from VITE_WS_BASE_URL or VITE_API_BASE_URL.
 */

export function getWsHost() {
  const envWs = (import.meta.env.VITE_WS_BASE_URL || '').trim();
  if (envWs) {
    return envWs.replace(/\/+$/, '');
  }

  const envApi = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envApi.startsWith('http')) {
    try {
      const parsed = new URL(envApi);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${parsed.host}`;
    } catch (e) {}
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

export class ChatWebSocketClient {
  constructor(connectionId, token, callbacks = {}) {
    this.connectionId = connectionId;
    this.token = token;
    this.callbacks = callbacks;
    this.ws = null;
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.ws) {
      this.disconnect();
    }

    const host = getWsHost();
    const url = `${host}/ws/chat/${this.connectionId}/?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('Online', true);
      }
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('Disconnected', false);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
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
        } else if (this.callbacks.onMessage) {
          this.callbacks.onMessage(data);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };
  }

  sendMessage(messageText) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message: messageText }));
    }
  }

  sendTyping(isTyping = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
