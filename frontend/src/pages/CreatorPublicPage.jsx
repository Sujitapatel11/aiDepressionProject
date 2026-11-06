import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import PostMediaGrid from '../components/common/PostMediaGrid';

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '';

function PostMedia({ post }) {
  return <PostMediaGrid post={post} className="mt-3" />;
}

export default function CreatorPublicPage() {
  const { username, postId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nextPage, setNextPage] = useState(null);

  useEffect(() => {
    let active = true;
    const loadPage = async () => {
      setLoading(true);
      setError('');
      try {
        const profileResponse = await api('GET', `/creators/${encodeURIComponent(username)}/`);
        if (!profileResponse?.ok) throw new Error('Creator profile not found.');
        const profileData = await profileResponse.json();
        if (!active) return;
        setProfile(profileData);

        if (postId) {
          // Post body and comments are independent; fetch them together.
          const [postResponse, commentsResponse] = await Promise.all([
            api('GET', `/creators/posts/${postId}/`),
            api('GET', `/creators/posts/${postId}/comments/`),
          ]);
          if (!postResponse?.ok) throw new Error('This post is not available.');
          const postData = await postResponse.json();
          if (!active) return;
          setPost(postData);
          if (token) api('POST', `/creators/posts/${postId}/view/`);
          if (commentsResponse?.ok) {
            const commentsData = await commentsResponse.json();
            if (active) setComments(Array.isArray(commentsData) ? commentsData : commentsData.results || []);
          }
        } else {
          const postsResponse = await api('GET', `/creators/profiles/${encodeURIComponent(username)}/posts/`);
          if (!postsResponse?.ok) throw new Error('Creator posts could not be loaded.');
          const postsData = await postsResponse.json();
          if (!active) return;
          setPosts(postsData.results || []);
          setNextPage(postsData.next || null);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Creator profile could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPage();
    return () => { active = false; };
  }, [username, postId, token]);

  const requireLogin = () => {
    if (!token) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!requireLogin()) return;
    const method = post.liked_by_me ? 'DELETE' : 'POST';
    const response = await api(method, `/creators/posts/${post.id}/like/`);
    if (response?.ok) setPost((current) => ({
      ...current,
      liked_by_me: method === 'POST',
      likes_count: Math.max(0, current.likes_count + (method === 'POST' ? 1 : -1)),
    }));
  };

  const sharePost = async () => {
    if (!requireLogin()) return;
    const response = await api('POST', `/creators/posts/${post.id}/share/`);
    if (response?.ok) {
      setNotice('Share recorded.');
      try { await navigator.clipboard.writeText(window.location.href); } catch (error) {}
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!requireLogin() || !commentText.trim()) return;
    const response = await api('POST', `/creators/posts/${post.id}/comments/`, { body: commentText.trim() });
    if (!response?.ok) {
      setNotice(response?.status === 429 ? 'That comment looks like a duplicate. Please try a different message.' : 'Comment could not be posted.');
      return;
    }
    const created = await response.json();
    setComments((current) => [...current, created]);
    setPost((current) => ({ ...current, comments_count: current.comments_count + 1 }));
    setCommentText('');
    setNotice('Comment posted.');
  };

  const followCreator = async () => {
    if (!requireLogin()) return;
    const response = await api('POST', `/creators/profiles/${encodeURIComponent(username)}/follow/`);
    if (response?.ok) setNotice('Following creator.');
    else if (response?.status === 400) setNotice('You cannot follow your own creator profile.');
  };

  const loadMore = async () => {
    if (!nextPage) return;
    const response = await fetch(nextPage, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) return;
    const data = await response.json();
    setPosts((current) => [...current, ...(data.results || [])]);
    setNextPage(data.next || null);
  };

  if (loading) return <main className="mx-auto max-w-3xl p-6 text-sm text-violet-700" role="status">Loading creator profile…</main>;
  if (error || !profile) return (
    <main className="mx-auto max-w-3xl p-6">
      <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error || 'Creator profile not found.'}</p>
      <Link to="/world" className="mt-4 inline-block text-sm font-bold text-violet-700">Back to Soul World</Link>
    </main>
  );

  return (
    <main className="min-h-full bg-[#fbf8fe] px-4 pb-10 pt-5 text-[#241b35] sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-sm">
          {profile.cover_image ? <img src={profile.cover_image} alt="Creator cover" className="h-40 w-full object-cover" /> : <div className="h-32 bg-gradient-to-r from-[#e7dff4] via-[#f2e7f2] to-[#f7e5ed]" />}
          <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              {profile.avatar ? <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full border-2 border-white object-cover shadow" /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-violet-700 text-lg font-extrabold text-white">{profile.display_name.slice(0, 2).toUpperCase()}</span>}
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold text-[#302441]">{profile.display_name}</h1>
                <p className="text-sm text-violet-700">@{profile.username}</p>
              </div>
            </div>
            <button type="button" onClick={followCreator} className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white">Follow</button>
          </div>
          {profile.bio && <p className="whitespace-pre-wrap px-5 pb-5 text-sm leading-relaxed text-[#6f637b] sm:px-6">{profile.bio}</p>}
        </section>

        {notice && <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700" role="status">{notice}</p>}

        {postId && post ? (
          <article className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
            <Link to={`/creators/${encodeURIComponent(username)}`} className="text-xs font-bold text-violet-700">← Creator feed</Link>
            {post.caption && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#453851]">{post.caption}</p>}
            <PostMedia post={post} />
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-violet-50 pt-4 text-xs text-[#8d8198]">
              <button type="button" onClick={toggleLike} className="font-bold text-violet-700">{post.liked_by_me ? 'Liked' : 'Like'} · {post.likes_count}</button>
              <button type="button" onClick={sharePost} className="font-bold text-violet-700">Share · {post.shares_count}</button>
              <span>{post.views_count} views</span>
              <time>{formatDate(post.published_at)}</time>
            </div>
            <form onSubmit={submitComment} className="mt-5 flex flex-wrap gap-2">
              <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Write a thoughtful comment" className="min-w-[220px] flex-1 rounded-xl border border-violet-100 px-3 py-2.5 text-sm" />
              <button type="submit" className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white">Comment</button>
            </form>
            <div className="mt-4 space-y-3">
              {comments.map((comment) => <div key={comment.id} className="border-t border-violet-50 pt-3"><p className="text-[10px] font-bold text-violet-600">{comment.author_label} · {formatDate(comment.created_at)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#594e66]">{comment.body}</p></div>)}
            </div>
          </article>
        ) : (
          <section className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#766982]">Published posts</h2>
            {posts.length === 0 ? <p className="rounded-xl border border-violet-100 bg-white p-6 text-sm text-[#91859e]">No published posts yet.</p> : posts.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
                <Link to={`/creators/${encodeURIComponent(username)}/posts/${item.id}`} className="block">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[#453851]">{item.caption}</p>
                  <PostMedia post={item} />
                </Link>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#93879d]">
                  <time>{formatDate(item.published_at)}</time><span>{item.likes_count} likes</span><span>{item.comments_count} comments</span><span>{item.shares_count} shares</span>
                </div>
              </article>
            ))}
            {nextPage && <button type="button" onClick={loadMore} className="w-full rounded-xl border border-violet-200 bg-white p-3 text-xs font-bold text-violet-700">Load more</button>}
          </section>
        )}
      </div>
    </main>
  );
}
