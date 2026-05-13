// SoulCare SPA
let token=localStorage.getItem('sc_token')||'',userId=Number(localStorage.getItem('sc_uid'))||0,username=localStorage.getItem('sc_username')||''
let currentTab='dashboard',ws=null,wsConnId='',allUsers=[],typingTimeout=null,confirmCallback=null
let allInsights=[],insightFilter='all',supportData={connections:[],incoming:[],sent:[],users:[]},activeSupportTab='connections'

const isDesktop=()=>window.innerWidth>=1024
const el=id=>document.getElementById(id)
const escHtml=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const fmtDate=iso=>new Date(iso).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})
const fmtTime=iso=>new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})

async function api(method,path,body){
  const opts={method,headers:{'Content-Type':'application/json'}}
  if(token)opts.headers['Authorization']='Bearer '+token
  if(body)opts.body=JSON.stringify(body)
  const res=await fetch('/api'+path,opts)
  if(res.status===401){logout();return null}
  return res
}

window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    el('screen-splash').classList.remove('active')
    if(token)bootApp()
    else showAuth('login')
  },1400)
})

function bootApp(){
  el('screen-auth').classList.remove('active')
  if(isDesktop()){el('desk').classList.add('active');updateDeskUser()}
  else el('mob').style.display='flex'
  showTab('dashboard')
}

function updateDeskUser(){
  const av=el('desk-user-av')
  if(av)av.textContent=(username||'?').slice(0,2).toUpperCase()
  if(el('desk-username'))el('desk-username').textContent=username
}

function showAuth(panel){
  el('screen-splash').classList.remove('active')
  el('screen-auth').classList.add('active')
  authPanel(panel)
}

function authPanel(name){
  ['login','signup','forgot'].forEach(p=>el('auth-'+p).classList.toggle('hidden',p!==name))
}

el('login-form').addEventListener('submit',async e=>{
  e.preventDefault()
  const btn=el('login-btn');btn.textContent='Logging in...';btn.disabled=true
  const res=await api('POST','/auth/login/',{username:el('login-username').value,password:el('login-password').value})
  btn.textContent='Log in';btn.disabled=false
  if(!res)return
  if(res.ok){const d=await res.json();setAuth(d);bootApp()}
  else{const e=await res.json();showErr('login-error',e.detail||'Invalid credentials.')}
})

el('signup-form').addEventListener('submit',async e=>{
  e.preventDefault()
  const pw=el('signup-password').value,pw2=el('signup-password2').value
  if(pw!==pw2){showErr('signup-error','Passwords do not match.');return}
  const res=await api('POST','/auth/signup/',{username:el('signup-username').value,email:el('signup-email').value,password:pw,password_confirm:pw2})
  if(!res)return
  if(res.ok){const d=await res.json();setAuth(d);bootApp()}
  else{const e=await res.json();showErr('signup-error',Object.values(e).flat().join(' ')||'Signup failed.')}
})

el('forgot-form').addEventListener('submit',async e=>{
  e.preventDefault()
  await api('POST','/auth/password/reset/',{email:el('forgot-email').value})
  const s=el('forgot-success');s.textContent='If that email exists, a reset link has been sent.';s.classList.remove('hidden')
})

function setAuth(d){
  token=d.token;userId=d.user_id;username=d.username
  localStorage.setItem('sc_token',token);localStorage.setItem('sc_uid',userId);localStorage.setItem('sc_username',username)
}

function logout(){
  token='';userId=0;username=''
  localStorage.removeItem('sc_token');localStorage.removeItem('sc_uid');localStorage.removeItem('sc_username')
  if(ws){ws.close();ws=null}
  el('desk').classList.remove('active');el('mob').style.display='none'
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
  el('bot-nav').style.display=name==='chat'?'none':'flex'
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
  const d=isDesktop(),greeting=getGreeting(),prompt=getDailyPrompt()
  if(d){
    if(el('d-dash-greeting'))el('d-dash-greeting').textContent=greeting
    if(el('d-dash-username2'))el('d-dash-username2').textContent=username
    if(el('desk-username'))el('desk-username').textContent=username
    const av=el('desk-user-av');if(av)av.textContent=(username||'?').slice(0,2).toUpperCase()
  }else{
    if(el('m-dash-greeting'))el('m-dash-greeting').textContent=greeting
    if(el('m-dash-username'))el('m-dash-username').textContent=username
  }
  if(el('d-dash-prompt-text'))el('d-dash-prompt-text').textContent=prompt
  if(el('m-dash-prompt-text'))el('m-dash-prompt-text').textContent=prompt
  const res=await api('GET','/dashboard/')
  if(!res||!res.ok)return
  const data=await res.json()
  const set=(id,val)=>{if(el(id))el(id).textContent=val}
  const pfx=d?'d-dash':'m-dash'
  set(pfx+'-journals',data.journal_count)
  set(pfx+'-connections',data.active_connections_count)
  set(pfx+'-requests',data.pending_requests_count)
  set(pfx+'-insights',data.unread_insights_count)
  const latestEl=el(pfx+'-latest')
  if(latestEl)latestEl.textContent=data.latest_journal_preview?.content||'No entries yet. Start writing!'
  if(el('desk-req-badge')){
    if(data.pending_requests_count>0){el('desk-req-badge').textContent=data.pending_requests_count;el('desk-req-badge').classList.remove('hidden')}
    else el('desk-req-badge').classList.add('hidden')
  }
}

