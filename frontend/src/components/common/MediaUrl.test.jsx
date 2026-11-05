import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';

import { resolveMediaUrl, getApiUrl } from '../../services/api';
import PostMediaGrid from './PostMediaGrid';

// Regression coverage for the duplicated "/api/api/" media prefix:
// serializers emit "/api/media/serve/<id>/" while getApiUrl() already adds
// the "/api" mount point, so resolving them naively produced
// "/api/api/media/serve/..." (404) in dev AND against an absolute origin.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveMediaUrl', () => {
  it('keeps a backend /api/media path intact under the default /api base', () => {
    expect(resolveMediaUrl('/api/media/serve/abc/')).toBe('/api/media/serve/abc/');
    expect(resolveMediaUrl('/api/media/serve/abc/?at=tok:1')).toBe('/api/media/serve/abc/?at=tok:1');
    expect(resolveMediaUrl('/api/media/serve/abc/')).not.toContain('/api/api/');
  });

  it('adds the /api prefix when the backend path omits it', () => {
    expect(resolveMediaUrl('/media/serve/abc/')).toBe('/api/media/serve/abc/');
  });

  it('resolves to a single /api against an absolute production origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://aidepressionproject.onrender.com');
    expect(resolveMediaUrl('/api/media/serve/abc/?at=tok'))
      .toBe('https://aidepressionproject.onrender.com/api/media/serve/abc/?at=tok');
    expect(resolveMediaUrl('/media/serve/abc/'))
      .toBe('https://aidepressionproject.onrender.com/api/media/serve/abc/');
  });

  it('resolves to a single /api when the base already ends with /api', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api');
    expect(resolveMediaUrl('/api/media/serve/abc/'))
      .toBe('https://api.example.com/api/media/serve/abc/');
  });

  it('passes external and browser-generated URLs through unchanged', () => {
    expect(resolveMediaUrl('https://cdn.example.com/photo.png')).toBe('https://cdn.example.com/photo.png');
    expect(resolveMediaUrl('//cdn.example.com/photo.png')).toBe('//cdn.example.com/photo.png');
    expect(resolveMediaUrl('blob:https://app/123')).toBe('blob:https://app/123');
    expect(resolveMediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('tolerates empty and nullish values', () => {
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeUndefined();
  });

  it('never duplicates /api for any supported input shape', () => {
    const samples = ['/api/media/serve/x/', '/media/serve/x/', '/api/media/serve/x/?at=a:b'];
    samples.forEach((sample) => {
      expect(resolveMediaUrl(sample)).not.toMatch(/\/api\/api\//);
    });
    expect(getApiUrl('/media/serve/x/')).toBe('/api/media/serve/x/');
  });
});

describe('PostMediaGrid media URLs', () => {
  it('renders a single /api prefix for an image asset', () => {
    const { container } = render(
      <PostMediaGrid
        post={{
          content_type: 'image',
          media: [{ id: 'm1', kind: 'image', url: '/api/media/serve/m1/', preview_url: '/api/media/serve/m1/?at=abc' }],
        }}
      />
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/api/media/serve/m1/?at=abc');
    expect(img.getAttribute('src')).not.toContain('/api/api/');
  });

  it('renders a single /api prefix for a video asset', () => {
    const { container } = render(
      <PostMediaGrid
        post={{
          content_type: 'video',
          media: [{ id: 'v1', kind: 'video', url: '/api/media/serve/v1/', preview_url: '/api/media/serve/v1/' }],
        }}
      />
    );
    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video.getAttribute('src')).toBe('/api/media/serve/v1/');
    expect(video.getAttribute('src')).not.toContain('/api/api/');
  });

  it('passes legacy absolute media_url values through unchanged', () => {
    const { container } = render(
      <PostMediaGrid
        post={{ content_type: 'image', media: [], media_url: 'https://cdn.example.com/legacy.png' }}
      />
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/legacy.png');
  });
});
