import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

const MAX_BIO = 280;
const MAX_INTERESTS = 10;
const MAX_INTEREST_LENGTH = 30;

/**
 * Public profile editor.
 *
 * Loads and saves through GET/PATCH /api/identity/profile/ using the existing
 * authenticated `api()` helper (single-flight refresh, no second token store).
 * Only public fields are edited: display name, bio, interests. The avatar is
 * read-only and comes from the existing identity/avatar system.
 */
export function PublicProfileEditor({ fallbackAvatar = '', username = '' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState([]);
  const [interestDraft, setInterestDraft] = useState('');

  useEffect(() => {
    if (!username) return undefined;
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      const response = await api('GET', '/identity/profile/');
      if (!active) return;
      if (!response || !response.ok) {
        setError('Your public profile could not be loaded. Please try again.');
        setLoading(false);
        return;
      }
      try {
        const data = await response.json();
        if (!active) return;
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setInterests(Array.isArray(data.interests) ? data.interests : []);
        setAvatarUrl(data.avatar_url || '');
      } catch {
        setError('Your public profile could not be read. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [username]);

  const addInterest = () => {
    const text = interestDraft.trim();
    if (!text) return;
    if (text.length > MAX_INTEREST_LENGTH) {
      setError(`Interests must be ${MAX_INTEREST_LENGTH} characters or fewer.`);
      return;
    }
    if (interests.length >= MAX_INTERESTS) {
      setError(`You can add up to ${MAX_INTERESTS} interests.`);
      return;
    }
    if (interests.some((item) => item.toLowerCase() === text.toLowerCase())) {
      setInterestDraft('');
      return;
    }
    setError('');
    setInterests([...interests, text]);
    setInterestDraft('');
  };

  const removeInterest = (value) => {
    setInterests(interests.filter((item) => item !== value));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api('PATCH', '/identity/profile/', {
        display_name: displayName,
        bio,
        interests,
      });
      if (!response) {
        setError('The profile service could not be reached. Please try again.');
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        const firstError =
          data.display_name?.[0] ||
          data.bio?.[0] ||
          data.interests?.[0] ||
          data.detail ||
          'Your profile could not be saved.';
        setError(firstError);
        return;
      }
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');
      setInterests(Array.isArray(data.interests) ? data.interests : []);
      setAvatarUrl(data.avatar_url || '');
      setNotice('Public profile saved.');
    } catch {
      setError('The profile response could not be read. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const shownAvatar = avatarUrl || fallbackAvatar;

  return (
    <section className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Public profile</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">How others see you</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#91859e]">
            Display name, bio and interests are shown on your public profile. Email and private data are never shared.
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700">
          {loading ? 'Loading…' : 'Public'}
        </span>
      </div>

      {loading ? (
        <p className="mt-5 text-xs font-semibold text-[#91859e]">Loading your public profile…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <label className="block text-xs font-bold text-[#5b4b6c]">
              Display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={50}
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <label className="block text-xs font-bold text-[#5b4b6c]">
              Bio
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, MAX_BIO))}
                maxLength={MAX_BIO}
                rows={3}
                className="mt-2 w-full resize-y rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
              <span className={`mt-1 block text-right text-[11px] font-semibold ${bio.length > MAX_BIO ? 'text-rose-600' : 'text-[#91859e]'}`}>
                {bio.length}/{MAX_BIO}
              </span>
            </label>

            <div>
              <p className="text-xs font-bold text-[#5b4b6c]">Interests</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={interestDraft}
                  onChange={(event) => setInterestDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addInterest();
                    }
                  }}
                  maxLength={MAX_INTEREST_LENGTH}
                  placeholder="Add an interest"
                  className="min-w-0 flex-1 rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm font-medium text-[#302441] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="rounded-xl bg-violet-100 px-4 py-2.5 text-xs font-extrabold text-violet-800 transition hover:bg-violet-200"
                >
                  Add
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.length === 0 && (
                  <span className="text-[11px] font-semibold text-[#91859e]">No interests added yet.</span>
                )}
                {interests.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removeInterest(item)}
                    className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-rose-50 hover:text-rose-700"
                    title="Remove interest"
                  >
                    {item} ✕
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p>}
            {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700" role="status">{notice}</p>}

            <div className="flex justify-end border-t border-violet-50 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-700 px-5 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save public profile'}
              </button>
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-violet-100 bg-[#fbf9fd]">
            <div className="h-24 bg-gradient-to-r from-[#e7dff4] via-[#f2e7f2] to-[#f7e5ed]" />
            <div className="p-4">
              <div className="-mt-10 mb-3">
                {shownAvatar ? (
                  <img src={shownAvatar} alt="Public avatar" className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-sm" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-violet-700 text-lg font-extrabold text-white shadow-sm">
                    {(displayName || username || '?').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-extrabold text-[#34264b]">{displayName || 'Your display name'}</p>
              <p className="truncate text-xs text-violet-600">@{username}</p>
              <p className="mt-2 min-h-10 whitespace-pre-wrap text-xs leading-relaxed text-[#796d8a]">
                {bio || 'Your bio will appear here.'}
              </p>
            </div>
          </aside>
        </form>
      )}
    </section>
  );
}

export default PublicProfileEditor;
