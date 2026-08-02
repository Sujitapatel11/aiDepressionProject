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
  const [selectedMood, setSelectedMood] = useState('Happy');

  // Voice-to-Text state hooks
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedLang, setSelectedLang] = useState('auto'); // 'auto', 'en', 'hi', 'ne'
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const fetchEntries = async () => {
    setLoading(true);
    const res = await api('GET', '/journal/');
    if (res && res.ok) {
      try {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setEntries(list);
      } catch (e) {
        setEntries([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleInputChange = (val) => {
    setInputVal(val);
    localStorage.setItem('sc_journal_draft', val);
  };

  // ── Voice Recording Handlers ────────────────────────────────────────────────
  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Voice recording is not supported in this browser.';
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        await handleAudioUpload(audioBlob);
      };

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleAudioUpload = async (blob) => {
    setTranscribing(true);
    setError('');

    const formData = new FormData();
    formData.append('audio', blob, 'journal_voice.webm');
    formData.append('language', selectedLang);

    try {
      const res = await api('POST', '/journal/transcribe/', formData);
      if (res && res.ok) {
        const data = await res.json();
        if (data.text) {
          const appendedText = inputVal.trim() ? `${inputVal.trim()}\n\n${data.text}` : data.text;
          handleInputChange(appendedText);
          if (window.showToast) window.showToast('Voice transcribed successfully!');
        } else {
          if (window.showToast) window.showToast('No speech detected in recording.');
        }
      } else {
        const errData = await res?.json().catch(() => ({}));
        const msg = errData?.detail || 'Audio transcription unavailable. You can type your entry manually.';
        if (window.showToast) window.showToast(msg);
        else setError(msg);
      }
    } catch (e) {
      const msg = 'Could not transcribe audio. You can type manually.';
      if (window.showToast) window.showToast(msg);
      else setError(msg);
    } finally {
      setTranscribing(false);
    }
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

    const payloadContent = selectedMood && !rawContent.startsWith('[Feeling')
      ? `[Feeling ${selectedMood}] ${rawContent}`
      : rawContent;

    const res = await api('POST', '/journal/', { content: payloadContent });
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
          await api('DELETE', `/journal/${id}/`);
          if (window.showToast) window.showToast('Entry deleted.');
          fetchEntries();
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
              📖 Digital Sanctuary
            </span>
          </div>
          <h1 className="t-display text-gray-900 text-2xl lg:text-3xl font-extrabold mb-1">Your Journal</h1>
          <p className="t-body-md text-gray-500 italic">“Every thought deserves a safe place to land.” 💜</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="px-4 py-2 rounded-2xl bg-purple-50 text-purple-700 font-bold text-xs flex items-center gap-1.5">
            <span>🔒</span> 100% Encrypted & Private
          </span>
        </div>
      </div>

      {/* MAIN WRITING SANCTUARY CARD */}
      <div className="p-6 lg:p-8 rounded-[32px] bg-white border border-purple-100 shadow-md space-y-5">
        {/* Emotion Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">How are you feeling right now?</span>
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {['Happy', 'Calm', 'Neutral', 'Sad', 'Angry', 'Tired'].map((mood) => {
              const isSelected = selectedMood === mood;
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setSelectedMood(mood)}
                  className={`mood-pill ${isSelected ? 'active-pill shadow-sm' : ''}`}
                  style={isSelected ? { backgroundColor: '#7C3AED', color: '#FFFFFF', borderColor: '#7C3AED', fontWeight: 700 } : {}}
                >
                  <span>
                    {mood === 'Happy' ? '😊' : mood === 'Calm' ? '😌' : mood === 'Neutral' ? '😐' : mood === 'Sad' ? '😔' : mood === 'Angry' ? '😡' : '😴'}
                  </span>{' '}
                  {mood}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice-to-Text Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-purple-50/70 border border-purple-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <span>🎙️</span> Voice-to-Text (Whisper AI):
            </span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-purple-200 shadow-2xs">
              {[
                { code: 'auto', label: 'Auto 🌐' },
                { code: 'en', label: 'English 🇬🇧' },
                { code: 'hi', label: 'Hindi 🇮🇳' },
                { code: 'ne', label: 'Nepali 🇳🇵' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition border-none cursor-pointer ${
                    selectedLang === lang.code
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'text-gray-600 hover:bg-purple-50 font-medium'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {recording ? (
              <div className="flex items-center gap-3 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl border border-red-200">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping inline-block"></span>
                <span className="text-xs font-extrabold font-mono">{fmtTimer(recordSeconds)}</span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold border-none cursor-pointer transition shadow-xs flex items-center gap-1"
                >
                  <span>⏹️</span> Stop & Transcribe
                </button>
              </div>
            ) : transcribing ? (
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold px-3 py-1.5 bg-purple-100/80 rounded-xl">
                <span className="w-4 h-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin inline-block"></span>
                <span>Transcribing audio...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm border-none cursor-pointer flex items-center gap-2"
                title="Speak your entry in English, Hindi, or Nepali"
              >
                <span>🎙️</span>
                <span>Speak Reflection</span>
              </button>
            )}
          </div>
        </div>

        {/* Distraction-Free Textarea Editor */}
        <div className="relative">
          <textarea
            rows={7}
            value={inputVal}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="What's on your mind today? Express your feelings freely without judgment..."
            className="w-full p-5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 t-body-lg focus:outline-none focus:border-purple-500 focus:bg-white transition resize-none"
          ></textarea>
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

      {/* PAST REFLECTIONS TIMELINE */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="t-h3 text-gray-900 font-bold flex items-center gap-2">
            <span>📚</span> Past Reflections
          </h3>
          <span className="text-xs font-bold text-gray-400">Encrypted Journal Logs</span>
        </div>

        {loading ? (
          <p className="t-body-sm text-center py-8 text-gray-400">Loading reflections...</p>
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
