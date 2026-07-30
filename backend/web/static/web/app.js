// SoulCare SPA
let token=localStorage.getItem('sc_token')||'',userId=Number(localStorage.getItem('sc_uid'))||0,username=localStorage.getItem('sc_username')||''
let currentTab='dashboard',ws=null,wsConnId='',allUsers=[],typingTimeout=null,confirmCallback=null
let allInsights=[],insightFilter='all',supportData={connections:[],incoming:[],sent:[],users:[]},activeSupportTab='connections'

const isDesktop=()=>window.innerWidth>=1024
const el=id=>document.getElementById(id)
const escHtml=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const fmtDate=iso=>{try{return new Date(iso).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}catch(e){return ''}}
const fmtTime=iso=>{try{return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}

async function api(method,path,body){
  try {
    const opts={method,headers:{'Content-Type':'application/json'}}
    if(token)opts.headers['Authorization']='Bearer '+token
    if(body)opts.body=JSON.stringify(body)
    const res=await fetch('/api'+path,opts)
    if(res.status===401){logout();return null}
    return res
  } catch(err) {
    console.error('API Error:', path, err)
    return null
  }
}

window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    if(el('screen-splash'))el('screen-splash').classList.remove('active')
    if(token)bootApp()
    else showAuth('login')
  },800)
})

function bootApp(){
  if(el('screen-auth'))el('screen-auth').classList.remove('active')
  if(isDesktop()){
    if(el('desk'))el('desk').classList.add('active')
    updateDeskUser()
  } else {
    if(el('mob'))el('mob').style.display='flex'
  }
  showTab('dashboard')
}

function updateDeskUser(){
  const av=el('desk-user-av')
  if(av)av.textContent=(username||'?').slice(0,2).toUpperCase()
  if(el('desk-username'))el('desk-username').textContent=username
}

function showAuth(panel){
  if(el('screen-splash'))el('screen-splash').classList.remove('active')
  if(el('screen-auth'))el('screen-auth').classList.add('active')
  authPanel(panel)
}

function authPanel(name){
  ['login','signup','forgot'].forEach(p=>{const e=el('auth-'+p);if(e)e.classList.toggle('hidden',p!==name)})
}

if(el('login-form')){
  el('login-form').addEventListener('submit',async e=>{
    e.preventDefault()
    const btn=el('login-btn');if(btn){btn.textContent='Signing in...';btn.disabled=true}
    const res=await api('POST','/auth/login/',{username:el('login-username').value,password:el('login-password').value})
    if(btn){btn.textContent='Sign in';btn.disabled=false}
    if(!res)return
    if(res.ok){const d=await res.json();setAuth(d);bootApp()}
    else{const errData=await res.json();showErr('login-error',errData.detail||'Invalid credentials.')}
  })
}

if(el('signup-form')){
  el('signup-form').addEventListener('submit',async e=>{
    e.preventDefault()
    const pw=el('signup-password').value,pw2=el('signup-password2').value
    if(pw!==pw2){showErr('signup-error','Passwords do not match.');return}
    const res=await api('POST','/auth/signup/',{username:el('signup-username').value,email:el('signup-email').value,password:pw,password_confirm:pw2})
    if(!res)return
    if(res.ok){const d=await res.json();setAuth(d);bootApp()}
    else{const errData=await res.json();showErr('signup-error',Object.values(errData).flat().join(' ')||'Signup failed.')}
  })
}

if(el('forgot-form')){
  el('forgot-form').addEventListener('submit',async e=>{
    e.preventDefault()
    await api('POST','/auth/password/reset/',{email:el('forgot-email').value})
    const s=el('forgot-success');if(s){s.textContent='If that email exists, a reset link has been sent.';s.classList.remove('hidden')}
  })
}

function setAuth(d){
  token=d.token;userId=d.user_id;username=d.username
  localStorage.setItem('sc_token',token);localStorage.setItem('sc_uid',userId);localStorage.setItem('sc_username',username)
}

function logout(){
  token='';userId=0;username=''
  localStorage.removeItem('sc_token');localStorage.removeItem('sc_uid');localStorage.removeItem('sc_username')
  if(ws){ws.close();ws=null}
  if(el('desk'))el('desk').classList.remove('active')
  if(el('mob'))el('mob').style.display='none'
  showAuth('login')
}

function showTab(name){
  currentTab=name
  if(isDesktop())showDeskTab(name)
  else showMobTab(name)
}

function showDeskTab(name){
  document.querySelectorAll('.snav-item').forEach(i=>i.classList.toggle('active',i.dataset.tab===name))
  ;['dashboard','journal','insights','support','sleep','profile','settings'].forEach(t=>{const p=el('desk-'+t);if(p)p.classList.toggle('hidden',t!==name)})
  if(name==='dashboard')loadDashboard()
  else if(name==='journal')loadJournal()
  else if(name==='insights')loadInsights()
  else if(name==='support')loadSupport()
  else if(name==='sleep')loadSleep()
  else if(name==='profile'||name==='settings')loadProfile()
}

function showMobTab(name){
  ;['dashboard','journal','insights','support','chat','profile','sleep','settings'].forEach(t=>{const s=el('mob-'+t);if(s)s.classList.remove('active')})
  const s=el('mob-'+name);if(s)s.classList.add('active')
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===name))
  if(el('bot-nav'))el('bot-nav').style.display=name==='chat'?'none':'flex'
  if(name==='dashboard')loadDashboard()
  else if(name==='journal')loadJournal()
  else if(name==='insights')loadInsights()
  else if(name==='support')loadSupport()
  else if(name==='sleep')loadSleep()
  else if(name==='profile'||name==='settings')loadProfile()
}

const PROMPTS=["What's one small thing that went well today?","Describe a moment this week when you felt at peace.","What emotion are you carrying right now?","Write about something you're looking forward to.","What would you tell a friend who felt the way you do today?","What drained your energy today, and what restored it?","Describe your ideal version of tomorrow.","What's something you've been avoiding thinking about?","Write three things you're grateful for right now.","What does your body need most today?","What made you smile recently, even briefly?","What boundary do you need to set or honour today?","Write about a person who makes you feel safe.","If today had a colour, what would it be and why?","What's a belief you hold that you've never questioned?"]
function getDailyPrompt(){return PROMPTS[(new Date().getDay()+new Date().getDate())%PROMPTS.length]}
function getGreeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}

