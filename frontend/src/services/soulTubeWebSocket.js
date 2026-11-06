/**
 * SoulTube room WebSocket client.
 *
 * Authentication reuses the single-use ticket from POST /api/chat/ws-ticket/,
 * so every reconnect fetches a fresh ticket. Callbacks are intentionally
 * narrow: the room page owns all state and applies each event explicitly.
 */
import { api } from './api';
import { getWsHost } from './chatWebSocket';

export class SoulTubeSocket {
  constructor(code, callbacks = {}) {
    this.code = code;
    this.callbacks = callbacks;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 6;
    this.isManualDisconnect = false;
    this.roomClosed = false;
  }

  reportStatus(statusText, connected) {
    if (typeof this.callbacks.onStatusChange === 'function') {
      this.callbacks.onStatusChange(statusText, connected);
    }
  }

  async connect() {
    if (this.isManualDisconnect || this.roomClosed) return;
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try { this.ws.close(); } catch (err) { /* already closed */ }
      this.ws = null;
    }

    this.reportStatus('Connecting…', false);

    const response = await api('POST', '/chat/ws-ticket/');
    if (this.isManualDisconnect || this.roomClosed) return;
    if (!response) {
      this.reportStatus('Could not reach the room service', false);
      this.scheduleReconnect();
      return;
    }
    if (!response.ok) {
      this.reportStatus('Could not authenticate the room connection', false);
      return;
    }

    let ticket = null;
    try {
      ticket = (await response.json()).ticket;
    } catch (err) {
      ticket = null;
    }
    if (typeof ticket !== 'string' || !ticket) {
      this.reportStatus('Could not authenticate the room connection', false);
      return;
    }

    const url = `${getWsHost()}/ws/soultube/${encodeURIComponent(this.code)}/?ticket=${encodeURIComponent(ticket)}`;
    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.reportStatus('Live', true);
    };

    this.ws.onclose = (event) => {
      if (this.isManualDisconnect) return;
      if (this.roomClosed) return;
      if (event && event.code === 4000) {
        this.handleRoomClosed();
        return;
      }
      if (event && event.code === 4003) {
        this.reportStatus('You are no longer a participant in this room', false);
        return;
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // The close handler owns retries; avoid duplicate status churn.
    };

    this.ws.onmessage = (event) => {
      let data = null;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'ping') {
        this.sendRaw({ type: 'pong' });
        return;
      }
      if (data.type === 'pong') return;

      if (data.type === 'sync') {
        if (this.callbacks.onSync) this.callbacks.onSync(data.playback || null);
      } else if (data.type === 'chat.message') {
        if (this.callbacks.onChat) this.callbacks.onChat(data.message);
      } else if (data.type === 'playback') {
        if (this.callbacks.onPlayback) this.callbacks.onPlayback(data.playback || null);
      } else if (data.type === 'participants') {
        if (this.callbacks.onParticipants) this.callbacks.onParticipants(data.participants || []);
      } else if (data.type === 'queue.updated') {
        if (this.callbacks.onQueue) this.callbacks.onQueue(data.queue || []);
      } else if (data.type === 'room.video') {
        if (this.callbacks.onRoomVideo) {
          this.callbacks.onRoomVideo(data.video || null, data.playback || null, data.queue || []);
        }
      } else if (data.type === 'room.closed') {
        this.handleRoomClosed();
      } else if (data.type === 'error') {
        if (this.callbacks.onError) this.callbacks.onError(data.detail || 'The room rejected that action.');
      }
    };
  }

  handleRoomClosed() {
    this.roomClosed = true;
    this.reportStatus('Room closed', false);
    if (this.callbacks.onClosed) this.callbacks.onClosed();
    this.disconnect(true);
  }

  sendRaw(payload) {
    const openState = typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1;
    if (this.ws && this.ws.readyState === openState) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  sendChat(body) {
    return this.sendRaw({ type: 'chat', body });
  }

  sendPlayback({ isPlaying, positionSeconds }) {
    return this.sendRaw({
      type: 'playback',
      is_playing: Boolean(isPlaying),
      position_seconds: Math.max(0, Number(positionSeconds) || 0),
    });
  }

  requestSync() {
    return this.sendRaw({ type: 'sync' });
  }

  scheduleReconnect() {
    if (this.isManualDisconnect || this.roomClosed) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.reportStatus('Disconnected — refresh to reconnect', false);
      return;
    }
    const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts += 1;
    this.reportStatus(`Reconnecting in ${Math.round(delayMs / 1000)}s…`, false);
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect(keepRoomClosed = false) {
    this.isManualDisconnect = true;
    if (!keepRoomClosed) this.roomClosed = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try { this.ws.close(); } catch (err) { /* already closed */ }
      this.ws = null;
    }
  }
}
