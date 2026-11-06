import { describe, expect, it } from 'vitest';
import {
  MAX_RECONCILE_DRIFT_SECONDS,
  formatClock,
  isOutOfSync,
  playbackTarget,
} from './soulTubePlayback';

describe('playbackTarget', () => {
  it('returns the stored position when paused', () => {
    expect(playbackTarget({ is_playing: false, position_seconds: 42 }, 0, 999999)).toEqual({
      position: 42,
      playing: false,
    });
  });

  it('adds elapsed time while playing', () => {
    const target = playbackTarget({ is_playing: true, position_seconds: 10 }, 1000, 6000);
    expect(target.playing).toBe(true);
    expect(target.position).toBe(15);
  });

  it('caps elapsed drift so a sleeping tab does not jump far ahead', () => {
    const target = playbackTarget(
      { is_playing: true, position_seconds: 0 },
      0,
      (MAX_RECONCILE_DRIFT_SECONDS + 60) * 1000,
    );
    expect(target.position).toBe(MAX_RECONCILE_DRIFT_SECONDS);
  });

  it('never returns a negative position', () => {
    expect(playbackTarget({ is_playing: false, position_seconds: -30 }).position).toBe(0);
  });

  it('handles missing snapshots safely', () => {
    expect(playbackTarget(null)).toEqual({ position: 0, playing: false });
  });
});

describe('isOutOfSync', () => {
  it('ignores small differences inside the tolerance', () => {
    expect(isOutOfSync(10, 11, 1.5)).toBe(false);
  });

  it('flags larger differences', () => {
    expect(isOutOfSync(10, 13, 1.5)).toBe(true);
  });

  it('handles invalid values without throwing', () => {
    expect(isOutOfSync(Number.NaN, 10)).toBe(false);
  });
});

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(0)).toBe('0:00');
  });

  it('clamps invalid values', () => {
    expect(formatClock(-4)).toBe('0:00');
    expect(formatClock('nope')).toBe('0:00');
  });
});