async function loadDashboard(){
  const greeting=getGreeting(),prompt=getDailyPrompt()
  if(el('d-dash-greeting'))el('d-dash-greeting').textContent=greeting
  if(el('d-dash-username2'))el('d-dash-username2').textContent=username
  if(el('desk-username'))el('desk-username').textContent=username
  const av=el('desk-user-av');if(av)av.textContent=(username||'?').slice(0,2).toUpperCase()
  if(el('m-dash-greeting'))el('m-dash-greeting').textContent=greeting
  if(el('m-dash-username'))el('m-dash-username').textContent=username

  if(el('d-dash-prompt-text'))el('d-dash-prompt-text').textContent=prompt
  if(el('m-dash-prompt-text'))el('m-dash-prompt-text').textContent=prompt

  const res=await api('GET','/dashboard/')
  if(!res||!res.ok)return
  try {
    const data=await res.json()
    const set=(id,val)=>{if(el(id))el(id).textContent=val}
    ;['d-dash','m-dash'].forEach(pfx=>{
      set(pfx+'-journals',data.journal_count ?? 0)
      set(pfx+'-connections',data.active_connections_count ?? 0)
      set(pfx+'-requests',data.pending_requests_count ?? 0)
      set(pfx+'-insights',data.unread_insights_count ?? 0)
      const latestEl=el(pfx+'-latest')
      if(latestEl)latestEl.textContent=data.latest_journal_preview?.content||'✍️ Every journey begins with one page. Write your first reflection to unlock AI insights.'
    })
    if(el('desk-req-badge')){
      if(data.pending_requests_count>0){el('desk-req-badge').textContent=data.pending_requests_count;el('desk-req-badge').classList.remove('hidden')}
      else el('desk-req-badge').classList.add('hidden')
    }
  } catch(e) {
    console.error('Error loading dashboard:', e)
  }

  // Load Sleep Stats for Dashboard Card (Modular Health Architecture)
  try {
    const sleepRes = await api('GET', '/sleep/stats/')
    if (sleepRes && sleepRes.ok) {
      const stats = await sleepRes.json()
      ;['d-dash-sleep', 'm-dash-sleep'].forEach(id => {
        const e = el(id)
        if (e) {
          e.textContent = stats.has_data ? `🌙 ${stats.formatted_latest}` : 'No sleep data'
          e.className = stats.has_data ? 'text-2xl font-black text-gray-900 my-1' : 'text-sm font-bold text-gray-400 my-2'
        }
      })
      ;['d-dash-sleep-sub', 'm-dash-sleep-sub'].forEach(id => {
        const e = el(id)
        if (e) {
          e.textContent = stats.has_data ? `Quality: ${stats.sleep_quality} · 7d avg: ${stats.formatted_avg}` : '+ Log Sleep'
        }
      })
    }
  } catch(e) {}
}

// SLEEP TRACKER MODULE (INDEPENDENT SUBSYSTEM)
let activeTodaySleepId = null

async function loadSleep(){
  ;['sleep-history-list','m-sleep-history-list'].forEach(id=>{
    const e=el(id);if(e)e.innerHTML='<p class="t-body-sm text-center py-8 text-gray-400">Loading sleep records...</p>'
  })

  const statsRes = await api('GET', '/sleep/stats/')
  if(statsRes && statsRes.ok){
    const stats = await statsRes.json()
    if(el('sleep-stat-avg')) el('sleep-stat-avg').textContent = stats.has_data ? stats.formatted_avg : '—'
    if(el('sleep-stat-quality')) el('sleep-stat-quality').textContent = stats.has_data ? stats.sleep_quality : '—'
    if(el('sleep-stat-total')) el('sleep-stat-total').textContent = stats.total_logs
  }

  const historyRes = await api('GET', '/sleep/')
  if(!historyRes || !historyRes.ok){
    ;['sleep-history-list','m-sleep-history-list'].forEach(id=>{
      const e=el(id);if(e)e.innerHTML='<p class="t-body-sm text-center py-8 text-gray-400">Failed to load sleep records.</p>'
    })
    return
  }

  const entries = await historyRes.json()
  renderSleepChart(entries)

  const emptyHtml = `
    <div class="p-8 rounded-[28px] bg-white border border-indigo-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
      <div class="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl mb-1">🌙</div>
      <h3 class="t-h3 font-bold text-gray-900">No sleep records yet.</h3>
      <p class="t-body-md text-gray-500 max-w-sm">Record your first night's sleep to start tracking your rest patterns and emotional clarity.</p>
    </div>
  `

  if(entries.length === 0){
    ;['sleep-history-list','m-sleep-history-list'].forEach(id=>{
      const e=el(id);if(e)e.innerHTML=emptyHtml
    })
    return
  }

  const cardsHtml = entries.map(e => `
    <div class="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:border-indigo-200 transition space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">🌙</div>
          <div>
            <h4 class="t-h5 font-bold text-gray-900">${fmtDate(e.sleep_date)}</h4>
            <span class="text-xs font-semibold text-indigo-600 block">${e.formatted_duration} · ${e.sleep_quality.toUpperCase()} Rest</span>
          </div>
        </div>
        <button onclick="deleteSleep(${e.id})" class="p-1.5 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition border-none bg-transparent cursor-pointer" title="Delete record">✕</button>
      </div>
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>Bedtime: <strong>${fmtTime(e.bedtime)}</strong></span>
        <span>Wake time: <strong>${fmtTime(e.wake_time)}</strong></span>
      </div>
      ${e.sleep_notes ? `<p class="t-body-sm text-gray-700 italic pt-1">${escHtml(e.sleep_notes)}</p>` : ''}
    </div>
  `).join('')

  ;['sleep-history-list','m-sleep-history-list'].forEach(id=>{
    const e=el(id);if(e)e.innerHTML=cardsHtml
  })
}

function renderSleepChart(entries){
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], ordered = []
  for(let i = 6; i >= 0; i--){
    const d = new Date()
    d.setDate(d.getDate() - i)
    ordered.push({ dateStr: d.toISOString().split('T')[0], label: days[(d.getDay() + 6) % 7] })
  }
  const map = {}
  entries.forEach(e => { map[e.sleep_date] = e.total_sleep_hours })
  
  const chartHtml = ordered.map(({ dateStr }) => {
    const h = map[dateStr] || 0
    const barPct = h > 0 ? Math.min(100, Math.max(12, Math.round((h / 12) * 100))) : 8
    const color = h === 0 ? 'rgba(229,231,235,0.6)' : h >= 7 ? '#6366f1' : h >= 5 ? '#f59e0b' : '#ef4444'
    return `<div style="flex:1;height:${barPct}%;background:${color};border-radius:6px 6px 0 0;transition:height 0.3s" title="${h > 0 ? h + ' hrs' : 'No data'}"></div>`
  }).join('')

  const labelsHtml = ordered.map(({ label }) => `<div style="flex:1;text-align:center" class="text-xs font-semibold text-gray-400">${label}</div>`).join('')

  ;['sleep-chart','m-sleep-chart'].forEach(id=>{const e=el(id);if(e)e.innerHTML=chartHtml})
  ;['sleep-chart-labels','m-sleep-chart-labels'].forEach(id=>{const e=el(id);if(e)e.innerHTML=labelsHtml})
}

function syncTimeInput(srcEl, targetId){
  const target = el(targetId)
  if(target && srcEl) target.value = srcEl.value
}

