import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

// ── Avatar initials helper ──────────────────────────────────────────────────
function Avatar({ name, size = 40 }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : '??'
  const colors = ['#6c63ff','#e91e8c','#00bcd4','#ff7043','#43a047','#8e24aa']
  const bg = colors[name?.charCodeAt(0) % colors.length] || '#6c63ff'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>{initials}</div>
  )
}

// ── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel, danger }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
    }}>
      <div style={{background:'#fff', borderRadius:16, padding:28, maxWidth:340, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
        <p style={{fontSize:15, marginBottom:24, lineHeight:1.6}}>{message}</p>
        <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
          <button onClick={onCancel} style={{background:'#f0f0f0', color:'#333', padding:'8px 18px', borderRadius:8}}>Cancel</button>
          <button onClick={onConfirm} style={{background: danger ? '#e53935' : '#6c63ff', color:'#fff', padding:'8px 18px', borderRadius:8}}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

export default function Support() {
  const [tab, setTab] = useState('connections') // connections | requests | find
  const [incoming, setIncoming] = useState([])
  const [sent, setSent] = useState([])
  const [connections, setConnections] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null) // { message, action, danger }
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    try {
      const [inc, snt, conn, usr] = await Promise.all([
        api.get('/support/requests/'),
        api.get('/support/requests/sent/'),
        api.get('/support/connections/'),
        api.get('/support/users/'),
      ])
      setIncoming(inc.data)
      setSent(snt.data)
      setConnections(conn.data)
      setUsers(usr.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function askConfirm(message, action, danger = false) {
    setConfirm({ message, action, danger })
  }

  async function runConfirm() {
    await confirm.action()
    setConfirm(null)
    await load()
  }

  async function sendRequest(userId, username) {
    try {
      await api.post(`/support/send/${userId}/`, {})
      showToast(`Request sent to ${username}`)
      await load()
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to send request')
    }
  }

  async function accept(id, username) {
    await api.post(`/support/accept/${id}/`, {})
    showToast(`Connected with ${username}`)
    await load()
    setTab('connections')
  }

  async function reject(id) {
    await api.post(`/support/reject/${id}/`, {})
    await load()
  }

  async function blockConn(connectionId, peerName) {
    askConfirm(
      `Block ${peerName}? They won't be able to message you and you'll lose this connection.`,
      async () => {
        await api.post(`/support/connections/${connectionId}/block/`, {})
        showToast(`${peerName} has been blocked`)
      },
      true
    )
  }

  async function disconnectConn(connectionId, peerName) {
    askConfirm(
      `Disconnect from ${peerName}? You can reconnect later by sending a new request.`,
      async () => {
        await api.post(`/support/connections/${connectionId}/disconnect/`, {})
        showToast(`Disconnected from ${peerName}`)
      },
      false
    )
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = incoming.length

  return (
    <div className="page" style={{maxWidth:680}}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'#323232', color:'#fff', padding:'10px 20px', borderRadius:24,
          fontSize:14, zIndex:999, boxShadow:'0 4px 16px rgba(0,0,0,0.2)',
        }}>{toast}</div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <h2 style={{marginBottom:20}}>Peer Support</h2>

      {/* Tabs */}
      <div style={{display:'flex', gap:4, marginBottom:24, background:'#f0f0f0', borderRadius:12, padding:4}}>
        {[
          { key:'connections', label:'Connections' },
          { key:'requests', label: pendingCount > 0 ? `Requests (${pendingCount})` : 'Requests' },
          { key:'find', label:'Find People' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex:1, padding:'8px 0', borderRadius:9, fontSize:14, fontWeight:500,
            background: tab === t.key ? '#fff' : 'transparent',
            color: tab === t.key ? '#6c63ff' : '#666',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            transition:'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <p style={{color:'#aaa', textAlign:'center', padding:32}}>Loading...</p>}

      {/* ── CONNECTIONS TAB ── */}
      {!loading && tab === 'connections' && (
        <>
          {connections.length === 0 ? (
            <div style={{textAlign:'center', padding:'48px 0', color:'#aaa'}}>
              <div style={{fontSize:48, marginBottom:12}}>🤝</div>
              <p style={{fontSize:15}}>No active connections yet.</p>
              <p style={{fontSize:13, marginTop:6}}>Go to "Find People" to connect with someone.</p>
            </div>
          ) : (
            connections.map(c => (
              <div key={c.connection_id} className="card" style={{display:'flex', alignItems:'center', gap:14}}>
                <Avatar name={c.peer?.username} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, fontSize:15}}>{c.peer?.username}</div>
                  <div style={{fontSize:12, color:'#aaa', marginTop:2}}>
                    Connected · {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/chat/${c.connection_id}`)}
                  style={{background:'#6c63ff', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:13}}
                >
                  💬 Chat
                </button>
                <div style={{position:'relative'}}>
                  <ConnectionMenu
                    onDisconnect={() => disconnectConn(c.connection_id, c.peer?.username)}
                    onBlock={() => blockConn(c.connection_id, c.peer?.username)}
                  />
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── REQUESTS TAB ── */}
      {!loading && tab === 'requests' && (
        <>
          {incoming.length > 0 && (
            <>
              <p style={{fontSize:13, color:'#888', marginBottom:12}}>Incoming</p>
              {incoming.map(r => (
                <div key={r.id} className="card" style={{display:'flex', alignItems:'center', gap:14}}>
                  <Avatar name={r.from_user.username} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600, fontSize:15}}>{r.from_user.username}</div>
                    <div style={{fontSize:12, color:'#aaa', marginTop:2}}>Wants to connect with you</div>
                  </div>
                  <button
                    onClick={() => accept(r.id, r.from_user.username)}
                    style={{background:'#43a047', color:'#fff', padding:'7px 14px', borderRadius:8, fontSize:13}}
                  >✓ Accept</button>
                  <button
                    onClick={() => reject(r.id)}
                    style={{background:'#f5f5f5', color:'#e53935', padding:'7px 14px', borderRadius:8, fontSize:13}}
                  >✕ Decline</button>
                </div>
              ))}
            </>
          )}

          {sent.length > 0 && (
            <>
              <p style={{fontSize:13, color:'#888', margin:'20px 0 12px'}}>Sent</p>
              {sent.map(r => (
                <div key={r.id} className="card" style={{display:'flex', alignItems:'center', gap:14}}>
                  <Avatar name={r.to_user.username} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600, fontSize:15}}>{r.to_user.username}</div>
                    <div style={{fontSize:12, color:'#aaa', marginTop:2}}>Request pending...</div>
                  </div>
                  <span style={{fontSize:12, color:'#ff9800', background:'#fff8e1', padding:'4px 10px', borderRadius:12}}>Pending</span>
                </div>
              ))}
            </>
          )}

          {incoming.length === 0 && sent.length === 0 && (
            <div style={{textAlign:'center', padding:'48px 0', color:'#aaa'}}>
              <div style={{fontSize:48, marginBottom:12}}>📭</div>
              <p style={{fontSize:15}}>No pending requests.</p>
            </div>
          )}
        </>
      )}

      {/* ── FIND PEOPLE TAB ── */}
      {!loading && tab === 'find' && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username..."
            style={{marginBottom:16}}
          />
          {filteredUsers.length === 0 ? (
            <div style={{textAlign:'center', padding:'48px 0', color:'#aaa'}}>
              <div style={{fontSize:48, marginBottom:12}}>🔍</div>
              <p style={{fontSize:15}}>{search ? 'No users match your search.' : 'No available users right now.'}</p>
            </div>
          ) : (
            filteredUsers.map(u => (
              <div key={u.id} className="card" style={{display:'flex', alignItems:'center', gap:14}}>
                <Avatar name={u.username} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, fontSize:15}}>{u.username}</div>
                  <div style={{fontSize:12, color:'#aaa', marginTop:2}}>Available for peer support</div>
                </div>
                <button
                  onClick={() => sendRequest(u.id, u.username)}
                  style={{background:'#6c63ff', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:13}}
                >+ Connect</button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

// ── 3-dot menu for connection actions ────────────────────────────────────────
function ConnectionMenu({ onDisconnect, onBlock }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div style={{position:'relative'}}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{background:'transparent', color:'#999', padding:'6px 10px', fontSize:18, borderRadius:8}}
        title="More options"
      >⋮</button>
      {open && (
        <div style={{
          position:'absolute', right:0, top:'110%', background:'#fff',
          borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
          minWidth:160, zIndex:100, overflow:'hidden',
        }}>
          <button
            onClick={() => { setOpen(false); onDisconnect() }}
            style={{display:'block', width:'100%', textAlign:'left', padding:'11px 16px', background:'transparent', color:'#333', fontSize:14, borderRadius:0, borderBottom:'1px solid #f0f0f0'}}
          >🔌 Disconnect</button>
          <button
            onClick={() => { setOpen(false); onBlock() }}
            style={{display:'block', width:'100%', textAlign:'left', padding:'11px 16px', background:'transparent', color:'#e53935', fontSize:14, borderRadius:0}}
          >🚫 Block</button>
        </div>
      )}
    </div>
  )
}
