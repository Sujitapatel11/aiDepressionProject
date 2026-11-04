import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const PAGE_SIZE = 8;
const FILTERS = [
  { value: 'all', label: 'All posts' },
  { value: 'micro-post', label: 'Posts' },
  { value: 'story', label: 'Stories' },
  { value: 'poem', label: 'Poems' },
  { value: 'journal-piece', label: 'Journal pieces' },
];

const formatLabel = (format) => ({
  'micro-post': 'Post',
  story: 'Story',
  poem: 'Poem',
  'journal-piece': 'Journal piece',
}[format] || 'Creator post');

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

function CreatorPostCard({ post }) {
  const creatorName = post.creator_name || 'SoulCare creator';
  const initials = creatorName.trim().slice(0, 2).toUpperCase();

  return (
    <article className="overflow-hidden rounded-3xl border border-violet-100 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-pink-200 text-sm font-extrabold text-violet-800">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-[#302442]">{creatorName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#91859f]">
            <span>{formatDate(post.published_at || post.created_at)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatLabel(post.format)}</span>
          </div>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
          Published
        </span>
      </div>
      {post.title && <h3 className="mt-4 text-lg font-extrabold leading-snug text-[#2b2040]">{post.title}</h3>}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#655a73]">{post.body}</p>
    </article>
  );
}

export default function CreatorHomeFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api('GET', '/creator/feed/');
      if (!response) throw new Error('The creator feed could not be reached. Check your connection and try again.');
      if (!response.ok) {
        if (response.status === 401) throw new Error('Please sign in again to view creator posts.');
        throw new Error('Creator posts are temporarily unavailable. Please try again.');
      }
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('The creator feed returned an unexpected response.');
      setPosts(data.filter((post) => post && post.status === 'published'));
    } catch (err) {
      setError(err.message || 'Could not load creator posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(
    () => filter === 'all' ? posts : posts.filter((post) => post.format === filter),
    [posts, filter],
  );
  const visiblePosts = filteredPosts.slice(0, visibleCount);

  const changeFilter = (value) => {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <section id="creator-discovery-feed" className="scroll-mt-6 space-y-4" aria-labelledby="creator-feed-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-500">Made by the community</p>
          <h2 id="creator-feed-heading" className="mt-1 text-xl font-extrabold text-[#2b2040]">Discover creator posts</h2>
          <p className="mt-1 text-sm text-[#887d98]">Stories, poems and thoughts shared by SoulCare creators.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/creator-studio')}
          className="rounded-full bg-violet-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-800"
        >
          Open Creator Studio
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter creator posts">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => changeFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${filter === item.value
              ? 'bg-violet-700 text-white shadow-sm'
              : 'border border-violet-100 bg-white text-[#766982] hover:border-violet-300 hover:text-violet-800'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3" aria-label="Loading creator posts" aria-live="polite">
          {[1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-3xl border border-violet-100 bg-white p-5">
              <div className="h-4 w-36 rounded bg-violet-100" />
              <div className="mt-4 h-3 w-full rounded bg-violet-50" />
              <div className="mt-2 h-3 w-4/5 rounded bg-violet-50" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5" role="alert">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button type="button" onClick={loadPosts} className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-rose-700 shadow-sm">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="rounded-3xl border border-dashed border-violet-200 bg-white px-5 py-9 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-2xl">✦</div>
          <h3 className="mt-3 text-sm font-extrabold text-[#392b4d]">
            {posts.length ? 'No posts in this category yet' : 'The creator feed is getting ready'}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#887d98]">
            {posts.length
              ? 'Try another category to discover more creator posts.'
              : 'Published creator posts will appear here. Drafts and private journal entries stay hidden.'}
          </p>
          {!posts.length && (
            <button type="button" onClick={() => navigate('/creator-studio')} className="mt-4 text-xs font-bold text-violet-700 hover:underline">
              Visit Creator Studio
            </button>
          )}
        </div>
      )}

      {!loading && !error && visiblePosts.length > 0 && (
        <div className="space-y-3">
          {visiblePosts.map((post) => <CreatorPostCard key={post.id} post={post} />)}
          {visibleCount < filteredPosts.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
            >
              Show more posts
            </button>
          )}
          <p className="text-center text-[11px] text-[#9a8fa6]">
            Showing {visiblePosts.length} of {filteredPosts.length} loaded posts
          </p>
        </div>
      )}
    </section>
  );
}