async function loadJournal(){
  const d=isDesktop(),listId=d?'d-journal-list':'m-journal-list',listEl=el(listId)
  if(listEl)listEl.innerHTML='<p class="text-center text-ig-gray text-sm py-8">Loading...</p>'
  const res=await api('GET','/journal/')
  if(!res||!res.ok)return
  const entries=await res.json()
  if(!listEl)return
  if(entries.length===0){listEl.innerHTML='<p class="text-center text-ig-gray text-sm py-8">No entries yet.</p>';return}
  const init=(username||'?').slice(0,2).toUpperCase()
  listEl.innerHTML=entries.map(e=>`
    <div style="background:#fff;border-bottom:1px solid #dbdbdb;padding:14px 16px" class="fade-in">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(45deg,#405DE6,#E1306C);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">${init}</div>
        <span style="font-size:13px;font-weight:600;color:#262626;flex:1">${escHtml(username)}</span>
        <button onclick="deleteJournal(${e.journal_id})" style="background:none;border:none;cursor:pointer;color:#c7c7c7;font-size:18px;line-height:1">x</button>
      </div>
      <p style="font-size:14px;color:#262626;line-height:1.65">${escHtml(e.content)}</p>
      <p style="font-size:11px;color:#8e8e8e;margin-top:6px">${fmtDate(e.created_at)}</p>
    </div>
  `).join('')
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
  if(res&&res.ok){if(inputEl)inputEl.value='';showToast('Entry saved');loadJournal()}
}

async function deleteJournal(id){
  showConfirm('Delete this journal entry?',async()=>{await api('DELETE',`/journal/${id}/`);loadJournal()},true)
}


// INSIGHTS
const MOOD={
  positive:{color:'#166534',bg:'#dcfce7',border:'#86efac',icon:'😊',label:'Positive',bar:'linear-gradient(90deg,#86efac,#16a34a)'},
  negative:{color:'#991b1b',bg:'#fee2e2',border:'#fca5a5',icon:'😔',label:'Negative',bar:'linear-gradient(90deg,#fca5a5,#dc2626)'},
  neutral:{color:'#374151',bg:'#f3f4f6',border:'#d1d5db',icon:'😐',label:'Neutral',bar:'linear-gradient(90deg,#d1d5db,#6b7280)'},
  mixed:{color:'#92400e',bg:'#fef3c7',border:'#fcd34d',icon:'🌤',label:'Mixed',bar:'linear-gradient(90deg,#fcd34d,#d97706)'},
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
    const h=avg!==null?Math.max(8,Math.round(((avg+1)/2)*100)):4
    const color=avg===null?'#e5e7eb':avg>=0.35?'#0095F6':avg<=-0.35?'#ef4444':'#f59e0b'
    return '<div style="flex:1;height:'+h+'%;background:'+color+';border-radius:4px 4px 0 0;min-height:4px"></div>'
  }).join('')
  labelsEl.innerHTML=ordered.map(({label})=>'<div style="flex:1;text-align:center;font-size:9px;color:#8e8e8e">'+label+'</div>').join('')
}

async function loadInsights(){
  const d=isDesktop(),listId=d?'d-insights-list':'m-insights-list',filtId=d?'d-insights-filter':'m-insights-filter'
  if(el(listId))el(listId).innerHTML='<p class="text-center text-ig-gray text-sm py-8">Loading...</p>'
  const res=await api('GET','/insights/')
  if(!res||!res.ok)return
  allInsights=await res.json()
  insightFilter='all'
  buildMoodChart(allInsights,d?'d-mood-chart':'m-mood-chart',d?'d-mood-chart-labels':'m-mood-chart-labels')
  renderInsightFilter(filtId)
  renderInsights(listId)
}

function renderInsightFilter(filtId){
  const counts={}
  allInsights.forEach(i=>{counts[i.mood]=(counts[i.mood]||0)+1})
  const el2=el(filtId);if(!el2)return
  const items=[['all',{icon:'all',label:'All',color:'#0095F6',bg:'#e8f4fd',border:'#0095F6'}]].concat(Object.entries(MOOD).filter(function(e){return counts[e[0]]}))
  el2.innerHTML=items.map(function(item){
    const k=item[0],cfg=item[1]
    const active=insightFilter===k
    const cnt=k!=='all'&&counts[k]?' x'+counts[k]:''
    return '<button onclick="setInsightFilter(\''+k+'\',\''+filtId+'\')" class="mood-pill flex-shrink-0" style="background:'+(active?cfg.bg:'#fff')+';color:'+cfg.color+';border-color:'+(active?cfg.border:'#dbdbdb')+'">'+cfg.icon+' '+cfg.label+cnt+'</button>'
  }).join('')
}

function setInsightFilter(mood,filtId){
  insightFilter=insightFilter===mood?'all':mood
  renderInsightFilter(filtId)
  renderInsights(filtId.replace('filter','list'))
}

