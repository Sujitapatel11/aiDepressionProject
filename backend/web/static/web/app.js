// ═══════════════════════════════════════════════════════════
//  SoulCare — Single-page app JS
//  Talks to Django REST API via fetch + JWT
// ═══════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────
let token = localStorage.getItem('sc_token') || ''
let userId = Number(localStorage.getItem('sc_uid')) || 0
let username = localStorage.getItem('sc_username') || ''
let currentTab = ''
let ws = null
let wsConnId = ''
let allUsers = []
let typingTimeout = null
let confirmCallback = null

// ── API helper ───────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch('/api' + path, opts)
  if (res.status === 401) { logout(); return null }
  return res
}

// ── Screen routing ───────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  const el = document.getElementById('screen-' + name)
  if (el) el.classList.add('active')
  const nav = document.getElementById('bottom-nav')
  const authScreens = ['login', 'signup', 'forgot']
  if (authScreens.includes(name)) {
    nav.classList.add('hidden')
  } else {
    nav.classList.remove('hidden')
  }
  // Update nav active state
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active')
    if (b.dataset.tab === name) b.classList.add('active')
  })
  // Update tab icon colors
  document.querySelectorAll('.tab-btn svg, .tab-btn span').forEach(el => {
    el.classList.remove('text-primary')
    el.classList.add('text-gray-400')
  })
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${name}"]`)
  if (activeBtn) {
    activeBtn.querySelectorAll('svg, span').forEach(el => {
      el.classList.remove('text-gray-400')
      el.classList.add('text-primary')
    })
  }
}

function showTab(name) {
  currentTab = name
  showScreen(name)
  if (name === 'dashboard') loadDashboard()
  else if (name === 'journal') loadJournal()
  else if (name === 'insights') loadInsights()
  else if (name === 'support') loadSupport()
}

// ── Auth ─────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault()
  const btn = document.getElementById('login-btn')
  btn.textContent = 'Logging in...'
  btn.disabled = true
  const res = await api('POST', '/auth/login/', {
    username: document.getElementById('login-username').value,
    password: document.getElementById('login-password').value,
  })
  btn.textContent = 'Log In'
  btn.disabled = false
  if (!res) return
  if (res.ok) {
    const data = await res.json()
    setAuth(data)
    showTab('dashboard')
  } else {
    const err = await res.json()
    showError('login-error', err.detail || 'Invalid credentials.')
  }
})

document.getElementById('signup-form').addEventListener('submit', async e => {
  e.preventDefault()
  const pw = document.getElementById('signup-password').value
  const pw2 = document.getElementById('signup-password2').value
  if (pw !== pw2) { showError('signup-error', 'Passwords do not match.'); return }
  const res = await api('POST', '/auth/signup/', {
    username: document.getElementById('signup-username').value,
    email: document.getElementById('signup-email').value,
    password: pw,
    password_confirm: pw2,
  })
  if (!res) return
  if (res.ok) {
    const data = await res.json()
    setAuth(data)
    showTab('dashboard')
  } else {
    const err = await res.json()
    const msg = Object.values(err).flat().join(' ')
    showError('signup-error', msg || 'Signup failed.')
  }
})

document.getElementById('forgot-form').addEventListener('submit', async e => {
  e.preventDefault()
  const res = await api('POST', '/auth/password/reset/', {
    email: document.getElementById('forgot-email').value,
  })
  const el = document.getElementById('forgot-success')
  el.textContent = 'If that email exists, a reset link has been sent.'
  el.classList.remove('hidden')
})

function setAuth(data) {
  token = data.token
  userId = data.user_id
  username = data.username
  localStorage.setItem('sc_token', token)
  localStorage.setItem('sc_uid', userId)
  localStorage.setItem('sc_username', username)
}

function logout() {
  token = ''; userId = 0; username = ''
  localStorage.removeItem('sc_token')
  localStorage.removeItem('sc_uid')
  localStorage.removeItem('sc_username')
  if (ws) { ws.close(); ws = null }
  showScreen('login')
}

// ── Dashboard ─────────────────────────────────────────────────
async function loadDashboard() {
  document.getElementById('dash-username').textContent = username
  const res = await api('GET', '/dashboard/')
  if (!res || !res.ok) return
  const d = await res.json()
  document.getElementById('dash-journals').textContent = d.journal_count
  document.getElementById('dash-connections').textContent = d.active_connections_count
  document.getElementById('dash-requests').textContent = d.pending_requests_count
  document.getElementById('dash-insights').textContent = d.unread_insights_count
  const latest = document.getElementById('dash-latest')
  if (d.latest_journal_preview) {
    latest.textContent = d.latest_journal_preview.content
  } else {
    latest.textContent = 'No entries yet. Start writing!'
  }
}