async function saveSleep(){
  const bedInput = el('sleep-bedtime-input')?.value
  const wakeInput = el('sleep-wake-input')?.value
  const quality = document.querySelector('input[name="sleep-quality"]:checked')?.value || 'good'
  const notes = el('sleep-notes-input')?.value.trim() || ''
  const errEl = el('sleep-error')

  if(!bedInput || !wakeInput){
    if(errEl){ errEl.textContent = 'Please select both bedtime and wake time.'; errEl.classList.remove('hidden'); }
    return
  }
  if(errEl) errEl.classList.add('hidden')

  const todayStr = new Date().toISOString().split('T')[0]
  const bedtime = `${todayStr}T${bedInput}:00`
  const wake_time = `${todayStr}T${wakeInput}:00`

  const payload = {
    sleep_date: todayStr,
    bedtime: bedtime,
    wake_time: wake_time,
    sleep_quality: quality,
    sleep_notes: notes,
  }

  const btn = el('sleep-save-btn')
  if(btn){ btn.textContent = 'Saving...'; btn.disabled = true; }

  const method = activeTodaySleepId ? 'PUT' : 'POST'
  const url = activeTodaySleepId ? `/sleep/${activeTodaySleepId}/` : '/sleep/'

  const res = await api(method, url, payload)
  if(btn){ btn.textContent = 'Save Sleep Record'; btn.disabled = false; }

  if(!res || !res.ok){
    const data = await res.json().catch(() => ({}))
    if(errEl){ errEl.textContent = data.detail || 'Failed to save sleep record.'; errEl.classList.remove('hidden'); }
    return
  }

  showToast('Sleep record saved!')
  loadSleep()
  loadDashboard()
}

async function deleteSleep(id){
  showConfirm('Delete this sleep record?', async function(){
    await api('DELETE', `/sleep/${id}/`)
    showToast('Record deleted.')
    loadSleep()
    loadDashboard()
  }, true)
}

async function loadJournal(){
  const dList=el('d-journal-list'),mList=el('m-journal-list')
  const showLoading=()=> {
    if(dList)dList.innerHTML='<p class="t-body-sm text-center py-8">Loading entries...</p>'
    if(mList)mList.innerHTML='<p class="t-body-sm text-center py-8">Loading entries...</p>'
  }
  const showMsg=msg=> {
    const emptyHtml=`
      <div class="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
        <div class="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1">📖</div>
        <h3 class="t-h3 font-bold text-gray-900">Your story begins today.</h3>
        <p class="t-body-md text-gray-500 max-w-sm">Every reflection helps you understand yourself better. Express your thoughts in a safe sanctuary.</p>
      </div>
    `
    if(dList)dList.innerHTML=emptyHtml
    if(mList)mList.innerHTML=emptyHtml
  }

  showLoading()
  const res=await api('GET','/journal/')
  if(!res||!res.ok){
    showMsg('Failed to load entries. Please check connection.')
    return
  }

  try {
    const data=await res.json()
    const entries=Array.isArray(data)?data:(data.results||[])
    if(entries.length===0){
      showMsg('Your story begins today.')
      return
    }
    const init=(username||'?').slice(0,2).toUpperCase()
    const html=entries.map(e=>`
      <div class="p-5 rounded-[24px] bg-white border border-gray-200 shadow-sm hover:border-purple-200 transition space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm" style="background:linear-gradient(135deg,#8B5CF6,#7C3AED)">${init}</div>
            <div>
              <span class="text-sm font-bold text-gray-900">${escHtml(username)}</span>
              <span class="text-xs text-purple-600 font-semibold block">${fmtDate(e.created_at)}</span>
            </div>
          </div>
          <button onclick="deleteJournal(${e.journal_id||e.id})" class="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition border-none bg-transparent cursor-pointer" title="Delete reflection">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <p class="t-body-md text-gray-800 leading-relaxed whitespace-pre-line">${escHtml(e.content)}</p>
      </div>
    `).join('')

    if(dList)dList.innerHTML=html
    if(mList)mList.innerHTML=html
  } catch(e) {
    console.error('Error rendering journal:', e)
    showMsg('Error displaying journal entries.')
  }
}

function handleJournalInput(val){
  localStorage.setItem('sc_journal_draft', val)
  const words = val.trim() ? val.trim().split(/\s+/).length : 0
  const chars = val.length
  const countEl = el('journal-char-count')
  if(countEl) countEl.textContent = `${chars} chars | ${words} words`
}

async function saveJournal(){
  const d=isDesktop()
  const inputEl=el(d?'d-journal-input':'m-journal-input'),errEl=el(d?'d-journal-error':'m-journal-error'),btnEl=el(d?'d-journal-save-btn':'m-journal-save-btn')
  const content=inputEl?.value.trim()
  if(!content){if(errEl){errEl.textContent='Entry cannot be empty.';errEl.classList.remove('hidden')}return}
  if(errEl)errEl.classList.add('hidden')
  if(btnEl){btnEl.textContent='Saving...';btnEl.disabled=true}
  const res=await api('POST','/journal/',{content})
  if(btnEl){btnEl.textContent='Save Reflection Entry';btnEl.disabled=false}
  if(res&&res.ok){
    if(inputEl)inputEl.value=''
    if(el('m-journal-input'))el('m-journal-input').value=''
    if(el('d-journal-input'))el('d-journal-input').value=''
    localStorage.removeItem('sc_journal_draft')
    handleJournalInput('')
    showToast('Entry saved!')
    loadJournal()
    loadDashboard()
  }
}

async function deleteJournal(id){
  showConfirm('Delete this journal entry?',async()=>{await api('DELETE',`/journal/${id}/`);loadJournal();loadDashboard()},true)
}

// INSIGHTS
const MOOD={
  positive:{color:'#10b981',bg:'rgba(16,185,129,0.12)',border:'rgba(16,185,129,0.3)',icon:'😊',label:'Positive',bar:'linear-gradient(90deg,#10b981,#059669)'},
  negative:{color:'#f87171',bg:'rgba(239,68,68,0.12)',border:'rgba(239,68,68,0.3)',icon:'😔',label:'Negative',bar:'linear-gradient(90deg,#f87171,#dc2626)'},
  neutral:{color:'#94a3b8',bg:'rgba(148,163,184,0.12)',border:'rgba(148,163,184,0.3)',icon:'😐',label:'Neutral',bar:'linear-gradient(90deg,#94a3b8,#64748b)'},
  mixed:{color:'#f59e0b',bg:'rgba(245,158,11,0.12)',border:'rgba(245,158,11,0.3)',icon:'🌤',label:'Mixed',bar:'linear-gradient(90deg,#f59e0b,#d97706)'},
}

function buildMoodChart(insights,chartId,labelsId){
  const chartEl=el(chartId),labelsEl=el(labelsId)
  if(!chartEl||!labelsEl)return
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],ordered=[]
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);ordered.push({date:d.toDateString(),label:days[(d.getDay()+6)%7]})}
  const dayMap={}
  insights.forEach(ins=>{const d=new Date(ins.created_at).toDateString();if(!dayMap[d])dayMap[d]=[];dayMap[d].push(ins.sentiment_score)})
  chartEl.innerHTML=ordered.map(({date})=>{
    const scores=dayMap[date]||[],avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null
    const h=avg!==null?Math.max(12,Math.round(((avg+1)/2)*100)):8
    const color=avg===null?'rgba(255,255,255,0.08)':avg>=0.35?'#10b981':avg<=-0.35?'#f87171':'#6366f1'
    return '<div style="flex:1;height:'+h+'%;background:'+color+';border-radius:4px 4px 0 0;min-height:6px;transition:height 0.3s"></div>'
  }).join('')
  labelsEl.innerHTML=ordered.map(({label})=>'<div style="flex:1;text-align:center" class="t-caption">'+label+'</div>').join('')
}

