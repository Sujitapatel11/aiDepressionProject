import { useEffect, useState } from 'react'
import api from '../api'

export default function Journal() {
  const [entries, setEntries] = useState([])
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await api.get('/journal/')
    setEntries(data)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) { setError('Entry cannot be empty.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/journal/', { content })
      setContent('')
      await load()
    } catch {
      setError('Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await api.delete(`/journal/${id}/`)
    setEntries(entries.filter(e => e.journal_id !== id))
  }

  return (
    <div className="page">
      <h2 style={{marginBottom:20}}>Journal</h2>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <textarea
            rows={4}
            placeholder="Write your thoughts..."
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{marginBottom:12}}
          />
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </form>
      </div>
      {entries.map(e => (
        <div className="card" key={e.journal_id} style={{position:'relative'}}>
          <p style={{fontSize:14, lineHeight:1.6}}>{e.content}</p>
          <p style={{fontSize:12, color:'#aaa', marginTop:8}}>{new Date(e.created_at).toLocaleString()}</p>
          <button
            onClick={() => handleDelete(e.journal_id)}
            style={{position:'absolute', top:16, right:16, background:'none', color:'#e53935', padding:'4px 8px', fontSize:12}}
          >Delete</button>
        </div>
      ))}
    </div>
  )
}