function renderInsights(listId){
  const listEl=el(listId);if(!listEl)return
  const filtered=insightFilter==='all'?allInsights:allInsights.filter(function(i){return i.mood===insightFilter})
  if(filtered.length===0){listEl.innerHTML='<div style="text-align:center;padding:48px 0"><div style="font-size:40px;margin-bottom:12px">🧠</div><p style="color:#8e8e8e;font-size:14px">No insights yet. Write a journal entry!</p></div>';return}
  listEl.innerHTML=filtered.map(function(i){
    const cfg=MOOD[i.mood]||MOOD.neutral,pct=Math.round(((i.sentiment_score+1)/2)*100)
    const emotions=(i.emotion_tags||[]).map(function(e){return'<span style="background:#efefef;color:#262626;font-size:11px;padding:3px 10px;border-radius:12px">'+e+'</span>'}).join('')
    const keywords=(i.keywords||[]).map(function(k){return'<span style="color:#0095F6;font-size:12px">#'+k+'</span>'}).join(' ')
    return '<div class="insight-card fade-in"><div style="height:3px;background:'+cfg.bar+'"></div><div style="padding:16px"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px">'+cfg.icon+'</span><div><p style="font-size:15px;font-weight:600;color:#262626">'+escHtml(i.title)+'</p><p style="font-size:11px;color:#8e8e8e;margin-top:2px">'+cfg.label+' - '+fmtDate(i.created_at)+'</p></div></div><button onclick="dismissInsight('+i.insight_id+')" style="color:#c7c7c7;font-size:20px;line-height:1;background:none;border:none;cursor:pointer">x</button></div><p style="font-size:14px;color:#262626;line-height:1.7;margin-bottom:12px">'+escHtml(i.message)+'</p><div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:10px;color:#8e8e8e;margin-bottom:4px"><span>Sentiment</span><span>'+(i.sentiment_score>0?'+':'')+i.sentiment_score.toFixed(2)+'</span></div><div style="height:4px;background:#efefef;border-radius:2px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+cfg.bar+';border-radius:2px"></div></div></div>'+(emotions?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">'+emotions+'</div>':'')+(keywords?'<div style="margin-bottom:10px;line-height:2">'+keywords+'</div>':'')+'</div></div>'
  }).join('')
}

async function dismissInsight(id){
  await api('POST','/insights/dismiss/'+id+'/',{})
  allInsights=allInsights.filter(function(i){return i.insight_id!==id})
  const d=isDesktop()
  renderInsightFilter(d?'d-insights-filter':'m-insights-filter')
  renderInsights(d?'d-insights-list':'m-insights-list')
}

// SUPPORT
async function loadSupport(){
  supportTab('connections')
  const results=await Promise.all([api('GET','/support/connections/'),api('GET','/support/requests/'),api('GET','/support/requests/sent/'),api('GET','/support/users/')])
  const c=results[0],inc=results[1],snt=results[2],usr=results[3]
  supportData.connections=c&&c.ok?await c.json():[]
  supportData.incoming=inc&&inc.ok?await inc.json():[]
  supportData.sent=snt&&snt.ok?await snt.json():[]
  supportData.users=usr&&usr.ok?await usr.json():[]
  allUsers=supportData.users
  renderSupportTab()
  const cnt=supportData.incoming.length
  const reqBtnM=el('m-stab-requests'),reqBtnD=el('d-stab-requests')
  if(reqBtnM)reqBtnM.textContent=cnt>0?'Requests ('+cnt+')':'Requests'
  if(reqBtnD)reqBtnD.textContent=cnt>0?'Requests ('+cnt+')':'Requests'
}

function supportTab(name){
  activeSupportTab=name
  const d=isDesktop(),pfx=d?'d':'m'
  document.querySelectorAll('.'+pfx+'stab').forEach(function(b){b.classList.remove('bg-white','text-primary','shadow-sm');b.classList.add('text-ig-gray')})
  const activeBtn=el(pfx+'-stab-'+name)
  if(activeBtn){activeBtn.classList.add('bg-white','text-primary','shadow-sm');activeBtn.classList.remove('text-ig-gray')}
  document.querySelectorAll('.'+pfx+'support-panel').forEach(function(p){p.classList.add('hidden')})
  const panel=el(pfx+'-support-'+name);if(panel)panel.classList.remove('hidden')
  renderSupportTab()
}

function renderSupportTab(){
  if(activeSupportTab==='connections')renderConnections()
  else if(activeSupportTab==='requests')renderRequests()
  else if(activeSupportTab==='find')renderFindUsers(allUsers)
}

function avatar(name,cls){
  cls=cls||'w-10 h-10'
  const colors=['#0095F6','#833AB4','#E1306C','#F77737','#405DE6','#5851DB']
  const bg=colors[(name||'').charCodeAt(0)%colors.length]||'#0095F6'
  return '<div class="'+cls+' rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style="background:'+bg+'">'+(name||'??').slice(0,2).toUpperCase()+'</div>'
}

function renderConnections(){
  const d=isDesktop(),container=el(d?'d-support-connections':'m-support-connections');if(!container)return
  if(supportData.connections.length===0){container.innerHTML='<div style="text-align:center;padding:48px 16px"><div style="font-size:36px;margin-bottom:8px">💬</div><p style="font-weight:600;color:#262626;margin-bottom:4px">No connections yet</p><p style="font-size:13px;color:#8e8e8e">Go to Find to connect with someone</p></div>';return}
  container.innerHTML=supportData.connections.map(function(c){
    const uname=escHtml(c.peer&&c.peer.username?c.peer.username:'')
    const display=escHtml(c.peer&&c.peer.username?c.peer.username:'—')
    return '<div class="peer-row" onclick="openChat(\''+c.connection_id+'\',\''+uname+'\')">'+avatar(c.peer&&c.peer.username?c.peer.username:'','w-11 h-11')+'<div style="position:absolute;width:9px;height:9px;border-radius:50%;background:#22c55e;border:2px solid #fff;bottom:0;right:0;margin-left:-9px;margin-bottom:-9px"></div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;color:#262626">'+display+'</div><div style="font-size:12px;color:#8e8e8e;margin-top:1px">Tap to chat</div></div><div style="position:relative"><button onclick="event.stopPropagation();toggleMenu(\'menu-'+c.connection_id+'\')" style="background:none;border:none;cursor:pointer;color:#8e8e8e;padding:4px"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button><div id="menu-'+c.connection_id+'" class="hidden" style="position:absolute;right:0;top:28px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);border:1px solid #dbdbdb;min-width:150px;overflow:hidden;z-index:10"><button onclick="closeMenu(\'menu-'+c.connection_id+'\');disconnectConn(\''+c.connection_id+'\',\''+uname+'\')" style="display:block;width:100%;text-align:left;padding:11px 16px;font-size:13px;color:#262626;background:none;border:none;cursor:pointer;border-bottom:1px solid #efefef">Disconnect</button><button onclick="closeMenu(\'menu-'+c.connection_id+'\');blockConn(\''+c.connection_id+'\',\''+uname+'\')" style="display:block;width:100%;text-align:left;padding:11px 16px;font-size:13px;color:#dc2626;background:none;border:none;cursor:pointer">Block</button></div></div></div>'
  }).join('')
}

