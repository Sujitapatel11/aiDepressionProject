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
  ;['dashboard','journal','insights','support'].forEach(t=>{const p=el('desk-'+t);if(p)p.classList.toggle('hidden',t!==name)})
  if(name==='dashboard')loadDashboard()
  else if(name==='journal')loadJournal()
  else if(name==='insights')loadInsights()
  else if(name==='support')loadSupport()
}

function showMobTab(name){
  ;['dashboard','journal','insights','support','chat','profile'].forEach(t=>{const s=el('mob-'+t);if(s)s.classList.remove('active')})
  const s=el('mob-'+name);if(s)s.classList.add('active')
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===name))
  if(el('bot-nav'))el('bot-nav').style.display=name==='chat'?'none':'flex'
  if(name==='dashboard')loadDashboard()
  else if(name==='journal')loadJournal()
  else if(name==='insights')loadInsights()
  else if(name==='support')loadSupport()
  else if(name==='profile')loadProfile()
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
      if(latestEl)latestEl.textContent=data.latest_journal_preview?.content||'No entries yet. Start writing!'
    })
    if(el('desk-req-badge')){
      if(data.pending_requests_count>0){el('desk-req-badge').textContent=data.pending_requests_count;el('desk-req-badge').classList.remove('hidden')}
      else el('desk-req-badge').classList.add('hidden')
    }
  } catch(e) {
    console.error('Error loading dashboard:', e)
  }
}

async function loadJournal(){
  const dList=el('d-journal-list'),mList=el('m-journal-list')
  const showLoading=()=> {
    if(dList)dList.innerHTML='<p class="t-body-sm text-center py-8">Loading entries...</p>'
    if(mList)mList.innerHTML='<p class="t-body-sm text-center py-8">Loading entries...</p>'
  }
  const showMsg=msg=> {
    if(dList)dList.innerHTML=`<p class="t-body-sm text-center py-8">${msg}</p>`
    if(mList)mList.innerHTML=`<p class="t-body-sm text-center py-8">${msg}</p>`
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
      showMsg('No entries yet. Start writing!')
      return
    }
    const init=(username||'?').slice(0,2).toUpperCase()
    const html=entries.map(e=>`
      <div class="j-entry fade-in mb-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black" style="background:linear-gradient(135deg,var(--coral),var(--lavender))">${init}</div>
            <span class="t-h6" style="color:var(--text-1)">${escHtml(username)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="t-caption">${fmtDate(e.created_at)}</span>
            <button onclick="deleteJournal(${e.journal_id||e.id})" class="text-sm leading-none font-bold" style="color:var(--text-3);background:none;border:none;cursor:pointer">×</button>
          </div>
        </div>
        <p class="t-body-md">${escHtml(e.content)}</p>
      </div>
    `).join('')

    if(dList)dList.innerHTML=html
    if(mList)mList.innerHTML=html
  } catch(e) {
    console.error('Error rendering journal:', e)
    showMsg('Error displaying journal entries.')
  }
}