async function loadInsights(){
  const dList=el('d-insights-list'),mList=el('m-insights-list')
  if(dList)dList.innerHTML='<p class="t-body-sm text-center py-8">Loading insights...</p>'
  if(mList)mList.innerHTML='<p class="t-body-sm text-center py-8">Loading insights...</p>'

  const res=await api('GET','/insights/')
  if(!res||!res.ok){
    const err='<p class="t-body-sm text-center py-8">Unable to load insights.</p>'
    if(dList)dList.innerHTML=err
    if(mList)mList.innerHTML=err
    return
  }
  try {
    const data=await res.json()
    allInsights=Array.isArray(data)?data:(data.results||[])
    insightFilter='all'
    buildMoodChart(allInsights,'d-mood-chart','d-mood-chart-labels')
    buildMoodChart(allInsights,'m-mood-chart','m-mood-chart-labels')
    renderInsightFilter('d-insights-filter')
    renderInsightFilter('m-insights-filter')
    renderInsights('d-insights-list')
    renderInsights('m-insights-list')
  } catch(e) {
    console.error('Error loading insights:', e)
  }
}

function renderInsightFilter(filtId){
  const counts={}
  allInsights.forEach(i=>{counts[i.mood]=(counts[i.mood]||0)+1})
  const el2=el(filtId);if(!el2)return
  const items=[['all',{icon:'✦',label:'All',color:'var(--coral-lt)',bg:'rgba(99,102,241,0.15)',border:'var(--coral)'}]].concat(Object.entries(MOOD).filter(function(e){return counts[e[0]]}))
  el2.innerHTML=items.map(function(item){
    const k=item[0],cfg=item[1]
    const active=insightFilter===k
    const cnt=k!=='all'&&counts[k]?' x'+counts[k]:''
    return '<button onclick="setInsightFilter(\''+k+'\',\''+filtId+'\')" class="mood-pill flex-shrink-0 '+(active?'active-pill':'')+'" style="background:'+(active?cfg.bg:'var(--clue-card)')+';color:'+cfg.color+';border-color:'+(active?cfg.border:'var(--clue-border2)')+'">'+cfg.icon+' '+cfg.label+cnt+'</button>'
  }).join('')
}

function setInsightFilter(mood,filtId){
  insightFilter=insightFilter===mood?'all':mood
  renderInsightFilter('d-insights-filter')
  renderInsightFilter('m-insights-filter')
  renderInsights('d-insights-list')
  renderInsights('m-insights-list')
}

function renderInsights(listId){
  const listEl=el(listId);if(!listEl)return
  const filtered=insightFilter==='all'?allInsights:allInsights.filter(function(i){return i.mood===insightFilter})
  if(filtered.length===0){
    listEl.innerHTML=`
      <div class="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
        <div class="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1">🌱</div>
        <h3 class="t-h3 font-bold text-gray-900">Your AI companion is still learning.</h3>
        <p class="t-body-md text-gray-500 max-w-sm">Write a few journal reflections and check back to discover gentle emotional patterns over time.</p>
        <button onclick="showTab('journal')" class="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md">Write First Reflection →</button>
      </div>
    `
    return
  }
  listEl.innerHTML=filtered.map(function(i){
    const cfg=MOOD[i.mood]||MOOD.neutral,pct=Math.round(((i.sentiment_score+1)/2)*100)
    return `
      <div class="p-6 rounded-[28px] bg-white border border-gray-200 shadow-sm hover:border-purple-200 transition space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${cfg.icon}</span>
            <div>
              <h4 class="t-h4 font-bold text-gray-900">${escHtml(i.title || 'Gentle Reflection Pattern')}</h4>
              <span class="text-xs font-semibold text-purple-600 block">${cfg.label} · ${fmtDate(i.created_at)}</span>
            </div>
          </div>
          <button onclick="dismissInsight(${i.insight_id||i.id})" class="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition border-none bg-transparent cursor-pointer" title="Dismiss insight">✕</button>
        </div>
        <p class="t-body-md text-gray-800 leading-relaxed">${escHtml(i.message || i.summary)}</p>
        <div class="pt-2 border-t border-gray-100 space-y-1">
          <div class="flex justify-between text-xs font-bold text-gray-500">
            <span>Emotional Wellbeing Trend</span>
            <span class="text-purple-700">${(i.sentiment_score > 0 ? '+' : '') + i.sentiment_score.toFixed(2)}</span>
          </div>
          <div class="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%;background:${cfg.bar}"></div>
          </div>
        </div>
      </div>
    `
  }).join('')
}

async function dismissInsight(id){
  await api('POST','/insights/dismiss/'+id+'/',{})
  allInsights=allInsights.filter(function(i){return (i.insight_id||i.id)!==id})
  renderInsightFilter('d-insights-filter')
  renderInsightFilter('m-insights-filter')
  renderInsights('d-insights-list')
  renderInsights('m-insights-list')
}

const supportSkeletonHtml = `
  <div class="space-y-3 p-2">
    <div class="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-between animate-pulse">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full bg-purple-100"></div>
        <div class="space-y-1.5">
          <div class="w-28 h-4 rounded bg-gray-200"></div>
          <div class="w-20 h-3 rounded bg-gray-100"></div>
        </div>
      </div>
      <div class="w-6 h-6 rounded bg-gray-100"></div>
    </div>
    <div class="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-between animate-pulse">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full bg-purple-100"></div>
        <div class="space-y-1.5">
          <div class="w-32 h-4 rounded bg-gray-200"></div>
          <div class="w-24 h-3 rounded bg-gray-100"></div>
        </div>
      </div>
      <div class="w-6 h-6 rounded bg-gray-100"></div>
    </div>
  </div>
`

