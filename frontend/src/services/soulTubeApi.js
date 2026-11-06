/**
 * SoulTube REST client.
 *
 * Every function resolves to `{ ok, status, data, error }` so pages can render
 * honest loading/empty/error states instead of throwing or fabricating data.
 */
import { api } from './api';

function extractError(data, status) {
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'detail') continue;
      if (Array.isArray(value) && value.length) return String(value[0]);
      if (typeof value === 'string' && value) return value;
    }
    if (typeof data.detail === 'string' && data.detail) return data.detail;
  }
  if (status === 401) return 'Please sign in again to use SoulTube.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'That room could not be found.';
  if (status === 409) return 'That room is no longer available.';
  if (status === 429) return 'That was a little too fast. Try again in a moment.';
  return 'Something went wrong. Please try again.';
}

async function request(method, path, body = null) {
  const response = await api(method, path, body);
  if (!response) {
    return { ok: false, status: 0, data: null, error: 'Network error. Check your connection and try again.' };
  }
  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }
  }
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: extractError(data, response.status) };
  }
  return { ok: true, status: response.status, data };
}

export function listRooms({ mine = false, page = 1 } = {}) {
  const params = new URLSearchParams();
  if (mine) params.set('mine', '1');
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return request('GET', `/soultube/rooms/${query ? `?${query}` : ''}`);
}

export function createRoom(payload) {
  return request('POST', '/soultube/rooms/create/', payload);
}

export function getRoom(code) {
  return request('GET', `/soultube/rooms/${encodeURIComponent(code)}/`);
}

export function joinRoom(code) {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/join/`);
}

export function leaveRoom(code) {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/leave/`);
}

export function closeRoom(code) {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/close/`);
}

export function listMessages(code) {
  return request('GET', `/soultube/rooms/${encodeURIComponent(code)}/messages/`);
}

export function sendRoomMessage(code, body) {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/messages/`, { body });
}

export function addQueueVideo(code, videoAssetId, title = '') {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/queue/`, {
    video_asset_id: videoAssetId,
    title,
  });
}

export function removeQueueVideo(code, itemId) {
  return request('DELETE', `/soultube/rooms/${encodeURIComponent(code)}/queue/${itemId}/`);
}

export function playQueueVideo(code, itemId) {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/queue/${itemId}/play/`);
}

export function reorderQueue(code, itemIds) {
  return request('POST', `/soultube/rooms/${encodeURIComponent(code)}/queue/reorder/`, {
    item_ids: itemIds,
  });
}

export function updatePlayback(code, { isPlaying, positionSeconds }) {
  return request('PATCH', `/soultube/rooms/${encodeURIComponent(code)}/playback/`, {
    is_playing: Boolean(isPlaying),
    position_seconds: Math.max(0, Number(positionSeconds) || 0),
  });
}

export function listMyVideos({ page = 1 } = {}) {
  const params = new URLSearchParams({ kind: 'video', page_size: '20' });
  if (page > 1) params.set('page', String(page));
  return request('GET', `/media/library/?${params.toString()}`);
}