function renderRequests(){
  const d=isDesktop(),container=el(d?'d-support-requests':'m-support-requests');if(!container)return
  let html=''
  if(supportData.incoming.length>0){
    html+='<p style="font-size:11px;color:#8e8e8e;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:12px 16px 6px">Incoming</p>'
    html+=supportData.incoming.map(function(r){
      return '<div class="peer-row">'+avatar(r.from_user.username,'w-11 h-11')+'<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;color:#262626">'+escHtml(r.from_user.username)+'</div><div style="font-size:12px;color:#8e8e8e;margin-top:1px">Wants to connect</div></div><button onclick="acceptRequest('+r.id+',\''+escHtml(r.from_user.username)+'\')" style="background:#0095F6;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">Accept</button><button onclick="rejectRequest('+r.id+')" style="background:#efefef;color:#262626;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">Decline</button></div>'
    }).join('')
  }
  if(supportData.sent.length>0){
    html+='<p style="font-size:11px;color:#8e8e8e;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:12px 16px 6px">Sent</p>'
    html+=supportData.sent.map(function(r){
      return '<div class="peer-row">'+avatar(r.to_user.username,'w-11 h-11')+'<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;color:#262626">'+escHtml(r.to_user.username)+'</div><div style="font-size:12px;color:#8e8e8e;margin-top:1px">Request pending...</div></div><span style="font-size:11px;color:#d97706;background:#fef3c7;padding:4px 10px;border-radius:20px;font-weight:500;flex-shrink:0">Pending</span></div>'
    }).join('')
  }
  if(!html)html='<div style="text-align:center;padding:48px 16px"><div style="font-size:32px;margin-bottom:8px">📭</div><p style="font-weight:600;color:#262626;margin-bottom:4px">All caught up</p><p style="font-size:13px;color:#8e8e8e">No pending requests</p></div>'
  container.innerHTML=html
}

function filterUsers(){
  const d=isDesktop(),q=(el(d?'d-find-search':'m-find-search')?el(d?'d-find-search':'m-find-search').value:'').toLowerCase()
  renderFindUsers(allUsers.filter(function(u){return u.username.toLowerCase().indexOf(q)!==-1}))
}

function renderFindUsers(users){
  const d=isDesktop(),container=el(d?'d-find-list':'m-find-list');if(!container)return
  if(users.length===0){container.innerHTML='<div style="text-align:center;padding:32px 0"><p style="font-size:13px;color:#8e8e8e">No users found</p></div>';return}
  container.innerHTML=users.map(function(u){
    const score=u.match_score!==undefined?u.match_score:null
    const scoreBadge=score!==null
      ?'<span style="font-size:10px;background:'+(score>=70?'#dcfce7':score>=50?'#fef3c7':'#f3f4f6')+';color:'+(score>=70?'#166534':score>=50?'#92400e':'#6b7280')+';padding:3px 8px;border-radius:20px;font-weight:600;flex-shrink:0">'+score+'% match</span>'
      :''
    return '<div class="peer-row">'+avatar(u.username,'w-11 h-11')+'<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;color:#262626">'+escHtml(u.username)+'</div><div style="font-size:12px;color:#8e8e8e;margin-top:1px">SoulCare member</div></div>'+scoreBadge+'<button onclick="sendRequest('+u.id+',\''+escHtml(u.username)+'\')" style="background:#0095F6;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;margin-left:6px">Follow</button></div>'
  }).join('')
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
  el(id)?el(id).classList.toggle('hidden'):null
  setTimeout(function(){document.addEventListener('click',function h(){if(el(id))el(id).classList.add('hidden');document.removeEventListener('click',h)})},0)
}
function closeMenu(id){if(el(id))el(id).classList.add('hidden')}

// CHAT
function openChat(connId,peerName){
  wsConnId=connId
  const d=isDesktop(),pfx=d?'d':'m'
  const colors=['#0095F6','#833AB4','#E1306C','#F77737','#405DE6','#5851DB']
  const bg=colors[peerName.charCodeAt(0)%colors.length]
  const av=el(pfx+'-chat-avatar')
  if(av){av.textContent=peerName.slice(0,2).toUpperCase();av.style.background=bg}
  if(el(pfx+'-chat-peer-name'))el(pfx+'-chat-peer-name').textContent=peerName
  if(el(pfx+'-chat-status')){el(pfx+'-chat-status').textContent='Connecting...';el(pfx+'-chat-status').style.color='#8e8e8e'}
  const dot=el(pfx+'-chat-online');if(dot)dot.classList.add('hidden')
  if(el(pfx+'-chat-messages'))el(pfx+'-chat-messages').innerHTML=''
  if(el(pfx+'-chat-input'))el(pfx+'-chat-input').value=''
  if(d){
    if(el('d-chat-placeholder'))el('d-chat-placeholder').classList.add('hidden')
    const win=el('d-chat-window');if(win){win.classList.remove('hidden');win.classList.add('flex')}
  }else showMobTab('chat')
  loadMessages(connId,pfx)
  connectWS(connId,pfx)
}

async function loadMessages(connId,pfx){
  const res=await api('GET','/chat/'+connId+'/messages/')
  if(!res||!res.ok)return
  const msgs=await res.json()
  msgs.forEach(function(m){appendMessage(m.content,m.sender_id===userId,fmtTime(m.created_at),false,pfx)})
  scrollChat(pfx)
}

