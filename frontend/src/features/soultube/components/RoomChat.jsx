import React, { useEffect, useRef, useState } from 'react';

const MAX_BODY = 500;

/**
 * Room chat. Messages are plain text and rendered as text nodes, never HTML.
 * History comes from the REST endpoint; live messages arrive over the room
 * WebSocket and are de-duplicated by the page before they reach this list.
 */
export default function RoomChat({
  messages,
  onSend,
  connected,
  disabled,
  currentUsername,
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    setDraft('');
    const delivered = await onSend(body);
    setSending(false);
    if (!delivered) {
      setDraft(body);
    }
  };

  return (
    <section className="flex min-h-0 flex-col rounded-[26px] border border-violet-100 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-violet-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#2b2040]">Room chat</h2>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-400">
            Everyone in this room can read it
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {connected ? 'Live' : 'Reconnecting'}
        </span>
      </header>

      <div ref={listRef} className="min-h-[180px] flex-1 space-y-3 overflow-y-auto px-4 py-3 lg:max-h-[380px]">
        {!messages.length && (
          <div className="grid h-full min-h-[150px] place-items-center text-center">
            <div>
              <span className="text-2xl" aria-hidden="true">💬</span>
              <p className="mt-2 text-xs font-bold text-violet-700">No messages yet</p>
              <p className="mt-1 text-[11px] text-violet-400">Say hello while the video loads.</p>
            </div>
          </div>
        )}
        {messages.map((message) => {
          const mine = message.is_mine || (message.username && message.username === currentUsername);
          return (
            <div key={message.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="px-1 text-[10px] font-bold text-violet-400">
                {mine ? 'You' : message.username || 'Member'}
              </span>
              <p className={`mt-1 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                mine
                  ? 'bg-violet-700 text-white'
                  : 'bg-violet-50 text-[#3d3050]'
              }`}>
                {message.body}
              </p>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="border-t border-violet-50 p-3">
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="soultube-chat-input">Message the room</label>
          <textarea
            id="soultube-chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_BODY))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit(event);
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={disabled ? 'This room has ended.' : 'Write a message…'}
            className="min-h-[40px] flex-1 resize-none rounded-2xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 text-xs text-[#2b2040] outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || sending || !draft.trim()}
            className="rounded-2xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
        <p className="mt-1.5 text-right text-[10px] text-violet-300">{draft.length}/{MAX_BODY}</p>
      </form>
    </section>
  );
}
