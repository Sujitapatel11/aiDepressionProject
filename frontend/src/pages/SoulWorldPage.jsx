import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const REALMS = [
  { id: 'soul-room', name: 'Soul Room', subtitle: 'Your private sanctuary', icon: '⌂', tone: 'violet', path: '/', status: 'Home base', description: 'Return to your personal corner of the universe.' },
  { id: 'journal-forest', name: 'Journal Forest', subtitle: 'A quiet place to reflect', icon: '🌳', tone: 'pink', path: '/journal', status: 'Ready to explore', description: 'Follow a thought, capture a moment, and let your reflections grow.' },
  { id: 'connect-island', name: 'Connect Island', subtitle: 'Find your people', icon: '♡', tone: 'rose', path: '/peers', status: 'Meet people', description: 'Build meaningful connections at your own pace.' },
  { id: 'play-zone', name: 'Community', subtitle: 'Shared stories & moments', icon: '✧', tone: 'amber', path: '/community', status: 'Community space', description: 'Visit the community to read and share anonymous reflections.' },
  { id: 'soultube', name: 'SoulTube', subtitle: 'Watch together, in sync', icon: '▶', tone: 'violet', path: '/soultube', status: 'Watch party', description: 'Open a watch room, share a video you own, and let the host keep everyone in sync.' },
  { id: 'creator-studio', name: 'Creator Studio', subtitle: 'Your creative corner', icon: '✿', tone: 'lavender', path: '/creator-studio', status: 'Creative space', description: 'Shape ideas into private drafts in your creative workshop.' },
  { id: 'explore-island', name: 'Explore Island', subtitle: 'A new realm awaits', icon: '♙', tone: 'slate', path: null, status: 'Locked', description: 'This realm is not available yet.' },
];

const toneClasses = {
  violet: 'bg-violet-100 text-violet-700 ring-violet-200',
  pink: 'bg-pink-100 text-pink-700 ring-pink-200',
  rose: 'bg-rose-100 text-rose-700 ring-rose-200',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200',
  lavender: 'bg-purple-100 text-purple-700 ring-purple-200',
  slate: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export default function SoulWorldPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('soul-room');
  const selected = REALMS.find((realm) => realm.id === selectedId) || REALMS[0];

  const openRealm = () => {
    if (selected.path) navigate(selected.path);
  };

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-8 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-[0_8px_28px_-20px_rgba(91,49,145,.35)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-violet-500">Your personal universe</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#211832] sm:text-3xl">Soul World ✨</h1>
              <p className="mt-1 text-sm text-[#796d8a]">Choose a realm and explore what’s waiting for you.</p>
            </div>
            <button type="button" onClick={() => navigate('/')} className="shrink-0 rounded-full bg-violet-100 px-4 py-2.5 text-xs font-extrabold text-violet-800 transition hover:bg-violet-200">⌂ My Room</button>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs font-bold">
            <span className="text-violet-700">✦ Your universe is taking shape</span>
            <span className="text-[#8a7d99]">Explore at your own pace</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-fuchsia-300 to-violet-500" /></div>
        </header>

        <section className="relative overflow-hidden rounded-[30px] border border-violet-100 bg-gradient-to-br from-[#28204b] via-[#66509a] to-[#d6a8d9] p-4 shadow-[0_18px_50px_-24px_rgba(91,49,145,.65)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 12% 18%, #fff 0 1px, transparent 2px), radial-gradient(circle at 76% 24%, #fff 0 1px, transparent 2px), radial-gradient(circle at 40% 62%, #fff 0 1px, transparent 2px), radial-gradient(circle at 88% 78%, #fff 0 1px, transparent 2px)', backgroundSize: '74px 68px, 113px 91px, 89px 102px, 131px 117px' }} />
          <div className="relative z-10 flex items-center justify-between gap-2 text-white">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-100">Celestial map</p><h2 className="text-lg font-extrabold">{REALMS.length} realms, one universe</h2></div>
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/90 backdrop-blur">Select an island</span>
          </div>
          <div className="relative z-10 mx-auto mt-4 grid min-h-[390px] max-w-3xl grid-cols-2 grid-rows-3 gap-3 sm:min-h-[430px] sm:grid-cols-3 sm:grid-rows-2 sm:gap-5">
            {REALMS.map((realm, index) => (
              <button key={realm.id} type="button" onClick={() => setSelectedId(realm.id)} aria-pressed={selectedId === realm.id}
                className={`group relative flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[25px] border px-2 py-4 text-center backdrop-blur-md transition duration-200 hover:-translate-y-1 ${selectedId === realm.id ? 'border-white bg-white text-violet-950 shadow-[0_12px_30px_rgba(20,10,50,.28)] ring-4 ring-white/20' : 'border-white/35 bg-white/15 text-white hover:bg-white/25'} ${realm.path ? '' : 'opacity-80'}`}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-inner ${selectedId === realm.id ? toneClasses[realm.tone] : 'bg-white/20 text-white'}`}>{realm.icon}</span>
                <span className="text-sm font-extrabold">{realm.name}</span>
                <span className={`text-[10px] ${selectedId === realm.id ? 'text-violet-600' : 'text-white/80'}`}>{realm.path ? realm.subtitle : realm.status}</span>
                {!realm.path && <span className="absolute right-2 top-2 text-[10px]">🔒</span>}
                {index < 4 && <span className="pointer-events-none absolute -bottom-2 left-1/2 h-3 w-px bg-white/30 sm:hidden" />}
              </button>
            ))}
          </div>
          <div className="relative z-10 mt-4 flex items-center justify-between rounded-2xl border border-white/25 bg-[#21183f]/40 px-4 py-3 text-xs text-white backdrop-blur">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-200" /> Tap an island to preview its realm</span>
            <span className="font-bold">{REALMS.filter((realm) => realm.path).length} destinations available</span>
          </div>
        </section>

        <section className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ring-1 ${toneClasses[selected.tone]}`}>{selected.icon}</span>
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">Selected realm</p><h2 className="text-lg font-extrabold text-[#2b2040]">{selected.name}</h2></div>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700">{selected.status}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#766982]">{selected.description}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-violet-50 pt-4">
            <span className="text-xs text-[#9489a0]">Pick another island whenever you like.</span>
            <button type="button" onClick={openRealm} disabled={!selected.path}
              className="rounded-full bg-violet-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-violet-200 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
              {selected.path ? 'Enter this realm →' : 'Not available yet'}
            </button>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-[24px] border border-pink-100 bg-[#fff0f8] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xl text-violet-700">☾</span>
          <div><p className="text-sm font-extrabold text-[#70465f]">A little cosmic reminder</p><p className="mt-1 text-xs leading-relaxed text-[#8d6c83]">There’s no race to explore everything. Take the path that feels right today.</p></div>
        </section>
      </div>
    </main>
  );
}
