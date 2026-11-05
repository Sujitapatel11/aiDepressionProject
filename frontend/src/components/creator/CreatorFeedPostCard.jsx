import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import PostMediaGrid from '../common/PostMediaGrid';
import { useAuth } from '../../hooks/useAuth';

const COMMENTS_PAGE_SIZE = 5;

function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

/**
 * Author avatar with a graceful fallback when the image is missing or broken.
 */
function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  const label = (name || '?').slice(0, 2).toUpperCase();
  if (!src || failed) {
    return (
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-extrabold text-white">
        {label}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`${name || 'Creator'} avatar`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-10 w-10 flex-shrink-0 rounded-full border border-violet-100 object-cover"
    />
  );
}

/**
 * One creator post on the home feed. Owns per-post interaction state
 * (like / follow / bookmark / comments) with optimistic UI + rollback.
 */
export default function CreatorFeedPostCard({ post: initialPost, compact = false }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');

  // Comments sub-state lives here so threads load lazily, one click at a time.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsNext, setCommentsNext] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    // Latest post data replaces draft state, but an open comment thread stays.
    setPost(initialPost);
    setComments([]);
    setCommentsPage(1);
    setCommentsNext(null);
    setCommentsOpen(false);
  }, [initialPost]);

  const requireLogin = useCallback(() => {
    if (!token) {
      navigate('/login');
      return false;
    }
    return true;
  }, [token, navigate]);

  const showNotice = (message) => {
    setNotice(message);
  };

  // ── Follow / Unfollow ────────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (!requireLogin() || busyAction) return;
    const method = post.followed_by_me ? 'DELETE' : 'POST';
    const previous = post.followed_by_me;
    setBusyAction('follow');
    // Optimistic update with rollback on failure.
    setPost((current) => ({ ...current, followed_by_me: !previous }));
    const response = await api(method, `/creators/profiles/${encodeURIComponent(post.creator_username)}/follow/`);
    setBusyAction('');
    if (!response?.ok) {
      setPost((current) => ({ ...current, followed_by_me: previous }));
      showNotice(previous ? 'Still following — unfollow failed.' : 'Follow failed. Please try again.');
      return;
    }
    showNotice(previous ? 'Unfollowed — their posts leave your Following tab.' : 'Following — new posts reach your Following tab.');
  };

  // ── Like / Unlike ────────────────────────────────────────────────────────
  const toggleLike = async () => {
    if (!requireLogin() || busyAction) return;
    const method = post.liked_by_me ? 'DELETE' : 'POST';
    const delta = method === 'POST' ? 1 : -1;
    const previous = { liked: post.liked_by_me, count: post.likes_count };
    setBusyAction('like');
    // Optimistic update with rollback on failure.
    setPost((current) => ({
      ...current,
      liked_by_me: !previous.liked,
      likes_count: Math.max(0, previous.count + delta),
    }));
    const response = await api(method, `/creators/posts/${post.id}/like/`);
    setBusyAction('');
    if (!response?.ok) {
      setPost((current) => ({ ...current, liked_by_me: previous.liked, likes_count: previous.count }));
      showNotice('Could not save your like. Please try again.');
    }
  };

  // ── Bookmark / Remove bookmark (saved posts are private) ─────────────────
  const toggleBookmark = async () => {
    if (!requireLogin() || busyAction) return;
    const method = post.bookmarked_by_me ? 'DELETE' : 'POST';
    const previous = post.bookmarked_by_me;
    setBusyAction('bookmark');
    // Optimistic update with rollback on failure.
    setPost((current) => ({ ...current, bookmarked_by_me: !previous }));
    const response = await api(method, `/creators/posts/${post.id}/bookmark/`);
    setBusyAction('');
    if (!response?.ok) {
      setPost((current) => ({ ...current, bookmarked_by_me: previous }));
      showNotice('Bookmark failed. Please try again.');
      return;
    }
    showNotice(previous ? 'Removed.' : 'Saved privately.');
  };

  // ── Share ────────────────────────────────────────────────────────────────
  const sharePost = async () => {
    if (!requireLogin()) return;
    const url = `${window.location.origin}/creators/${encodeURIComponent(post.creator_username)}/posts/${post.id}`;
    let shared = false;
    let claimed = false;
    // Prefer the native share sheet where the platform offers one.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `A post from @${post.creator_username}`, url });
        shared = true;
        claimed = true;
      } catch (error) {
        shared = error && error.name === 'AbortError';
        // AbortError simply means the user closed the sheet — not a failure notice.
        claimed = shared;
      }
    }
    if (!shared && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        shared = true;
        claimed = true;
      } catch (error) {
        shared = false;
      }
    }
    if (claimed) {
      const recordResponse = await api('POST', `/creators/posts/${post.id}/share/`);
      if (recordResponse?.ok) {
        setPost((current) => ({ ...current, shares_count: current.shares_count + 1 }));
      }
      showNotice(shared ? 'Post link shared.' : '');
    } else {
      // Never claim success when nothing was actually shared.
      showNotice('Sharing is unavailable in this browser.');
    }
  };

  // ── Comments ─────────────────────────────────────────────────────────────
  const loadComments = async (targetPage = 1, append = false) => {
    setCommentsLoading(true);
    setCommentsError('');
    const cancelled = { value: false };
    const response = await api(
      'GET',
      `/creators/posts/${post.id}/comments/?page=${targetPage}&page_size=${COMMENTS_PAGE_SIZE}`
    );
    if (cancelled.value) return null;
    setCommentsLoading(false);
    if (!response?.ok) {
      setCommentsError(append ? 'Could not load more comments.' : 'Comments could not be loaded.');
      return null;
    }
    const data = await response.json();
    const fetched = Array.isArray(data) ? data : data.results || [];
    if (append) {
      setComments((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...fetched.filter((item) => !known.has(item.id))];
      });
    } else {
      setComments(fetched);
    }
    setCommentsPage(targetPage);
    setCommentsNext(data.next ?? null);
    return fetched;
  };

  const toggleComments = async () => {
    if (!commentsOpen) {
      setCommentsOpen(true);
      await loadComments(1, false);
    } else {
      setCommentsOpen(false);
    }
  };

  const loadMoreComments = async () => {
    if (commentsNext && !commentsLoading) await loadComments(commentsPage + 1, true);
  };

  const deleteComment = async (commentId) => {
    if (!requireLogin()) return;
    const response = await api('DELETE', `/creators/comments/${commentId}/delete/`);
    if (response?.ok || response?.status === 204) {
      setComments((current) => current.filter((item) => item.id !== commentId));
      setPost((current) => ({ ...current, comments_count: Math.max(0, current.comments_count - 1) }));
    } else if (response?.status === 403) {
      setCommentsError('You can only delete your own comments.');
    } else {
      setCommentsError('Comment deletion failed. Please try again.');
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!requireLogin()) return;
    const body = commentDraft.trim();
    if (!body) return;
    if (body.length > 1000) {
      setCommentError('Comments must be 1000 characters or fewer.');
      return;
    }
    setCommentError('');
    const response = await api('POST', `/creators/posts/${post.id}/comments/`, { body });
    if (!response?.ok) {
      setCommentError(
        response?.status === 429
          ? 'You already posted a similar comment recently. Please write something new.'
          : 'Comment failed. Please try again.'
      );
      return;
    }
    const created = await response.json();
    setComments((current) => [...current, created]);
    setPost((current) => ({ ...current, comments_count: current.comments_count + 1 }));
    setCommentDraft('');
  };

  const profilePath = `/creators/${encodeURIComponent(post.creator_username)}`;
  const creatorLabel = post.creator_display_name || post.creator_username || 'Creator';

  const cardShell = `rounded-[24px] border border-violet-100 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'} transition hover:border-violet-200`;

  return (
    <article className={cardShell} aria-label={`Post from ${creatorLabel}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(profilePath)} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-full" aria-label={`View ${creatorLabel}'s profile`}>
          <Avatar src={post.creator_avatar} name={post.creator_display_name || post.creator_username} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(profilePath)}
            className="block max-w-full truncate text-sm font-extrabold text-[#302441] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded">
            {creatorLabel}
          </button>
          <p className="text-xs text-violet-500">@{post.creator_username} · {timeAgo(post.published_at)}</p>
        </div>
        <button
          type="button"
          onClick={toggleFollow}
          disabled={busyAction === 'follow'}
          aria-pressed={!!post.followed_by_me}
          aria-label={post.followed_by_me ? `Unfollow ${creatorLabel}` : `Follow ${creatorLabel}`}
          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            post.followed_by_me
              ? 'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
              : 'bg-violet-700 text-white hover:bg-violet-800'
          } disabled:opacity-60`}
        >
          {post.followed_by_me ? 'Following ✓' : 'Follow'}
        </button>
      </div>

      <div className="mt-3">
        <p className="whitespace-pre-line text-sm leading-relaxed text-[#463a5c]">{post.caption}</p>
        {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Post topics">
            {post.hashtags.slice(0, 6).map((tag) => (
              <li key={tag} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">#{tag}</li>
            ))}
          </ul>
        )}
        <PostMediaGrid post={post} className="mt-3" />
      </div>

      {notice && (
        <p className="mt-2 rounded-xl bg-[#f7f2fd] px-3 py-1.5 text-xs font-semibold text-violet-600" role="status" aria-live="polite">
          {notice}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5">
        <button type="button" onClick={toggleLike} disabled={busyAction === 'like'}
          aria-pressed={!!post.liked_by_me}
          aria-label={post.liked_by_me ? 'Unlike this post' : 'Like this post'}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            post.liked_by_me ? 'bg-pink-100 text-pink-600' : 'text-violet-600 hover:bg-violet-50'
          } disabled:opacity-60`}>
          <span aria-hidden="true">{post.liked_by_me ? '❤️' : '🤍'}</span>{post.likes_count}
        </button>
        <button type="button" onClick={toggleComments}
          aria-expanded={commentsOpen}
          aria-controls={`comments-${post.id}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-violet-600 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
          <span aria-hidden="true">💬</span>{post.comments_count}
        </button>
        <button type="button" onClick={toggleBookmark} disabled={busyAction === 'bookmark'}
          aria-pressed={!!post.bookmarked_by_me}
          aria-label={post.bookmarked_by_me ? 'Remove bookmark' : 'Bookmark privately'}
          className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            post.bookmarked_by_me ? 'bg-violet-100 text-violet-700' : 'text-violet-500 hover:bg-violet-50'
          } disabled:opacity-60`}>
          <span aria-hidden="true">{post.bookmarked_by_me ? '🔖' : '📑'}</span>
        </button>
        <button type="button" onClick={sharePost}
          aria-label="Share this post"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-violet-500 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
          <span aria-hidden="true">↗</span>
        </button>
      </div>

      {commentsOpen && (
        <section id={`comments-${post.id}`} className="mt-3 rounded-2xl bg-[#faf7fd] p-3" aria-label="Comments">
          {commentsError && <p className="mb-2 text-xs font-semibold text-rose-600" role="alert">{commentsError}</p>}
          {commentsLoading && comments.length === 0 ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1].map((row) => <div key={row} className="h-4 w-full animate-pulse rounded-full bg-violet-200/60" />)}
            </div>
          ) : (
            <ul className="space-y-2">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start justify-between gap-2 rounded-xl bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-violet-600">
                      {comment.author_label} @{comment.author_username}
                    </p>
                    <p className="break-words text-sm text-[#5d5271]">{comment.body}</p>
                  </div>
                  {comment.author_is_me && (
                    <button type="button" onClick={() => deleteComment(comment.id)}
                      aria-label="Delete your comment"
                      className="flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                      ✕
                    </button>
                  )}
                </li>
              ))}
              {comments.length === 0 && !commentsLoading && (
                <li className="py-2 text-xs text-violet-500">No comments yet — start gently.</li>
              )}
            </ul>
          )}
          {commentsNext && (
            <button type="button" onClick={loadMoreComments} disabled={commentsLoading}
              className="mt-2 text-xs font-extrabold text-violet-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60">
              {commentsLoading ? 'Loading…' : 'More comments'}
            </button>
          )}

          <form onSubmit={submitComment} className="mt-2 flex items-end gap-2">
            <label htmlFor={`comment-input-${post.id}`} className="sr-only">Write a comment</label>
            <textarea
              id={`comment-input-${post.id}`}
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              rows={1}
              maxLength={1000}
              placeholder="Share something supportive…"
              className="min-h-[38px] flex-1 resize-y rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-[#463a5c] placeholder:text-violet-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button type="submit"
              className="rounded-xl bg-violet-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-violet-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
              Post
            </button>
          </form>
          {commentError && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{commentError}</p>}
        </section>
      )}
    </article>
  );
}
