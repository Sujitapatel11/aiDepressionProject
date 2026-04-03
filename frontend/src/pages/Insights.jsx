import { useEffect, useState } from 'react'
import api from '../api'

const MOOD_CONFIG = {
  positive: { color: '#43a047', bg: '#e8f5e9', icon: '😊', label: 'Positive' },
  negative: { color: '#e53935', bg: '#ffebee', icon: '😔', label: 'Negative' },
  neutral:  { color: '#757575', bg: '#f5f5f5', icon: '😐', label: 'Neutral'  },
  mixed:    { color: '#ff9800', bg: '#fff8e1', icon: '🌤️', label: 'Mixed'    },
}

function MoodBar({ score }) {
  // score: -1 to 1, map to 0-100%
  const pct = Math.round(((score + 1) / 2) * 100)
  const color = score >= 0.35 ? '#43a047' : score <= -0.35 ? '#e53935' : '#ff9800'
  return (
    <div style={{marginTop:10}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#aaa', marginBottom:4}}>
        <span>Negative</span>
        <span>Sentiment score: {score > 0 ? '+' : ''}{score.toFixed(2)}</span>
        <span>Positive</span>
      </div>
      <div style={{height:6, background:'#eee', borderRadius:4, overflow:'hidden'}}>
        <div style={{width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.6s'}} />
      </div>
    </div>
  )
}

function EmotionTag({ label }) {
  const colors = {
    anxious:'#7b1fa2', sad:'#1565c0', angry:'#b71c1c', hopeful:'#2e7d32',
    grateful:'#00695c', exhausted:'#4e342e', lonely:'#37474f',
    confused:'#e65100', motivated:'#1b5e20', calm:'#006064',
  }
  const bg = colors[label] || '#6c63ff'
  return (
    <span style={{
      display:'inline-block', background:bg, color:'#fff',
      borderRadius:12, padding:'3px 10px', fontSize:12, marginRight:6, marginBottom:4,
    }}>{label}</span>
  )
}

export default function Insights() {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/insights/')
      setInsights(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function dismiss(id) {
    await api.post(`/insights/dismiss/${id}/`, {})
    setInsights(prev => prev.filter(i => i.insight_id !== id))
  }

  const filtered = filter === 'all'
    ? insights
    : insights.filter(i => i.mood === filter)

  const moodCounts = insights.reduce((acc, i) => {
    acc[i.mood] = (acc[i.mood] || 0) + 1
    return acc
  }, {})

  return (
    <div className="page" style={{maxWidth:700}}>
      <h2 style={{marginBottom:6}}>AI Insights</h2>
      <p style={{fontSize:13, color:'#aaa', marginBottom:20}}>
        Generated from your journal entries using sentiment analysis.
      </p>

      {/* Mood summary strip */}
      {insights.length > 0 && (
        <div style={{display:'flex', gap:10, marginBottom:20, flexWrap:'wrap'}}>
          {Object.entries(MOOD_CONFIG).map(([key, cfg]) => (
            moodCounts[key] ? (
              <div key={key} style={{
                background: cfg.bg, borderRadius:10, padding:'8px 14px',
                display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                border: filter === key ? `2px solid ${cfg.color}` : '2px solid transparent',
              }} onClick={() => setFilter(filter === key ? 'all' : key)}>
                <span style={{fontSize:18}}>{cfg.icon}</span>
                <span style={{fontSize:13, color: cfg.color, fontWeight:600}}>{cfg.label}</span>
                <span style={{fontSize:12, color:'#aaa'}}>×{moodCounts[key]}</span>
              </div>
            ) : null
          ))}
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} style={{
              background:'transparent', color:'#6c63ff', fontSize:13,
              padding:'8px 14px', border:'1px dashed #6c63ff', borderRadius:10, width:'auto',
            }}>Show all</button>
          )}
        </div>
      )}

      {loading && <p style={{color:'#aaa', textAlign:'center', padding:40}}>Analyzing your entries...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{textAlign:'center', padding:'48px 0', color:'#aaa'}}>
          <div style={{fontSize:48, marginBottom:12}}>🧠</div>
          <p style={{fontSize:15}}>No insights yet.</p>
          <p style={{fontSize:13, marginTop:6}}>Write a journal entry and insights will appear here.</p>
        </div>
      )}

      {filtered.map(i => {
        const cfg = MOOD_CONFIG[i.mood] || MOOD_CONFIG.neutral
        return (
          <div key={i.insight_id} className="card" style={{borderLeft:`4px solid ${cfg.color}`}}>
            <div style={{display:'flex', alignItems:'flex-start', gap:10, marginBottom:8}}>
              <span style={{fontSize:22}}>{cfg.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:15}}>{i.title}</div>
                <div style={{fontSize:12, color:'#aaa', marginTop:2}}>
                  {new Date(i.created_at).toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'})}
                  {' · '}
                  <span style={{color: cfg.color}}>{cfg.label}</span>
                </div>
              </div>
              <button
                onClick={() => dismiss(i.insight_id)}
                style={{background:'none', color:'#ccc', padding:'2px 8px', fontSize:18, width:'auto'}}
                title="Dismiss"
              >×</button>
            </div>

            <p style={{fontSize:14, color:'#444', lineHeight:1.7, marginBottom:12}}>{i.message}</p>

            <MoodBar score={i.sentiment_score} />

            {i.emotion_tags?.length > 0 && (
              <div style={{marginTop:12}}>
                <div style={{fontSize:11, color:'#aaa', marginBottom:6}}>EMOTIONS DETECTED</div>
                {i.emotion_tags.map(e => <EmotionTag key={e} label={e} />)}
              </div>
            )}

            {i.keywords?.length > 0 && (
              <div style={{marginTop:10}}>
                <div style={{fontSize:11, color:'#aaa', marginBottom:6}}>KEY THEMES</div>
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  {i.keywords.map(k => (
                    <span key={k} style={{
                      background:'#f5f5f5', color:'#555', borderRadius:8,
                      padding:'3px 10px', fontSize:12,
                    }}>#{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