// ── Journal ───────────────────────────────────────────────────
async function loadJournal() {
  const list = document.getElementById('journal-list')
  list.innerHTML = '<div class="text-center text-gray-400 text-sm py-8">Loading...</div>'
  const res = await api('GET', '/journal/')
  if (!res || !res.ok) return
  const entries = await res.json()
  if (entries.length === 0) {
    list.innerHTML = '<div class="text-center text-gray-400 text-sm py-8">No entries yet. Write your first one!</div>'
    return
  }
  list.innerHTML = entries.map(e => `
    <div class="bg-gray-50 rounded-2xl p-4 fade-in relative">
      <p class="text-sm text-gray-700 leading-relaxed pr-8">${escHtml(e.content)}</p>
      <p class="text-xs text-gray-400 mt-2">${fmtDate(e.created_at)}</p>
      <button onclick="deleteJournal(${e.journal_id})"
        class="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition text-lg leading-none">×</button>
    </div>
  `).join('')
}

async function saveJournal() {
  const input = document.getElementById('journal-input')
  const errEl = document.getElementById('journal-error')
  const btn = document.getElementById('journal-save-btn')
  const content = input.value.trim()
  if (!content) { errEl.textContent = 'Entry cannot be empty.'; errEl.classList.remove('hidden'); return }
  errEl.classList.add('hidden')
  btn.textContent = 'Saving...'
  btn.disabled = true
  const res = await api('POST', '/journal/', { content })
  btn.textContent = 'Save Entry'
  btn.disabled = false
  if (res && res.ok) {
    input.value = ''
    showToast('Entry saved ✓')
    loadJournal()
  }
}

async function deleteJournal(id) {
  showConfirm('Delete this journal entry?', async () => {
    await api('DELETE', `/journal/${id}/`)
    loadJournal()
  }, true)
}

