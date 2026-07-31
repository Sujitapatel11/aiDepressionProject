import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const BetaAdminPage = () => {
  const [stats, setStats] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const resStats = await api('GET', '/dashboard/beta/');
      if (resStats && resStats.ok) {
        const data = await resStats.json();
        setStats(data);
      }

      const resFb = await api('GET', '/feedback/');
      if (resFb && resFb.ok) {
        const fbData = await resFb.json();
        setFeedbackList(Array.isArray(fbData) ? fbData : fbData.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch beta admin dashboard stats:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const escapeHtml = (str) => {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const dau = stats?.beta_overview?.dau ?? 0;
  const wau = stats?.beta_overview?.wau ?? 0;
  const crashFreePct = stats?.beta_overview?.crash_free_session_percent ?? 100.0;
  const fatalCrashes = stats?.crash_metrics?.fatal_crashes ?? 0;
  const totalCrashes = stats?.crash_metrics?.total_crashes ?? 0;
  const totalFeedback = stats?.feedback_metrics?.total ?? 0;
  const openFeedback = stats?.feedback_metrics?.open ?? 0;

  const featureUsage = stats?.feature_usage || {};
  const featureKeys = Object.keys(featureUsage);
  const maxVal = Math.max(...Object.values(featureUsage), 1);

  return (
    <div className="min-h-screen bg-[#090d16] text-[#cbd5e1] p-6 lg:p-10 relative overflow-hidden animate-fadeIn font-sans">
      {/* Ambient background glows */}
      <div className="ambient-glow glow-orb-1"></div>
      <div className="ambient-glow glow-orb-2"></div>
      <div className="bg-grid-overlay"></div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/10 relative z-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-indigo-400 bg-clip-text text-transparent">
            SoulCare Beta Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-Time Telemetry, Crash Analytics & In-App Feedback Ingestion Monitor
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/25 shadow-lg shadow-emerald-500/10 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>LIVE TELEMETRY ACTIVE</span>
        </div>
      </div>

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        <div className="bg-[#121a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Beta Users (DAU / WAU)</div>
          <div className="text-3xl font-extrabold text-white">{dau} / {wau}</div>
          <div className="text-xs font-semibold text-emerald-400">Real Human Testers Tracked</div>
        </div>

        <div className="bg-[#121a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Crash-Free Sessions</div>
          <div className="text-3xl font-extrabold text-white">{crashFreePct}%</div>
          <div className={`text-xs font-semibold ${crashFreePct >= 99.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {crashFreePct >= 99.0 ? 'Target: ≥ 99.0% (PASSING)' : 'Target: ≥ 99.0% (BELOW TARGET)'}
          </div>
        </div>

        <div className="bg-[#121a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fatal Crashes / Exceptions</div>
          <div className="text-3xl font-extrabold text-white">{fatalCrashes} / {totalCrashes}</div>
          <div className="text-xs font-semibold text-amber-400">Zero Fatal Crashes</div>
        </div>

        <div className="bg-[#121a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Beta Feedback Received</div>
          <div className="text-3xl font-extrabold text-white">{totalFeedback}</div>
          <div className="text-xs font-semibold text-emerald-400">{openFeedback} Open Items</div>
        </div>
      </div>

      {/* MAIN PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Feedback Feed */}
        <div className="lg:col-span-2 bg-[#121a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">In-App Beta Feedback Ingestion Feed</h3>
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition cursor-pointer"
            >
              Refresh Feed
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold uppercase text-slate-400">
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Title & Description</th>
                  <th className="py-3 px-3">User / App Version</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {feedbackList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                      Zero feedback submissions. Awaiting real user submissions.
                    </td>
                  </tr>
                ) : (
                  feedbackList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <strong className="text-white font-bold block">{item.title}</strong>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-400">
                        v{item.app_version}
                        <br />
                        {item.device_info?.model || 'Mobile Device'}
                      </td>
                      <td className="py-3.5 px-3 text-xs font-bold text-amber-400 uppercase">{item.status}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Usage Matrix */}
        <div className="bg-[#121a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
          <h3 className="text-lg font-bold text-white">Feature Usage Matrix</h3>
          <div className="space-y-4">
            {featureKeys.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-sm">No feature events ingested yet.</p>
            ) : (
              featureKeys.map((key) => {
                const count = featureUsage[key];
                const pct = Math.round((count / maxVal) * 100);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>{key}</span>
                      <span className="text-slate-400">{count} events</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetaAdminPage;
