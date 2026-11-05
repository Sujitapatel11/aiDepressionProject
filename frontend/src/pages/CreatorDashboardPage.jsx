import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const today = new Date().toISOString().slice(0, 10);

export default function CreatorDashboardPage() {
  const [range, setRange] = useState({ start: '', end: today });
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async (filters = range) => {
    setLoading(true);
    setError('');
    const query = new URLSearchParams();
    if (filters.start) query.set('start', filters.start);
    if (filters.end) query.set('end', filters.end);
    const response = await api('GET', `/creators/dashboard/${query.size ? `?${query}` : ''}`);
    if (!response?.ok) {
      setError(response?.status === 404 ? 'Activate Creator Mode to view your analytics.' : 'Analytics could not be loaded.');
      setDashboard(null);
      setLoading(false);
      return;
    }
    try {
      setDashboard(await response.json());
    } catch (loadError) {
      setError('Analytics response could not be read.');
    }
    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  const submitRange = (event) => {
    event.preventDefault();
    loadDashboard(range);
  };

  const metrics = [
    ['Followers', dashboard?.followers ?? 0],
    ['Total posts', dashboard?.total_posts ?? 0],
    ['Views', dashboard?.views ?? 0],
    ['Likes', dashboard?.likes ?? 0],
    ['Comments', dashboard?.comments ?? 0],
    ['Shares', dashboard?.shares ?? 0],
    ['Engagements', dashboard?.engagements ?? 0],
  ];

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Creator Mode</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#302441]">Analytics</h1>
            <p className="mt-1 text-xs text-[#8b7e96]">Metrics come from recorded creator posts and authenticated engagement.</p>
          </div>
          <Link to="/creator-studio" className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white">Creator Studio</Link>
        </header>

        <form onSubmit={submitRange} className="flex flex-wrap items-end gap-3 rounded-2xl border border-violet-100 bg-white p-4">
          <label className="text-xs font-bold text-[#5b4b6c]">From
            <input type="date" value={range.start} max={range.end || today} onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))} className="mt-1 block rounded-lg border border-violet-100 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-[#5b4b6c]">Through
            <input type="date" value={range.end} min={range.start || undefined} max={today} onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))} className="mt-1 block rounded-lg border border-violet-100 px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={loading} className="rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Apply range</button>
          <button type="button" onClick={() => { const next = { start: '', end: today }; setRange(next); loadDashboard(next); }} className="rounded-lg border border-violet-200 px-4 py-2.5 text-xs font-bold text-violet-700">Clear</button>
        </form>

        {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {loading ? <p role="status" className="text-sm text-violet-700">Loading analytics…</p> : dashboard && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-violet-100 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#93879d]">{label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-violet-800">{value}</p>
                </div>
              ))}
            </section>
            <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
              <div className="border-b border-violet-50 px-4 py-3"><h2 className="text-sm font-extrabold text-[#34264b]">Post performance</h2></div>
              {(dashboard.post_analytics || []).length === 0 ? <p className="p-5 text-sm text-[#91859e]">No published posts in this date range.</p> : (
                <div className="divide-y divide-violet-50">
                  {dashboard.post_analytics.map((post) => (
                    <div key={post.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-[#4a3c58]">{post.caption || post.media_url || 'Creator post'}</p><p className="mt-1 text-[10px] text-[#93879d]">{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}</p></div>
                      <div className="flex gap-3 text-[10px] text-[#81758d]"><span>{post.views_count} views</span><span>{post.likes_count} likes</span><span>{post.comments_count} comments</span><span>{post.shares_count} shares</span></div>
                      <Link to={`/creators/${encodeURIComponent(post.creator_username)}/posts/${post.id}`} className="text-xs font-bold text-violet-700">Open</Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {!dashboard.earnings_available && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Earnings are unavailable until a verified advertising provider is integrated.</p>}
          </>
        )}
      </div>
    </main>
  );
}