async function saveJournal(){
  const d=isDesktop()
  const inputEl=el(d?'d-journal-input':'m-journal-input'),errEl=el(d?'d-journal-error':'m-journal-error'),btnEl=el(d?'d-journal-save-btn':'m-journal-save-btn')
  const content=inputEl?.value.trim()
  if(!content){if(errEl){errEl.textContent='Entry cannot be empty.';errEl.classList.remove('hidden')}return}
  if(errEl)errEl.classList.add('hidden')
  if(btnEl){btnEl.textContent='Saving...';btnEl.disabled=true}
  const res=await api('POST','/journal/',{content})
  if(btnEl){btnEl.textContent='Save Entry';btnEl.disabled=false}
  if(res&&res.ok){
    if(inputEl)inputEl.value=''
    if(el('m-journal-input'))el('m-journal-input').value=''
    if(el('d-journal-input'))el('d-journal-input').value=''
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
  if(filtered.length===0){listEl.innerHTML='<div style="text-align:center;padding:48px 0"><div style="font-size:36px;margin-bottom:12px">🧠</div><p class="t-body-sm">No insights yet. Write a journal entry!</p></div>';return}
  listEl.innerHTML=filtered.map(function(i){
    const cfg=MOOD[i.mood]||MOOD.neutral,pct=Math.round(((i.sentiment_score+1)/2)*100)
    const emotions=(i.emotion_tags||[]).map(function(e){return'<span class="t-caption" style="background:rgba(99,102,241,0.12);color:var(--coral-lt);padding:3px 10px;border-radius:12px;border:1px solid rgba(99,102,241,0.2)">'+e+'</span>'}).join('')
    const keywords=(i.keywords||[]).map(function(k){return'<span class="t-caption" style="color:var(--coral-lt)">#'+k+'</span>'}).join(' ')
    return '<div class="insight-card fade-in"><div style="height:3px;background:'+cfg.bar+'"></div><div style="padding:18px"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">'+cfg.icon+'</span><div><p class="t-h4">'+escHtml(i.title)+'</p><p class="t-caption" style="margin-top:2px">'+cfg.label+' · '+fmtDate(i.created_at)+'</p></div></div><button onclick="dismissInsight('+(i.insight_id||i.id)+')" style="color:var(--text-3);font-size:20px;line-height:1;background:none;border:none;cursor:pointer">×</button></div><p class="t-body-md" style="margin-bottom:14px">'+escHtml(i.message)+'</p><div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between" class="t-caption"><span>Sentiment score</span><span>'+(i.sentiment_score>0?'+':'')+i.sentiment_score.toFixed(2)+'</span></div><div style="height:5px;background:var(--clue-bg);border-radius:3px;overflow:hidden;margin-top:4px"><div style="width:'+pct+'%;height:100%;background:'+cfg.bar+';border-radius:3px"></div></div></div>'+(emotions?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'+emotions+'</div>':'')+(keywords?'<div style="margin-bottom:6px;line-height:1.8">'+keywords+'</div>':'')+'</div></div>'
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

// SUPPORT
async function loadSupport(){
  supportTab('connections')
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
    if(supportData.connections.length===0){container.innerHTML='<div style="text-align:center;padding:48px 16px"><div style="font-size:36px;margin-bottom:8px">💬</div><p class="t-h4" style="margin-bottom:4px">No active chats yet</p><p class="t-body-sm">Go to Find tab to connect with peers</p></div>';return}
    container.innerHTML=supportData.connections.map(function(c){
      const uname=escHtml(c.peer&&c.peer.username?c.peer.username:'')
      const display=escHtml(c.peer&&c.peer.username?c.peer.username:'—')
      return '<div class="peer-row" onclick="openChat(\''+c.connection_id+'\',\''+uname+'\')">'+avatar(c.peer&&c.peer.username?c.peer.username:'','w-11 h-11')+'<div style="position:relative;flex:1;min-width:0"><div class="t-h5">'+display+'</div><div class="t-caption" style="margin-top:1px">Tap to start chat</div></div><div style="position:relative"><button onclick="event.stopPropagation();toggleMenu(\'menu-'+c.connection_id+'\')" style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:6px"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button><div id="menu-'+c.connection_id+'" class="hidden" style="position:absolute;right:0;top:32px;background:var(--clue-surface);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.6);border:1px solid var(--clue-border2);min-width:150px;overflow:hidden;z-index:20"><button onclick="closeMenu(\'menu-'+c.connection_id+'\');disconnectConn(\''+c.connection_id+'\',\''+uname+'\')" class="t-btn" style="display:block;width:100%;text-align:left;padding:12px 16px;color:var(--text-1);background:none;border:none;cursor:pointer;border-bottom:1px solid var(--clue-border)">Disconnect</button><button onclick="closeMenu(\'menu-'+c.connection_id+'\');blockConn(\''+c.connection_id+'\',\''+uname+'\')" class="t-btn" style="display:block;width:100%;text-align:left;padding:12px 16px;color:var(--error-text);background:none;border:none;cursor:pointer">Block</button></div></div></div>'
    }).join('')
  })
}

function renderRequests(){
  ;['d-support-requests','m-support-requests'].forEach(id=>{
    const container=el(id);if(!container)return
    let html=''
    if(supportData.incoming.length>0){
      html+='<p class="t-label" style="padding:12px 16px 6px">Incoming Requests</p>'
      html+=supportData.incoming.map(function(r){
        return '<div class="peer-row">'+avatar(r.from_user.username,'w-11 h-11')+'<div style="flex:1;min-width:0"><div class="t-h5">'+escHtml(r.from_user.username)+'</div><div class="t-caption" style="margin-top:1px">Wants to connect</div></div><button onclick="acceptRequest('+r.id+',\''+escHtml(r.from_user.username)+'\')" class="btn-blue" style="width:auto;padding:6px 14px;font-size:12px;border-radius:10px">Accept</button><button onclick="rejectRequest('+r.id+')" class="btn-gray" style="width:auto;padding:6px 12px;font-size:12px;border-radius:10px;margin-left:6px">Decline</button></div>'
      }).join('')
    }
    if(supportData.sent.length>0){
      html+='<p class="t-label" style="padding:12px 16px 6px">Sent Requests</p>'
      html+=supportData.sent.map(function(r){
        return '<div class="peer-row">'+avatar(r.to_user.username,'w-11 h-11')+'<div style="flex:1;min-width:0"><div class="t-h5">'+escHtml(r.to_user.username)+'</div><div class="t-caption" style="margin-top:1px">Request pending...</div></div><span class="t-caption" style="color:var(--amber);background:rgba(245,158,11,0.12);padding:4px 10px;border-radius:20px;flex-shrink:0;border:1px solid rgba(245,158,11,0.25)">Pending</span></div>'
      }).join('')
    }
    if(!html)html='<div style="text-align:center;padding:48px 16px"><div style="font-size:32px;margin-bottom:8px">📭</div><p class="t-h4" style="margin-bottom:4px">All caught up</p><p class="t-body-sm">No pending requests</p></div>'
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
    if(users.length===0){container.innerHTML='<div style="text-align:center;padding:32px 0"><p class="t-body-sm">No users found</p></div>';return}
    container.innerHTML=users.map(function(u){
      const score=u.match_score!==undefined?u.match_score:null
      const scoreBadge=score!==null
        ?'<span class="t-caption" style="background:rgba(20,184,166,0.15);color:var(--teal);padding:3px 10px;border-radius:20px;flex-shrink:0;border:1px solid rgba(20,184,166,0.25)">'+score+'% match</span>'
        :''
      return '<div class="peer-row">'+avatar(u.username,'w-11 h-11')+'<div style="flex:1;min-width:0"><div class="t-h5">'+escHtml(u.username)+'</div><div class="t-caption" style="margin-top:1px">SoulCare member</div></div>'+scoreBadge+'<button onclick="sendRequest('+u.id+',\''+escHtml(u.username)+'\')" class="btn-blue" style="width:auto;padding:6px 14px;font-size:12px;border-radius:10px;margin-left:8px">Connect</button></div>'
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
  const res=await api('GET','/chat/'+connId+'/messages/')
  if(!res||!res.ok)return
  try {
    const data=await res.json()
    const msgs=Array.isArray(data)?data:(data.results||[])
    msgs.forEach(function(m){appendMessage(m.content,m.sender_id===userId,fmtTime(m.created_at),false,pfx)})
    scrollChat(pfx)
  } catch(e) {}
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
  wrap.style.cssText='display:flex;flex-direction:column;align-items:'+(isSelf?'flex-end':'flex-start')
  if(animate)wrap.classList.add('fade-in')
  wrap.innerHTML='<div class="bubble '+(isSelf?'bubble-self':'bubble-other')+'">'+escHtml(content)+'</div><span class="t-caption" style="margin-top:4px;margin-left:4px;margin-right:4px">'+time+'</span>'
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
    ok.textContent=danger?'Confirm':'Yes'
    ok.style.color=danger?'var(--error-text)':'var(--coral-lt)'
    ok.onclick=async function(){closeConfirm();await confirmCallback()}
  }
  if(el('confirm-modal'))el('confirm-modal').classList.remove('hidden')
}
function closeConfirm(){if(el('confirm-modal'))el('confirm-modal').classList.add('hidden')}

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
  applyProfilePic()
  const res=await api('GET','/dashboard/')
  if(!res||!res.ok)return
  const data=await res.json()
  if(el('profile-stat-journals'))el('profile-stat-journals').textContent=data.journal_count
  if(el('profile-stat-connections'))el('profile-stat-connections').textContent=data.active_connections_count
  if(el('profile-stat-insights'))el('profile-stat-insights').textContent=data.unread_insights_count
}

function openAvatarPicker(){
  const grid=el('avatar-grid');if(!grid)return
  const current=getSelectedAvatar()
  grid.innerHTML=AVATARS.map(function(src,i){
    const selected=src===current
    return '<div onclick="selectAvatar('+i+')" style="cursor:pointer;border-radius:16px;overflow:hidden;border:2.5px solid '+(selected?'var(--coral)':'transparent')+';transition:all .18s;box-shadow:'+(selected?'var(--shadow-coral)':'none')+'" title="'+AVATAR_LABELS[i]+'"><img src="'+src+'" style="width:100%;aspect-ratio:1;display:block"/></div>'
  }).join('')
  if(el('avatar-picker'))el('avatar-picker').classList.add('hidden')
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
