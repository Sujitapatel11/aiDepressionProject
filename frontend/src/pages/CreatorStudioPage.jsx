import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const FORMATS = [
  { id: 'micro-post', label: 'Write a post', icon: '✍️' },
  { id: 'story', label: 'Create a story', icon: '✦' },
  { id: 'poem', label: 'Poetry', icon: '❋' },
  { id: 'journal-piece', label: 'Journal-inspired', icon: '🌿' },
];

async function readResponse(response) {
  if (!response) throw new Error('Could not connect to SoulCare API.');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || Object.values(data).flat().join(' ') || 'Request failed.');
  return data;
}

export default function CreatorStudioPage() {
  const navigate = useNavigate();
  const [format, setFormat] = useState('micro-post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadCreatorData = useCallback(async () => {
    setError('');
    try {
      const [postsRes, earningsRes, withdrawalsRes] = await Promise.all([
        api('GET', '/creator/posts/'),
        api('GET', '/creator/earnings/'),
        api('GET', '/creator/withdrawals/'),
        api('GET', '/creator/settlements/'),
      ]);
      const [postsData, earningsData, withdrawalsData, settlementsData] = await Promise.all([
        readResponse(postsRes), readResponse(earningsRes), readResponse(withdrawalsRes), readResponse(settlementsRes),
      ]);
      setDrafts(Array.isArray(postsData) ? postsData : []);
      setEarnings(earningsData);
      setWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
      setSettlements(Array.isArray(settlementsData) ? settlementsData : []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { loadCreatorData(); }, [loadCreatorData]);

  const resetEditor = () => { setSelectedId(null); setTitle(''); setBody(''); setFormat('micro-post'); };

  const saveDraft = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Add both a title and content before saving.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = selectedId
        ? await api('PATCH', `/creator/posts/${selectedId}/`, { title: title.trim(), body: body.trim() })
        : await api('POST', '/creator/posts/', { title: title.trim(), body: body.trim() });
      const saved = await readResponse(response);
      setSelectedId(saved.id);
      setNotice('Draft saved securely to your SoulCare account.');
      await loadCreatorData();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const openDraft = (draft) => {
    if (draft.status !== 'draft') return;
    setSelectedId(draft.id); setTitle(draft.title); setBody(draft.body);
    setNotice('Draft loaded.'); setError('');
  };

  const publishDraft = async () => {
    if (!selectedId) { setError('Save this draft first, then publish it.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await readResponse(await api('POST', `/creator/posts/${selectedId}/publish/`, {}));
      resetEditor(); setNotice('Your post is now published.');
      await loadCreatorData();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Delete this draft permanently?')) return;
    setBusy(true); setError('');
    try {
      const response = await api('DELETE', `/creator/posts/${id}/`);
      if (!response || !response.ok) throw new Error('Could not delete draft.');
      if (selectedId === id) resetEditor();
      setNotice('Draft deleted.'); await loadCreatorData();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const requestWithdrawal = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await readResponse(await api('POST', '/creator/withdrawals/', { amount: withdrawAmount, currency: 'USD' }));
      setWithdrawAmount(''); setNotice('Withdrawal request submitted for staff review.');
      await loadCreatorData();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const selectedFormat = FORMATS.find((item) => item.id === format) || FORMATS[0];
  const published = drafts.filter((item) => item.status === 'published');

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-700">✦ Creator workspace</span>
            <button type="button" onClick={() => navigate('/world')} className="rounded-full border border-violet-200 px-4 py-2 text-xs font-bold text-violet-700">← Soul World</button>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2a1e43] sm:text-4xl">Creator Studio <span className="text-violet-500">✧</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#796d8a]">Write, save drafts to your account, publish, and review creator activity.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f8f4fc] px-3 py-2 text-[11px] font-semibold text-[#766982]">Account-synced drafts</span>
            <span className="rounded-full bg-[#f8f4fc] px-3 py-2 text-[11px] font-semibold text-[#766982]">Published posts</span>
            <span className="rounded-full bg-[#f8f4fc] px-3 py-2 text-[11px] font-semibold text-[#766982]">Creator earnings ledger</span>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-white p-4"><p className="text-xs text-[#847891]">Published posts</p><p className="mt-1 text-2xl font-extrabold">{published.length}</p></div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4"><p className="text-xs text-[#847891]">Lifetime creator earnings</p><p className="mt-1 text-2xl font-extrabold">{earnings ? Object.entries(earnings.lifetime_earnings_by_currency || {}).map(([c,v]) => `${c} ${v}`).join(' · ') || '0.00' : '—'}</p></div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4"><p className="text-xs text-[#847891]">Pending withdrawal requests</p><p className="mt-1 text-2xl font-extrabold">{withdrawals.filter((item) => item.status === 'requested').length}</p></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-[28px] border border-violet-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-50 pb-4">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Writing desk</p><h2 className="mt-1 text-lg font-extrabold">{selectedFormat.label}</h2></div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700">{selectedId ? 'Editing saved draft' : 'New draft'}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FORMATS.map((item) => <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => setFormat(item.id)} className={`rounded-xl border p-3 text-left text-xs font-bold ${format === item.id ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-violet-100'}`}>{item.icon} {item.label}</button>)}
            </div>
            <label className="mt-4 block text-[11px] font-extrabold text-[#766982]" htmlFor="creator-title">TITLE</label>
            <input id="creator-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Give your creation a name…" className="mt-2 w-full rounded-2xl border border-violet-100 bg-[#fbf9fd] px-4 py-3 text-sm outline-none focus:border-violet-400" />
            <label className="mt-4 block text-[11px] font-extrabold text-[#766982]" htmlFor="creator-body">YOUR WORDS</label>
            <textarea id="creator-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={20000} rows={11} placeholder="Start writing…" className="mt-2 w-full resize-y rounded-2xl border border-violet-100 bg-[#fbf9fd] p-4 text-sm leading-7 outline-none focus:border-violet-400" />
            <div className="mt-2 flex justify-between text-[10px] text-[#9a8fa5]"><span>{body.length}/20000 characters</span><span>{body.trim() ? body.trim().split(/\s+/).length : 0} words</span></div>
            <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-violet-50 pt-4">
              <button type="button" onClick={resetEditor} className="rounded-full border border-violet-200 px-4 py-2.5 text-xs font-bold text-violet-700">New draft</button>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy || !title.trim() || !body.trim()} onClick={saveDraft} className="rounded-full border border-violet-300 px-4 py-2.5 text-xs font-extrabold text-violet-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save draft'}</button>
                <button type="button" disabled={busy || !selectedId} onClick={publishDraft} className="rounded-full bg-violet-700 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">Publish →</button>
              </div>
            </div>
            {notice && <p role="status" className="mt-3 text-xs font-semibold text-violet-700">{notice}</p>}
            {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-extrabold">Your drafts</h3>
              <div className="mt-3 space-y-2">
                {drafts.filter((item) => item.status === 'draft').length === 0 && <p className="text-xs text-[#847891]">No saved drafts yet.</p>}
                {drafts.filter((item) => item.status === 'draft').map((draft) => <div key={draft.id} className="flex items-center gap-2 rounded-xl bg-[#f8f4fc] p-3"><button type="button" onClick={() => openDraft(draft)} className="min-w-0 flex-1 truncate text-left text-xs font-bold text-[#5b4773]">{draft.title}</button><button type="button" onClick={() => deleteDraft(draft.id)} className="text-xs font-bold text-red-600">Delete</button></div>)}
              </div>
            </div>
            <div className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-extrabold">Withdraw creator earnings</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-[#847891]">Requests are reviewed by staff. This app does not send money automatically.</p>
              <input aria-label="Withdrawal amount in USD" type="number" min="1" step="0.01" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} placeholder="Amount in USD" className="mt-3 w-full rounded-xl border border-violet-100 px-3 py-2 text-sm" />
              <button type="button" disabled={busy || !withdrawAmount || Number(withdrawAmount) <= 0} onClick={requestWithdrawal} className="mt-2 w-full rounded-full bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">Request withdrawal</button>
              <div className="mt-4 space-y-2">{withdrawals.map((item) => <div key={item.id} className="flex justify-between gap-2 text-[11px]"><span>{item.currency} {item.amount}</span><span className="font-bold capitalize">{item.status}</span></div>)}</div>
            </div>
            <div className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-extrabold">Monthly statements</h3>
              <p className="mt-1 text-[11px] text-[#847891]">Statements are prepared by the SoulCare finance team.</p>
              <div className="mt-3 space-y-2">{settlements.length === 0 && <p className="text-xs text-[#847891]">No monthly statements yet.</p>}{settlements.map((item) => <div key={item.id} className="rounded-xl bg-[#f8f4fc] p-3"><div className="flex justify-between gap-2 text-xs font-bold"><span>{item.period_start.slice(0, 7)} · {item.currency} {item.total_amount}</span><span className="capitalize">{item.status}</span></div><p className="mt-1 text-[10px] text-[#847891]">{item.earning_count} earning entries{item.payout_reference ? ' · Ref: ' + item.payout_reference : ''}</p></div>)}</div>
            </div>
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-extrabold text-amber-900">Monetization status</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">The ledger applies the 50% share only to revenue entered through the staff-only verified-event endpoint. Ad-network callbacks, fraud signals and real payout rails still need provider integration.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
