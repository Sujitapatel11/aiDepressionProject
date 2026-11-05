import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { ChatWebSocketClient } from '../services/chatWebSocket';
import { ArrowLeft, MessageCircle, Search, Send } from 'lucide-react';
import './ChatPage.css';

export const ChatPage = () => {
  const { userId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const connId = searchParams.get('conn') || '';
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState('');
  const [connectionsRefresh, setConnectionsRefresh] = useState(0);
  const [conversationQuery, setConversationQuery] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [sendError, setSendError] = useState('');
  const selectedConnection = connections.find((connection) => connection.connection_id === connId);
  const peerName = selectedConnection?.peer?.username
    || selectedConnection?.alias
    || searchParams.get('name')
    || 'Peer companion';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [isOnline, setIsOnline] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Connection Level & Activity State
  const [activityState, setActivityState] = useState(null);
  const [showLevelPopover, setShowLevelPopover] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Modals state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showConsentLearnMore, setShowConsentLearnMore] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // Quiz execution state
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizErr, setQuizErr] = useState('');

  const messagesEndRef = useRef(null);
  const wsClientRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const historyRequestRef = useRef(0);

  useEffect(() => {
    let active = true;

    const fetchConnections = async () => {
      setConnectionsLoading(true);
      setConnectionsError('');
      const response = await api('GET', '/support/connections/');
      if (!active) return;

      if (!response || !response.ok) {
        setConnections([]);
        setConnectionsError('Your conversations could not be loaded.');
      } else {
        try {
          const data = await response.json();
          setConnections(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
          setConnections([]);
          setConnectionsError('Your conversations could not be loaded.');
        }
      }
      if (active) setConnectionsLoading(false);
    };

    fetchConnections();
    return () => { active = false; };
  }, [connectionsRefresh]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchHistory = async () => {
    const requestId = ++historyRequestRef.current;
    if (!connId) {
      setMessages([]);
      setLoading(false);
      setHistoryError('');
      return;
    }
    setLoading(true);
    setHistoryError('');
    const res = await api('GET', `/chat/${connId}/messages/`);
    if (requestId !== historyRequestRef.current) return;
    if (res && res.ok) {
      try {
        const data = await res.json();
        if (requestId !== historyRequestRef.current) return;
        const list = Array.isArray(data) ? data : data.results || [];
        setMessages(list);
      } catch (error) {
        setMessages([]);
        setHistoryError('Messages could not be read. Try again.');
      }
    } else {
      setMessages([]);
      setHistoryError('This conversation could not be loaded.');
    }
    setLoading(false);
    scrollToBottom();
  };

  const fetchActivityStatus = async () => {
    if (!connId) return;
    const res = await api('GET', `/support/connections/${connId}/activity/`);
    if (res && res.ok) {
      try {
        const data = await res.json();
        setActivityState(data);
        if (data.quiz && data.quiz.my_answers) {
          setQuizAnswers(data.quiz.my_answers);
        }
      } catch (e) {
        console.error('Failed to parse activity status:', e);
      }
    }
  };

  useEffect(() => {
    if (!connId) return;

    fetchHistory();
    fetchActivityStatus();

    const client = new ChatWebSocketClient(connId, {
      onStatusChange: (statusText, online) => {
        setStatus(statusText);
        setIsOnline(online);
      },
      onMessage: (msgData) => {
        setMessages((prev) => {
          if (msgData.message_id && prev.some((m) => m.message_id === msgData.message_id)) {
            return prev;
          }
          return [...prev, msgData];
        });
        setConnections((prev) => prev.map((connection) => (
          connection.connection_id === connId
            ? {
              ...connection,
              last_message: {
                content: msgData.message || msgData.content,
                sender_id: msgData.sender_id,
                created_at: msgData.timestamp || msgData.created_at,
              },
            }
            : connection
        )));
        // Re-evaluate level score after new messages arrive
        fetchActivityStatus();
        scrollToBottom();
      },
      onError: (message) => setSendError(message),
      onTyping: (senderId, isTyping) => {
        if (senderId !== userId) {
          setIsPeerTyping(isTyping);
          if (isTyping) scrollToBottom();
        }
      },
    });

    client.connect();
    wsClientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [connId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    const msg = inputText.trim();
    if (!msg) return;

    if (!wsClientRef.current?.sendMessage(msg)) {
      setSendError('Reconnecting. Your message is still here; try again when chat is online.');
      return;
    }
    setSendError('');
    setInputText('');
  };

  const handleTypingInput = (val) => {
    setInputText(val);
    if (wsClientRef.current) {
      wsClientRef.current.sendTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsClientRef.current) {
          wsClientRef.current.sendTyping(false);
        }
      }, 2000);
    }
  };

  // Activity flow handlers
  const handleStartActivity = () => {
    if (!activityState?.has_user_consent) {
      setShowConsentModal(true);
    } else if (activityState?.quiz) {
      setShowQuizModal(true);
    } else {
      handleGenerateQuiz();
    }
  };

  const handleConsentAgreement = async (agree) => {
    setShowConsentModal(false);
    if (!agree) return;

    const res = await api('POST', '/support/activity/consent/', { consent: true });
    if (res && res.ok) {
      setActivityState((prev) => ({ ...prev, has_user_consent: true }));
      if (!activityState?.quiz) {
        await handleGenerateQuiz();
      } else {
        setShowQuizModal(true);
      }
    }
  };

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuizErr('');
    const res = await api('POST', `/support/connections/${connId}/activity/generate/`);
    setGeneratingQuiz(false);
    if (res && res.ok) {
      const data = await res.json();
      setActivityState((prev) => ({ ...prev, quiz: data }));
      setQuizAnswers({});
      setShowQuizModal(true);
    } else {
      setQuizErr('Could not generate quiz at this time. Please try again later.');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activityState?.quiz?.quiz_id) return;
    setSubmittingQuiz(true);
    setQuizErr('');

    const res = await api('POST', `/support/connections/${connId}/activity/submit/`, {
      quiz_id: activityState.quiz.quiz_id,
      answers: quizAnswers,
    });
    setSubmittingQuiz(false);

    if (res && res.ok) {
      const data = await res.json();
      setActivityState((prev) => ({
        ...prev,
        quiz: {
          ...prev.quiz,
          ...data,
        },
      }));
    } else {
      setQuizErr('Failed to submit choices. Please select an option for each question.');
    }
  };

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const fmtConversationTime = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if ((now - date) < 6 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
  };

  const initials = (peerName || '?').slice(0, 2).toUpperCase();
  const lvlInfo = activityState?.level_info || { level: 1, level_name: 'Seed Connection', progress_pct: 0, score: 0 };
  const currentQuiz = activityState?.quiz;
  const filteredConnections = connections.filter((connection) => {
    const name = connection.peer?.username || connection.alias || '';
    return name.toLowerCase().includes(conversationQuery.trim().toLowerCase());
  });

  const selectConnection = (connection) => {
    setSendError('');
    setSearchParams({ conn: connection.connection_id, name: connection.peer?.username || connection.alias || '' });
  };

  return (
    <div className="chat-page">
      <div className={`chat-workspace ${connId ? 'is-selected' : ''}`}>
        <aside className="chat-sidebar" aria-label="Conversations">
          <div className="chat-sidebar-heading">
            <h1 className="chat-sidebar-title">Messages</h1>
            <p className="chat-sidebar-subtitle">Your private support circle</p>
          </div>
          <label className="chat-search-wrap">
            <Search className="chat-search-icon" aria-hidden="true" />
            <input
              className="chat-search"
              type="search"
              value={conversationQuery}
              onChange={(event) => setConversationQuery(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
          </label>
          <p className="chat-list-label">Active connections</p>
          <div className="chat-conversation-list">
            {connectionsLoading ? (
              <div className="chat-list-state" role="status">Loading conversations…</div>
            ) : connectionsError ? (
              <div className="chat-list-state" role="alert">
                <strong>Couldn’t load conversations</strong>
                <p>{connectionsError}</p>
                <button className="chat-retry-button" onClick={() => setConnectionsRefresh((value) => value + 1)}>
                  Try again
                </button>
              </div>
            ) : connections.length === 0 ? (
              <div className="chat-list-state">
                <MessageCircle size={23} strokeWidth={1.7} aria-hidden="true" />
                <strong>No conversations yet</strong>
                <p>Connect with a peer to start a private conversation.</p>
                <button className="chat-retry-button" onClick={() => navigate('/peers')}>Find peer companions</button>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="chat-list-state"><p>No conversations match that search.</p></div>
            ) : filteredConnections.map((connection) => {
              const name = connection.peer?.username || connection.alias || 'Peer companion';
              const lastMessage = connection.last_message;
              const preview = lastMessage?.content
                ? `${String(lastMessage.sender_id) === String(userId) ? 'You: ' : ''}${lastMessage.content}`
                : 'Start a conversation';
              const avatarUrl = connection.peer?.avatar_url;
              return (
                <button
                  key={connection.connection_id}
                  type="button"
                  className={`chat-conversation ${connection.connection_id === connId ? 'is-active' : ''}`}
                  onClick={() => selectConnection(connection)}
                  aria-pressed={connection.connection_id === connId}
                >
                  {avatarUrl ? (
                    <img className="chat-avatar" src={avatarUrl} alt="" />
                  ) : (
                    <span className="chat-avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
                  )}
                  <span className="chat-conversation-copy">
                    <span className="chat-conversation-name">{name}</span>
                    <span className="chat-conversation-preview">{preview}</span>
                  </span>
                  <span className="chat-conversation-meta">
                    {fmtConversationTime(lastMessage?.created_at || connection.created_at)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="chat-main" aria-label={connId ? `Chat with ${peerName}` : 'Conversation'}>
          {connId ? (
            <>
              <header className="chat-header">
                <button
                  type="button"
                  className="chat-back-button"
                  onClick={() => setSearchParams({})}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <div className="relative flex-shrink-0">
                  {selectedConnection?.peer?.avatar_url ? (
                    <img className="chat-avatar" src={selectedConnection.peer.avatar_url} alt="" />
                  ) : (
                    <span className="chat-avatar" aria-hidden="true">{initials}</span>
                  )}
                  <span className={`chat-status-dot absolute -bottom-0.5 -right-0.5 ${isOnline ? 'is-online' : ''}`} />
                </div>
                <div className="chat-header-copy">
                  <h2 className="chat-header-name">{peerName}</h2>
                  <div className="chat-header-status">
                    <span className={`chat-status-dot ${isOnline ? 'is-online' : ''}`} />
                    <span>{status}</span>
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    className="chat-level-button"
                    onClick={() => setShowLevelPopover(!showLevelPopover)}
                    aria-expanded={showLevelPopover}
                    aria-label={`Connection level ${lvlInfo.level}: ${lvlInfo.level_name}`}
                  >
                    <span>Level {lvlInfo.level}</span>
                    <span className="hidden sm:inline">{lvlInfo.level_name}</span>
                  </button>
                  {showLevelPopover && (
                    <div className="chat-level-popover">
                      <strong>Connection depth · {lvlInfo.score} points</strong>
                      <p>{lvlInfo.level_name} · {lvlInfo.progress_pct}% to the next level</p>
                      {activityState?.compatibility_summary && (
                        <p>{activityState.compatibility_summary}</p>
                      )}
                    </div>
                  )}
                </div>
              </header>

      {/* DISMISSIBLE "GET TO KNOW EACH OTHER" CHAT PROMPT CARD */}
      {activityState?.unlocked && !promptDismissed && (!currentQuiz || !currentQuiz.is_fully_completed) && (
        <div className="chat-activity-banner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/70 text-purple-700 flex items-center justify-center text-lg flex-shrink-0">
                ✨
              </div>
              <div>
                <h4 className="text-xs font-bold">Get to know each other</h4>
                <p className="text-xs text-purple-100">
                  Play a fun, positive-only guessing activity tailored to your connection!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleStartActivity}
                disabled={generatingQuiz}
                className="px-3 py-2 rounded-lg bg-white text-purple-700 font-bold text-xs hover:bg-purple-50 transition border-none cursor-pointer shadow-sm"
              >
                {generatingQuiz ? 'Loading...' : currentQuiz ? 'Continue Quiz' : 'Start Activity'}
              </button>
              <button
                onClick={() => setPromptDismissed(true)}
                className="p-1.5 text-purple-700 hover:text-purple-900 transition border-none bg-transparent cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
        </div>
      )}

      {/* MESSAGES CONTAINER */}
          <div className="chat-message-list" aria-live="polite" aria-label="Messages">
        {historyError && (
            <div className="chat-inline-error" role="alert">
            <p>{historyError}</p>
            <button type="button" className="chat-retry-button" onClick={fetchHistory}>Retry</button>
          </div>
        )}
        {loading ? (
          <div className="chat-empty-state" role="status"><p>Loading messages…</p></div>
          ) : historyError ? null : messages.length === 0 ? (
          <div className="chat-empty-state">
            <span className="chat-empty-mark"><MessageCircle size={23} aria-hidden="true" /></span>
            <h2>Start your conversation</h2>
            <p>A kind message can make someone's day better. Send a supportive reflection to begin.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isSelf = String(m.sender_id) === String(userId);
            const time = fmtTime(m.created_at || m.timestamp);

            return (
              <div key={m.message_id || `${m.sender_id}-${m.created_at || m.timestamp}-${idx}`} className={`chat-message-row ${isSelf ? 'is-mine' : ''}`}>
                <div className="chat-message-bubble">
                  {m.content || m.message}
                </div>
                <span className="chat-message-time">{time}</span>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isPeerTyping && (
          <div className="chat-typing" role="status">{peerName} is typing…</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
      <div className="chat-composer-shell">
        {sendError && <p className="chat-inline-error" role="alert">{sendError}</p>}
        <form onSubmit={handleSend} className="chat-composer">
          <textarea
            rows="1"
            value={inputText}
            onChange={(e) => handleTypingInput(e.target.value)}
            placeholder="Write a supportive message..."
            className="chat-composer-input"
            aria-label="Message"
          />
          <button type="submit" className="chat-send-button" disabled={!inputText.trim() || !isOnline}>
            <Send size={16} aria-hidden="true" />
            Send
          </button>
        </form>
      </div>
            </>
          ) : (
            <div className="chat-empty-state">
              <span className="chat-empty-mark"><MessageCircle size={23} aria-hidden="true" /></span>
              <h2>Choose a conversation</h2>
              <p>Your private support conversations will appear here.</p>
            </div>
          )}
        </section>
      </div>

      {/* EXPLICIT ONE-TIME CONSENT MODAL */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl shadow-inner">
              ✨
            </div>
            <div>
              <h3 className="t-h3 font-bold text-gray-900">Personalized Companion Activities</h3>
              <p className="t-body-md text-gray-600 mt-1">
                SoulCare uses your chat and journal patterns to create fun, personalized activities with your connections.
              </p>
            </div>

            {showConsentLearnMore && (
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-xs text-purple-800 leading-relaxed">
                🔒 <strong>Privacy Assurance:</strong> Raw private message content is never shared verbatim. We only analyze derived interest tags and high-level themes. All activities are 100% positive-only with pre-written options—never open-text or negative traits.
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleConsentAgreement(true)}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
              >
                I Agree
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConsentLearnMore(!showConsentLearnMore)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition border-none cursor-pointer"
                >
                  {showConsentLearnMore ? 'Hide Details' : 'Learn More'}
                </button>
                <button
                  onClick={() => handleConsentAgreement(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-500 font-semibold text-xs hover:bg-gray-200 transition border-none cursor-pointer"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE POSITIVE-ONLY QUIZ & COMPARISON MODAL */}
      {showQuizModal && currentQuiz && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="t-h4 font-bold text-gray-900">Get to Know {peerName}</h3>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quizErr && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {quizErr}
              </div>
            )}

            {currentQuiz.is_fully_completed ? (
              /* CELEBRATORY COMPARISON VIEW */
              <div className="space-y-4 text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                  🎉
                </div>
                <div>
                  <h3 className="t-h3 font-bold text-gray-900">Activity Completed!</h3>
                  <p className="t-body-md text-gray-500">
                    Here is what you both guessed about each other. Warm & uplifting!
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  {currentQuiz.questions.map((q) => {
                    const myG = quizAnswers[q.id];
                    const peerG = currentQuiz.peer_answers[q.id];

                    return (
                      <div key={q.id} className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-2">
                        <p className="text-xs font-bold text-purple-900">{q.prompt}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Your Guess</span>
                            <span className="font-semibold text-purple-700">{myG || 'Not answered'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">{peerName}'s Guess</span>
                            <span className="font-semibold text-indigo-700">{peerG || 'Not answered'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowQuizModal(false)}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
                >
                  Back to Chat 💬
                </button>
              </div>
            ) : currentQuiz.has_answered ? (
              /* WAITING FOR PEER VIEW */
              <div className="text-center py-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
                  ⏳
                </div>
                <h3 className="t-h3 font-bold text-gray-900">Your guesses are saved!</h3>
                <p className="t-body-md text-gray-500 max-w-xs mx-auto">
                  Once {peerName} submits their guesses, both of your answers will unlock here.
                </p>
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition border-none cursor-pointer shadow-sm"
                >
                  Close & Return to Chat
                </button>
              </div>
            ) : (
              /* ANSWERING FORM (STRICTLY POSITIVE CHOICE BUTTONS) */
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Select the positive trait that best describes your companion:
                </p>

                {currentQuiz.questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                    <p className="text-xs font-bold text-gray-900">{q.prompt}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => {
                        const selected = quizAnswers[q.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            className={`p-3 rounded-xl text-left text-xs font-semibold transition border cursor-pointer ${
                              selected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleSubmitQuiz}
                  disabled={submittingQuiz || Object.keys(quizAnswers).length < currentQuiz.questions.length}
                  className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 disabled:opacity-50 transition border-none cursor-pointer shadow-md"
                >
                  {submittingQuiz ? 'Submitting...' : 'Submit Guesses ✨'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default ChatPage;