function connectWS(connId,pfx){
  if(ws){ws.close();ws=null}
  const proto=location.protocol==='https:'?'wss':'ws'
  ws=new WebSocket(proto+'://'+location.host+'/ws/chat/'+connId+'/?token='+token)
  ws.onopen=function(){
    const s=el(pfx+'-chat-status');if(s){s.textContent='Online';s.style.color='#22c55e'}
    const dot=el(pfx+'-chat-online');if(dot)dot.classList.remove('hidden')
  }
  ws.onclose=function(){
    const s=el(pfx+'-chat-status');if(s){s.textContent='Disconnected';s.style.color='#8e8e8e'}
    const dot=el(pfx+'-chat-online');if(dot)dot.classList.add('hidden')
  }
  ws.onmessage=function(e){
    const data=JSON.parse(e.data)
    if(data.type==='typing'){if(data.sender_id!==userId)showTyping(data.is_typing,pfx);return}
    appendMessage(data.message,data.sender_id===userId,fmtTime(data.timestamp),true,pfx)
    scrollChat(pfx)
  }
}

function appendMessage(content,isSelf,time,animate,pfx){
  const container=el(pfx+'-chat-messages');if(!container)return
  const wrap=document.createElement('div')
  wrap.style.cssText='display:flex;flex-direction:column;align-items:'+(isSelf?'flex-end':'flex-start')
  if(animate)wrap.classList.add('fade-in')
  wrap.innerHTML='<div class="bubble '+(isSelf?'bubble-self':'bubble-other')+'">'+escHtml(content)+'</div><span style="font-size:10px;color:#8e8e8e;margin-top:3px;margin-left:4px;margin-right:4px">'+time+'</span>'
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
  const t=el('toast');t.textContent=msg;t.classList.remove('hidden')
  setTimeout(function(){t.classList.add('hidden')},3000)
}
function showErr(id,msg){const e=el(id);if(e){e.textContent=msg;e.classList.remove('hidden')}}
function showConfirm(msg,cb,danger){
  confirmCallback=cb
  el('confirm-msg').textContent=msg
  const ok=el('confirm-ok')
  ok.textContent=danger?'Confirm':'Yes'
  ok.style.cssText='flex:1;padding:12px;font-size:14px;font-weight:600;border:none;border-right:1px solid #dbdbdb;cursor:pointer;background:#fff;color:'+(danger?'#dc2626':'#0095F6')
  ok.onclick=async function(){closeConfirm();await confirmCallback()}
  el('confirm-modal').classList.remove('hidden')
}
function closeConfirm(){el('confirm-modal').classList.add('hidden')}

window.addEventListener('resize',function(){
  if(!token)return
  if(isDesktop()){el('mob').style.display='none';el('desk').classList.add('active');updateDeskUser();showDeskTab(currentTab)}
  else{el('desk').classList.remove('active');el('mob').style.display='flex';showMobTab(currentTab)}
})

