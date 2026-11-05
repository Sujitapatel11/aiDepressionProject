import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function CreatorEarningsPage() {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadEarnings = async () => {
    setLoading(true);
    const response = await api('GET', '/creators/earnings/');
    if (!response?.ok) {
      setError(response?.status === 404 ? 'Activate Creator Mode to view earnings.' : 'Earnings are currently unavailable.');
      setData(null);
      setLoading(false);
      return;
    }
    try {
      setData(await response.json());
      setError('');
    } catch (loadError) {
      setError('Earnings response could not be read.');
    }
    setLoading(false);
  };

  useEffect(() => { loadEarnings(); }, []);

  const requestWithdrawal = async (event) => {
    event.preventDefault();
    if (!data?.available) return;
    setSaving(true);
    setError('');
    setNotice('');
    const requestKey = window.crypto?.randomUUID?.();
    if (!requestKey) {
      setError('This browser cannot create a secure request key. Update your browser and retry.');
      setSaving(false);
      return;
    }
    const response = await api('POST', '/creators/withdrawals/', { request_key: requestKey, amount });
    setSaving(false);
    if (!response?.ok) {
      let body = {};
      try { body = response ? await response.json() : {}; } catch (parseError) {}
      setError(body.detail || body.amount?.[0] || 'Withdrawal request could not be submitted.');
      return;
    }
    setAmount('');
    setNotice('Withdrawal request submitted for staff review.');
    await loadEarnings();
  };

  const balances = data?.balances || { pending: '0.00', available: '0.00', paid: '0.00' };

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Creator Mode</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#302441]">Earnings</h1>
            <p className="mt-1 text-xs text-[#8b7e96]">Only verified advertising revenue can create earnings.</p>
          </div>
          <Link to="/creator-studio" className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white">Creator Studio</Link>
        </header>

        {loading ? <p role="status" className="text-sm text-violet-700">Loading earnings…</p> : error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {data && (
          <>
            {!data.available && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-sm font-extrabold text-amber-950">Earnings unavailable</h2>
                <p className="mt-1 text-xs leading-relaxed text-amber-900">{data.unavailable_reason} No revenue or payout amount is estimated or fabricated.</p>
              </section>
            )}
            <section className="grid gap-3 sm:grid-cols-3">
              {[
                ['Pending', balances.pending],
                ['Available', balances.available],
                ['Paid', balances.paid],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-violet-100 bg-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#93879d]">{label} · {data.currency}</p>
                  <p className="mt-2 text-2xl font-extrabold text-violet-800">{value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-violet-100 bg-white p-5">
              <h2 className="text-sm font-extrabold text-[#34264b]">Withdraw available balance</h2>
              <p className="mt-1 text-xs text-[#91859e]">Minimum request: {data.minimum_withdrawal} {data.currency}. Staff approval and a recorded payment reference are required.</p>
              <form onSubmit={requestWithdrawal} className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-xs font-bold text-[#5b4b6c]">Amount ({data.currency})
                  <input type="number" min={data.minimum_withdrawal} step="0.01" max={balances.available} value={amount} onChange={(event) => setAmount(event.target.value)} disabled={!data.available} className="mt-1 block w-48 rounded-lg border border-violet-100 px-3 py-2.5 text-sm disabled:bg-gray-50" />
                </label>
                <button type="submit" disabled={!data.available || saving || !amount} className="rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Submitting…' : 'Request withdrawal'}</button>
              </form>
              {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
              {notice && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{notice}</p>}
            </section>

            <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
              <div className="border-b border-violet-50 px-4 py-3"><h2 className="text-sm font-extrabold text-[#34264b]">Monthly settlements</h2></div>
              {!data.settlements?.length ? <p className="p-4 text-xs text-[#91859e]">No verified advertising settlements are available.</p> : data.settlements.map((settlement) => (
                <div key={settlement.month} className="flex flex-wrap justify-between gap-2 border-b border-violet-50 px-4 py-3 text-xs">
                  <span className="font-bold text-[#4a3c58]">{settlement.month}</span>
                  <span>{settlement.creator_amount} {data.currency} creator share</span>
                  <span className="text-[#8b7e96]">{settlement.status}</span>
                  {settlement.payment_reference && <span>Ref: {settlement.payment_reference}</span>}
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
              <div className="border-b border-violet-50 px-4 py-3"><h2 className="text-sm font-extrabold text-[#34264b]">Withdrawal history</h2></div>
              {!data.withdrawals?.length ? <p className="p-4 text-xs text-[#91859e]">No withdrawal requests.</p> : data.withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex flex-wrap justify-between gap-2 border-b border-violet-50 px-4 py-3 text-xs">
                  <span>{withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString() : ''}</span>
                  <span className="font-bold">{withdrawal.amount} {data.currency}</span>
                  <span className="capitalize text-violet-700">{withdrawal.status}</span>
                  {withdrawal.payment_reference && <span>Ref: {withdrawal.payment_reference}</span>}
                  {withdrawal.review_note && <span className="basis-full text-[#82758f]">{withdrawal.review_note}</span>}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
