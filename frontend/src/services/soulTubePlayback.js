/**
 * Server-authoritative playback helpers for SoulTube.
 *
 * The backend stores `{ is_playing, position_seconds, server_timestamp }`
 * snapshots. `position_seconds` is already the effective position at the
 * server's timestamp, so clients only add the time elapsed since the snapshot
 * was received. This keeps a late-joining viewer close to the host without
 * trusting the viewer's wall clock to match the server's.
 */

export const MAX_RECONCILE_DRIFT_SECONDS = 10;

export function playbackTarget(playback, receivedAt = Date.now(), now = Date.now()) {
  const base = Math.max(0, Number(playback?.position_seconds) || 0);
  const playing = Boolean(playback?.is_playing);
  if (!playing) {
    return { position: base, playing: false };
  }
  const elapsed = Math.max(0, (now - receivedAt) / 1000);
  return {
    position: base + Math.min(elapsed, MAX_RECONCILE_DRIFT_SECONDS),
    playing: true,
  };
}

export function isOutOfSync(currentTime, targetPosition, tolerance = 1.5) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(targetPosition)) return false;
  return Math.abs(currentTime - targetPosition) > tolerance;
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