// PROFILE — Anonymous cyberpunk avatar system
// 10 SVG avatars stored inline, zero CDN, zero backend, instant load
const AVATARS = [
  // 1 Blue neon hooded figure
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230a0a1a"/><circle cx="50" cy="50" r="48" fill="%230d0d2b" stroke="%2300d4ff" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23111133"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%2300d4ff" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23111133"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%2300d4ff" stroke-width="1" opacity=".6"/><ellipse cx="50" cy="38" rx="8" ry="5" fill="%2300d4ff" opacity=".15"/><line x1="38" y1="38" x2="62" y2="38" stroke="%2300d4ff" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%2300d4ff" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%2300d4ff" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%2300d4ff" opacity=".5"/><path d="M20 52 Q50 45 80 52" fill="none" stroke="%2300d4ff" stroke-width="1" opacity=".4"/><filter id="g1"><feGaussianBlur stdDeviation="2"/></filter><circle cx="43" cy="36" r="4" fill="%2300d4ff" opacity=".3" filter="url(%23g1)"/><circle cx="57" cy="36" r="4" fill="%2300d4ff" opacity=".3" filter="url(%23g1)"/></svg>',
  // 2 Purple neon mask
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230a0010"/><circle cx="50" cy="50" r="48" fill="%23100020" stroke="%23bf00ff" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23150025"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23bf00ff" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23150025"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23bf00ff" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23bf00ff" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23bf00ff" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23bf00ff" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23bf00ff" opacity=".5"/><path d="M20 52 Q50 45 80 52" fill="none" stroke="%23bf00ff" stroke-width="1" opacity=".4"/><filter id="g2"><feGaussianBlur stdDeviation="2.5"/></filter><circle cx="43" cy="36" r="5" fill="%23bf00ff" opacity=".35" filter="url(%23g2)"/><circle cx="57" cy="36" r="5" fill="%23bf00ff" opacity=".35" filter="url(%23g2)"/></svg>',
  // 3 Red neon
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23100000"/><circle cx="50" cy="50" r="48" fill="%231a0000" stroke="%23ff2020" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%231a0505"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23ff2020" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%231a0505"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23ff2020" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23ff2020" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23ff2020" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23ff2020" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23ff2020" opacity=".5"/><path d="M20 52 Q50 45 80 52" fill="none" stroke="%23ff2020" stroke-width="1" opacity=".4"/><filter id="g3"><feGaussianBlur stdDeviation="2"/></filter><circle cx="43" cy="36" r="4" fill="%23ff2020" opacity=".3" filter="url(%23g3)"/><circle cx="57" cy="36" r="4" fill="%23ff2020" opacity=".3" filter="url(%23g3)"/></svg>',
  // 4 Green circuit
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23001008"/><circle cx="50" cy="50" r="48" fill="%23001a0a" stroke="%2300ff88" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23001a0a"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%2300ff88" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23001a0a"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%2300ff88" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%2300ff88" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%2300ff88" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%2300ff88" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%2300ff88" opacity=".5"/><line x1="50" y1="54" x2="50" y2="62" stroke="%2300ff88" stroke-width="1" opacity=".5"/><line x1="40" y1="58" x2="60" y2="58" stroke="%2300ff88" stroke-width="1" opacity=".5"/><circle cx="50" cy="58" r="2" fill="%2300ff88" opacity=".6"/><filter id="g4"><feGaussianBlur stdDeviation="2"/></filter><circle cx="43" cy="36" r="4" fill="%2300ff88" opacity=".3" filter="url(%23g4)"/><circle cx="57" cy="36" r="4" fill="%2300ff88" opacity=".3" filter="url(%23g4)"/></svg>',
  // 5 Gold/amber
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230f0800"/><circle cx="50" cy="50" r="48" fill="%231a1000" stroke="%23ffaa00" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%231a1000"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23ffaa00" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%231a1000"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23ffaa00" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23ffaa00" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23ffaa00" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23ffaa00" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23ffaa00" opacity=".5"/><path d="M20 52 Q50 45 80 52" fill="none" stroke="%23ffaa00" stroke-width="1" opacity=".4"/><filter id="g5"><feGaussianBlur stdDeviation="2"/></filter><circle cx="43" cy="36" r="4" fill="%23ffaa00" opacity=".3" filter="url(%23g5)"/><circle cx="57" cy="36" r="4" fill="%23ffaa00" opacity=".3" filter="url(%23g5)"/></svg>',
  // 6 Cyan minimal
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23050f12"/><circle cx="50" cy="50" r="48" fill="%230a1a20" stroke="%2300e5ff" stroke-width="1" opacity=".5"/><circle cx="50" cy="36" r="13" fill="%230a1a20" stroke="%2300e5ff" stroke-width="1.2" opacity=".8"/><rect x="32" y="52" width="36" height="26" rx="10" fill="%230a1a20" stroke="%2300e5ff" stroke-width="1.2" opacity=".7"/><circle cx="44" cy="35" r="3" fill="%2300e5ff" opacity=".8"/><circle cx="56" cy="35" r="3" fill="%2300e5ff" opacity=".8"/><rect x="45" y="40" width="10" height="1.5" rx="1" fill="%2300e5ff" opacity=".6"/><filter id="g6"><feGaussianBlur stdDeviation="3"/></filter><circle cx="44" cy="35" r="6" fill="%2300e5ff" opacity=".25" filter="url(%23g6)"/><circle cx="56" cy="35" r="6" fill="%2300e5ff" opacity=".25" filter="url(%23g6)"/></svg>',
  // 7 Pink/magenta
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23100010"/><circle cx="50" cy="50" r="48" fill="%231a001a" stroke="%23ff00cc" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%231a001a"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23ff00cc" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%231a001a"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23ff00cc" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23ff00cc" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23ff00cc" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23ff00cc" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23ff00cc" opacity=".5"/><filter id="g7"><feGaussianBlur stdDeviation="2.5"/></filter><circle cx="43" cy="36" r="5" fill="%23ff00cc" opacity=".3" filter="url(%23g7)"/><circle cx="57" cy="36" r="5" fill="%23ff00cc" opacity=".3" filter="url(%23g7)"/></svg>',
  // 8 White/silver minimal
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23080808"/><circle cx="50" cy="50" r="48" fill="%23111111" stroke="%23cccccc" stroke-width="1" opacity=".5"/><circle cx="50" cy="36" r="13" fill="%23111111" stroke="%23cccccc" stroke-width="1.2" opacity=".7"/><rect x="32" y="52" width="36" height="26" rx="10" fill="%23111111" stroke="%23cccccc" stroke-width="1.2" opacity=".6"/><circle cx="44" cy="35" r="3" fill="%23e0e0e0" opacity=".8"/><circle cx="56" cy="35" r="3" fill="%23e0e0e0" opacity=".8"/><rect x="45" y="40" width="10" height="1.5" rx="1" fill="%23cccccc" opacity=".6"/><line x1="36" y1="58" x2="44" y2="58" stroke="%23cccccc" stroke-width="1" opacity=".4"/><line x1="56" y1="58" x2="64" y2="58" stroke="%23cccccc" stroke-width="1" opacity=".4"/></svg>',
  // 9 Orange/fire
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23100500"/><circle cx="50" cy="50" r="48" fill="%231a0800" stroke="%23ff6600" stroke-width="1.5" opacity=".6"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%231a0800"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%23ff6600" stroke-width="1" opacity=".8"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%231a0800"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%23ff6600" stroke-width="1" opacity=".6"/><line x1="38" y1="38" x2="62" y2="38" stroke="%23ff6600" stroke-width="1.5" opacity=".9"/><circle cx="43" cy="36" r="2.5" fill="%23ff6600" opacity=".9"/><circle cx="57" cy="36" r="2.5" fill="%23ff6600" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%23ff6600" opacity=".5"/><filter id="g9"><feGaussianBlur stdDeviation="2"/></filter><circle cx="43" cy="36" r="4" fill="%23ff6600" opacity=".35" filter="url(%23g9)"/><circle cx="57" cy="36" r="4" fill="%23ff6600" opacity=".35" filter="url(%23g9)"/></svg>',
  // 10 Deep blue dual-tone
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23000818"/><circle cx="50" cy="50" r="48" fill="%23001030" stroke="%230066ff" stroke-width="1.5" opacity=".7"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="%23001030"/><ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="%230066ff" stroke-width="1.2" opacity=".9"/><rect x="30" y="52" width="40" height="28" rx="8" fill="%23001030"/><rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="%230066ff" stroke-width="1" opacity=".7"/><line x1="38" y1="38" x2="62" y2="38" stroke="%230066ff" stroke-width="2" opacity=".9"/><circle cx="43" cy="36" r="3" fill="%230066ff" opacity=".9"/><circle cx="57" cy="36" r="3" fill="%230066ff" opacity=".9"/><rect x="44" y="41" width="12" height="2" rx="1" fill="%230066ff" opacity=".6"/><line x1="36" y1="56" x2="64" y2="56" stroke="%230066ff" stroke-width="1" opacity=".4"/><line x1="40" y1="62" x2="60" y2="62" stroke="%230066ff" stroke-width="1" opacity=".3"/><filter id="g10"><feGaussianBlur stdDeviation="2.5"/></filter><circle cx="43" cy="36" r="5" fill="%230066ff" opacity=".4" filter="url(%23g10)"/><circle cx="57" cy="36" r="5" fill="%230066ff" opacity=".4" filter="url(%23g10)"/></svg>',
]