// SUPPORT
async function loadSupport(){
  if(!activeSupportTab) activeSupportTab = 'connections'
  ;['d-support-connections','m-support-connections','d-support-requests','m-support-requests','d-find-list','m-find-list'].forEach(id=>{
    const e=el(id);if(e)e.innerHTML=supportSkeletonHtml
  })
  try {
    const results=await Promise.all([api('GET','/support/connections/'),api('GET','/support/requests/'),api('GET','/support/requests/sent/'),api('GET','/support/users/')])
    const c=results[0],inc=results[1],snt=results[2],usr=results[3]
    const parseRes=async r=>(r&&r.ok)?(await r.json()):[]
    const cData=await parseRes(c),incData=await parseRes(inc),sntData=await parseRes(snt),usrData=await parseRes(usr)
    supportData.connections=Array.isArray(cData)?cData:(cData.results||[])
    supportData.incoming=Array.isArray(incData)?incData:(incData.results||[])
    supportData.sent=Array.isArray(sntData)?sntData:(sntData.results||[])
    supportData.users=Array.isArray(usrData)?usrData:(usrData.results||[])
    allUsers=supportData.users
    renderSupportTab()
    const cnt=supportData.incoming.length
    ;['m-stab-requests','d-stab-requests'].forEach(id=>{
      const btn=el(id)
      if(btn)btn.textContent=cnt>0?'Requests ('+cnt+')':'Requests'
    })
  } catch(e) {
    const errHtml = `
      <div class="p-8 rounded-[28px] bg-white border border-rose-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
        <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-1">⚠️</div>
        <h3 class="t-h3 font-bold text-gray-900">Unable to load connections.</h3>
        <p class="t-body-md text-gray-500 max-w-sm">Please check your network connection and try again.</p>
        <button onclick="loadSupport()" class="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md">Try Again</button>
      </div>
    `
    ;['d-support-connections','m-support-connections'].forEach(id=>{
      const container=el(id);if(container)container.innerHTML=errHtml
    })
  }
}

function supportTab(name){
  activeSupportTab=name
  ;['d','m'].forEach(pfx=>{
    document.querySelectorAll('.'+pfx+'stab').forEach(function(b){b.classList.remove('tab-active')})
    const activeBtn=el(pfx+'-stab-'+name)
    if(activeBtn)activeBtn.classList.add('tab-active')
    document.querySelectorAll('.'+pfx+'support-panel').forEach(function(p){p.classList.add('hidden')})
    const panel=el(pfx+'-support-'+name)
    if(panel)panel.classList.remove('hidden')
  })
  renderSupportTab()
}

function renderSupportTab(){
  if(activeSupportTab==='connections')renderConnections()
  else if(activeSupportTab==='requests')renderRequests()
  else if(activeSupportTab==='find')renderFindUsers(allUsers)
}

function avatar(name,cls){
  cls=cls||'w-10 h-10'
  return '<div class="'+cls+' rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0" style="background:linear-gradient(135deg,var(--coral),var(--lavender))">'+(name||'??').slice(0,2).toUpperCase()+'</div>'
}

function renderConnections(){
  ;['d-support-connections','m-support-connections'].forEach(id=>{
    const container=el(id);if(!container)return
    if(supportData.connections.length===0){
      container.innerHTML=`
        <div class="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div class="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">💬</div>
          <h3 class="t-h3 font-bold text-gray-900">No conversations yet.</h3>
          <p class="t-body-md text-gray-500 max-w-sm">Once you connect with a peer, your private 1-on-1 conversations will appear here.</p>
          <button onclick="supportTab('find')" class="px-6 py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md">Find Peer Companions →</button>
        </div>
      `
      return
    }
    container.innerHTML=supportData.connections.map(function(c){
      const uname=escHtml(c.peer&&c.peer.username?c.peer.username:'')
      const display=escHtml(c.peer&&c.peer.username?c.peer.username:'—')
      const connId=c.connection_id
      const isActive = (connId === wsConnId)
      
      const cardStyles = isActive 
        ? 'border-2 border-purple-500 bg-purple-50/70 shadow-md ring-2 ring-purple-200/60 border-l-4 border-l-purple-600' 
        : 'border border-purple-100 bg-white shadow-sm hover:border-purple-300 hover:shadow-md'
      
      return `
        <div class="p-5 rounded-[28px] ${cardStyles} transition-all duration-200 flex items-center justify-between mb-3 cursor-pointer group" onclick="openChat('${connId}','${uname}')">
          <div class="flex items-center gap-4 min-w-0 flex-1">
            ${avatar(c.peer&&c.peer.username?c.peer.username:'','w-12 h-12 text-base flex-shrink-0')}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h4 class="t-h4 ${isActive ? 'font-black text-purple-950' : 'font-bold text-gray-900'} truncate group-hover:text-purple-700 transition">${display}</h4>
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" title="Connected"></span>
              </div>
              <p class="text-xs ${isActive ? 'text-purple-700 font-bold' : 'text-purple-600 font-semibold'} mt-0.5 flex items-center gap-1">
                <span>🌸</span> 1-on-1 Support Circle Member
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 relative flex-shrink-0">
            <button onclick="event.stopPropagation();openChat('${connId}','${uname}')" class="px-4 py-2 rounded-xl ${isActive ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'} font-bold text-xs transition border-none cursor-pointer flex items-center gap-1.5">
              <span>💬</span> <span>Open Chat</span>
            </button>
            <button onclick="event.stopPropagation();toggleMenu('menu-${connId}')" class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition border-none bg-transparent cursor-pointer" title="More options">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            <div id="menu-${connId}" class="hidden fixed sm:absolute right-4 sm:right-0 top-auto sm:top-10 bg-white border border-gray-200 rounded-2xl shadow-xl min-w-[160px] overflow-hidden z-30">
              <button onclick="closeMenu('menu-${connId}');disconnectConn('${connId}','${uname}')" class="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition border-none bg-transparent cursor-pointer border-b border-gray-100 flex items-center gap-2">
                <span>👋</span> Disconnect
              </button>
              <button onclick="closeMenu('menu-${connId}');blockConn('${connId}','${uname}')" class="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition border-none bg-transparent cursor-pointer flex items-center gap-2">
                <span>🚫</span> Block Peer
              </button>
            </div>
          </div>
        </div>
      `
    }).join('')
  })
}

function renderRequests(){
  ;['d-support-requests','m-support-requests'].forEach(id=>{
    const container=el(id);if(!container)return
    let html=''
    if(supportData.incoming.length>0){
      html+='<div class="px-2 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Incoming Connection Requests</div>'
      html+=supportData.incoming.map(function(r){
        const uname=escHtml(r.from_user.username)
        return `
          <div class="p-5 rounded-[24px] bg-white border border-purple-100 shadow-sm hover:border-purple-300 transition space-y-3 mb-3">
            <div class="flex items-center gap-3">
              ${avatar(r.from_user.username,'w-11 h-11')}
              <div class="flex-1 min-w-0">
                <h4 class="t-h5 font-bold text-gray-900">${uname}</h4>
                <p class="text-xs text-purple-600 font-semibold">Invited you to connect for 1-on-1 peer support</p>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button onclick="acceptRequest(${r.id},'${uname}')" class="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm text-center">Accept Connection</button>
              <button onclick="rejectRequest(${r.id})" class="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition border-none cursor-pointer text-center">Decline</button>
            </div>
          </div>
        `
      }).join('')
    }
    if(supportData.sent.length>0){
      html+='<div class="px-2 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Sent Connection Invitations</div>'
      html+=supportData.sent.map(function(r){
        const uname=escHtml(r.to_user.username)
        return `
          <div class="p-4 rounded-[24px] bg-white border border-purple-100 shadow-sm flex items-center justify-between mb-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              ${avatar(r.to_user.username,'w-11 h-11')}
              <div class="min-w-0 flex-1">
                <h4 class="t-h5 font-bold text-gray-900 truncate">${uname}</h4>
                <p class="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Waiting for response
                </p>
              </div>
            </div>
            <button onclick="event.stopPropagation();cancelRequest(${r.id},'${uname.replace(/'/g, "\\'")}',this)" class="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition border border-rose-200 cursor-pointer flex-shrink-0 relative z-10">Cancel Request</button>
          </div>
        `
      }).join('')
    }
    if(!html){
      html=`
        <div class="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
          <div class="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1">📬</div>
          <h3 class="t-h3 font-bold text-gray-900">No pending support requests.</h3>
          <p class="t-body-md text-gray-500 max-w-sm">When peers invite you to connect, or when your sent invitations are accepted, updates will appear here.</p>
          <button onclick="supportTab('find')" class="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition border-none cursor-pointer shadow-md">Explore Peer Directory →</button>
        </div>
      `
    }
    container.innerHTML=html
  })
}

