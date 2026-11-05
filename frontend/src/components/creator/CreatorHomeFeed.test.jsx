import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import CreatorHomeFeed from './CreatorHomeFeed';

// The API layer is fully mocked: tests own every response shape.
vi.mock('../../services/api', () => ({ api: vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockUseAuth = useAuth;
const mockApi = api;

const POST_ID_A = 'a0000000-0000-0000-0000-00000000000a';
const POST_ID_B = 'b0000000-0000-0000-0000-00000000000b';

const makePost = (id, caption, extras = {}) => ({
  id,
  creator_username: 'river_light',
  creator_display_name: 'River',
  creator_avatar: '',
  content_type: 'text',
  caption,
  media_url: '',
  hashtags: [],
  category: '',
  status: 'published',
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  likes_count: 2,
  comments_count: 1,
  shares_count: 0,
  views_count: 0,
  liked_by_me: false,
  followed_by_me: false,
  bookmarked_by_me: false,
  media: [],
  ...extras,
});

const feedResponse = (results, next = null) => ({
  ok: true,
  status: 200,
  json: async () => ({ count: results.length, next, previous: null, results }),
});

const commentsResponse = (results, next = null) => ({
  ok: true,
  status: 200,
  json: async () => ({ count: results.length, next, results }),
});

const renderFeed = (props = {}) =>
  render(
    <MemoryRouter>
      <CreatorHomeFeed {...props} />
    </MemoryRouter>
  );

beforeEach(() => {
  mockUseAuth.mockReturnValue({ token: 'test-token-123' });
  mockApi.mockReset();
});

describe('CreatorHomeFeed', () => {
  it('renders posts after loading skeletons resolve', async () => {
    mockApi.mockResolvedValueOnce(feedResponse([makePost(POST_ID_A, 'It is a soft morning.')]));
    renderFeed();
    expect(await screen.findByText(/It is a soft morning\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /soul world/i })).toHaveAttribute('href', '/world');
  });

  it('shows the feed tabs and switches tab with a fresh request', async () => {
    mockApi.mockResolvedValue(feedResponse([makePost(POST_ID_A, 'Trending post.')]));
    renderFeed();
    await screen.findByText(/Trending post\./);
    expect(mockApi).toHaveBeenLastCalledWith('GET', expect.stringContaining('/creators/feed/for-you/'));

    await userEvent.click(screen.getByRole('tab', { name: 'Latest' }));
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith('GET', expect.stringContaining('/creators/feed/latest/'))
    );
  });

  it('appends page two without duplicates and marks end of feed', async () => {
    const postA = makePost(POST_ID_A, 'First page post.');
    const postB = makePost(POST_ID_B, 'Second page post.');
    // Server returns post A again on page two (it shifted mid-scroll) — the
    // client must keep only one copy.
    mockApi
      .mockImplementationOnce(() => feedResponse([postA], '/api/creators/feed/latest/?page=2&page_size=10'))
      .mockImplementationOnce(() => feedResponse([postA, postB], null));

    renderFeed();
    await screen.findByText(/First page post\./);

    const loadMore = screen.getByRole('button', { name: /load more posts/i });
    await userEvent.click(loadMore);

    await waitFor(() => expect(screen.getByText(/Second page post\./)).toBeInTheDocument());
    const occurrences = screen.getAllByText(/First page post\./).length;
    expect(occurrences).toBe(1);
    expect(await screen.findByText(/end of the feed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more posts/i })).not.toBeInTheDocument();
  });

  it('requests the next page when loading more', async () => {
    mockApi
      .mockImplementationOnce(() => feedResponse([makePost(POST_ID_A, 'Page one.')], '/api/creators/feed/latest/?page=2'))
      .mockImplementationOnce(() => feedResponse([makePost(POST_ID_B, 'Page two.')], null));
    renderFeed();
    await screen.findByText(/Page one\./);
    await userEvent.click(screen.getByRole('button', { name: /load more posts/i }));
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith('GET', expect.stringMatching(/feed\/for-you\/\?page=2&page_size=10/))
    );
  });

  it('keeps loaded posts and offers retry when the next page fails', async () => {
    mockApi
      .mockImplementationOnce(() => feedResponse([makePost(POST_ID_A, 'Still readable.')], '/api/creators/feed/latest/?page=2'))
      .mockImplementationOnce(() => ({ ok: false, status: 502, json: async () => ({}) }));
    renderFeed();
    await screen.findByText(/Still readable\./);
    await userEvent.click(screen.getByRole('button', { name: /load more posts/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/feed could not be loaded/i)).toBeInTheDocument();
    // Page 1 posts must still be visible while the error banner is shown.
    expect(screen.getByText(/Still readable\./)).toBeInTheDocument();

    // Retry must re-request page 2 (not page 1), appending to the existing posts.
    mockApi.mockImplementationOnce(() => feedResponse([makePost(POST_ID_B, 'Recovered.')], null));
    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(/Recovered\./)).toBeInTheDocument();
    // Page 1 posts must still be present after page 2 appended successfully.
    expect(screen.getByText(/Still readable\./)).toBeInTheDocument();
    // Confirm retry targeted page 2, not page 1.
    expect(mockApi).toHaveBeenLastCalledWith('GET', expect.stringMatching(/feed\/for-you\/\?page=2&page_size=10/));
  });

  it('shows the following-tab empty state when the user follows nobody', async () => {
    mockApi.mockResolvedValue(feedResponse([]));
    renderFeed();
    await userEvent.click(screen.getByRole('tab', { name: 'Following' }));
    expect(await screen.findByText(/you're not following anyone yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discover creators/i })).toBeInTheDocument();
  });

  it('shows an error state with retry when the first page fails', async () => {
    mockApi.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    renderFeed();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('CreatorFeedPostCard interactions', () => {
  const setupCard = (post) => {
    // Feed resolves first page with one post; comment list resolves empty.
    mockApi
      .mockImplementationOnce(() => feedResponse([post]))
      .mockImplementation(() => commentsResponse([]));
    return renderFeed();
  };
  const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('likes a post optimistically and reverts on failure', async () => {
    setupCard(makePost(POST_ID_A, 'Likeable post.'));
    expect(await screen.findByRole('button', { name: /like this post/i })).toBeInTheDocument();

    // Like succeeds: optimistic update shows liked state.
    mockApi.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ liked: true, created: true }) });
    await userEvent.click(screen.getByRole('button', { name: /like this post/i }));
    expect(screen.getByRole('button', { name: /unlike this post/i })).toHaveAttribute('aria-pressed', 'true');
    expect(mockApi).toHaveBeenLastCalledWith('POST', expect.stringContaining(`posts/${POST_ID_A}/like/`));

    // Unlike fails: optimistic unlike is reverted — post stays liked.
    // previous.liked was true, so rollback restores liked_by_me=true.
    mockApi.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });
    await userEvent.click(screen.getByRole('button', { name: /unlike this post/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /unlike this post/i })).toHaveAttribute('aria-pressed', 'true')
    );
    expect(mockApi).toHaveBeenLastCalledWith('DELETE', expect.stringContaining(`posts/${POST_ID_A}/like/`));
  });

  it('follows a creator optimistically and rolls back on failure', async () => {
    setupCard(makePost(POST_ID_A, 'Followable creator.'));
    const followButton = await screen.findByRole('button', { name: /follow river/i });
    expect(followButton.getAttribute('aria-pressed')).toBe('false');

    // Follow succeeds: optimistic update shows following state.
    mockApi.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ following: true, created: true }) });
    await userEvent.click(followButton);
    expect(screen.getByRole('button', { name: /unfollow river/i })).toHaveAttribute('aria-pressed', 'true');
    expect(mockApi).toHaveBeenLastCalledWith(
      'POST',
      expect.stringContaining('/creators/profiles/river_light/follow/')
    );

    // Unfollow fails: optimistic unfollow is reverted — creator stays followed.
    // previous.followed was true, so rollback restores followed_by_me=true.
    mockApi.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });
    await userEvent.click(screen.getByRole('button', { name: /unfollow river/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /unfollow river/i })).toHaveAttribute('aria-pressed', 'true')
    );
    expect(mockApi).toHaveBeenLastCalledWith(
      'DELETE',
      expect.stringContaining('/creators/profiles/river_light/follow/')
    );
  });

  it('toggles a bookmark optimistically and persists via API', async () => {
    setupCard(makePost(POST_ID_A, 'Bookmark me.'));
    const bookmarkButton = await screen.findByRole('button', { name: /bookmark privately/i });

    mockApi.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ bookmarked: true, created: true }) });
    await userEvent.click(bookmarkButton);
    expect(screen.getByRole('button', { name: /remove bookmark/i })).toHaveAttribute('aria-pressed', 'true');
    expect(mockApi).toHaveBeenLastCalledWith('POST', expect.stringContaining(`posts/${POST_ID_A}/bookmark/`));

    mockApi.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ bookmarked: false }) });
    await userEvent.click(screen.getByRole('button', { name: /remove bookmark/i }));
    expect(screen.getByRole('button', { name: /bookmark privately/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits a comment and appends it to the thread', async () => {
    setupCard(makePost(POST_ID_A, 'Commentable.'));
    const commentsButton = await screen.findByRole('button', { name: /1$/ });
    await userEvent.click(commentsButton);
    await screen.findByText(/no comments yet/i);

    mockApi.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'c1', author_label: 'SoulCare member', author_username: 'me', author_is_me: true, body: 'proud of you.' }),
    });
    await userEvent.type(screen.getByLabelText(/write a comment/i), 'proud of you.');
    await userEvent.click(screen.getByRole('button', { name: /^post$/i }));

    expect(mockApi).toHaveBeenLastCalledWith('POST', expect.stringContaining(`posts/${POST_ID_A}/comments/`), { body: 'proud of you.' });
    expect(await screen.findByText('proud of you.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete your comment/i })).toBeInTheDocument();
  });

  it('rejects empty comment submission without calling the API', async () => {
    setupCard(makePost(POST_ID_A, 'Commentable.'));
    const commentsButton = await screen.findByRole('button', { name: /1$/ });
    await userEvent.click(commentsButton);
    await screen.findByText(/no comments yet/i);
    const beforeCalls = mockApi.mock.calls.length;

    await userEvent.type(screen.getByLabelText(/write a comment/i), '   ');
    await userEvent.click(screen.getByRole('button', { name: /^post$/i }));
    await sleep();
    expect(mockApi.mock.calls.length).toBe(beforeCalls);
  });

  it('opens comments, shows authors and paginates the thread', async () => {
    const comment = { id: 'c1', author_label: 'Creator', author_username: 'river_light', author_is_me: false, body: 'From the author.' };
    mockApi
      .mockImplementationOnce(() => feedResponse([makePost(POST_ID_A, 'Threaded post.')]))
      .mockImplementationOnce(() => commentsResponse([comment], '/api/creators/posts/next/'))
      .mockImplementationOnce(() => feedResponse([]))
      .mockImplementation(() => ({ ok: true, status: 200, json: async () => ({ count: 0, next: null, results: [] }) }));

    renderFeed();
    await screen.findByText(/Threaded post\./);
    await userEvent.click(screen.getByRole('button', { name: /1$/ }));
    expect(await screen.findByText('From the author.')).toBeInTheDocument();
    // The comment section renders "Creator @river_light" as a single label.
    // getAllByText handles the username appearing in both the post header and comment.
    expect(screen.getAllByText(/@river_light/).length).toBeGreaterThanOrEqual(1);

    mockApi.mockImplementation((method, path) => {
      if (path.includes('/comments/')) return commentsResponse([{ ...comment, id: 'c2' }], null);
      return feedResponse([]);
    });
    await userEvent.click(screen.getByRole('button', { name: /more comments/i }));
    expect(await screen.findByText(/from the author\./i)).toBeInTheDocument();
  });
});