const AVATAR_LABELS=['Blue Neon','Purple Neon','Red Neon','Green Circuit','Gold Mask','Cyan Minimal','Magenta','Silver','Fire','Deep Blue']

function getSelectedAvatar(){return localStorage.getItem('sc_av_'+username)||''}

function applyProfilePic(){
  const av=getSelectedAvatar()
  const init=(username||'?').slice(0,2).toUpperCase()
  // Helper: set element to avatar or initials
  function setAv(id,size){
    const e=el(id);if(!e)return
    if(av){e.innerHTML='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';e.style.background='none'}
    else{e.innerHTML='<span>'+init+'</span>';e.style.background='linear-gradient(45deg,#405DE6,#E1306C,#F77737)'}
  }
  setAv('m-dash-av');setAv('m-dash-av2');setAv('d-dash-av-inner')
  // Nav avatar
  const navAv=el('nav-profile-av')
  if(navAv){
    if(av){navAv.innerHTML='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover"/>';navAv.style.background='none'}
    else{navAv.textContent=init;navAv.style.background='linear-gradient(45deg,#405DE6,#E1306C,#F77737)'}
  }
  // Profile page large avatar
  const pDisp=el('profile-avatar-display'),pInit=el('profile-avatar-initials')
  if(pDisp){
    if(av){pDisp.innerHTML='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover"/><button onclick="openAvatarPicker()" style="position:absolute;bottom:0;right:0;width:24px;height:24px;background:#0095F6;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>';pDisp.style.background='none'}
    else{pDisp.innerHTML='<span id="profile-avatar-initials" style="font-size:28px;font-weight:700">'+init+'</span><button onclick="openAvatarPicker()" style="position:absolute;bottom:0;right:0;width:24px;height:24px;background:#0095F6;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>';pDisp.style.background='linear-gradient(45deg,#405DE6,#E1306C,#F77737)'}
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
    return '<div onclick="selectAvatar('+i+')" style="cursor:pointer;border-radius:12px;overflow:hidden;border:2px solid '+(selected?'#0095F6':'transparent')+';transition:border-color .15s" title="'+AVATAR_LABELS[i]+'"><img src="'+src+'" style="width:100%;aspect-ratio:1;display:block"/></div>'
  }).join('')
  el('avatar-picker').classList.remove('hidden')
  document.body.style.overflow='hidden'
}

function closeAvatarPicker(){
  el('avatar-picker').classList.add('hidden')
  document.body.style.overflow=''
}

function selectAvatar(index){
  localStorage.setItem('sc_av_'+username,AVATARS[index])
  applyProfilePic()
  closeAvatarPicker()
  showToast('Avatar updated — '+AVATAR_LABELS[index])
}

function removeAvatar(){
  showConfirm('Remove your avatar?',function(){
    localStorage.removeItem('sc_av_'+username)
    applyProfilePic()
    showToast('Avatar removed')
  },true)
}

// Keep old name for backward compat
function handleProfilePicUpload(){}
function removeProfilePic(){removeAvatar()}

// ── Custom Avatar Builder ─────────────────────────────────────────────────
var _avOpts = { neon:'00d4ff', bg:'0a0a1a', mask:'visor' }

function switchAvatarTab(tab){
  var isPresets = tab==='presets'
  el('avatar-grid').classList.toggle('hidden', !isPresets)
  el('avatar-builder').classList.toggle('hidden', isPresets)
  var tabPresets=el('av-tab-presets'), tabCustom=el('av-tab-custom')
  if(tabPresets){
    tabPresets.style.background = isPresets ? 'var(--coral)' : 'var(--clue-card)'
    tabPresets.style.color = isPresets ? '#fff' : 'var(--text-2)'
    tabPresets.style.border = isPresets ? 'none' : '1.5px solid var(--clue-border2)'
  }
  if(tabCustom){
    tabCustom.style.background = !isPresets ? 'var(--coral)' : 'var(--clue-card)'
    tabCustom.style.color = !isPresets ? '#fff' : 'var(--text-2)'
    tabCustom.style.border = !isPresets ? 'none' : '1.5px solid var(--clue-border2)'
  }
  if(!isPresets) renderAvatarPreview()
}

function setAvatarOpt(key, val){
  _avOpts[key] = val
  // Highlight selected option
  document.querySelectorAll('.av-opt[data-key="'+key+'"]').forEach(function(b){
    var isSelected = b.getAttribute('data-val') === val
    b.style.borderColor = isSelected ? '#'+val : 'transparent'
    b.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)'
    b.style.boxShadow = isSelected ? '0 0 8px #'+val : 'none'
  })
  renderAvatarPreview()
}