function filterUsers(){
  const d=isDesktop(),q=(el(d?'d-find-search':'m-find-search')?el(d?'d-find-search':'m-find-search').value:'').toLowerCase()
  renderFindUsers(allUsers.filter(function(u){return u.username.toLowerCase().indexOf(q)!==-1}))
}

function renderFindUsers(users){
  ;['d-find-list','m-find-list'].forEach(id=>{
    const container=el(id);if(!container)return
    // Filter out users who are already connected (they belong in Connections tab)
    const availablePeers = users.filter(u => !supportData.connections.some(c => c.peer && c.peer.id === u.id))
    
    if(availablePeers.length===0){
      container.innerHTML=`
        <div class="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm my-2">
          <div class="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">🌱</div>
          <h3 class="t-h3 font-bold text-gray-900">No supportive peers found.</h3>
          <p class="t-body-md text-gray-500 max-w-sm">Try another search term or come back later as more people join our community sanctuary.</p>
        </div>
      `
      return
    }
    container.innerHTML=availablePeers.map(function(u){
      const uname=escHtml(u.username)
      const sentReq = supportData.sent.find(r => r.to_user && r.to_user.id === u.id)
      const isSent = !!sentReq
      
      let actionBtn = ''
      if(isSent){
        actionBtn = `
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Waiting for response
            </span>
            <button onclick="event.stopPropagation();cancelRequest(${sentReq.id},'${uname.replace(/'/g, "\\'")}',this)" class="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition border border-rose-200 cursor-pointer flex-shrink-0 relative z-10">Cancel Request</button>
          </div>
        `
      } else {
        actionBtn = `<button onclick="sendRequest(${u.id},'${uname}')" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition border-none cursor-pointer shadow-sm flex-shrink-0">＋ Connect</button>`
      }

      return `
        <div class="p-5 rounded-[28px] bg-white border border-purple-100 shadow-sm hover:border-purple-300 hover:shadow-md transition-all duration-200 flex items-center justify-between mb-3">
          <div class="flex items-center gap-4 min-w-0 flex-1">
            ${avatar(u.username,'w-12 h-12 text-base flex-shrink-0')}
            <div class="min-w-0 flex-1">
              <h4 class="t-h4 font-bold text-gray-900 truncate">${uname}</h4>
              <p class="text-xs text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                <span>🌸</span> SoulCare Peer Companion
              </p>
            </div>
          </div>
          ${actionBtn}
        </div>
      `
    }).join('')
  })
}

async function sendRequest(uid,uname){
  const res=await api('POST','/support/send/'+uid+'/',{})
  if(res&&res.ok){showToast('Request sent to '+uname);loadSupport()}
  else if(res){const e=await res.json();showToast(e.detail||'Failed')}
}
async function acceptRequest(id,uname){
  const res=await api('POST','/support/accept/'+id+'/',{})
  if(res&&res.ok){showToast('Connected with '+uname);loadSupport();supportTab('connections')}
}
async function rejectRequest(id){await api('POST','/support/reject/'+id+'/',{});loadSupport()}
async function cancelRequest(id,uname,btn){
  if(typeof event !== 'undefined' && event && event.stopPropagation) event.stopPropagation()
  const targetBtn = btn || (typeof event !== 'undefined' && event && event.currentTarget ? event.currentTarget : null)
  showConfirm('Cancel Connection Request?\nThis request will be removed. The other person will no longer see your invitation.',async function(){
    let origText = ''
    if(targetBtn){
      origText = targetBtn.textContent
      targetBtn.disabled = true
      targetBtn.textContent = 'Cancelling...'
      targetBtn.style.opacity = '0.6'
      targetBtn.style.pointerEvents = 'none'
    }
    try {
      const res=await api('POST','/support/requests/'+id+'/cancel/',{})
      if(res&&res.ok){
        showToast('✓ Connection request cancelled.')
        await loadSupport()
      }else{
        const errData = res ? await res.json().catch(function(){return {}}) : {}
        showToast(errData.detail || 'We couldn\'t cancel your request. Please try again.')
        if(targetBtn){
          targetBtn.disabled = false
          targetBtn.textContent = origText
          targetBtn.style.opacity = '1'
          targetBtn.style.pointerEvents = 'auto'
        }
      }
    } catch(e) {
      showToast('We couldn\'t cancel your request. Please try again.')
      if(targetBtn){
        targetBtn.disabled = false
        targetBtn.textContent = origText
        targetBtn.style.opacity = '1'
        targetBtn.style.pointerEvents = 'auto'
      }
    }
  },true)
}
window.cancelRequest = cancelRequest
async function disconnectConn(connId,peerName){
  showConfirm('Disconnect from '+peerName+'?',async function(){await api('POST','/support/connections/'+connId+'/disconnect/',{});showToast('Disconnected');loadSupport()},false)
}
async function blockConn(connId,peerName){
  showConfirm('Block '+peerName+'?',async function(){await api('POST','/support/connections/'+connId+'/block/',{});showToast('Blocked');loadSupport()},true)
}
function toggleMenu(id){
  if(el(id))el(id).classList.toggle('hidden')
  setTimeout(function(){document.addEventListener('click',function h(){if(el(id))el(id).classList.add('hidden');document.removeEventListener('click',h)})},0)
}
function closeMenu(id){if(el(id))el(id).classList.add('hidden')}

