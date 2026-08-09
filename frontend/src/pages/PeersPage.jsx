import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const PeersPage = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('connections'); // 'connections', 'requests', 'find'
  const [supportData, setSupportData] = useState({
    connections: [],
    incoming: [],
    sent: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [findSubMode, setFindSubMode] = useState('matches'); // 'matches' (card UI) vs 'browse' (list UI)
  const [cardIndex, setCardIndex] = useState(0);
  const [celebratingId, setCelebratingId] = useState(null);

  const fetchSupportData = async () => {
    setLoading(true);
    try {
      const [cRes, incRes, sntRes, usrRes] = await Promise.all([
        api('GET', '/support/connections/'),
        api('GET', '/support/requests/'),
        api('GET', '/support/requests/sent/'),
        api('GET', '/support/users/'),
      ]);

      const parse = async (r) => (r && r.ok ? await r.json() : []);
      const c = await parse(cRes);
      const inc = await parse(incRes);
      const snt = await parse(sntRes);
      const usr = await parse(usrRes);

      setSupportData({
        connections: Array.isArray(c) ? c : c.results || [],
        incoming: Array.isArray(inc) ? inc : inc.results || [],
        sent: Array.isArray(snt) ? snt : snt.results || [],
        users: Array.isArray(usr) ? usr : usr.results || [],
      });
    } catch (e) {
      console.error('Support data fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSupportData();
  }, []);

  const avatar = (name, cls = 'w-10 h-10') => {
    const init = (name || '??').slice(0, 2).toUpperCase();
    return (
      <div
        className={`${cls} rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg,var(--coral),var(--lavender))' }}
      >
        {init}
      </div>
    );
  };

  const handleSendRequest = async (uid, uname) => {
    const res = await api('POST', `/support/send/${uid}/`, {});
    if (res && res.ok) {
      if (window.showToast) window.showToast('Request sent to ' + uname);
      fetchSupportData();
    } else if (res) {
      const err = await res.json();
      if (window.showToast) window.showToast(err.detail || 'Failed');
    }
  };

  const handleAcceptRequest = async (id, uname) => {
    const res = await api('POST', `/support/accept/${id}/`, {});
    if (res && res.ok) {
      if (window.showToast) window.showToast('Connected with ' + uname);
      fetchSupportData();
      setActiveTab('connections');
    }
  };

  const handleRejectRequest = async (id) => {
    await api('POST', `/support/reject/${id}/`, {});
    fetchSupportData();
  };

  const handleCancelRequest = async (id, uname) => {
    if (window.showConfirm) {
      window.showConfirm(
        'Cancel Connection Request?\nThis request will be removed. The other person will no longer see your invitation.',
        async () => {
          const res = await api('POST', `/support/requests/${id}/cancel/`, {});
          if (res && res.ok) {
            if (window.showToast) window.showToast('✓ Connection request cancelled.');
            fetchSupportData();
          } else {
            const err = res ? await res.json().catch(() => ({})) : {};
            if (window.showToast) window.showToast(err.detail || "We couldn't cancel your request. Please try again.");
          }
        },
        true
      );
    }
  };

  const handleDisconnect = (connId, peerName) => {
    if (window.showConfirm) {
      window.showConfirm(
        `Disconnect from ${peerName}?`,
        async () => {
          await api('POST', `/support/connections/${connId}/disconnect/`, {});
          if (window.showToast) window.showToast('Disconnected');
          fetchSupportData();
        },
        false
      );
    }
  };

  const handleBlock = (connId, peerName) => {
    if (window.showConfirm) {
      window.showConfirm(
        `Block ${peerName}?`,
        async () => {
          await api('POST', `/support/connections/${connId}/block/`, {});
          if (window.showToast) window.showToast('Blocked');
          fetchSupportData();
        },
        true
      );
    }
  };

  const cleanQuery = searchQuery.trim().toLowerCase();
  const availablePeers = supportData.users.filter((u) => {
    const isConnected = supportData.connections.some((c) => c.peer && c.peer.id === u.id);
    if (isConnected) return false;
    if (!cleanQuery) return true;
    const nameMatch = (u.username || '').toLowerCase().includes(cleanQuery);
    const aliasMatch = (u.alias || u.display_name || '').toLowerCase().includes(cleanQuery);
    const idMatch = String(u.id) === cleanQuery;
    return nameMatch || aliasMatch || idMatch;
  });

  const reqCount = supportData.incoming.length;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              💬 1-on-1 Peer Sanctuary
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">Peer Support Circle</h1>
          <p className="t-body-md text-gray-500 italic">“Connect with kind souls who offer safe, non-judgmental support.” 🌸</p>
        </div>
        <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
          🤝
        </div>
      </div>

      {/* TAB BAR */}
      <div className="tab-bar bg-[#F3F0F9] p-1.5 rounded-2xl flex gap-2">
        <button
          onClick={() => setActiveTab('connections')}
          className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm border-none cursor-pointer transition ${
            activeTab === 'connections' ? 'tab-active' : 'text-gray-500 hover:text-purple-700'
          }`}
        >
          Chats ({supportData.connections.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm border-none cursor-pointer transition ${
            activeTab === 'requests' ? 'tab-active' : 'text-gray-500 hover:text-purple-700'
          }`}
        >
          Requests {reqCount > 0 ? `(${reqCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('find')}
          className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm border-none cursor-pointer transition ${
            activeTab === 'find' ? 'tab-active' : 'text-gray-500 hover:text-purple-700'
          }`}
        >
          Find Peers
        </button>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="space-y-3 p-2">
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-purple-100"></div>
              <div className="space-y-1.5">
                <div className="w-28 h-4 rounded bg-gray-200"></div>
                <div className="w-20 h-3 rounded bg-gray-100"></div>
              </div>
            </div>
            <div className="w-6 h-6 rounded bg-gray-100"></div>
          </div>
        </div>
      ) : activeTab === 'connections' ? (
        <div className="space-y-3">
          {supportData.connections.length === 0 ? (
            <div className="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">
                💬
              </div>
              <h3 className="t-h3 font-bold text-gray-900">No conversations yet.</h3>
              <p className="t-body-md text-gray-500 max-w-sm">
                Once you connect with a peer, your private 1-on-1 conversations will appear here.
              </p>
              <button
                onClick={() => setActiveTab('find')}
                className="px-6 py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
              >
                Find Peer Companions →
              </button>
            </div>
          ) : (
            supportData.connections.map((c) => {
              const uname = c.peer && c.peer.username ? c.peer.username : '';
              const connId = c.connection_id;

              return (
                <div
                  key={connId}
                  onClick={() => navigate(`/chat?conn=${connId}&name=${encodeURIComponent(uname)}`)}
                  className="p-5 rounded-[28px] border border-purple-100 bg-white shadow-sm hover:border-purple-300 hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {avatar(uname, 'w-12 h-12 text-base flex-shrink-0')}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="t-h4 font-bold text-gray-900 truncate group-hover:text-purple-700 transition">{uname}</h4>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" title="Connected"></span>
                      </div>
                      {c.last_message && c.last_message.content ? (
                        <p className="text-xs text-gray-500 font-medium mt-0.5 truncate max-w-xs flex items-center gap-1">
                          <span className="text-gray-400">💬</span>
                          <span className="truncate">{c.last_message.content}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                          <span>🌸</span> 1-on-1 Support Circle Member
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat?conn=${connId}&name=${encodeURIComponent(uname)}`);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition border-none cursor-pointer flex items-center gap-1.5"
                    >
                      <span>💬</span> <span>Open Chat</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === connId ? null : connId);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition border-none bg-transparent cursor-pointer"
                      >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>

                      {activeMenuId === connId && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-10 bg-white border border-gray-200 rounded-2xl shadow-xl min-w-[160px] overflow-hidden z-30 animate-fadeIn"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleDisconnect(connId, uname);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition border-none bg-transparent cursor-pointer border-b border-gray-100 flex items-center gap-2"
                          >
                            <span>👋</span> Disconnect
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleBlock(connId, uname);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition border-none bg-transparent cursor-pointer flex items-center gap-2"
                          >
                            <span>🚫</span> Block Peer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'requests' ? (
        <div className="space-y-4">
          {supportData.incoming.length > 0 && (
            <div>
              <div className="px-2 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Incoming Connection Requests
              </div>
              {supportData.incoming.map((r) => {
                const uname = r.from_user.username;
                return (
                  <div key={r.id} className="p-5 rounded-[24px] bg-white border border-purple-100 shadow-sm space-y-3 mb-3">
                    <div className="flex items-center gap-3">
                      {avatar(uname, 'w-11 h-11')}
                      <div className="flex-1 min-w-0">
                        <h4 className="t-h5 font-bold text-gray-900">{uname}</h4>
                        <p className="text-xs text-purple-600 font-semibold">Invited you to connect for 1-on-1 peer support</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleAcceptRequest(r.id, uname)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm text-center"
                      >
                        Accept Connection
                      </button>
                      <button
                        onClick={() => handleRejectRequest(r.id)}
                        className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition border-none cursor-pointer text-center"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {supportData.sent.length > 0 && (
            <div>
              <div className="px-2 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Sent Connection Invitations
              </div>
              {supportData.sent.map((r) => {
                const uname = r.to_user.username;
                return (
                  <div key={r.id} className="p-4 rounded-[24px] bg-white border border-purple-100 shadow-sm flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {avatar(uname, 'w-11 h-11')}
                      <div className="min-w-0 flex-1">
                        <h4 className="t-h5 font-bold text-gray-900 truncate">{uname}</h4>
                        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Waiting for response
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelRequest(r.id, uname)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition border border-rose-200 cursor-pointer flex-shrink-0"
                    >
                      Cancel Request
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {supportData.incoming.length === 0 && supportData.sent.length === 0 && (
            <div className="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1">
                📬
              </div>
              <h3 className="t-h3 font-bold text-gray-900">No pending support requests.</h3>
              <p className="t-body-md text-gray-500 max-w-sm">
                When peers invite you to connect, or when your sent invitations are accepted, updates will appear here.
              </p>
              <button
                onClick={() => setActiveTab('find')}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
              >
                Explore Peer Directory →
              </button>
            </div>
          )}
        </div>
      ) : (
        /* FIND TAB */
        <div className="space-y-5">
          {/* Viewer Cold-Start Banner (shown when current user has no journal-computed personality profile) */}
          {availablePeers.length > 0 && availablePeers[0].my_profile_ready === false && (
            <div className="p-4 px-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shadow-inner flex-shrink-0">
                  ✍️
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Unlock Personalized Matching</h4>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">
                    Write a few journal entries to unlock personalized compatibility scores — for now, explore supportive companions!
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/journal')}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm flex-shrink-0 flex items-center gap-1.5"
              >
                <span>Start Journaling</span> <span>→</span>
              </button>
            </div>
          )}

          {/* Sub-Mode Toggle: Best Matches vs Browse All */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-purple-100 shadow-sm">
            <div className="flex gap-2 flex-1 max-w-md">
              <button
                onClick={() => setFindSubMode('matches')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border-none cursor-pointer transition flex items-center justify-center gap-1.5 ${
                  findSubMode === 'matches'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <span>⚡</span> <span>Best Matches</span>
              </button>
              <button
                onClick={() => setFindSubMode('browse')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border-none cursor-pointer transition flex items-center justify-center gap-1.5 ${
                  findSubMode === 'browse'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <span>📋</span> <span>Browse All</span>
              </button>
            </div>
            {findSubMode === 'matches' && availablePeers.length > 0 && (
              <span className="text-xs font-bold text-purple-600 px-3 hidden sm:inline">
                {Math.min(cardIndex + 1, availablePeers.length)} of {availablePeers.length}
              </span>
            )}
          </div>

          {findSubMode === 'matches' ? (
            /* TINDER-STYLE CARD MATCH VIEW */
            <div className="max-w-md mx-auto py-2">
              {availablePeers.length === 0 || cardIndex >= availablePeers.length ? (
                <div className="p-8 rounded-[32px] bg-white border border-purple-100 shadow-md text-center flex flex-col items-center justify-center space-y-4 animate-fadeIn">
                  <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-4xl shadow-inner">
                    🎉
                  </div>
                  <h3 className="t-h3 font-extrabold text-gray-900">You've reviewed all suggested matches!</h3>
                  <p className="t-body-md text-gray-500 max-w-xs">
                    Check back as new peer companions join our sanctuary, or browse the complete directory.
                  </p>
                  <div className="flex gap-3 w-full pt-2">
                    <button
                      onClick={() => setCardIndex(0)}
                      className="flex-1 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition border-none cursor-pointer"
                    >
                      🔄 Restart Cards
                    </button>
                    <button
                      onClick={() => setFindSubMode('browse')}
                      className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm"
                    >
                      📋 Browse All
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const candidate = availablePeers[cardIndex];
                  const uname = candidate.display_name || candidate.username || (`Companion #${candidate.id}`);
                  const matchScore = candidate.match_score ?? 50;
                  const hasProfile = candidate.has_profile;
                  const isViewerProfileReady = candidate.my_profile_ready !== false;

                  return (
                    <div
                      key={candidate.id}
                      className="p-8 rounded-[36px] bg-white border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center space-y-6 animate-fadeIn relative"
                    >
                      {/* COMPATIBILITY PROGRESS-RING GAUGE */}
                      <div className="w-full flex flex-col items-center justify-center space-y-2">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 72 72">
                            <defs>
                              <linearGradient id={`grad-${candidate.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8B5CF6" />
                                <stop offset="100%" stopColor="#EC4899" />
                              </linearGradient>
                            </defs>
                            {/* Track */}
                            <circle
                              cx="36"
                              cy="36"
                              r="30"
                              stroke="#F3E8FF"
                              strokeWidth="6"
                              fill="transparent"
                            />
                            {/* Progress Ring */}
                            <circle
                              cx="36"
                              cy="36"
                              r="30"
                              stroke={`url(#grad-${candidate.id})`}
                              strokeWidth="6"
                              strokeLinecap="round"
                              fill="transparent"
                              strokeDasharray={188.5}
                              strokeDashoffset={188.5 - (188.5 * matchScore) / 100}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-black text-purple-900 tracking-tight">{matchScore}%</span>
                            <span className="text-[9px] font-extrabold uppercase text-purple-600 tracking-wider">Match</span>
                          </div>
                        </div>

                        {!hasProfile ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <span>🌱</span> New Peer Companion
                          </span>
                        ) : !isViewerProfileReady ? (
                          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <span>🌸</span> Recommended Companion
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-wider border border-purple-200/60 shadow-xs flex items-center gap-1">
                            <span>⚡</span> High Compatibility
                          </span>
                        )}
                      </div>

                      {/* AVATAR */}
                      <div className="relative">
                        {avatar(uname, 'w-24 h-24 text-xl shadow-md')}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px]" title="Active"></div>
                        {celebratingId === candidate.id && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 animate-bounce text-xl pointer-events-none z-10">
                            <span>✨</span><span>💖</span><span>🎉</span>
                          </div>
                        )}
                      </div>

                      {/* USER DETAILS */}
                      <div className="space-y-1">
                        <h3 className="t-h3 font-extrabold text-gray-900 text-xl">{uname}</h3>
                        <p className="text-xs font-semibold text-purple-600">SoulCare 1-on-1 Peer Companion</p>
                      </div>

                      {/* DUOLINGO-STYLE COLORFUL INTEREST/HABIT PILLS */}
                      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                        {(candidate.interest_tags || ["🌸 Kind Listener", "🛡️ Anonymous & Safe", "💬 Private Support"]).map((tag, tIdx) => {
                          const pillStyles = [
                            "bg-purple-100 text-purple-800 border-purple-200",
                            "bg-pink-100 text-pink-800 border-pink-200",
                            "bg-amber-100 text-amber-800 border-amber-200",
                            "bg-sky-100 text-sky-800 border-sky-200",
                            "bg-emerald-100 text-emerald-800 border-emerald-200",
                          ];
                          const style = pillStyles[tIdx % pillStyles.length];
                          return (
                            <span
                              key={tIdx}
                              className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs transition hover:scale-105 flex items-center gap-1 cursor-default ${style}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>

                      {/* ACTION BUTTONS (SKIP vs CONNECT) */}
                      <div className="flex items-center gap-4 w-full pt-4 border-t border-purple-50">
                        <button
                          onClick={() => setCardIndex((prev) => prev + 1)}
                          className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition border-none cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Skip</span> <span>→</span>
                        </button>
                        <button
                          onClick={() => {
                            setCelebratingId(candidate.id);
                            handleSendRequest(candidate.id, uname);
                            setTimeout(() => {
                              setCardIndex((prev) => prev + 1);
                              setCelebratingId(null);
                            }, 500);
                          }}
                          className={`flex-1 py-3.5 rounded-2xl font-bold text-xs transition border-none cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                            celebratingId === candidate.id
                              ? 'bg-emerald-500 text-white scale-95'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          {celebratingId === candidate.id ? (
                            <>
                              <span>✨ Sent!</span> <span>💖</span>
                            </>
                          ) : (
                            <>
                              <span>＋ Connect</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          ) : (
            /* BROWSE ALL LIST VIEW */
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for supportive peers..."
                className="inp mb-3"
              />

              {availablePeers.length === 0 ? (
                <div className="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm my-2">
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">
                    🌱
                  </div>
                  <h3 className="t-h3 font-bold text-gray-900">
                    {searchQuery.trim() ? `No peers found matching "${searchQuery.trim()}".` : 'No supportive peers found.'}
                  </h3>
                  <p className="t-body-md text-gray-500 max-w-sm">
                    {searchQuery.trim() ? 'Check for typos or try searching for another username.' : 'Come back later as more people join our community sanctuary.'}
                  </p>
                </div>
              ) : (
                availablePeers.map((u) => {
                  const uname = u.display_name || u.username || (`Companion #${u.id}`);
                  const sentReq = supportData.sent.find((r) => r.to_user && r.to_user.id === u.id);
                  const isSent = !!sentReq;
                  const matchScore = u.match_score ?? 50;
                  const isViewerProfileReady = u.my_profile_ready !== false;

                  return (
                    <div
                      key={u.id}
                      className="p-5 rounded-[28px] bg-white border border-purple-100 shadow-sm hover:border-purple-300 hover:shadow-md transition-all duration-200 flex items-center justify-between mb-3"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {avatar(uname, 'w-12 h-12 text-base flex-shrink-0')}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="t-h4 font-bold text-gray-900 truncate">{uname}</h4>
                            {!u.has_profile ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                New Peer
                              </span>
                            ) : !isViewerProfileReady ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                                Recommended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                                {matchScore}% Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                            <span>🌸</span> SoulCare Peer Companion
                          </p>
                        </div>
                      </div>

                      {isSent ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Sent
                          </span>
                          <button
                            onClick={() => handleCancelRequest(sentReq.id, uname)}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition border border-rose-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.id, uname)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm flex-shrink-0"
                        >
                          ＋ Connect
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PeersPage;