function buildCustomSVG(neon, bg, mask){
  var n = '%23'+neon  // URL-encode #
  var b = '%23'+bg
  var maskSVG = ''

  if(mask === 'visor'){
    maskSVG = '<line x1="38" y1="38" x2="62" y2="38" stroke="'+n+'" stroke-width="1.5" opacity=".9"/>'
            + '<circle cx="43" cy="36" r="2.5" fill="'+n+'" opacity=".9"/>'
            + '<circle cx="57" cy="36" r="2.5" fill="'+n+'" opacity=".9"/>'
            + '<rect x="44" y="41" width="12" height="2" rx="1" fill="'+n+'" opacity=".5"/>'
            + '<filter id="gv"><feGaussianBlur stdDeviation="2"/></filter>'
            + '<circle cx="43" cy="36" r="4" fill="'+n+'" opacity=".3" filter="url(%23gv)"/>'
            + '<circle cx="57" cy="36" r="4" fill="'+n+'" opacity=".3" filter="url(%23gv)"/>'
  } else if(mask === 'eyes'){
    maskSVG = '<rect x="36" y="33" width="10" height="6" rx="3" fill="'+n+'" opacity=".9"/>'
            + '<rect x="54" y="33" width="10" height="6" rx="3" fill="'+n+'" opacity=".9"/>'
            + '<rect x="44" y="41" width="12" height="2" rx="1" fill="'+n+'" opacity=".4"/>'
            + '<filter id="ge"><feGaussianBlur stdDeviation="2.5"/></filter>'
            + '<rect x="36" y="33" width="10" height="6" rx="3" fill="'+n+'" opacity=".3" filter="url(%23ge)"/>'
            + '<rect x="54" y="33" width="10" height="6" rx="3" fill="'+n+'" opacity=".3" filter="url(%23ge)"/>'
  } else if(mask === 'circuit'){
    maskSVG = '<line x1="38" y1="38" x2="62" y2="38" stroke="'+n+'" stroke-width="1.5" opacity=".9"/>'
            + '<circle cx="43" cy="36" r="2.5" fill="'+n+'" opacity=".9"/>'
            + '<circle cx="57" cy="36" r="2.5" fill="'+n+'" opacity=".9"/>'
            + '<line x1="50" y1="54" x2="50" y2="62" stroke="'+n+'" stroke-width="1" opacity=".5"/>'
            + '<line x1="40" y1="58" x2="60" y2="58" stroke="'+n+'" stroke-width="1" opacity=".5"/>'
            + '<circle cx="50" cy="58" r="2" fill="'+n+'" opacity=".6"/>'
            + '<line x1="36" y1="44" x2="30" y2="44" stroke="'+n+'" stroke-width="1" opacity=".4"/>'
            + '<line x1="64" y1="44" x2="70" y2="44" stroke="'+n+'" stroke-width="1" opacity=".4"/>'
            + '<circle cx="30" cy="44" r="1.5" fill="'+n+'" opacity=".5"/>'
            + '<circle cx="70" cy="44" r="1.5" fill="'+n+'" opacity=".5"/>'
  } else { // minimal
    maskSVG = '<circle cx="44" cy="36" r="3" fill="'+n+'" opacity=".8"/>'
            + '<circle cx="56" cy="36" r="3" fill="'+n+'" opacity=".8"/>'
            + '<rect x="45" y="41" width="10" height="1.5" rx="1" fill="'+n+'" opacity=".6"/>'
            + '<filter id="gm"><feGaussianBlur stdDeviation="3"/></filter>'
            + '<circle cx="44" cy="36" r="6" fill="'+n+'" opacity=".25" filter="url(%23gm)"/>'
            + '<circle cx="56" cy="36" r="6" fill="'+n+'" opacity=".25" filter="url(%23gm)"/>'
  }

  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    + '<rect width="100" height="100" fill="'+b+'"/>'
    + '<circle cx="50" cy="50" r="48" fill="'+b+'" stroke="'+n+'" stroke-width="1.5" opacity=".6"/>'
    + '<ellipse cx="50" cy="38" rx="14" ry="16" fill="'+b+'"/>'
    + '<ellipse cx="50" cy="38" rx="14" ry="16" fill="none" stroke="'+n+'" stroke-width="1" opacity=".8"/>'
    + '<rect x="30" y="52" width="40" height="28" rx="8" fill="'+b+'"/>'
    + '<rect x="30" y="52" width="40" height="28" rx="8" fill="none" stroke="'+n+'" stroke-width="1" opacity=".6"/>'
    + '<path d="M20 52 Q50 45 80 52" fill="none" stroke="'+n+'" stroke-width="1" opacity=".3"/>'
    + maskSVG
    + '</svg>'
}

function renderAvatarPreview(){
  var svg = buildCustomSVG(_avOpts.neon, _avOpts.bg, _avOpts.mask)
  var prev = el('av-preview')
  if(prev) prev.innerHTML = '<img src="'+svg+'" style="width:100%;height:100%;object-fit:cover"/>'
}

function saveCustomAvatar(){
  var svg = buildCustomSVG(_avOpts.neon, _avOpts.bg, _avOpts.mask)
  localStorage.setItem('sc_av_'+username, svg)
  applyProfilePic()
  closeAvatarPicker()
  showToast('Custom avatar saved!')
}

// Override openAvatarPicker to init builder state
var _origOpenAvatarPicker = openAvatarPicker
function openAvatarPicker(){
  _origOpenAvatarPicker()
  // Reset to presets tab
  switchAvatarTab('presets')
  // Init builder option highlights
  Object.keys(_avOpts).forEach(function(k){
    setAvatarOpt(k, _avOpts[k])
  })
}
