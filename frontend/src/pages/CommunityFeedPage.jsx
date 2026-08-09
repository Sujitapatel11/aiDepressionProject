import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const REACTION_CONFIG = [
  { key: 'here_for_you', icon: '🫂', label: 'Here for you' },
  { key: 'sending_strength', icon: '🌸', label: 'Sending strength' },
  { key: 'listening', icon: '💙', label: 'Listening' },
];

export const CommunityFeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Report Modal state
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportReason, setReportReason] = useState('self_harm');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api('GET', '/community/posts/');
      if (res && res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error('Error fetching community posts:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const res = await api('POST', '/community/posts/create/', {
        content: newPostContent.trim(),
      });
      if (res && res.ok) {
        const createdPost = await res.json();
        setPosts((prev) => [createdPost, ...prev]);
        setNewPostContent('');
        setShowCreateModal(false);
        if (window.showToast) window.showToast('✓ Anonymous entry posted to community feed');
      } else if (res) {
        const err = await res.json();
        if (window.showToast) window.showToast(err.detail || 'Failed to post entry');
      }
    } catch (e) {
      if (window.showToast) window.showToast('Network error while posting');
    }
    setIsPosting(false);
  };

  const handleReact = async (postId, reactionType) => {
    try {
      const res = await api('POST', `/community/posts/${postId}/react/`, {
        reaction_type: reactionType,
      });
      if (res && res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? data.post : p))
        );
      }
    } catch (e) {
      console.error('Reaction error:', e);
    }
  };

  const handleOpenReportModal = (postId) => {
    setReportingPostId(postId);
    setReportReason('self_harm');
    setReportDetails('');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingPostId || isSubmittingReport) return;

    setIsSubmittingReport(true);
    try {
      const res = await api('POST', `/community/posts/${reportingPostId}/report/`, {
        reason: reportReason,
        details: reportDetails.trim(),
      });

      if (res && res.ok) {
        const data = await res.json();
        if (window.showToast) window.showToast(data.detail || 'Report submitted for safety review');
        
        if (data.is_hidden) {
          setPosts((prev) => prev.filter((p) => p.id !== reportingPostId));
        } else {
          setPosts((prev) =>
            prev.map((p) => (p.id === reportingPostId ? { ...p, user_has_reported: true } : p))
          );
        }
        setReportingPostId(null);
      } else if (res) {
        const err = await res.json();
        if (window.showToast) window.showToast(err.detail || 'Failed to submit report');
      }
    } catch (e) {
      if (window.showToast) window.showToast('Error submitting safety report');
    }
    setIsSubmittingReport(false);
  };

  const timeAgo = (isoString) => {
    try {
      const date = new Date(isoString);
      const seconds = Math.floor((new Date() - date) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
              🕊️ Anonymous Community Feed
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase">
              Safeguarded
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">
            Community Sanctuary
          </h1>
          <p className="t-body-md text-gray-500 italic">
            “Share your story freely and offer gentle support to others — completely anonymous and safe.” 💜
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-md flex items-center gap-2 flex-shrink-0"
        >
          <span>✍️ Post Anonymously</span>
        </button>
      </div>

      {/* CREATE POST MODAL / DRAWER */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 lg:p-8 max-w-lg w-full shadow-2xl border border-purple-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🕊️</span>
                <h3 className="t-h3 font-bold text-gray-900">Share Anonymous Entry</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your heart today? Share your thoughts safely..."
                  rows="5"
                  maxLength="2000"
                  className="inp text-sm resize-none"
                  required
                />
                <div className="flex justify-between items-center text-[11px] font-semibold text-gray-400 mt-1.5 px-1">
                  <span>🔒 Fully unlinked anonymous handle generated automatically</span>
                  <span>{newPostContent.length}/2000</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100 text-purple-900 text-xs font-medium leading-relaxed flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">🛡️</span>
                <span>
                  Our community feed is moderated 24/7. Posts containing self-harm triggers automatically attach regional crisis resources (Tele-MANAS, Vandrevala, iCALL, Nepal 1166).
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting || !newPostContent.trim()}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm flex items-center gap-2"
                >
                  {isPosting ? 'Posting...' : 'Publish Entry →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportingPostId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 lg:p-8 max-w-md w-full shadow-2xl border border-rose-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <span className="text-xl">🚩</span>
                <h3 className="t-h3 font-bold text-gray-900">Safety Report</h3>
              </div>
              <button
                onClick={() => setReportingPostId(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <p className="text-xs text-gray-600 font-medium">
                Help us keep SoulCare safe. Reports are reviewed urgently. Posts accumulating 3 reports are automatically hidden.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Reason Category</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="inp text-xs font-medium cursor-pointer"
                >
                  <option value="self_harm">🆘 Self-Harm or Crisis Concern</option>
                  <option value="harassment">⚠️ Harassment or Bullying</option>
                  <option value="spam">🚫 Spam or Off-Topic</option>
                  <option value="other">🚩 Other Safety Concern</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Optional Context</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide additional details if necessary..."
                  rows="3"
                  className="inp text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingPostId(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POSTS FEED */}
      {loading ? (
        <div className="space-y-4 py-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-24 h-4 rounded bg-purple-100"></div>
                <div className="w-16 h-3 rounded bg-gray-100"></div>
              </div>
              <div className="w-full h-12 rounded bg-gray-100"></div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 rounded-[32px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-4 shadow-sm my-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">
            🕊️
          </div>
          <h3 className="t-h3 font-bold text-gray-900">The community sanctuary is quiet right now.</h3>
          <p className="t-body-md text-gray-500 max-w-sm">
            Be the first to share an anonymous reflection with the community.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
          >
            Post First Reflection →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const counts = post.reaction_counts || {};
            const userReactions = post.user_reactions || [];

            return (
              <div
                key={post.id}
                className="p-6 lg:p-7 rounded-[32px] bg-white border border-purple-100/90 shadow-sm hover:shadow-md transition duration-200 space-y-4 relative"
              >
                {/* POST HEADER */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-black border border-purple-200/60 shadow-2xs flex items-center gap-1.5">
                      <span>🕊️</span> {post.author_alias}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReportModal(post.id)}
                    disabled={post.user_has_reported}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition border-none cursor-pointer flex items-center gap-1 ${
                      post.user_has_reported
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                    }`}
                    title={post.user_has_reported ? 'Reported' : 'Report safety concern'}
                  >
                    <span>🚩</span> <span>{post.user_has_reported ? 'Reported' : 'Report'}</span>
                  </button>
                </div>

                {/* POST CONTENT */}
                <p className="t-body-lg text-gray-800 leading-relaxed font-normal whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* CRISIS HELPLINE SUPPORT CARD (if crisis keywords detected) */}
                {post.has_crisis_resources && (
                  <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 space-y-2 shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                      <span>🆘</span> <span>Supportive Helpline Resources</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed whitespace-pre-line text-amber-900/90">
                      {post.crisis_resource_note}
                    </p>
                  </div>
                )}

                {/* SUPPORTIVE REACTIONS ROW */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  {REACTION_CONFIG.map(({ key, icon, label }) => {
                    const count = counts[key] || 0;
                    const isActive = userReactions.includes(key);

                    return (
                      <button
                        key={key}
                        onClick={() => handleReact(post.id, key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-purple-100 border-purple-300 text-purple-800 shadow-xs scale-105'
                            : 'bg-gray-50 border-gray-200/80 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-white text-[10px] font-black text-purple-700 shadow-2xs">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommunityFeedPage;
