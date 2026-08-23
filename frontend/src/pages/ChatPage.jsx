import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { ChatWebSocketClient } from '../services/chatWebSocket';

export const ChatPage = () => {
  const { userId, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const connId = searchParams.get('conn') || '';
  const peerName = searchParams.get('name') || 'Peer Companion';

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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchHistory = async () => {
    if (!connId) return;
    setLoading(true);
    const res = await api('GET', `/chat/${connId}/messages/`);
    if (res && res.ok) {
      try {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setMessages(list);
      } catch (e) {
        setMessages([]);
      }
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

    const client = new ChatWebSocketClient(connId, token, {
      onStatusChange: (statusText, online) => {
        setStatus(statusText);
        setIsOnline(online);
      },
      onMessage: (msgData) => {
        console.log('[ChatPage] WS message received, updating state:', msgData);
        setMessages((prev) => {
          if (msgData.message_id && prev.some((m) => m.message_id === msgData.message_id)) {
            return prev;
          }
          return [...prev, msgData];
        });
        // Re-evaluate level score after new messages arrive
        fetchActivityStatus();
        scrollToBottom();
      },
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
  }, [connId, token, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    const msg = inputText.trim();
    if (!msg || !wsClientRef.current) return;

    wsClientRef.current.sendMessage(msg);
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

  const initials = (peerName || '?').slice(0, 2).toUpperCase();
  const lvlInfo = activityState?.level_info || { level: 1, level_name: 'Seed Connection', progress_pct: 0, score: 0 };
  const currentQuiz = activityState?.quiz;

  if (!connId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70vh]">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-3 shadow-inner">
          💬
        </div>
        <h3 className="t-h3 font-bold text-gray-900 mb-1">Your 1-on-1 Messages</h3>
        <p className="t-body-md text-gray-500 max-w-sm mb-4">
          Select a peer conversation from your Support Circle to start messaging.
        </p>
        <button
          onClick={() => navigate('/peers')}
          className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md"
        >
          Go to Peers Sanctuary →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] lg:h-screen bg-white max-w-5xl mx-auto shadow-sm animate-fadeIn relative">
      {/* CHAT HEADER WITH LEVEL INDICATOR BADGE */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0 relative">
        <button
          onClick={() => navigate('/peers')}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition border-none bg-transparent cursor-pointer mr-1"
          title="Back to peers"
        >
          ←
        </button>
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-black"
            style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}
          >
            {initials}
          </div>
          {isOnline && <div className="online-dot"></div>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="t-h5 font-bold text-gray-900 truncate">{peerName}</h3>
            {lvlInfo.level >= 4 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                🛡️ Trusted Circle
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold block ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
            {status}
          </span>
        </div>

        {/* LEVEL BADGE & PROGRESS INDICATOR */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowLevelPopover(!showLevelPopover)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">
              {lvlInfo.level}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[11px] font-bold leading-tight">{lvlInfo.level_name}</div>
              <div className="w-16 h-1 rounded-full bg-purple-200 overflow-hidden mt-0.5">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${lvlInfo.progress_pct}%` }}
                ></div>
              </div>
            </div>
          </button>

          {/* LEVEL POPOVER TOOLTIP */}
          {showLevelPopover && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl p-4 shadow-xl border border-purple-100 z-30 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
                <span className="text-xs font-bold text-gray-900">Connection Depth: Level {lvlInfo.level}</span>
                <span className="text-xs font-semibold text-purple-600">{lvlInfo.score} pts</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{lvlInfo.level_name}</p>

              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-purple-600 h-full transition-all duration-300"
                  style={{ width: `${lvlInfo.progress_pct}%` }}
                ></div>
              </div>

              <div className="space-y-1.5 text-[11px] font-medium text-gray-600 mb-3">
                <div className={`flex items-center gap-1.5 ${lvlInfo.level >= 1 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
                  <span>🏷️</span> <span>Level 1: Journal Interest Tags</span>
                </div>
                <div className={`flex items-center gap-1.5 ${lvlInfo.level >= 2 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
                  <span>🎲</span> <span>Level 2: "Get to Know Each Other" Activity</span>
                </div>
                <div className={`flex items-center gap-1.5 ${lvlInfo.level >= 3 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
                  <span>💖</span> <span>Level 3: Compatibility Summary</span>
                </div>
                <div className={`flex items-center gap-1.5 ${lvlInfo.level >= 4 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
                  <span>🛡️</span> <span>Level 4: Trusted Circle Badge</span>
                </div>
              </div>

              {activityState?.compatibility_summary && (
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-xs font-medium text-purple-800">
                  <span className="font-bold">✨ Compatibility: </span>
                  {activityState.compatibility_summary}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DISMISSIBLE "GET TO KNOW EACH OTHER" CHAT PROMPT CARD */}
      {activityState?.unlocked && !promptDismissed && (!currentQuiz || !currentQuiz.is_fully_completed) && (
        <div className="px-6 pt-3 bg-[#FAF8FE] flex-shrink-0">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-xl flex-shrink-0">
                ✨
              </div>
              <div>
                <h4 className="text-sm font-bold">Get to know each other</h4>
                <p className="text-xs text-purple-100">
                  Play a fun, positive-only guessing activity tailored to your connection!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleStartActivity}
                disabled={generatingQuiz}
                className="px-4 py-2 rounded-xl bg-white text-purple-700 font-bold text-xs hover:bg-purple-50 transition border-none cursor-pointer shadow-sm"
              >
                {generatingQuiz ? 'Loading...' : currentQuiz ? 'Continue Quiz' : 'Start Activity'}
              </button>
              <button
                onClick={() => setPromptDismissed(true)}
                className="p-1.5 text-purple-200 hover:text-white transition border-none bg-transparent cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#FAF8FE]">
        {loading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="flex flex-col items-start">
              <div className="w-48 h-10 rounded-2xl bg-purple-100"></div>
            </div>
            <div className="flex flex-col items-end">
              <div className="w-56 h-12 rounded-2xl bg-purple-200"></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm mx-auto my-auto max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">
              💜
            </div>
            <h3 className="t-h3 font-bold text-gray-900">Start your conversation.</h3>
            <p className="t-body-md text-gray-500">
              A kind message can make someone's day better. Send a supportive reflection to begin.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isSelf = String(m.sender_id) === String(userId);
            const time = fmtTime(m.created_at || m.timestamp);

            return (
              <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} fade-in`}>
                <div
                  className="p-4 max-w-md shadow-sm text-sm font-normal leading-relaxed"
                  style={{
                    background: isSelf
                      ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)'
                      : '#FFFFFF',
                    color: isSelf ? '#FFFFFF' : '#1F2937',
                    border: isSelf ? 'none' : '1px solid #E5E7EB',
                    borderRadius: isSelf
                      ? '24px 24px 4px 24px'
                      : '24px 24px 24px 4px',
                  }}
                >
                  {m.content || m.message}
                </div>
                <span className="text-[10px] font-semibold text-gray-400 mt-1 px-1">{time}</span>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isPeerTyping && (
          <div className="flex flex-col items-start fade-in">
            <div className="p-3 px-4 rounded-2xl bg-white border border-gray-200 text-xs font-semibold text-purple-600 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
              <span>{peerName} is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0 bg-white border-t border-gray-200"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleTypingInput(e.target.value)}
          placeholder="Write a supportive message..."
          className="inp flex-1 t-body-md"
          style={{ borderRadius: '24px', padding: '12px 20px' }}
        />
        <button type="submit" className="btn-blue py-3 px-6" style={{ width: 'auto' }}>
          Send
        </button>
      </form>

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
