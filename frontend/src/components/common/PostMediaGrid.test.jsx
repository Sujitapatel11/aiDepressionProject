import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SafeVideo } from './PostMediaGrid';

class MockIntersectionObserver {
  static instances = [];

  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    MockIntersectionObserver.instances.push(this);
  }

  intersect() {
    this.callback([{ isIntersecting: true }]);
  }
}

describe('SafeVideo lazy loading', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts loading only near the viewport and observes a changed source', () => {
    const { rerender } = render(<SafeVideo src="/media/first.mp4" />);

    expect(screen.queryByLabelText('Video')).not.toBeInTheDocument();
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    act(() => MockIntersectionObserver.instances[0].intersect());
    expect(screen.getByLabelText('Video')).toHaveAttribute('src', expect.stringContaining('/media/first.mp4'));

    rerender(<SafeVideo src="/media/second.mp4" />);

    // A new source must get a fresh observer instead of remaining stuck in
    // the previous source's loaded state.
    expect(MockIntersectionObserver.instances).toHaveLength(2);
    expect(MockIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(screen.queryByLabelText('Video')).not.toBeInTheDocument();

    act(() => MockIntersectionObserver.instances[1].intersect());
    expect(screen.getByLabelText('Video')).toHaveAttribute('src', expect.stringContaining('/media/second.mp4'));
  });

  it('uses a preload margin so media can begin loading shortly before visibility', () => {
    render(<SafeVideo src="/media/clip.mp4" />);
    expect(MockIntersectionObserver.instances[0].options).toMatchObject({ rootMargin: '200px' });
  });
});
