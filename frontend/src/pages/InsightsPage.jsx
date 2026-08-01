import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const MOOD = {
  positive: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '😊', label: 'Positive', bar: 'linear-gradient(90deg,#10b981,#059669)' },
  negative: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '😔', label: 'Negative', bar: 'linear-gradient(90deg,#f87171,#dc2626)' },
  neutral:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', icon: '😐', label: 'Neutral',  bar: 'linear-gradient(90deg,#94a3b8,#64748b)' },
  mixed:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '🌤', label: 'Mixed',    bar: 'linear-gradient(90deg,#f59e0b,#d97706)' },
};

export const InsightsPage = () => {
  const navigate = useNavigate();

  const [allInsights, setAllInsights] = useState([]);
  const [insightFilter, setInsightFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    const res = await api('GET', '/insights/');
    if (res && res.ok) {
      try {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setAllInsights(list);
      } catch (e) {
        setAllInsights([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleDismiss = async (id) => {
    await api('POST', `/insights/dismiss/${id}/`, {});
    setAllInsights((prev) => prev.filter((i) => (i.insight_id || i.id) !== id));
    if (window.showToast) window.showToast('Insight dismissed');
  };

  // Build chart data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    chartDays.push({ date: d.toDateString(), label: days[(d.getDay() + 6) % 7] });
  }

  const dayMap = {};
  allInsights.forEach((ins) => {
    const d = new Date(ins.created_at).toDateString();
    if (!dayMap[d]) dayMap[d] = [];
    dayMap[d].push(ins.sentiment_score);
  });

  const filteredInsights =
    insightFilter === 'all'
      ? allInsights
      : allInsights.filter((i) => i.mood === insightFilter);

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">
      {/* SECTION 1: HERO HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
              😊 30-Second Check-In
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">
            How are you feeling today?
          </h1>
          <p className="t-body-md text-gray-500 italic">“Take a moment to pause, breathe, and listen to your inner state.” 💜</p>
        </div>
        <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
          🌸
        </div>
      </div>

      {/* SECTION 2: WELLNESS INDICATORS CARD */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-md space-y-6">
        <div className="space-y-3">
          <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
            <span>✨</span> Select Primary Mood
          </h3>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
            {['Great', 'Calm', 'Good', 'Neutral', 'Sad', 'Very Sad', 'Angry', 'Tired'].map((m) => (
              <button key={m} type="button" className="mood-pill active-pill py-2 px-4">
                <span>
                  {m === 'Great' ? '😊' : m === 'Calm' ? '😌' : m === 'Good' ? '🙂' : m === 'Neutral' ? '😐' : m === 'Sad' ? '😔' : m === 'Very Sad' ? '😢' : m === 'Angry' ? '😡' : '😴'}
                </span>{' '}
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Wellness Check Sliders */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span> Wellness Indicators
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>⚡ Energy</span>
                <span className="text-purple-600">High</span>
              </div>
              <input type="range" min="1" max="5" defaultValue="4" className="w-full accent-purple-600 cursor-pointer" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>🍃 Stress</span>
                <span className="text-emerald-600">Low</span>
              </div>
              <input type="range" min="1" max="5" defaultValue="2" className="w-full accent-emerald-600 cursor-pointer" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>🌙 Sleep Quality</span>
                <span className="text-indigo-600">Great</span>
              </div>
              <input type="range" min="1" max="5" defaultValue="4" className="w-full accent-indigo-600 cursor-pointer" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>🎯 Focus</span>
                <span className="text-amber-600">Good</span>
              </div>
              <input type="range" min="1" max="5" defaultValue="3" className="w-full accent-amber-600 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: 7-DAY MOOD CHART */}
      <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="t-h4 font-bold text-gray-900">7-Day Emotional Stability Chart</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setInsightFilter('all')}
              className={`mood-pill ${insightFilter === 'all' ? 'active-pill' : ''}`}
            >
              ✦ All
            </button>
            {Object.entries(MOOD).map(([k, cfg]) => (
              <button
                key={k}
                onClick={() => setInsightFilter(insightFilter === k ? 'all' : k)}
                className={`mood-pill ${insightFilter === k ? 'active-pill' : ''}`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="flex items-end gap-3 h-28 pt-4 pb-2 px-2 border-b border-gray-100">
          {chartDays.map(({ date }, idx) => {
            const scores = dayMap[date] || [];
            const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
            const h = avg !== null ? Math.max(12, Math.round(((avg + 1) / 2) * 100)) : 8;
            const color =
              avg === null
                ? 'rgba(229, 231, 235, 0.6)'
                : avg >= 0.35
                ? '#10b981'
                : avg <= -0.35
                ? '#f87171'
                : '#6366f1';

            return (
              <div
                key={idx}
                style={{ height: `${h}%`, background: color }}
                className="flex-1 rounded-t-md transition-all duration-300 min-h-[6px]"
                title={avg !== null ? `Score: ${avg.toFixed(2)}` : 'No data'}
              ></div>
            );
          })}
        </div>

        {/* Labels */}
        <div className="flex gap-3">
          {chartDays.map(({ label }, idx) => (
            <div key={idx} className="flex-1 text-center t-caption text-gray-400 font-semibold">
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: AI INSIGHTS & HISTORY FEED */}
      <div>
        <h3 className="t-h3 text-gray-900 font-bold mb-4 flex items-center gap-2">
          <span>🤖</span> AI Companion Insights
        </h3>

        {/* AI & Mental Health Medical Disclaimer */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-sm">
          <span className="text-xl flex-shrink-0 mt-0.5" role="img" aria-label="disclaimer">ℹ️</span>
          <p className="t-body-sm text-amber-900/90 leading-relaxed font-medium m-0">
            These insights are generated by AI based on patterns in your journal entries. They are not a substitute for professional mental health advice, diagnosis, or treatment. If you're struggling, please reach out to a licensed therapist, counselor, or a mental health helpline.
          </p>
        </div>

        {loading ? (
          <p className="t-body-sm text-center py-8 text-gray-400">Loading insights...</p>
        ) : filteredInsights.length === 0 ? (
          <div className="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1">🌱</div>
            <h3 className="t-h3 font-bold text-gray-900">Your AI companion is still learning.</h3>
            <p className="t-body-md text-gray-500 max-w-sm">
              Write a few journal reflections and check back to discover gentle emotional patterns over time.
            </p>
            <button
              onClick={() => navigate('/journal')}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
            >
              Write First Reflection →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInsights.map((i) => {
              const cfg = MOOD[i.mood] || MOOD.neutral;
              const pct = Math.round(((i.sentiment_score + 1) / 2) * 100);
              const insightId = i.insight_id || i.id;

              return (
                <div
                  key={insightId}
                  className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm hover:border-purple-200 transition space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div>
                        <h4 className="t-h4 font-bold text-gray-900">{i.title || 'Gentle Reflection Pattern'}</h4>
                        <span className="text-xs font-semibold text-purple-600 block">
                          {cfg.label} · {fmtDate(i.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismiss(insightId)}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition border-none bg-transparent cursor-pointer"
                      title="Dismiss insight"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="t-body-md text-gray-800 leading-relaxed">{i.message || i.summary}</p>
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Emotional Wellbeing Trend</span>
                      <span className="text-purple-700">
                        {(i.sentiment_score > 0 ? '+' : '') + i.sentiment_score.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.bar }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