// CHAT
function openChat(connId,peerName){
  wsConnId=connId
  renderConnections()
  ;['d','m'].forEach(pfx=>{
    const av=el(pfx+'-chat-avatar')
    if(av){av.textContent=peerName.slice(0,2).toUpperCase();av.style.background='linear-gradient(135deg,var(--coral),var(--lavender))'}
    if(el(pfx+'-chat-peer-name'))el(pfx+'-chat-peer-name').textContent=peerName
    if(el(pfx+'-chat-status')){el(pfx+'-chat-status').textContent='Connecting...';el(pfx+'-chat-status').style.color='var(--text-3)'}
    const dot=el(pfx+'-chat-online');if(dot)dot.classList.add('hidden')
    if(el(pfx+'-chat-messages'))el(pfx+'-chat-messages').innerHTML=''
    if(el(pfx+'-chat-input'))el(pfx+'-chat-input').value=''
  })

  if(isDesktop()){
    if(el('d-chat-placeholder'))el('d-chat-placeholder').classList.add('hidden')
    const win=el('d-chat-window');if(win){win.classList.remove('hidden');win.classList.add('flex')}
  }else showMobTab('chat')
  loadMessages(connId,'d')
  loadMessages(connId,'m')
  connectWS(connId,isDesktop()?'d':'m')
}

async function loadMessages(connId,pfx){
  const container=el(pfx+'-chat-messages')
  if(container){
    container.innerHTML = `
      <div class="space-y-3 py-4 animate-pulse">
        <div class="flex flex-col items-start"><div class="w-48 h-10 rounded-2xl bg-purple-100"></div></div>
        <div class="flex flex-col items-end"><div class="w-56 h-12 rounded-2xl bg-purple-200"></div></div>
        <div class="flex flex-col items-start"><div class="w-40 h-10 rounded-2xl bg-purple-100"></div></div>
      </div>
    `
  }

  const res=await api('GET','/chat/'+connId+'/messages/')
  if(!res||!res.ok){
    if(container){
      container.innerHTML = `
        <div class="p-6 rounded-[28px] bg-white border border-rose-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm mx-auto my-auto max-w-sm">
          <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl mb-1">⚠️</div>
          <h3 class="t-h4 font-bold text-gray-900">We couldn't load this conversation.</h3>
          <p class="t-body-sm text-gray-500">Please check your network connection and try again.</p>
          <button onclick="loadMessages('${connId}','${pfx}')" class="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition border-none cursor-pointer shadow-md">Try Again</button>
        </div>
      `
    }
    return
  }

  try {
    const data=await res.json()
    const msgs=Array.isArray(data)?data:(data.results||[])
    if(container) container.innerHTML=''

    if(msgs.length===0){
      if(container){
        container.innerHTML = `
          <div class="p-8 rounded-[28px] bg-white border border-purple-100 text-center flex flex-col items-center justify-center space-y-3 shadow-sm mx-auto my-auto max-w-sm">
            <div class="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-1 shadow-inner">💜</div>
            <h3 class="t-h3 font-bold text-gray-900">Start your conversation.</h3>
            <p class="t-body-md text-gray-500">A kind message can make someone's day better. Send a supportive reflection to begin.</p>
          </div>
        `
      }
      return
    }

    msgs.forEach(function(m){appendMessage(m.content,m.sender_id===userId,fmtTime(m.created_at),false,pfx)})
    scrollChat(pfx)
  } catch(e) {
    if(container){
      container.innerHTML = `<p class="t-body-sm text-center py-8 text-rose-500">Error loading message history.</p>`
    }
  }
}

function connectWS(connId,pfx){
  if(ws){ws.close();ws=null}
  const proto=location.protocol==='https:'?'wss':'ws'
  ws=new WebSocket(proto+'://'+location.host+'/ws/chat/'+connId+'/?token='+token)
  ws.onopen=function(){
    ;['d','m'].forEach(p=>{
      const s=el(p+'-chat-status');if(s){s.textContent='Online';s.style.color='#10b981'}
      const dot=el(p+'-chat-online');if(dot)dot.classList.remove('hidden')
    })
  }
  ws.onclose=function(){
    ;['d','m'].forEach(p=>{
      const s=el(p+'-chat-status');if(s){s.textContent='Disconnected';s.style.color='var(--text-3)'}
      const dot=el(p+'-chat-online');if(dot)dot.classList.add('hidden')
    })
  }
  ws.onmessage=function(e){
    const data=JSON.parse(e.data)
    if(data.type==='typing'){
      if(data.sender_id!==userId){showTyping(data.is_typing,'d');showTyping(data.is_typing,'m')}
      return
    }
    appendMessage(data.message,data.sender_id===userId,fmtTime(data.timestamp),true,'d')
    appendMessage(data.message,data.sender_id===userId,fmtTime(data.timestamp),true,'m')
    scrollChat('d')
    scrollChat('m')
  }
}

function appendMessage(content,isSelf,time,animate,pfx){
  const container=el(pfx+'-chat-messages');if(!container)return
  const wrap=document.createElement('div')
  wrap.className='flex flex-col mb-3 '+(isSelf?'items-end':'items-start')
  if(animate)wrap.classList.add('fade-in')
  const bubbleStyle=isSelf
    ?'background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#FFFFFF;border-radius:24px 24px 4px 24px;'
    :'background:#FFFFFF;color:#1F2937;border:1px solid #E5E7EB;border-radius:24px 24px 24px 4px;'
  wrap.innerHTML='<div class="p-4 max-w-md shadow-sm text-sm font-normal leading-relaxed" style="'+bubbleStyle+'">'+escHtml(content)+'</div><span class="text-[10px] font-semibold text-gray-400 mt-1 px-1">'+time+'</span>'
  container.appendChild(wrap)
}

function sendMessage(e,pfx){
  e.preventDefault()
  const input=el(pfx+'-chat-input'),msg=input?input.value.trim():''
  if(!msg||!ws||ws.readyState!==1)return
  ws.send(JSON.stringify({message:msg}))
  input.value=''
}

function sendTyping(){
  if(!ws||ws.readyState!==1)return
  ws.send(JSON.stringify({type:'typing',is_typing:true}))
  clearTimeout(typingTimeout)
  typingTimeout=setTimeout(function(){if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'typing',is_typing:false}))},2000)
}

function showTyping(show,pfx){
  const ind=el(pfx+'-typing-indicator');if(ind)ind.classList.toggle('hidden',!show)
  if(show)scrollChat(pfx)
}

function scrollChat(pfx){const c=el(pfx+'-chat-messages');if(c)c.scrollTop=c.scrollHeight}

// UTILITIES
function showToast(msg){
  const t=el('toast');if(!t)return
  t.textContent=msg;t.classList.remove('hidden')
  setTimeout(function(){t.classList.add('hidden')},3000)
}
function showErr(id,msg){const e=el(id);if(e){e.textContent=msg;e.classList.remove('hidden')}}
function showConfirm(msg,cb,danger){
  confirmCallback=cb
  if(el('confirm-msg'))el('confirm-msg').textContent=msg
  const ok=el('confirm-ok')
  if(ok){
    ok.disabled=false
    ok.textContent=danger?'Yes, Cancel Request':'Yes'
    ok.style.color=danger?'var(--error-text)':'var(--coral-lt)'
    ok.onclick=async function(){
      if(!confirmCallback) return
      const callback = confirmCallback
      confirmCallback = null
      ok.disabled = true
      try {
        await callback()
      } finally {
        ok.disabled = false
        closeConfirm()
      }
    }
  }
  if(el('confirm-modal'))el('confirm-modal').classList.remove('hidden')
}
function closeConfirm(){if(el('confirm-modal'))el('confirm-modal').classList.add('hidden')}
window.showConfirm = showConfirm
window.closeConfirm = closeConfirm