// ── Insights ──────────────────────────────────────────────────
const MOOD = {
  positive: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-400', icon: '😊', label: 'Positive' },
  negative: { color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-400',     icon: '😔', label: 'Negative' },
  neutral:  { color: 'text-gray-500',    bg: 'bg-gray-100',   border: 'border-gray-300',    icon: '😐', label: 'Neutral'  },
  mixed:    { color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-400',   icon: '🌤', label: 'Mixed'    },
}
let insightFilter = 'all'
let allInsights = []

async function loadInsights() {
  const list = document.getElementById('insights-list')
  list.innerHTML = '<div class="text-center text-gray-400 text-sm py-8">Loading...</div>'
  const res = await api('GET', '/insights/')
  if (!res || !res.ok) return
  allInsights = await res.json()
  renderInsightFilter()
  renderInsights()
}

function renderInsightFilter() {
  const counts = {}
  allInsights.forEach(i => { counts[i.mood] = (counts[i.mood] || 0) + 1 })
  const el = document.getElementById('insights-filter')
  el.innerHTML = Object.entries(MOOD).filter(([k]) => counts[k]).map(([k, cfg]) => `
    <button onclick="setInsightFilter('${k}')" id="ifilter-${k}"
      class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition
        ${insightFilter === k ? 'bg-primary text-white border-primary' : cfg.bg + ' ' + cfg.color + ' border-transparent'}">
      ${cfg.icon} ${cfg.label} <span class="opacity-70">×${counts[k]}</span>
    </button>
  `).join('')
}

function setInsightFilter(mood) {
  insightFilter = insightFilter === mood ? 'all' : mood
  renderInsightFilter()
  renderInsights()
}

function renderInsights() {
  const list = document.getElementById('insights-list')
  const filtered = insightFilter === 'all' ? allInsights : allInsights.filter(i => i.mood === insightFilter)
  if (filtered.length === 0) {
    list.innerHTML = `<div class="text-center py-12">
      <div class="text-4xl mb-3">🧠</div>
      <p class="text-gray-400 text-sm">No insights yet. Write a journal entry!</p>
    </div>`
    return
  }
  list.innerHTML = filtered.map(i => {
    const cfg = MOOD[i.mood] || MOOD.neutral
    const pct = Math.round(((i.sentiment_score + 1) / 2) * 100)
    const barColor = i.sentiment_score >= 0.35 ? 'bg-emerald-400' : i.sentiment_score <= -0.35 ? 'bg-red-400' : 'bg-amber-400'
    const emotions = (i.emotion_tags || []).map(e =>
      `<span class="bg-primary-light text-primary text-xs px-2.5 py-0.5 rounded-full">${e}</span>`
    ).join('')
    const keywords = (i.keywords || []).map(k =>
      `<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-0.5 rounded-full">#${k}</span>`
    ).join('')
    return `
    <div class="bg-white rounded-2xl p-4 border-l-4 ${cfg.border} shadow-sm fade-in">
      <div class="flex items-start gap-2 mb-2">
        <span class="text-xl">${cfg.icon}</span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-gray-900">${escHtml(i.title)}</div>
          <div class="text-xs ${cfg.color} mt-0.5">${cfg.label} · ${fmtDate(i.created_at)}</div>
        </div>
        <button onclick="dismissInsight(${i.insight_id})" class="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">×</button>
      </div>
      <p class="text-sm text-gray-600 leading-relaxed mb-3">${escHtml(i.message)}</p>
      <div class="mb-1 flex justify-between text-[10px] text-gray-400">
        <span>Negative</span><span>${i.sentiment_score > 0 ? '+' : ''}${i.sentiment_score.toFixed(2)}</span><span>Positive</span>
      </div>
      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div class="h-full ${barColor} rounded-full transition-all" style="width:${pct}%"></div>
      </div>
      ${emotions ? `<div class="flex flex-wrap gap-1.5 mb-2">${emotions}</div>` : ''}
      ${keywords ? `<div class="flex flex-wrap gap-1.5">${keywords}</div>` : ''}
    </div>`
  }).join('')
}

async function dismissInsight(id) {
  await api('POST', `/insights/dismiss/${id}/`, {})
  allInsights = allInsights.filter(i => i.insight_id !== id)
  renderInsightFilter()
  renderInsights()
}

// ── Support ───────────────────────────────────────────────────
let supportData = { connections: [], incoming: [], sent: [], users: [] }
let activeSupportTab = 'connections'

async function loadSupport() {
  supportTab('connections')
  const [c, inc, snt, usr] = await Promise.all([
    api('GET', '/support/connections/'),
    api('GET', '/support/requests/'),
    api('GET', '/support/requests/sent/'),
    api('GET', '/support/users/'),
  ])
  supportData.connections = c && c.ok ? await c.json() : []
  supportData.incoming = inc && inc.ok ? await inc.json() : []
  supportData.sent = snt && snt.ok ? await snt.json() : []
  supportData.users = usr && usr.ok ? await usr.json() : []
  allUsers = supportData.users
  renderSupportTab()
  // Update requests badge
  const reqBtn = document.getElementById('stab-requests')
  if (supportData.incoming.length > 0) {
    reqBtn.textContent = `Requests (${supportData.incoming.length})`
  } else {
    reqBtn.textContent = 'Requests'
  }
}

function supportTab(name) {
  activeSupportTab = name
  document.querySelectorAll('.stab').forEach(b => {
    b.classList.remove('bg-white', 'text-primary', 'shadow-sm')
    b.classList.add('text-gray-500')
  })
  const active = document.getElementById('stab-' + name)
  if (active) {
    active.classList.add('bg-white', 'text-primary', 'shadow-sm')
    active.classList.remove('text-gray-500')
  }
  document.querySelectorAll('.support-panel').forEach(p => p.classList.add('hidden'))
  const panel = document.getElementById('support-' + name)
  if (panel) panel.classList.remove('hidden')
  renderSupportTab()
}

function renderSupportTab() {
  if (activeSupportTab === 'connections') renderConnections()
  else if (activeSupportTab === 'requests') renderRequests()
  else if (activeSupportTab === 'find') renderFindUsers(allUsers)
}

function avatar(name, size = 'w-10 h-10') {
  const colors = ['bg-violet-500','bg-pink-500','bg-cyan-500','bg-orange-500','bg-emerald-500','bg-purple-500']
  const bg = colors[(name || '').charCodeAt(0) % colors.length] || 'bg-violet-500'
  const initials = (name || '??').slice(0, 2).toUpperCase()
  return `<div class="${size} ${bg} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">${initials}</div>`
}

function renderConnections() {
  const el = document.getElementById('support-connections')
  if (supportData.connections.length === 0) {
    el.innerHTML = `<div class="text-center py-12">
      <div class="text-4xl mb-3">🤝</div>
      <p class="text-gray-400 text-sm">No connections yet.</p>
      <p class="text-gray-400 text-xs mt-1">Go to "Find People" to connect.</p>
    </div>`
    return
  }
  el.innerHTML = supportData.connections.map(c => `
    <div class="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm fade-in">
      ${avatar(c.peer?.username)}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm text-gray-900">${escHtml(c.peer?.username || '—')}</div>
        <div class="text-xs text-gray-400">Connected · ${fmtDate(c.created_at)}</div>
      </div>
      <button onclick="openChat('${c.connection_id}', '${escHtml(c.peer?.username || '')}')"
        class="bg-primary text-white text-xs px-3 py-2 rounded-xl font-medium">Chat</button>
      <div class="relative">
        <button onclick="toggleMenu('menu-${c.connection_id}')"
          class="text-gray-400 hover:text-gray-600 px-2 py-1 text-lg leading-none">⋮</button>
        <div id="menu-${c.connection_id}" class="hidden absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-[140px] overflow-hidden">
          <button onclick="closeMenu('menu-${c.connection_id}'); disconnectConn('${c.connection_id}', '${escHtml(c.peer?.username || '')}')"
            class="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">🔌 Disconnect</button>
          <button onclick="closeMenu('menu-${c.connection_id}'); blockConn('${c.connection_id}', '${escHtml(c.peer?.username || '')}')"
            class="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">🚫 Block</button>
        </div>
      </div>
    </div>
  `).join('')
}

function renderRequests() {
  const el = document.getElementById('support-requests')
  let html = ''
  if (supportData.incoming.length > 0) {
    html += `<p class="text-xs text-gray-400 font-medium mb-2">INCOMING</p>`
    html += supportData.incoming.map(r => `
      <div class="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm fade-in">
        ${avatar(r.from_user.username)}
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-gray-900">${escHtml(r.from_user.username)}</div>
          <div class="text-xs text-gray-400">Wants to connect</div>
        </div>
        <button onclick="acceptRequest(${r.id}, '${escHtml(r.from_user.username)}')"
          class="bg-emerald-500 text-white text-xs px-3 py-2 rounded-xl font-medium">Accept</button>
        <button onclick="rejectRequest(${r.id})"
          class="bg-gray-100 text-red-500 text-xs px-3 py-2 rounded-xl font-medium">Decline</button>
      </div>
    `).join('')
  }
  if (supportData.sent.length > 0) {
    html += `<p class="text-xs text-gray-400 font-medium mb-2 mt-4">SENT</p>`
    html += supportData.sent.map(r => `
      <div class="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm fade-in">
        ${avatar(r.to_user.username)}
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-gray-900">${escHtml(r.to_user.username)}</div>
          <div class="text-xs text-gray-400">Request pending...</div>
        </div>
        <span class="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Pending</span>
      </div>
    `).join('')
  }
  if (!html) {
    html = `<div class="text-center py-12">
      <div class="text-4xl mb-3">📭</div>
      <p class="text-gray-400 text-sm">No pending requests.</p>
    </div>`
  }
  el.innerHTML = html
}

function filterUsers() {
  const q = document.getElementById('find-search').value.toLowerCase()
  renderFindUsers(allUsers.filter(u => u.username.toLowerCase().includes(q)))
}

function renderFindUsers(users) {
  const el = document.getElementById('find-list')
  if (users.length === 0) {
    el.innerHTML = `<div class="text-center py-8">
      <div class="text-4xl mb-3">🔍</div>
      <p class="text-gray-400 text-sm">No users found.</p>
    </div>`
    return
  }
  el.innerHTML = users.map(u => `
    <div class="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm fade-in">
      ${avatar(u.username)}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm text-gray-900">${escHtml(u.username)}</div>
        <div class="text-xs text-gray-400">Available for peer support</div>
      </div>
      <button onclick="sendRequest(${u.id}, '${escHtml(u.username)}')"
        class="bg-primary text-white text-xs px-3 py-2 rounded-xl font-medium">+ Connect</button>
    </div>
  `).join('')
}

async function sendRequest(uid, uname) {
  const res = await api('POST', `/support/send/${uid}/`, {})
  if (res && res.ok) { showToast(`Request sent to ${uname}`); loadSupport() }
  else if (res) { const e = await res.json(); showToast(e.detail || 'Failed') }
}

async function acceptRequest(id, uname) {
  const res = await api('POST', `/support/accept/${id}/`, {})
  if (res && res.ok) { showToast(`Connected with ${uname} ✓`); loadSupport(); supportTab('connections') }
}

async function rejectRequest(id) {
  await api('POST', `/support/reject/${id}/`, {})
  loadSupport()
}

async function disconnectConn(connId, peerName) {
  showConfirm(`Disconnect from ${peerName}?`, async () => {
    await api('POST', `/support/connections/${connId}/disconnect/`, {})
    showToast(`Disconnected from ${peerName}`)
    loadSupport()
  }, false)
}

async function blockConn(connId, peerName) {
  showConfirm(`Block ${peerName}? This will end your connection.`, async () => {
    await api('POST', `/support/connections/${connId}/block/`, {})
    showToast(`${peerName} blocked`)
    loadSupport()
  }, true)
}

function toggleMenu(id) {
  const el = document.getElementById(id)
  el.classList.toggle('hidden')
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      el.classList.add('hidden')
      document.removeEventListener('click', handler)
    })
  }, 0)
}

