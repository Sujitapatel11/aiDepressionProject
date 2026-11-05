import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PostMediaUploader from '../components/common/PostMediaUploader';
import PostMediaGrid from '../components/common/PostMediaGrid';

const STORAGE_KEY = 'soulcare_creator_draft_v1';
const FORMATS = [
  { id: 'micro-post', label: 'Write a post', icon: '✍️', note: 'A short thought to share' },
  { id: 'story', label: 'Create a story', icon: '✦', note: 'A moment worth remembering' },
  { id: 'poem', label: 'Poetry', icon: '❋', note: 'Shape a feeling into words' },
  { id: 'journal-piece', label: 'Journal-inspired', icon: '🌿', note: 'Rework a private reflection' },
];

export default function CreatorStudioPage() {
  const navigate = useNavigate();
  const [format, setFormat] = useState('micro-post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [notice, setNotice] = useState('');
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [postSaving, setPostSaving] = useState(false);
  const [postNotice, setPostNotice] = useState('');
  const [editingPostId, setEditingPostId] = useState('');
  const [postAssets, setPostAssets] = useState([]);
  const [postForm, setPostForm] = useState({
    content_type: 'text', caption: '', media_url: '', hashtags: '', category: '', status: 'draft',
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setFormat(FORMATS.some((item) => item.id === draft.format) ? draft.format : 'micro-post');
      setTitle(typeof draft.title === 'string' ? draft.title : '');
      setBody(typeof draft.body === 'string' ? draft.body : '');
      setSavedAt(draft.savedAt || null);
    } catch (error) {
      console.warn('Could not restore Creator Studio draft:', error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadPublishingData = async () => {
      setPostsLoading(true);
      const profileResponse = await api('GET', '/creators/me/');
      if (!active) return;
      if (!profileResponse?.ok) {
        setCreatorProfile(null);
        setPosts([]);
        setPostsLoading(false);
        return;
      }
      try {
        const profile = await profileResponse.json();
        if (!active) return;
        setCreatorProfile(profile);
        const postsResponse = await api('GET', '/creators/posts/mine/');
        if (!active) return;
        if (postsResponse?.ok) {
          const postsData = await postsResponse.json();
          if (active) setPosts(Array.isArray(postsData) ? postsData : postsData.results || []);
        } else {
          setPostsError('Creator posts could not be loaded.');
        }
      } catch (error) {
        if (active) setPostsError('Creator data could not be read. Try again.');
      }
      if (active) setPostsLoading(false);
    };
    loadPublishingData();
    return () => { active = false; };
  }, []);

  const refreshPosts = async () => {
    const response = await api('GET', '/creators/posts/mine/');
    if (!response?.ok) {
      setPostsError('Creator posts could not be loaded.');
      return;
    }
    const data = await response.json();
    setPosts(Array.isArray(data) ? data : data.results || []);
    setPostsError('');
  };

  const updatePostField = (event) => {
    const { name, value } = event.target;
    setPostForm((current) => ({ ...current, [name]: value }));
  };

  const savePost = async (event) => {
    event.preventDefault();
    if (postForm.content_type !== 'text' && postAssets.length === 0 && !postForm.media_url.trim()) {
      setPostsError('Add a photo or video before saving this post.');
      return;
    }
    setPostSaving(true);
    setPostsError('');
    setPostNotice('');
    const isMediaPost = postForm.content_type !== 'text';
    const payload = {
      ...postForm,
      hashtags: postForm.hashtags.split(',').map((tag) => tag.trim()).filter(Boolean),
      media_url: postForm.content_type === 'text' || postAssets.length ? '' : postForm.media_url.trim(),
    };
    if (isMediaPost) {
      payload.media_asset_ids = postAssets.map((asset) => asset.id);
    }
    const response = editingPostId
      ? await api('PATCH', `/creators/posts/${editingPostId}/edit/`, payload)
      : await api('POST', '/creators/posts/create/', payload);
    setPostSaving(false);
    if (!response?.ok) {
      let data = {};
      try { data = response ? await response.json() : {}; } catch (error) {}
      setPostsError(data.detail || Object.values(data).flat()[0] || 'Post could not be saved.');
      return;
    }
    setEditingPostId('');
    setPostAssets([]);
    setPostForm({ content_type: 'text', caption: '', media_url: '', hashtags: '', category: '', status: 'draft' });
    setPostNotice(editingPostId ? 'Post updated.' : payload.status === 'published' ? 'Post published.' : 'Draft saved.');
    await refreshPosts();
  };

  const editPost = (post) => {
    setEditingPostId(post.id);
    setPostAssets(post.media || []);
    setPostForm({
      content_type: post.content_type,
      caption: post.caption || '',
      media_url: post.media_url || '',
      hashtags: (post.hashtags || []).join(', '),
      category: post.category || '',
      status: post.status,
    });
    setPostNotice('Editing selected post.');
  };

  const deletePost = async (postId) => {
    const response = await api('DELETE', `/creators/posts/${postId}/delete/`);
    if (!response || !response.ok) {
      setPostsError('Post could not be removed. Try again.');
      return;
    }
    setPostNotice('Post removed from public view.');
    await refreshPosts();
  };

  const saveDraft = () => {
    const draft = { format, title, body, savedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSavedAt(draft.savedAt);
      setNotice('Draft saved on this device.');
    } catch (error) {
      setNotice('Could not save locally. Check your browser storage settings.');
    }
  };

  const clearDraft = () => {
    setTitle('');
    setBody('');
    setFormat('micro-post');
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setSavedAt(null);
      setNotice('Local draft cleared.');
    } catch (error) {
      setNotice('Draft cleared from the editor, but browser storage could not be updated.');
    }
  };

  const selectedFormat = FORMATS.find((item) => item.id === format) || FORMATS[0];

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_8px_28px_-20px_rgba(91,49,145,.35)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-700">✦ Sanctuary · Starlight Atelier</span>
            <button type="button" onClick={() => navigate('/world')} className="rounded-full border border-violet-200 px-4 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">← Soul World</button>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2a1e43] sm:text-4xl">Creator Studio <span className="text-violet-500">✧</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#796d8a]">Shape a thought into something meaningful. Start with a small idea, give it a title, and keep refining it at your own pace.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f8f4fc] px-3 py-2 text-[11px] font-semibold text-[#766982]">Your ideas, your voice</span>
            <span className="rounded-full bg-[#f8f4fc] px-3 py-2 text-[11px] font-semibold text-[#766982]">Drafts stay on this device</span>
            <span className="rounded-full bg-[#f8f4fc] px-3 py-2 text-[11px] font-semibold text-[#766982]">Creator posts use your existing SoulCare account</span>
          </div>
        </header>

        <section className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-violet-50 p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Publishing desk</p>
              <h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">Publish to your creator feed</h2>
              <p className="mt-1 text-xs text-[#91859e]">
                {creatorProfile ? `@${creatorProfile.username}` : 'Activate Creator Mode from your profile to start publishing.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate('/creator-dashboard')} className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">Analytics</button>
              <button type="button" onClick={() => navigate('/creator-earnings')} className="rounded-lg bg-pink-50 px-3 py-2 text-xs font-bold text-violet-700">Earnings</button>
              {creatorProfile && <button type="button" onClick={() => navigate(`/creators/${creatorProfile.username}`)} className="rounded-lg bg-[#f8f4fc] px-3 py-2 text-xs font-bold text-violet-700">Public profile</button>}
            </div>
          </div>

          {!creatorProfile ? (
            <div className="p-5 text-sm text-[#796d8a]">
              <button type="button" onClick={() => navigate('/profile')} className="rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white">Activate Creator Mode</button>
            </div>
          ) : (
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_.95fr]">
              <form onSubmit={savePost} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-[#5b4b6c]">Format
                    <select name="content_type" value={postForm.content_type} onChange={updatePostField} className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm">
                      <option value="text">Text</option><option value="image">Image</option><option value="video">Video</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-[#5b4b6c]">Visibility
                    <select name="status" value={postForm.status} onChange={updatePostField} className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm">
                      <option value="draft">Draft</option><option value="published">Publish</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-bold text-[#5b4b6c]">Caption
                  <textarea name="caption" value={postForm.caption} onChange={updatePostField} maxLength={5000} rows={5} className="mt-2 w-full resize-y rounded-xl border border-violet-100 bg-[#fbf9fd] p-3 text-sm" />
                </label>
                {postForm.content_type !== 'text' && (
                  <div className="space-y-2">
                    <PostMediaUploader
                      value={postAssets}
                      onChange={setPostAssets}
                      disabled={postSaving}
                      videoLimit={1}
                    />
                    {postForm.content_type === 'image' && postAssets.some((a) => a.kind === 'video') && (
                      <p className="text-[10px] text-amber-700 font-semibold">Image posts keep photos only — remove the video or switch to Video.</p>
                    )}
                    {!postAssets.length && postForm.media_url && (
                      <p className="rounded-lg bg-[#f8f4fc] px-3 py-2 text-[10px] font-semibold text-[#766982]">
                        This post currently uses an external media link: {postForm.media_url}. Uploading a file below replaces it.
                      </p>
                    )}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-[#5b4b6c]">Category
                    <input name="category" value={postForm.category} onChange={updatePostField} maxLength={48} placeholder="reflection" className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block text-xs font-bold text-[#5b4b6c]">Hashtags
                    <input name="hashtags" value={postForm.hashtags} onChange={updatePostField} placeholder="writing, wellbeing" className="mt-2 w-full rounded-xl border border-violet-100 bg-[#fbf9fd] px-3 py-2.5 text-sm" />
                  </label>
                </div>
                {postsError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{postsError}</p>}
                {postNotice && <p className="text-xs font-semibold text-emerald-700" role="status">{postNotice}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  {editingPostId && <button type="button" onClick={() => { setEditingPostId(''); setPostAssets([]); setPostForm({ content_type: 'text', caption: '', media_url: '', hashtags: '', category: '', status: 'draft' }); }} className="rounded-lg border border-violet-200 px-4 py-2.5 text-xs font-bold text-violet-700">Cancel edit</button>}
                  <button type="submit" disabled={postSaving} className="rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{postSaving ? 'Saving…' : editingPostId ? 'Save changes' : postForm.status === 'published' ? 'Publish post' : 'Save draft'}</button>
                </div>
              </form>

              <div className="min-w-0 border-t border-violet-50 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <h3 className="text-sm font-extrabold text-[#34264b]">Your posts</h3>
                {postsLoading ? <p className="py-5 text-xs text-[#91859e]">Loading creator posts…</p> : posts.length === 0 ? (
                  <p className="py-5 text-xs text-[#91859e]">No posts yet. Save a draft or publish your first post.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {posts.map((post) => (
                      <article key={post.id} className="rounded-xl border border-violet-100 bg-[#fbf9fd] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-violet-700">{post.status}</span>
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[#5f526c]">{post.caption || (!post.media?.length && post.media_url ? post.media_url : 'Media post')}</p>
                            <PostMediaGrid post={post} compact className="mt-2" />
                            <p className="mt-2 text-[10px] text-[#9a8fa5]">{post.views_count} views · {post.likes_count} likes · {post.comments_count} comments · {post.shares_count} shares</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" title="Edit post" onClick={() => editPost(post)} className="rounded-lg bg-white px-2 py-1.5 text-[10px] font-bold text-violet-700">Edit</button>
                            <button type="button" title="Remove post" onClick={() => deletePost(post.id)} className="rounded-lg bg-white px-2 py-1.5 text-[10px] font-bold text-rose-700">Remove</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#30224f] via-[#7354a1] to-[#d9a9d2] p-5 text-white shadow-[0_18px_42px_-24px_rgba(91,49,145,.7)] sm:p-7">
          <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full border-[24px] border-white/10" />
          <div className="relative max-w-2xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-100">✧ Create something new</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Your imagination deserves a canvas.</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">Shape your writing in a local private draft, or use the publishing desk above to create a draft or public post.</p>
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FORMATS.map((item) => (
              <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => setFormat(item.id)} className={`rounded-2xl border p-3 text-left transition ${format === item.id ? 'border-white bg-white text-violet-950 shadow-lg' : 'border-white/25 bg-white/10 text-white hover:bg-white/20'}`}>
                <span className="text-xl">{item.icon}</span><span className="mt-2 block text-xs font-extrabold">{item.label}</span><span className={`mt-1 block text-[10px] leading-relaxed ${format === item.id ? 'text-violet-600' : 'text-white/70'}`}>{item.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.5fr_.8fr]">
          <div className="rounded-[28px] border border-violet-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-50 pb-4">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-500">Your writing desk</p><h2 className="mt-1 text-lg font-extrabold text-[#2b2040]">{selectedFormat.label}</h2></div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700">Private draft</span>
            </div>
            <label className="mt-4 block text-[11px] font-extrabold text-[#766982]" htmlFor="creator-title">TITLE</label>
            <input id="creator-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Give your creation a name…" className="mt-2 w-full rounded-2xl border border-violet-100 bg-[#fbf9fd] px-4 py-3 text-sm text-[#302441] outline-none transition placeholder:text-[#a89db4] focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            <label className="mt-4 block text-[11px] font-extrabold text-[#766982]" htmlFor="creator-body">YOUR WORDS</label>
            <textarea id="creator-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={11} placeholder="Start with one sentence, one image, or one feeling…" className="mt-2 w-full resize-y rounded-2xl border border-violet-100 bg-[#fbf9fd] p-4 text-sm leading-7 text-[#302441] outline-none transition placeholder:text-[#a89db4] focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            <div className="mt-2 flex items-center justify-between text-[10px] text-[#9a8fa5]"><span>{body.length}/5000 characters</span><span>{body.trim() ? body.trim().split(/\s+/).length : 0} words</span></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-violet-50 pt-4">
              <button type="button" onClick={clearDraft} className="rounded-full border border-violet-200 px-4 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50">Clear draft</button>
              <button type="button" onClick={saveDraft} disabled={!title.trim() && !body.trim()} className="rounded-full bg-violet-700 px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-violet-200 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">Save private draft →</button>
            </div>
            {notice && <p role="status" className="mt-3 text-xs font-semibold text-violet-700">{notice}</p>}
            {savedAt && <p className="mt-1 text-[10px] text-[#9a8fa5]">Last saved: {new Date(savedAt).toLocaleString()}</p>}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-2xl">🌱</div>
              <h3 className="mt-3 text-sm font-extrabold text-[#34264b]">A gentle creative prompt</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#847891]">Describe a tiny moment from today that you wish you could keep in a glass jar.</p>
              <button type="button" onClick={() => setBody((current) => current ? current + '\n\n' + 'A tiny moment I want to keep…' : 'A tiny moment I want to keep…')} className="mt-4 rounded-full bg-pink-50 px-4 py-2 text-[11px] font-bold text-violet-700 transition hover:bg-pink-100">Use this prompt</button>
            </div>
            <div className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-500">Keep creating</p>
              <h3 className="mt-2 text-sm font-extrabold text-[#34264b]">Your other creative spaces</h3>
              <button type="button" onClick={() => navigate('/journal')} className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#f8f4fc] px-3 py-3 text-left text-xs font-bold text-[#5b4773] transition hover:bg-violet-100"><span>🌿 Journal Forest</span><span>→</span></button>
              <button type="button" onClick={() => navigate('/community')} className="mt-2 flex w-full items-center justify-between rounded-xl bg-[#f8f4fc] px-3 py-3 text-left text-xs font-bold text-[#5b4773] transition hover:bg-violet-100"><span>✧ Community Grove</span><span>→</span></button>
            </div>
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-extrabold text-amber-900">Earnings are unavailable</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">Verified advertising is not integrated. No earnings are fabricated; balances stay unavailable until a provider is verified.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
