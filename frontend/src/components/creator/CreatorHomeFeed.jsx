import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import CreatorFeedPostCard from './CreatorFeedPostCard';

const PAGE_SIZE = 10;

const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
  { id: 'latest', label: 'Latest' },
];

const EMPTY_STATES = {
  'for-you': {
    icon: '✦',
    title: 'No reflections to discover yet',
    body: 'When creators publish, you will find fresh posts here. Follow what moves you.',
  },
  following: {
    icon: '♡',
    title: "You're not following anyone yet",
    body: 'Browse the For You tab, follow the creators who feel like your people, and their posts will appear here first.',
  },
  trending: {
    icon: '🔥',
    title: 'No trending posts this week',
    body: 'When the community engages with recent posts, the most loved ones rise here.',
  },
  latest: {
    icon: '🌿',
    title: 'Nothing published yet',
    body: 'The feed will bloom as soon as creators begin sharing.',
  },
};

function SkeletonCard({ index }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-violet-100 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-28 rounded-full bg-violet-100 animate-pulse" />
          <div className="h-2.5 w-20 rounded-full bg-violet-50 animate-pulse" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-full rounded-full bg-violet-100 animate-pulse" style={{ animationDelay: `${index * 120}ms` }} />
        <div className="h-3.5 w-4/5 rounded-full bg-violet-100 animate-pulse" style={{ animationDelay: `${index * 120 + 60}ms` }} />
      </div>
      <div className="mt-4 h-3 w-36 rounded-full bg-violet-50 animate-pulse" />
    </div>
  );
}

/**
 * SoulCare home creator feed. Four server-backed tabs with true backend
 * pagination (page numbers + page_size),-markdown dedupe on append, skeleton
 * loading, end-of-feed message, and retry-on-failure that never drops
 * previously loaded posts.
 */
export default function CreatorHomeFeed({ className = '' }) {
  const [activeTab, setActiveTab] = useState('for-you');
  const [posts, setPosts] = useState([]);
  // page tracks the last successfully loaded page number.
  const [page, setPage] = useState(1);
  // pendingPage tracks the page currently being requested (or the page that
  // last failed). Retry uses this so a load-more failure retries page N rather
  // than resetting to page 1 and discarding already-loaded posts.
  const pendingPageRef = useRef(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Guards against out-of-order responses when tabs switch quickly.
  const requestGeneration = useRef(0);

  const fetchFeed = async (tab, targetPage) => {
    const generation = ++requestGeneration.current;
    pendingPageRef.current = targetPage;
    const isFirstPage = targetPage === 1;
    if (isFirstPage) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }
    const response = await api('GET', `/creators/feed/${tab}/?page=${targetPage}&page_size=${PAGE_SIZE}`);
    if (generation !== requestGeneration.current) return; // a newer request took over
    setLoading(false);
    setLoadingMore(false);
    if (!response?.ok) {
      // Keep previously loaded posts so users can read while retrying.
      setError('The feed could not be loaded. Please check your connection and try again.');
      return;
    }
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      setError('The feed responded with an unreadable payload. Please try again.');
      return;
    }
    if (generation !== requestGeneration.current) return;
    const fetched = Array.isArray(data) ? data : data.results || [];
    if (isFirstPage) {
      setPosts(fetched);
    } else {
      // Database pages fetch fresh rows, so explicit dedupe guards against the
      // edge case of a post shifting between pages mid-scroll.
      setPosts((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...fetched.filter((item) => !known.has(item.id))];
      });
    }
    setPage(targetPage);
    setHasNext(Boolean(data.next));
    setError('');
  };

  useEffect(() => {
    fetchFeed(activeTab, 1);
    // Cancel any in-flight request when this tab view unmounts.
    return () => { requestGeneration.current += 1; };
  }, [activeTab]);

  const changeTab = (tabId) => {
    if (tabId !== activeTab) setActiveTab(tabId);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasNext) fetchFeed(activeTab, page + 1);
  };

  // Retry the page that actually failed (pendingPageRef), not necessarily
  // page 1. This preserves already-loaded posts when a load-more fails.
  const retry = () => fetchFeed(activeTab, pendingPageRef.current);

  const emptyState = EMPTY_STATES[activeTab];
  const showSkeletons = loading;

  return (
    <section className={`rounded-[26px] border border-violet-100 bg-white p-4 shadow-sm sm:p-6 ${className}`} aria-label="Creator feed">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-500">Creators you'll love</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">Creator feed</h2>
        </div>
        <Link to="/world" className="text-xs font-extrabold text-violet-700 hover:underline">Soul World ↗</Link>
      </div>

      <div role="tablist" aria-label="Feed filters" className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl bg-[#f6f1fb] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`feed-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls="feed-panel"
            onClick={() => changeTab(tab.id)}
            className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              activeTab === tab.id
                ? 'bg-violet-700 text-white shadow-sm'
                : 'text-violet-700 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && posts.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-rose-50 px-4 py-3" role="alert">
          <p className="text-xs font-semibold text-rose-700">{error}</p>
          <button type="button" onClick={retry}
            className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
            Try again
          </button>
        </div>
      )}

      <div id="feed-panel" role="tabpanel" aria-labelledby={`feed-tab-${activeTab}`} className="space-y-3">
        {showSkeletons ? (
          <>
            <span className="sr-only" role="status" aria-live="polite">Loading the feed…</span>
            {[0, 1, 2].map((index) => <SkeletonCard key={index} index={index} />)}
          </>
        ) : (
          <>
            {error && posts.length === 0 ? (
              <div className="rounded-2xl bg-rose-50 p-5 text-center" role="alert">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
                <button type="button" onClick={retry}
                  className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                  Try again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl bg-[#faf7fd] p-6 text-center">
                <span className="text-2xl" aria-hidden="true">{emptyState.icon}</span>
                <p className="mt-2 text-sm font-extrabold text-[#3c2f52]">{emptyState.title}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#807c95]">{emptyState.body}</p>
                {activeTab === 'following' && (
                  <button type="button" onClick={() => changeTab('for-you')}
                    className="mt-3 rounded-full bg-violet-700 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-violet-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                    Discover creators
                  </button>
                )}
              </div>
            ) : (
              posts.map((post) => <CreatorFeedPostCard key={post.id} post={post} />)
            )}

            {!error && (loadingMore || hasNext) && (
              <div className="pt-1 text-center">
                {loadingMore ? (
                  <>
                    <span className="sr-only" role="status" aria-live="polite">Loading more posts…</span>
                    <SkeletonCard index={0} compact />
                  </>
                ) : (
                  <button type="button" onClick={loadMore}
                    className="rounded-full border border-violet-200 bg-white px-5 py-2.5 text-xs font-extrabold text-violet-700 shadow-sm transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                    Load more posts
                  </button>
                )}
              </div>
            )}

            {!hasNext && !loading && !loadingMore && posts.length > 0 && (
              <p className="pt-1 text-center text-xs font-bold text-violet-300" role="status">
                ✦ You've reached the end of the feed
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