function closeMenu(id) {
  document.getElementById(id)?.classList.add('hidden')
}

// ── Chat ──────────────────────────────────────────────────────
function openChat(connId, peerName) {
  wsConnId = connId
  // Set header
  document.getElementById('chat-peer-name').textContent = peerName
  document.getElementById('chat-status').textContent = 'Connecting...'
  document.getElementById('chat-status').className = 'text-xs text-gray-400'
  // Avatar
  const av = document.getElementById('chat-avatar')
  const colors = ['bg-violet-500','bg-pink-500','bg-cyan-500','bg-orange-500','bg-emerald-500','bg-purple-500']
  av.className = `w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${colors[peerName.charCodeAt(0) % colors.length]}`
  av.textContent = peerName.slice(0, 2).toUpperCase()
  // Clear messages
  document.getElementById('chat-messages').innerHTML = ''
  document.getElementById('chat-input').value = ''
  showScreen('chat')
  loadMessages(connId)
  connectWS(connId)
}

async function loadMessages(connId) {
  const res = await api('GET', `/chat/${connId}/messages/`)
  if (!res || !res.ok) return
  const msgs = await res.json()
  msgs.forEach(m => appendMessage(m.content, m.sender_id === userId, fmtTime(m.created_at), false))
  scrollChat()
}

