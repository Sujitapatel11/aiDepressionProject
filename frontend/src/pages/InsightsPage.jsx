import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const MOOD = {
  positive: { icon: '😊', label: 'Positive', bar: 'linear-gradient(90deg,#10b981,#059669)' },
  negative: { icon: '😔', label: 'Negative', bar: 'linear-gradient(90deg,#f87171,#dc2626)' },
  neutral: { icon: '😐', label: 'Neutral', bar: 'linear-gradient(90deg,#94a3b8,#64748b)' },
  mixed: { icon: '🌤', label: 'Mixed', bar: 'linear-gradient(90deg,#f59e0b,#d97706)' },
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissingId, setDismissingId] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api('GET', '/insights/');
      if (!response || !response.ok) {
        setError('Insights could not load. Check your connection and try again.');
        return;
      }
      const data = await response.json();
      setInsights(Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      setError('Something went wrong while loading your insights. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  const handleDismiss = async (id) => {
    if (!id || dismissingId) return;
    setDismissingId(id);
    try {
      const response = await api('POST', `/insights/dismiss/${id}/`, {});
      if (response && response.ok) {
        setInsights((current) => current.filter((item) => (item.insight_id || item.id) !== id));
        if (window.showToast) window.showToast('Insight dismissed');
      } else if (window.showToast) {
        window.showToast('Could not dismiss this insight. Please try again.');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Network error. Insight was not dismissed.');
    } finally {
      setDismissingId(null);
    }
  };

  const chartDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toDateString(), label: date.toLocaleDateString([], { weekday: 'short' }) };
  }), []);

  const dayScores = useMemo(() => {
    const scores = {};
    insights.forEach((item) => {
      const timestamp = new Date(item.created_at);
      const score = Number(item.sentiment_score);
      if (Number.isNaN(timestamp.getTime()) || !Number.isFinite(score)) return;
      const key = timestamp.toDateString();
      if (!scores[key]) scores[key] = [];
      scores[key].push(score);
    });
    return scores;
  }, [insights]);

  const filteredInsights = filter === 'all' ? insights : insights.filter((item) => item.mood === filter);
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6 lg:py-8">
      <header className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-violet-600">Your journal patterns</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#2b2040] sm:text-3xl">AI Companion Insights</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#796d8a]">Reflections generated from your journal entries. These are supportive observations, not a diagnosis or a substitute for professional care.</p>
      </header>

      <section className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-extrabold text-[#34264b]">Recent emotional patterns</h2><p className="mt-1 text-xs text-[#887d98]">Based only on insights generated from your journal entries</p></div>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{insights.length} insights</span>
        </div>
        <div className="mt-5 flex h-28 items-end gap-2 border-b border-violet-100 px-1 pb-1">
          {chartDays.map(({ key, label }) => {
            const values = dayScores[key] || [];
            const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
            const height = average === null ? 6 : Math.max(12, Math.round(((average + 1) / 2) * 100));
            const background = average === null ? '#e9e4ef' : average >= 0.35 ? '#10b981' : average <= -0.35 ? '#f87171' : '#8b5cf6';
            return <div key={key} className="flex h-full flex-1 flex-col justify-end"><div title={average === null ? 'No insight recorded' : `Average sentiment: ${average.toFixed(2)}`} style={{ height: `${height}%`, background }} className="min-h-[6px] rounded-t-md" /><span className="mt-2 text-center text-[10px] font-semibold text-gray-400">{label}</span></div>;
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-[#34264b]">Your reflections</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className={`rounded-full px-3 py-2 text-xs font-bold ${filter === 'all' ? 'bg-violet-700 text-white' : 'bg-white text-violet-700 border border-violet-100'}`}>All</button>
            {Object.entries(MOOD).map(([key, value]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-full px-3 py-2 text-xs font-bold ${filter === key ? 'bg-violet-700 text-white' : 'bg-white text-violet-700 border border-violet-100'}`}>{value.icon} {value.label}</button>)}
          </div>
        </div>

        {loading ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">Loading your insights…</p> :
          error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center"><p role="alert" className="text-sm text-rose-700">{error}</p><button type="button" onClick={fetchInsights} className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white">Retry</button></div> :
          filteredInsights.length === 0 ? <div className="rounded-[26px] border border-violet-100 bg-white p-8 text-center shadow-sm"><div className="text-3xl">🌱</div><h3 className="mt-3 text-lg font-extrabold text-[#34264b]">{insights.length ? 'No insights in this category' : 'Your first insight starts with a journal entry'}</h3><p className="mx-auto mt-2 max-w-md text-sm text-[#796d8a]">{insights.length ? 'Try another mood filter to see your reflections.' : 'Write a reflection and your AI insights will appear here when analysis is available.'}</p><button type="button" onClick={() => navigate('/journal')} className="mt-4 rounded-full bg-violet-700 px-5 py-3 text-xs font-extrabold text-white">Open Journal →</button></div> :
          <div className="space-y-3">{filteredInsights.map((item) => {
            const id = item.insight_id || item.id;
            const mood = MOOD[item.mood] || MOOD.neutral;
            const score = Number(item.sentiment_score);
            const scorePercent = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(((score + 1) / 2) * 100))) : null;
            return <article key={id} className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="text-2xl">{item.status === 'too_short' ? '💡' : item.status === 'invalid' ? 'ℹ️' : mood.icon}</span><div className="min-w-0"><h3 className="font-extrabold text-[#34264b]">{item.title || 'Journal reflection'}</h3><p className="mt-1 text-xs font-semibold text-violet-600">{item.status === 'too_short' ? 'Reflection prompt' : item.status === 'invalid' ? 'Content note' : mood.label} · {formatDate(item.created_at)}</p></div></div><button type="button" disabled={dismissingId === id} onClick={() => handleDismiss(id)} aria-label="Dismiss insight" className="rounded-full px-3 py-1 text-sm text-gray-400 hover:bg-violet-50 disabled:opacity-50">{dismissingId === id ? '…' : '×'}</button></div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#5f536f]">{item.message || item.summary || 'No additional details available.'}</p>
              {scorePercent !== null && item.status !== 'too_short' && item.status !== 'invalid' && <div className="mt-4 border-t border-violet-50 pt-3"><div className="flex justify-between text-xs font-semibold text-gray-500"><span>Sentiment signal</span><span>{score.toFixed(2)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full" style={{ width: `${scorePercent}%`, background: mood.bar }} /></div></div>}
            </article>;
          })}</div>}
      </section>
    </main>
  );
}