window.addEventListener('resize',function(){
  if(!token)return
  if(isDesktop()){if(el('mob'))el('mob').style.display='none';if(el('desk'))el('desk').classList.add('active');updateDeskUser();showDeskTab(currentTab)}
  else{if(el('desk'))el('desk').classList.remove('active');if(el('mob'))el('mob').style.display='flex';showMobTab(currentTab)}
})

// PROFILE — Anonymous cyberpunk avatar system
const AVATARS = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230f172a"/><circle cx="50" cy="50" r="48" fill="%231e293b" stroke="%236366f1" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%230f172a"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%236366f1" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%230f172a"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%236366f1" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%236366f1" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%236366f1" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%236366f1" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%236366f1" opacity=".5"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e1b4b"/><circle cx="50" cy="50" r="48" fill="%23312e81" stroke="%23a855f7" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%231e1b4b"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23a855f7" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%231e1b4b"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23a855f7" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23a855f7" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23a855f7" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23a855f7" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23a855f7" opacity=".5"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23134e4a"/><circle cx="50" cy="50" r="48" fill="%23115e59" stroke="%2314b8a6" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23134e4a"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%2314b8a6" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23134e4a"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%2314b8a6" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%2314b8a6" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%2314b8a6" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%2314b8a6" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%2314b8a6" opacity=".5"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23020617"/><circle cx="50" cy="50" r="48" fill="%230f172a" stroke="%23ff6b6b" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23020617"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23ff6b6b" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23020617"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23ff6b6b" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23ff6b6b" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23ff6b6b" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23ff6b6b" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23ff6b6b" opacity=".5"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231c1917"/><circle cx="50" cy="50" r="48" fill="%23292524" stroke="%23f59e0b" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%231c1917"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23f59e0b" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%231c1917"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23f59e0b" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23f59e0b" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23f59e0b" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23f59e0b" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23f59e0b" opacity=".5"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23064e3b"/><circle cx="50" cy="50" r="48" fill="%23047857" stroke="%2310b981" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23064e3b"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%2310b981" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23064e3b"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%2310b981" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%2310b981" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%2310b981" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%2310b981" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%2310b981" opacity=".5"/></svg>'
]

const AVATAR_LABELS=['Indigo Neon','Purple Glow','Teal Circuit','Coral Cyber','Gold Mask','Emerald Minimal']

function getSelectedAvatar(){return localStorage.getItem('sc_av_'+username)||''}

function applyProfilePic(){
  const av=getSelectedAvatar()
  const init=(username||'?').slice(0,2).toUpperCase()
  function setAv(id){
    const e=el(id);if(!e)return
    if(av){e.innerHTML='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';e.style.background='none'}
    else{e.innerHTML='<span>'+init+'</span>';e.style.background='linear-gradient(135deg,var(--coral),var(--lavender))'}
  }
  setAv('m-dash-av');setAv('m-dash-av2');setAv('d-dash-av-inner')
  const navAv=el('nav-profile-av')
  if(navAv){
    if(av){navAv.innerHTML='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover"/>';navAv.style.background='none'}
    else{navAv.textContent=init;navAv.style.background='linear-gradient(135deg,var(--coral),var(--lavender))'}
  }
  const pDisp=el('profile-avatar-display')
  if(pDisp){
    if(av){pDisp.innerHTML='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover"/><button onclick="openAvatarPicker()" class="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2" style="background:var(--coral);border-color:var(--clue-bg)"><svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>';pDisp.style.background='none'}
    else{pDisp.innerHTML='<span id="profile-avatar-initials" class="t-h1" style="font-size:28px">'+init+'</span><button onclick="openAvatarPicker()" class="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2" style="background:var(--coral);border-color:var(--clue-bg)"><svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>';pDisp.style.background='linear-gradient(135deg,var(--coral),var(--lavender))'}
  }
  const removeBtn=el('profile-remove-btn');if(removeBtn)removeBtn.classList.toggle('hidden',!av)
}

async function loadProfile(){
  if(el('profile-username-display'))el('profile-username-display').textContent=username
  if(el('d-prof-username'))el('d-prof-username').textContent=username
  if(el('settings-username'))el('settings-username').textContent=username
  if(el('settings-email'))el('settings-email').textContent=localStorage.getItem('sc_email')||(username?username+'@soulcare.app':'—')
  applyProfilePic()
  const res=await api('GET','/dashboard/')
  if(!res||!res.ok)return
  const data=await res.json()
  if(el('profile-stat-journals'))el('profile-stat-journals').textContent=data.journal_count
  if(el('d-prof-journals'))el('d-prof-journals').textContent=data.journal_count
  if(el('profile-stat-connections'))el('profile-stat-connections').textContent=data.active_connections_count
  if(el('d-prof-connections'))el('d-prof-connections').textContent=data.active_connections_count
  if(el('profile-stat-insights'))el('profile-stat-insights').textContent=data.unread_insights_count
  if(el('d-prof-insights'))el('d-prof-insights').textContent=data.unread_insights_count
}

async function requestPasswordResetLink(){
  showConfirm('Send a password reset link to your email?', async function(){
    const res=await api('POST','/auth/password/reset/',{email: username + '@soulcare.app'})
    showToast('Password reset request processed. Check your inbox.')
  }, false)
}

function clearLocalDrafts(){
  localStorage.removeItem('sc_journal_draft')
  handleJournalInput('')
  showToast('Local draft cache cleared.')
}

function openAvatarPicker(){
  const grid=el('avatar-grid');if(!grid)return
  const current=getSelectedAvatar()
  grid.innerHTML=AVATARS.map(function(src,i){
    const selected=src===current
    return '<div onclick="selectAvatar('+i+')" style="cursor:pointer;border-radius:16px;overflow:hidden;border:2.5px solid '+(selected?'var(--coral)':'transparent')+';transition:all .18s;box-shadow:'+(selected?'var(--shadow-coral)':'none')+'" title="'+AVATAR_LABELS[i]+'"><img src="'+src+'" style="width:100%;aspect-ratio:1;display:block"/></div>'
  }).join('')
  if(el('avatar-picker'))el('avatar-picker').classList.remove('hidden')
  document.body.style.overflow='hidden'
}

function closeAvatarPicker(){
  if(el('avatar-picker'))el('avatar-picker').classList.add('hidden')
  document.body.style.overflow=''
}

function selectAvatar(index){
  localStorage.setItem('sc_av_'+username,AVATARS[index])
  applyProfilePic()
  closeAvatarPicker()
  showToast('Avatar updated — '+AVATAR_LABELS[index])
}

function removeAvatar(){
  showConfirm('Remove your custom avatar?',function(){
    localStorage.removeItem('sc_av_'+username)
    applyProfilePic()
    showToast('Avatar removed')
  },true)
}

function handleProfilePicUpload(){}
function removeProfilePic(){removeAvatar()}
