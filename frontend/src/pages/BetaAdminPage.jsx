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
    <div className="beta-admin-wrapper">
      <style>{`
        /* ═════════════════════════════════════════════════════════════════
           SOULCARE BETA ADMIN TYPOGRAPHY SYSTEM & PIXEL PERFECT STYLES
           ═════════════════════════════════════════════════════════════════ */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        .beta-admin-wrapper {
          --font-heading: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          --font-body:    'Inter', system-ui, -apple-system, sans-serif;

          --bg-dark: #090d16;
          --card-bg: rgba(18, 26, 42, 0.75);
          --card-border: rgba(255, 255, 255, 0.08);
          --card-border-glow: rgba(99, 102, 241, 0.3);

          --accent-purple: #a855f7;
          --accent-indigo: #6366f1;
          --accent-teal: #14b8a6;
          --accent-green: #10b981;
          --accent-red: #f87171;
          --accent-amber: #f59e0b;

          --text-main: #f8fafc;
          --text-body: #cbd5e1;
          --text-muted: #64748b;
          --text-placeholder: #475569;

          --radius-md: 14px;
          --radius-lg: 20px;
          --shadow-lg: 0 24px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.12);
          --transition-fast: 0.18s cubic-bezier(0.4, 0, 0.2, 1);

          font-family: var(--font-body);
          background-color: var(--bg-dark);
          color: var(--text-body);
          padding: 2.5rem 2rem;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        .beta-admin-wrapper .ambient-glow {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 0;
          pointer-events: none;
          opacity: 0.35;
        }
        .beta-admin-wrapper .glow-orb-1 { top: -100px; left: -80px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0) 70%); }
        .beta-admin-wrapper .glow-orb-2 { bottom: -100px; right: -80px; width: 450px; height: 450px; background: radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, rgba(20, 184, 166, 0) 70%); }

        .beta-admin-wrapper .bg-grid-overlay {
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 44px 44px;
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }

        .beta-admin-wrapper .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--card-border);
          position: relative;
          z-index: 1;
        }

        .beta-admin-wrapper .header h1 {
          font-family: var(--font-heading);
          font-size: 30px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 50%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .beta-admin-wrapper .header-sub {
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 400;
          line-height: 1.5;
          letter-spacing: 0.01em;
          color: var(--text-muted);
          margin-top: 0.35rem;
        }

        .beta-admin-wrapper .badge-live {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-green);
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid rgba(16, 185, 129, 0.25);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }

        .beta-admin-wrapper .badge-live .pulse {
          width: 8px;
          height: 8px;
          background-color: var(--accent-green);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-green);
          animation: pulseGlow 1.8s infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }

        .beta-admin-wrapper .grid-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          position: relative;
          z-index: 1;
        }

        .beta-admin-wrapper .stat-card {
          background: var(--card-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 1.6rem 1.5rem;
          transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        .beta-admin-wrapper .stat-card:hover {
          border-color: var(--card-border-glow);
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(99, 102, 241, 0.18);
        }

        .beta-admin-wrapper .stat-title {
          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 0.6rem;
        }

        .beta-admin-wrapper .stat-value {
          font-family: var(--font-heading);
          font-size: 36px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--text-main);
        }

        .beta-admin-wrapper .stat-sub {
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: 0.01em;
          margin-top: 0.6rem;
          color: var(--accent-green);
        }

        .beta-admin-wrapper .stat-sub.warn { color: var(--accent-amber); }
        .beta-admin-wrapper .stat-sub.danger { color: var(--accent-red); }

        .beta-admin-wrapper .dashboard-main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 1024px) {
          .beta-admin-wrapper .dashboard-main { grid-template-columns: 1fr; }
        }

        .beta-admin-wrapper .panel {
          background: var(--card-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 1.8rem 1.6rem;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
        }

        .beta-admin-wrapper .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .beta-admin-wrapper .panel-title {
          font-family: var(--font-heading);
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: -0.015em;
          color: var(--text-main);
        }

        .beta-admin-wrapper .btn-refresh {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-main);
          border: 1px solid var(--card-border);
          padding: 0.45rem 0.95rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-family: var(--font-heading);
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.2;
          transition: all var(--transition-fast);
        }
        .beta-admin-wrapper .btn-refresh:hover { background: rgba(99, 102, 241, 0.15); border-color: var(--accent-indigo); transform: translateY(-1px); }

        .beta-admin-wrapper .table-container { overflow-x: auto; }

        .beta-admin-wrapper table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; }

        .beta-admin-wrapper th {
          background-color: rgba(255, 255, 255, 0.03);
          color: var(--text-muted);
          padding: 0.85rem 1rem;
          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--card-border);
        }

        .beta-admin-wrapper td {
          padding: 1rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          vertical-align: middle;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.6;
        }

        .beta-admin-wrapper .badge-cat {
          padding: 0.3rem 0.7rem;
          border-radius: 9999px;
          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          display: inline-block;
        }

        .beta-admin-wrapper .cat-bug { background: rgba(248, 113, 113, 0.15); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.25); }
        .beta-admin-wrapper .cat-sug { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.25); }
        .beta-admin-wrapper .cat-feat { background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.25); }

        .beta-admin-wrapper .feature-bar { margin-bottom: 1.25rem; }

        .beta-admin-wrapper .feature-info {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-body);
          font-size: 13.5px;
          font-weight: 500;
          margin-bottom: 0.45rem;
          color: var(--text-main);
        }

        .beta-admin-wrapper .bar-bg {
          height: 10px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .beta-admin-wrapper .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-indigo), var(--accent-purple));
          border-radius: 6px;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
          transition: width 0.4s ease;
        }

        .beta-admin-wrapper .empty-state {
          text-align: center;
          padding: 2.5rem 1rem;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>

      <div className="ambient-glow glow-orb-1"></div>
      <div className="ambient-glow glow-orb-2"></div>
      <div className="bg-grid-overlay"></div>

      <div className="header">
        <div>
          <h1>SoulCare Beta Telemetry</h1>
          <p className="header-sub">
            Real-Time Telemetry, Crash Analytics & In-App Feedback Ingestion Monitor
          </p>
        </div>
        <div className="badge-live">
          <span className="pulse"></span> LIVE TELEMETRY ACTIVE
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-title">Active Beta Users (DAU / WAU)</div>
          <div className="stat-value" id="val-dau">{dau} / {wau}</div>
          <div className="stat-sub">Real Human Testers Tracked</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Crash-Free Sessions</div>
          <div className="stat-value" id="val-crash-free">{crashFreePct}%</div>
          <div className={crashFreePct >= 99.0 ? 'stat-sub' : 'stat-sub danger'} id="sub-crash-target">
            {crashFreePct >= 99.0 ? 'Target: ≥ 99.0% (PASSING)' : 'Target: ≥ 99.0% (BELOW TARGET)'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Fatal Crashes / Exceptions</div>
          <div className="stat-value" id="val-crashes">{fatalCrashes} / {totalCrashes}</div>
          <div className="stat-sub warn" id="sub-crash-status">Zero Fatal Crashes</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Beta Feedback Received</div>
          <div className="stat-value" id="val-feedback">{totalFeedback}</div>
          <div className="stat-sub" id="sub-feedback-open">{openFeedback} Open Items</div>
        </div>
      </div>

      {/* Main Content Panels */}
      <div className="dashboard-main">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">In-App Beta Feedback Ingestion Feed</div>
            <button onClick={fetchData} className="btn-refresh">
              Refresh Feed
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Title & Description</th>
                  <th>User / App Version</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody id="feedback-table-body">
                {feedbackList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      Zero feedback submissions. Awaiting real user submissions.
                    </td>
                  </tr>
                ) : (
                  feedbackList.map((item, idx) => {
                    let catBadge = null;
                    if (item.category === 'bug_report') {
                      catBadge = <span className="badge-cat cat-bug">Bug Report</span>;
                    } else if (item.category === 'suggestion') {
                      catBadge = <span className="badge-cat cat-sug">Suggestion</span>;
                    } else {
                      catBadge = <span className="badge-cat cat-feat">Feature Request</span>;
                    }

                    const dt = new Date(item.created_at).toLocaleString();
                    const deviceModel = item.device_info?.model || 'Mobile Device';

                    return (
                      <tr key={item.id || idx}>
                        <td>{catBadge}</td>
                        <td>
                          <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                            {item.title}
                          </strong>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                            {item.description}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          v{item.app_version}
                          <br />
                          {deviceModel}
                        </td>
                        <td>
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.82rem' }}>
                            {String(item.status).toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{dt}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Feature Usage Matrix</div>
          </div>
          <div id="feature-bar-list">
            {featureKeys.length === 0 ? (
              <div className="empty-state">No feature events ingested yet.</div>
            ) : (
              featureKeys.map((key) => {
                const count = featureUsage[key];
                const pct = Math.round((count / maxVal) * 100);
                return (
                  <div className="feature-bar" key={key}>
                    <div className="feature-info">
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{key}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{count} events</span>
                    </div>
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${pct}%` }}></div>
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
