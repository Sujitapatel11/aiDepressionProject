import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function CreatorAdminPage() {
  const [profiles, setProfiles] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [signals, setSignals] = useState([]);
  const [reasons, setReasons] = useState({});
  const [references, setReferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    const [profileResponse, withdrawalResponse, signalResponse] = await Promise.all([
      api('GET', '/creators/admin/profiles/'),
      api('GET', '/creators/admin/withdrawals/'),
      api('GET', '/creators/admin/signals/'),
    ]);
    if ([profileResponse, withdrawalResponse, signalResponse].some((response) => response?.status === 403)) {
      setDenied(true);
      setLoading(false);
      return;
    }
    if (![profileResponse, withdrawalResponse, signalResponse].every((response) => response?.ok)) {
      setError('Creator admin data could not be loaded.');
      setLoading(false);
      return;
    }
    try {
      const [profileData, withdrawalData, signalData] = await Promise.all([
        profileResponse.json(), withdrawalResponse.json(), signalResponse.json(),
      ]);
      setProfiles(profileData.results || []);
      setWithdrawals(withdrawalData.results || []);
      setSignals(signalData.results || []);
    } catch (loadError) {
      setError('Creator admin response could not be read.');
    }
    setLoading(false);
  };

  useEffect(() => { loadAdminData(); }, []);

  const updateCreator = async (profile, updates) => {
    const reason = reasons[`profile-${profile.id}`]?.trim();
    if (!reason) {
      setError('Add a review reason before changing a creator profile.');
      return;
    }
    const response = await api('PATCH', `/creators/admin/profiles/${profile.id}/`, { ...updates, reason });
    if (!response?.ok) {
      setError('Creator profile update was rejected.');
      return;
    }
    setNotice(`@${profile.username} updated.`);
    await loadAdminData();
  };

  const reviewWithdrawal = async (withdrawal, action) => {
    const reason = reasons[`withdrawal-${withdrawal.id}`]?.trim();
    if (!reason) {
      setError('Add a review reason before processing a withdrawal.');
      return;
    }
    const payload = { action, reason };
    if (action === 'paid') payload.payment_reference = references[withdrawal.id]?.trim();
    const response = await api('POST', `/creators/admin/withdrawals/${withdrawal.id}/review/`, payload);
    if (!response?.ok) {
      let body = {};
      try { body = response ? await response.json() : {}; } catch (parseError) {}
      setError(body.detail || 'Withdrawal action was rejected.');
      return;
    }
    setNotice(`Withdrawal ${action} recorded.`);
    await loadAdminData();
  };

  const reviewSignal = async (signal, status) => {
    const reason = reasons[`signal-${signal.id}`]?.trim();
    if (!reason) {
      setError('Add a review reason for this signal.');
      return;
    }
    const response = await api('POST', `/creators/admin/signals/${signal.id}/review/`, { status, reason });
    if (!response?.ok) {
      setError('Signal review was rejected.');
      return;
    }
    setNotice('Signal review recorded. Suspicious signals do not automatically restrict accounts.');
    await loadAdminData();
  };

  if (loading) return <main className="mx-auto max-w-5xl p-6 text-sm text-violet-700" role="status">Loading creator administration…</main>;
  if (denied) return <main className="mx-auto max-w-3xl p-6"><p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Staff access is required for creator administration.</p></main>;

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Staff tools</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#302441]">Creator review</h1>
          <p className="mt-1 text-xs text-[#8b7e96]">Review, restrict, and process payouts with a recorded reason. Signals never auto-ban users.</p>
        </header>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

        <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-50 px-4 py-3"><h2 className="text-sm font-extrabold">Creators</h2></div>
          {!profiles.length ? <p className="p-4 text-xs text-[#91859e]">No creator profiles.</p> : profiles.map((profile) => (
            <div key={profile.id} className="grid gap-3 border-b border-violet-50 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end">
              <div><p className="text-sm font-bold text-[#42334f]">{profile.display_name} <span className="font-normal text-violet-600">@{profile.username}</span></p><p className="mt-1 text-[10px] text-[#93879d]">{profile.post_count} posts · {profile.follower_count} followers</p></div>
              <label className="text-[10px] font-bold text-[#766982]">Creator status
                <select value={profile.is_active ? 'active' : 'restricted'} onChange={(event) => updateCreator(profile, { is_active: event.target.value === 'active' })} className="mt-1 block w-full rounded-lg border border-violet-100 px-2 py-2 text-xs">
                  <option value="active">Active</option><option value="restricted">Restricted</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-[#766982]">Monetization
                <select value={profile.monetization_status} onChange={(event) => updateCreator(profile, { monetization_status: event.target.value })} className="mt-1 block w-full rounded-lg border border-violet-100 px-2 py-2 text-xs">
                  <option value="not_eligible">Not eligible</option><option value="pending_review">Pending review</option><option value="eligible">Eligible</option><option value="suspended">Suspended</option>
                </select>
              </label>
              <input value={reasons[`profile-${profile.id}`] || ''} onChange={(event) => setReasons((current) => ({ ...current, [`profile-${profile.id}`]: event.target.value }))} placeholder="Review reason" className="rounded-lg border border-violet-100 px-2 py-2 text-xs" />
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-50 px-4 py-3"><h2 className="text-sm font-extrabold">Withdrawal review</h2></div>
          {!withdrawals.length ? <p className="p-4 text-xs text-[#91859e]">No withdrawal requests.</p> : withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="border-b border-violet-50 p-4">
              <div className="flex flex-wrap justify-between gap-2 text-xs"><strong>{withdrawal.amount} INR · {withdrawal.status}</strong><time>{new Date(withdrawal.created_at).toLocaleString()}</time></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
                <input value={reasons[`withdrawal-${withdrawal.id}`] || ''} onChange={(event) => setReasons((current) => ({ ...current, [`withdrawal-${withdrawal.id}`]: event.target.value }))} placeholder="Required review reason" className="rounded-lg border border-violet-100 px-2 py-2 text-xs" />
                {withdrawal.status === 'approved' && <input value={references[withdrawal.id] || ''} onChange={(event) => setReferences((current) => ({ ...current, [withdrawal.id]: event.target.value }))} placeholder="Payment reference" className="rounded-lg border border-violet-100 px-2 py-2 text-xs" />}
                {withdrawal.status === 'pending' && <><button type="button" onClick={() => reviewWithdrawal(withdrawal, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Approve</button><button type="button" onClick={() => reviewWithdrawal(withdrawal, 'reject')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Reject</button></>}
                {withdrawal.status === 'approved' && <button type="button" onClick={() => reviewWithdrawal(withdrawal, 'paid')} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white">Mark paid</button>}
              </div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-50 px-4 py-3"><h2 className="text-sm font-extrabold">Suspicious activity signals</h2></div>
          {!signals.length ? <p className="p-4 text-xs text-[#91859e]">No open signals.</p> : signals.map((signal) => (
            <div key={signal.id} className="grid gap-3 border-b border-violet-50 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <div><p className="text-xs font-bold text-[#42334f]">@{signal.creator_username} · {signal.kind}</p><p className="mt-1 text-[10px] text-[#93879d]">{new Date(signal.created_at).toLocaleString()} · {signal.status}</p></div>
              <input value={reasons[`signal-${signal.id}`] || ''} onChange={(event) => setReasons((current) => ({ ...current, [`signal-${signal.id}`]: event.target.value }))} placeholder="Review reason" className="rounded-lg border border-violet-100 px-2 py-2 text-xs" />
              {signal.status === 'open' && <><button type="button" onClick={() => reviewSignal(signal, 'reviewed')} className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700">Reviewed</button><button type="button" onClick={() => reviewSignal(signal, 'actioned')} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white">Action taken</button></>}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
