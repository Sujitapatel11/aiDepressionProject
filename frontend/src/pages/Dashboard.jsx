import { useEffect, useState } from 'react'
import api from '../api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard/').then(r => setData(r.data)).catch(() => setError('Failed to load dashboard.'))
  }, [])

  if (error) return <div className="page"><p className="error">{error}</p></div>
  if (!data) return <div className="page"><p>Loading...</p></div>

  return (
    <div className="page">
      <h2 style={{marginBottom:24}}>Dashboard</h2>
      <div className="stat-grid">
        <div className="stat-card"><div className="num">{data.journal_count}</div><div className="lbl">Journal Entries</div></div>
        <div className="stat-card"><div className="num">{data.active_connections_count}</div><div className="lbl">Connections</div></div>
        <div className="stat-card"><div className="num">{data.pending_requests_count}</div><div className="lbl">Pending Requests</div></div>
        <div className="stat-card"><div className="num">{data.unread_insights_count}</div><div className="lbl">Unread Insights</div></div>
      </div>
      {data.latest_journal_preview && (
        <div className="card">
          <span className="label">Latest Journal</span>
          <p style={{fontSize:14, color:'#555'}}>{data.latest_journal_preview.content}</p>
          <p style={{fontSize:12, color:'#aaa', marginTop:8}}>{new Date(data.latest_journal_preview.created_at).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  )
}
