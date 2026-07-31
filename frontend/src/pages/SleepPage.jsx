import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const SleepPage = () => {
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState('good');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSleepData = async () => {
    setLoading(true);

    try {
      const sRes = await api('GET', '/sleep/stats/');
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
      }
    } catch (e) {}

    const res = await api('GET', '/sleep/');
    if (res && res.ok) {
      try {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : data.results || []);
      } catch (e) {
        setEntries([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSleepData();
  }, []);

  const handleSave = async () => {
    if (!bedtime || !wakeTime) {
      setError('Please select both bedtime and wake time.');
      return;
    }
    setError('');
    setSaving(true);

    const todayStr = new Date().toISOString().split('T')[0];
    const payload = {
      sleep_date: todayStr,
      bedtime: `${todayStr}T${bedtime}:00`,
      wake_time: `${todayStr}T${wakeTime}:00`,
      sleep_quality: quality,
      sleep_notes: notes.trim(),
    };

    const res = await api('POST', '/sleep/', payload);
    setSaving(false);

    if (res && res.ok) {
      setNotes('');
      if (window.showToast) window.showToast('Sleep record saved!');
      fetchSleepData();
    } else {
      const data = res ? await res.json().catch(() => ({})) : {};
      setError(data.detail || 'Failed to save sleep record.');
    }
  };

  const handleDelete = (id) => {
    if (window.showConfirm) {
      window.showConfirm(
        'Delete this sleep record?',
        async () => {
          await api('DELETE', `/sleep/${id}/`);
          if (window.showToast) window.showToast('Record deleted.');
          fetchSleepData();
        },
        true
      );
    }
  };

  // Render sleep chart
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const orderedDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    orderedDays.push({ dateStr: d.toISOString().split('T')[0], label: days[(d.getDay() + 6) % 7] });
  }

  const sleepMap = {};
  entries.forEach((e) => {
    sleepMap[e.sleep_date] = e.total_sleep_hours;
  });

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">
      {/* HERO HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-indigo-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              🌙 Independent Rest Subsystem
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">Restful Sleep Tracker</h1>
          <p className="t-body-md text-gray-500 italic">“Quality sleep is the foundation of mental clarity & emotional peace.” 🌌</p>
        </div>
        <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl flex-shrink-0">
          🌙
        </div>
      </div>

      {/* TODAY'S SLEEP ENTRY CARD */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-indigo-100 shadow-md space-y-6">
        <h3 className="t-h4 font-bold text-gray-900 flex items-center gap-2">
          <span>🛏️</span> Log Today's Rest
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Bedtime</label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-base font-bold text-gray-900 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Wake Time</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-base font-bold text-gray-900 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Sleep Quality Selector */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Sleep Quality</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: 'great', label: '😊 Great' },
              { val: 'good', label: '🙂 Good' },
              { val: 'fair', label: '😐 Fair' },
              { val: 'poor', label: '🙁 Poor' },
            ].map((item) => (
              <label
                key={item.val}
                className="p-3 rounded-xl border border-gray-200 flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 font-semibold text-sm"
              >
                <input
                  type="radio"
                  name="sleep-quality"
                  value={item.val}
                  checked={quality === item.val}
                  onChange={() => setQuality(item.val)}
                  className="accent-indigo-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        {/* Sleep Notes Input */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Sleep Notes (Optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Woke up feeling peaceful and refreshed..."
            className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          {error && <div className="text-xs font-bold text-red-500">{error}</div>}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-lg border-none cursor-pointer flex items-center gap-2 ml-auto"
          >
            <span>{saving ? 'Saving...' : 'Save Sleep Record'}</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* 7-DAY SLEEP DURATION CHART */}
      <div className="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="t-h4 font-bold text-gray-900">7-Day Sleep Duration Trend</h3>
          <span className="text-xs font-bold text-gray-400">Target: 7-9 hrs/night</span>
        </div>

        <div className="flex items-end gap-3 h-28 pt-4 pb-2 px-2 border-b border-gray-100">
          {orderedDays.map(({ dateStr }, idx) => {
            const h = sleepMap[dateStr] || 0;
            const barPct = h > 0 ? Math.min(100, Math.max(12, Math.round((h / 12) * 100))) : 8;
            const color = h === 0 ? 'rgba(229,231,235,0.6)' : h >= 7 ? '#6366f1' : h >= 5 ? '#f59e0b' : '#ef4444';

            return (
              <div
                key={idx}
                style={{ height: `${barPct}%`, background: color }}
                className="flex-1 rounded-t-md transition-all duration-300 min-h-[6px]"
                title={h > 0 ? `${h} hrs` : 'No data'}
              ></div>
            );
          })}
        </div>

        <div className="flex gap-3">
          {orderedDays.map(({ label }, idx) => (
            <div key={idx} className="flex-1 text-center text-xs font-semibold text-gray-400">
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* SLEEP HISTORY TIMELINE */}
      <div>
        <h3 className="t-h3 text-gray-900 font-bold mb-4 flex items-center gap-2">
          <span>📚</span> Sleep History
        </h3>

        {loading ? (
          <p className="t-body-sm text-center py-8 text-gray-400">Loading sleep records...</p>
        ) : entries.length === 0 ? (
          <div className="p-8 rounded-[28px] bg-white border border-indigo-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl mb-1">
              🌙
            </div>
            <h3 className="t-h3 font-bold text-gray-900">No sleep records yet.</h3>
            <p className="t-body-md text-gray-500 max-w-sm">
              Record your first night's sleep to start tracking your rest patterns and emotional clarity.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => (
              <div
                key={e.id}
                className="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:border-indigo-200 transition space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                      🌙
                    </div>
                    <div>
                      <h4 className="t-h5 font-bold text-gray-900">{fmtDate(e.sleep_date)}</h4>
                      <span className="text-xs font-semibold text-indigo-600 block">
                        {e.formatted_duration || `${e.total_sleep_hours || 0} hrs`} · {(e.sleep_quality || '').toUpperCase()} Rest
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="p-1.5 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition border-none bg-transparent cursor-pointer"
                    title="Delete record"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Bedtime: <strong>{fmtTime(e.bedtime)}</strong>
                  </span>
                  <span>
                    Wake time: <strong>{fmtTime(e.wake_time)}</strong>
                  </span>
                </div>

                {e.sleep_notes && <p className="t-body-sm text-gray-700 italic pt-1">{e.sleep_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepPage;
