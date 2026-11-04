import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export const JournalPage = () => {
  const { username } = useAuth();

  const [inputVal, setInputVal] = useState(() => localStorage.getItem('sc_journal_draft') || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  // Voice-to-Text state hooks
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const speechRecRef = useRef(null);
  const fallbackTranscriptRef = useRef('');

  const fetchEntries = async () => {
    setLoading(true);
    const res = await api('GET', '/journal/');
    if (res && res.ok) {
      try {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setEntries(list);
        setLoadError('');
      } catch (e) {
        setLoadError('Journal response could not be read. Please retry.');
      }
    } else {
      setLoadError('Your journal could not load. Check your connection and retry.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      if (speechRecRef.current) {
        try { speechRecRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  const handleInputChange = (val) => {
    setInputVal(val);
    localStorage.setItem('sc_journal_draft', val);
  };

  // ── Voice Recording Handlers (ChatGPT Pattern: HuggingFace Whisper Primary + Silent Web Speech Fallback) ──
  const startRecording = async () => {
    setError('');
    fallbackTranscriptRef.current = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Voice recording is not supported on this browser.';
      if (window.showToast) window.showToast(msg);
      else setError(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioUpload(audioBlob, mimeType);
      };

      // Emergency Fallback: Silently collect Web Speech API transcript in parallel if supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          speechRecRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event) => {
            let text = '';
            for (let i = 0; i < event.results.length; ++i) {
              text += event.results[i][0].transcript + ' ';
            }
            fallbackTranscriptRef.current = text.trim();
          };

          recognition.onerror = (e) => {
            console.warn('[VoiceToText] Fallback Web Speech API error:', e.error);
          };

          recognition.start();
        } catch (err) {
          console.warn('[VoiceToText] Could not initialize fallback Web Speech API:', err);
        }
      }

      mediaRecorder.start(250);
      setRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      const msg = 'Microphone access denied. Please allow microphone permissions to record.';
      if (window.showToast) window.showToast(msg);
      else setError(msg);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleAudioUpload = async (blob, mimeType = 'audio/webm') => {
    setTranscribing(true);
    setError('');

    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
    const formData = new FormData();
    formData.append('audio', blob, `journal_voice.${ext}`);
    // Note: No language parameter passed so HuggingFace Whisper auto-detects language (Hindi/English/Nepali/mixed)

    let transcribedText = '';
    let success = false;

    // Primary path: HuggingFace Whisper API
    try {
      const res = await api('POST', '/journal/transcribe/', formData);
      if (res && res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim()) {
          transcribedText = data.text.trim();
          success = true;
        }
      } else {
        console.warn(`[VoiceToText] HuggingFace Whisper transcription returned status ${res?.status}`);
      }
    } catch (e) {
      console.warn('[VoiceToText] HuggingFace Whisper API request failed:', e);
    }

    // Emergency fallback path: Web Speech API background transcript
    if (!success && fallbackTranscriptRef.current && fallbackTranscriptRef.current.trim()) {
      console.info('[VoiceToText] HuggingFace Whisper failed. Using Web Speech API fallback.');
      transcribedText = fallbackTranscriptRef.current.trim();
      success = true;
    }

    if (success && transcribedText) {
      const currentContent = inputVal;
      const appendedText = currentContent.trim() ? `${currentContent.trim()}\n\n${transcribedText}` : transcribedText;
      handleInputChange(appendedText);
      if (window.showToast) window.showToast('Voice transcribed successfully!');
    } else {
      const msg = "Couldn't transcribe that, try again or type instead";
      if (window.showToast) window.showToast(msg);
      else setError(msg);
    }

    setTranscribing(false);
  };

  const fmtTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    const rawContent = inputVal.trim();
    if (!rawContent) {
      setError('Entry cannot be empty.');
      return;
    }
    setError('');
    setSaving(true);

    const res = await api('POST', '/journal/', { content: rawContent });
    setSaving(false);

    if (res && res.ok) {
      setInputVal('');
      localStorage.removeItem('sc_journal_draft');
      if (window.showToast) window.showToast('Entry saved!');
      fetchEntries();
    } else {
      setError('Failed to save reflection entry.');
    }
  };

  const handleDelete = (id) => {
    if (window.showConfirm) {
      window.showConfirm(
        'Delete this journal entry?',
        async () => {
          const res = await api('DELETE', `/journal/${id}/`);
          if (res && res.ok) {
            if (window.showToast) window.showToast('Entry deleted.');
            fetchEntries();
          } else if (window.showToast) {
            window.showToast('Could not delete this entry. Please try again.');
          }
        },
        true
      );
    }
  };

  const words = inputVal.trim() ? inputVal.trim().split(/\s+/).length : 0;
  const chars = inputVal.length;
  const initials = (username || '?').slice(0, 2).toUpperCase();

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 lg:py-8 lg:px-6 space-y-6 lg:space-y-8 animate-fadeIn">
      {/* TOP HERO HEADER */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
              🌿 Sanctuary · Ancient Grove
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">Journal Forest</h1>
          <p className="t-body-md text-gray-500 italic">Unburden your thoughts beneath the glowing canopy. This space is yours — write freely, without judgment.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="px-4 py-2 rounded-2xl bg-purple-50 text-purple-700 font-bold text-xs flex items-center gap-1.5">
            <span>🔒</span> 100% Encrypted & Private
          </span>
        </div>
      </div>

      {/* JOURNAL FOREST ATMOSPHERE */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#30224f] via-[#7354a1] to-[#d9a9d2] p-5 text-white shadow-[0_18px_42px_-24px_rgba(91,49,145,.7)] sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full border-[24px] border-white/10" />
        <div className="relative max-w-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-100">✦ Lantern writing desk</p>
          <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Give your thoughts a place to grow.</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">A few honest lines are enough. You don't need perfect words to begin.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold backdrop-blur">🏮 Quiet room · Your personal grove</div>
        </div>
      </section>
      <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-sm font-extrabold text-[#34264b]">How does your spirit feel today?</h2><p className="mt-1 text-[11px] text-[#91859e]">Tap a mood to add it to your draft.</p></div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Optional</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[
            { label: 'Peaceful', emoji: '🌸' },
            { label: 'Inspired', emoji: '✨' },
            { label: 'Calm', emoji: '🍃' },
            { label: 'Tender', emoji: '🌧️' },
            { label: 'Dreamy', emoji: '💫' },
          ].map((mood) => (
            <button key={mood.label} type="button" onClick={() => handleInputChange(inputVal ? inputVal + ' #' + mood.label : '#' + mood.label)} className="flex flex-col items-center gap-1 rounded-xl border border-violet-100 bg-[#fbf9fd] px-1 py-3 text-center transition hover:border-violet-300 hover:bg-pink-50">
              <span className="text-xl">{mood.emoji}</span><span className="text-[10px] font-bold text-[#514465]">{mood.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* MAIN WRITING SANCTUARY CARD */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-md space-y-5">
        {/* Distraction-Free Textarea Editor with ChatGPT-style Mic Button */}
        <div className="relative">
          <textarea
            rows={7}
            value={inputVal}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="What's on your mind today? Express your feelings freely without judgment..."
            className="w-full p-5 pr-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 t-body-lg focus:outline-none focus:border-purple-500 focus:bg-white transition resize-none"
          ></textarea>

          {/* ChatGPT-style Voice Mic Icon Button */}
          <div className="absolute right-4 bottom-8 flex items-center">
            {recording ? (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-200 shadow-sm animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block"></span>
                <span className="text-xs font-extrabold font-mono">{fmtTimer(recordSeconds)}</span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="ml-1 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white border-none cursor-pointer transition flex items-center justify-center"
                  title="Stop recording"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              </div>
            ) : transcribing ? (
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold px-3 py-1.5 bg-purple-50 rounded-full border border-purple-200 shadow-xs">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-600 border-t-transparent animate-spin inline-block"></span>
                <span className="hidden sm:inline">Transcribing...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white transition shadow-sm border-none cursor-pointer flex items-center justify-center"
                title="Voice input (Auto-detects Hindi, English, Nepali)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-xs text-gray-400 font-medium">
            <span>
              {chars} chars | {words} words
            </span>
            <span>🔒 Auto-saving draft locally</span>
          </div>
        </div>

        {/* Quick Topic Tags & Save Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400">Add Tags:</span>
            {['#Stress', '#Work', '#Family', '#Sleep', '#Health'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleInputChange(inputVal ? `${inputVal} ${tag}` : tag)}
                className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition border-none cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-4">
            {error && <div className="text-xs font-bold text-red-500">{error}</div>}
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-8 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition shadow-lg border-none cursor-pointer flex items-center gap-2"
            >
              <span>{saving ? 'Saving...' : 'Save Reflection Entry'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* YOUR STORY OVER TIME */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="t-h3 text-gray-900 font-bold flex items-center gap-2">
            <span>📚</span> Past reflections
          </h3>
          <span className="text-xs font-bold text-gray-400">Encrypted Journal Logs</span>
        </div>

        {loading ? (
          <p className="t-body-sm text-center py-8 text-gray-400">Loading reflections...</p>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center"><p role="alert" className="text-sm text-rose-700">{loadError}</p><button type="button" onClick={fetchEntries} className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white">Retry</button></div>
        ) : entries.length === 0 ? (
          <div className="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1">📖</div>
            <h3 className="t-h3 font-bold text-gray-900">Your story begins today.</h3>
            <p className="t-body-md text-gray-500 max-w-sm">
              Every reflection helps you understand yourself better. Express your thoughts in a safe sanctuary.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => (
              <div
                key={e.journal_id || e.id}
                className="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:border-purple-200 transition space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}
                    >
                      {initials}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">{username}</span>
                      <span className="text-xs text-purple-600 font-semibold block">{fmtDate(e.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(e.journal_id || e.id)}
                    className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition border-none bg-transparent cursor-pointer"
                    title="Delete reflection"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                <p className="t-body-md text-gray-800 leading-relaxed whitespace-pre-line">{e.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalPage;
