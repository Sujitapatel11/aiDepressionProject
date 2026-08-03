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

  useEffect(() => {
    if (!connId) return;

    fetchHistory();

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

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const initials = (peerName || '?').slice(0, 2).toUpperCase();

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
    <div className="flex flex-col h-[calc(100vh-68px)] lg:h-screen bg-white max-w-5xl mx-auto shadow-sm animate-fadeIn">
      {/* CHAT HEADER */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
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
          <h3 className="t-h5 font-bold text-gray-900 truncate">{peerName}</h3>
          <span className={`text-xs font-semibold block ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
            {status}
          </span>
        </div>
      </div>

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
    </div>
  );
};

export default ChatPage;
