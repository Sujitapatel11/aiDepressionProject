import React from 'react';

export default function RoomParticipants({ participants, maxParticipants }) {
  return (
    <section className="rounded-[26px] border border-violet-100 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-[#2b2040]">In the room</h2>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-700">
          {participants.length}{maxParticipants ? ` / ${maxParticipants}` : ''}
        </span>
      </header>
      {participants.length ? (
        <ul className="mt-3 space-y-2">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                participant.role === 'host'
                  ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {(participant.username || '?').slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#3d3050]">
                {participant.username || 'Member'}
                {participant.is_me && <span className="ml-1.5 text-[10px] font-extrabold text-violet-400">You</span>}
              </span>
              {participant.role === 'host' && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">
                  Host
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-violet-400">No one is here yet.</p>
      )}
    </section>
  );
}