function connectWS(connId) {
  if (ws) { ws.close(); ws = null }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${proto}://${location.host}/ws/chat/${connId}/?token=${token}`)
  ws.onopen = () => {
    document.getElementById('chat-status').textContent = '● Online'
    document.getElementById('chat-status').className = 'text-xs text-emerald-500'
  }
  ws.onclose = () => {
    document.getElementById('chat-status').textContent = '○ Disconnected'
    document.getElementById('chat-status').className = 'text-xs text-gray-400'
  }
  ws.onmessage = e => {
    const data = JSON.parse(e.data)
    if (data.type === 'typing') {
      if (data.sender_id !== userId) showTyping(data.is_typing)
      return
    }
    appendMessage(data.message, data.sender_id === userId, fmtTime(data.timestamp), true)
    scrollChat()
  }
}

function appendMessage(content, isSelf, time, animate) {
  const wrap = document.createElement('div')
  wrap.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'} ${animate ? 'fade-in' : ''}`
  wrap.innerHTML = `
    <div class="msg-bubble max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
      ${isSelf ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}">
      ${escHtml(content)}
    </div>
    <span class="text-[10px] text-gray-400 mt-0.5 mx-1">${time}</span>
  `
  document.getElementById('chat-messages').appendChild(wrap)
}

function sendMessage(e) {
  e.preventDefault()
  const input = document.getElementById('chat-input')
  const msg = input.value.trim()
  if (!msg || !ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ message: msg }))
  input.value = ''
}

function sendTyping() {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ type: 'typing', is_typing: true }))
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'typing', is_typing: false }))
  }, 2000)
}

function showTyping(show) {
  document.getElementById('typing-indicator').classList.toggle('hidden', !show)
  if (show) scrollChat()
}

function scrollChat() {
  const el = document.getElementById('chat-messages')
  el.scrollTop = el.scrollHeight
}

// ── Utilities ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function showToast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 3000)
}

function showError(id, msg) {
  const el = document.getElementById(id)
  el.textContent = msg
  el.classList.remove('hidden')
}

function showConfirm(msg, cb, danger) {
  confirmCallback = cb
  document.getElementById('confirm-msg').textContent = msg
  const ok = document.getElementById('confirm-ok')
  ok.textContent = danger ? 'Confirm' : 'Yes'
  ok.className = `flex-1 py-2.5 rounded-xl text-white text-sm font-medium ${danger ? 'bg-red-500' : 'bg-primary'}`
  ok.onclick = async () => { closeConfirm(); await confirmCallback() }
  document.getElementById('confirm-modal').classList.remove('hidden')
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.add('hidden')
}

// ── Boot ──────────────────────────────────────────────────────
(function init() {
  if (token) {
    showTab('dashboard')
  } else {
    showScreen('login')
  }
})()
