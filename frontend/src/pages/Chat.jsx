import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

function Avatar({ name, size = 36 }) {
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

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const { connectionId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [peerName, setPeerName] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [wsStatus, setWsStatus] = useState('connecting') // connecting | open | closed
  const wsRef = useRef(null)
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)
  const userId = Number(localStorage.getItem('userId'))
  const token = localStorage.getItem('token')

  useEffect(() => {
    // Load history + peer info
    Promise.all([
      api.get(`/chat/${connectionId}/messages/`),
      api.get('/support/connections/'),
    ]).then(([msgRes, connRes]) => {
      setMessages(msgRes.data)
      const conn = connRes.data.find(c => c.connection_id === connectionId)
      if (conn) setPeerName(conn.peer?.username || 'Peer')
    }).catch(() => navigate('/support'))

    // WebSocket
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${connectionId}/?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => setWsStatus('open')
    ws.onclose = () => setWsStatus('closed')

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'typing') {
        if (data.sender_id !== userId) {
          setPeerTyping(data.is_typing)
          if (data.is_typing) {
            clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() => setPeerTyping(false), 3000)
          }
        }
        return
      }
      setMessages(prev => [...prev, {
        message_id: data.message_id,
        sender: { id: data.sender_id },
        content: data.message,
        created_at: data.timestamp,
      }])
    }

    return () => { ws.close(); clearTimeout(typingTimer.current) }
  }, [connectionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, peerTyping])

  function send(e) {
    e.preventDefault()
    if (!input.trim() || wsRef.current?.readyState !== 1) return
    wsRef.current.send(JSON.stringify({ message: input.trim() }))
    setInput('')
  }

  function handleTyping() {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: true }))
    }
  }

  // Group messages by date
  const grouped = []
  let lastDate = null
  messages.forEach(m => {
    const d = formatDate(m.created_at)
    if (d !== lastDate) { grouped.push({ type: 'date', label: d }); lastDate = d }
    grouped.push({ type: 'msg', ...m })
  })

  return (
    <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 56px)', background:'#f5f5f5'}}>

      {/* Header */}
      <div style={{
        background:'#fff', borderBottom:'1px solid #eee',
        padding:'12px 20px', display:'flex', alignItems:'center', gap:12,
        boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => navigate('/support')}
          style={{background:'transparent', color:'#6c63ff', padding:'6px 10px', fontSize:18, borderRadius:8, width:'auto'}}
        >←</button>
        <Avatar name={peerName} />
        <div style={{flex:1}}>
          <div style={{fontWeight:600, fontSize:15}}>{peerName || 'Loading...'}</div>
          <div style={{fontSize:12, color: wsStatus === 'open' ? '#43a047' : '#aaa'}}>
            {wsStatus === 'open' ? '● Online' : wsStatus === 'connecting' ? 'Connecting...' : '○ Disconnected'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:4}}>
        {grouped.map((item, i) => {
          if (item.type === 'date') return (
            <div key={i} style={{textAlign:'center', margin:'12px 0 4px'}}>
              <span style={{fontSize:12, color:'#aaa', background:'#ececec', padding:'3px 12px', borderRadius:12}}>{item.label}</span>
            </div>
          )
          const isSelf = item.sender?.id === userId || Number(item.sender_id) === userId
          return (
            <div key={item.message_id} style={{display:'flex', flexDirection:'column', alignItems: isSelf ? 'flex-end' : 'flex-start', marginBottom:2}}>
              <div style={{
                maxWidth:'68%', padding:'10px 14px',
                background: isSelf ? '#6c63ff' : '#fff',
                color: isSelf ? '#fff' : '#212121',
                borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize:14, lineHeight:1.5,
                boxShadow:'0 1px 3px rgba(0,0,0,0.08)',
              }}>{item.content}</div>
              <span style={{fontSize:11, color:'#bbb', marginTop:2, marginLeft:4, marginRight:4}}>
                {formatTime(item.created_at)}
              </span>
            </div>
          )
        })}

        {peerTyping && (
          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:4}}>
            <Avatar name={peerName} size={28} />
            <div style={{background:'#fff', borderRadius:'18px 18px 18px 4px', padding:'10px 14px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        style={{
          display:'flex', gap:10, padding:'12px 16px',
          background:'#fff', borderTop:'1px solid #eee',
          alignItems:'flex-end',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleTyping}
          placeholder={wsStatus === 'open' ? 'Type a message...' : 'Connecting...'}
          disabled={wsStatus !== 'open'}
          style={{flex:1, borderRadius:24, padding:'10px 16px', fontSize:14}}
        />
        <button
          type="submit"
          disabled={!input.trim() || wsStatus !== 'open'}
          style={{
            background:'#6c63ff', color:'#fff', borderRadius:'50%',
            width:44, height:44, padding:0, fontSize:18, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >➤</button>
      </form>
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{display:'flex', gap:4, alignItems:'center', height:16}}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:7, height:7, borderRadius:'50%', background:'#bbb',
          animation:'bounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
