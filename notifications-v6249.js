/* VIMAK CRM V6.24.9 — Central de Notificações de Leads */
let vimakNotifState={
  rows:[],
  channel:null,
  startedFor:null,
  polling:null,
  latestId:null
};

function vimakNotifEsc(v){return esc(v)}
function vimakNotifUnread(){return vimakNotifState.rows.filter(x=>!x.read_at).length}

function updateNotificationBadge(){
  const b=document.getElementById("notificationCount");
  const dot=document.getElementById("notificationDot");
  const n=vimakNotifUnread();
  if(b){
    b.textContent=n>99?"99+":String(n);
    b.hidden=n===0;
  }
  if(dot)dot.classList.toggle("active",n>0);
}

async function loadCrmNotifications(){
  if(!profile?.company_id)return;
  const {data,error}=await sb.from("crm_notifications")
    .select("*")
    .eq("company_id",profile.company_id)
    .order("created_at",{ascending:false})
    .limit(50);
  if(error){
    console.warn("[Notificações] tabela ainda não disponível:",error.message);
    return
  }
  vimakNotifState.rows=data||[];
  updateNotificationBadge()
}

function notificationTime(v){
  const d=new Date(v);
  if(isNaN(d))return "";
  return d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})
}

function notificationIcon(x){
  return x.severity==="hot"?"🔥":x.type==="new_lead"?"◎":"◇"
}

async function markNotificationRead(id,openLead=false){
  const n=vimakNotifState.rows.find(x=>x.id===id);
  if(n&&!n.read_at){
    const now=new Date().toISOString();
    const {error}=await sb.from("crm_notifications").update({read_at:now}).eq("id",id);
    if(!error)n.read_at=now
  }
  updateNotificationBadge();
  if(openLead&&n?.lead_id){
    closeModal();
    await refreshCore();
    page="leads";location.hash="leads";render();
    setTimeout(()=>viewLead(n.lead_id),250)
  }else if(document.getElementById("notificationList")){
    renderNotificationList()
  }
}

async function markAllNotificationsRead(){
  if(!profile?.company_id)return;
  const now=new Date().toISOString();
  const {error}=await sb.from("crm_notifications")
    .update({read_at:now})
    .eq("company_id",profile.company_id)
    .is("read_at",null);
  if(error)return toast("Erro: "+error.message);
  vimakNotifState.rows.forEach(x=>x.read_at=x.read_at||now);
  updateNotificationBadge();
  renderNotificationList();
  toast("Notificações marcadas como lidas")
}

function renderNotificationList(){
  const box=document.getElementById("notificationList");if(!box)return;
  box.innerHTML=vimakNotifState.rows.length?vimakNotifState.rows.map(x=>`
   <button class="notif-row ${x.read_at?"":"unread"}" onclick="markNotificationRead('${x.id}',true)">
    <span class="notif-ico">${notificationIcon(x)}</span>
    <span class="notif-copy"><b>${vimakNotifEsc(x.title||"Novo lead")}</b><em>${vimakNotifEsc(x.message||"")}</em><small>${notificationTime(x.created_at)}</small></span>
    ${x.whatsapp_status?`<span class="notif-wa ${x.whatsapp_status==='sent'?'ok':'warn'}">WA ${vimakNotifEsc(x.whatsapp_status)}</span>`:""}
   </button>`).join(""):`<div class="empty">Nenhuma notificação.</div>`
}

function openNotificationCenter(){
  openModal("Central de Notificações",`
   <div class="notif-center">
    <div class="notif-head">
      <div><span>NOVOS LEADS</span><h3>${vimakNotifUnread()} não lida(s)</h3><p>Alertas gerados automaticamente quando o formulário público é enviado.</p></div>
      <button class="btn" onclick="markAllNotificationsRead()">Marcar todas como lidas</button>
    </div>
    <div id="notificationList" class="notif-list"></div>
   </div>`,"");
  renderNotificationList()
}

function dismissLeadAlert(id){
  document.getElementById("leadAlert-"+id)?.remove()
}

function showLeadAlert(n){
  let stack=document.getElementById("leadAlertStack");
  if(!stack){
    stack=document.createElement("div");
    stack.id="leadAlertStack";
    stack.className="lead-alert-stack";
    document.body.appendChild(stack)
  }
  if(document.getElementById("leadAlert-"+n.id))return;
  const card=document.createElement("div");
  card.id="leadAlert-"+n.id;
  card.className="lead-alert-card";
  card.innerHTML=`
    <button class="lead-alert-close" onclick="dismissLeadAlert('${n.id}')">×</button>
    <span class="lead-alert-kicker">🔔 NOVO LEAD VIMAK</span>
    <b>${vimakNotifEsc(n.title||"Novo lead recebido")}</b>
    <p>${vimakNotifEsc(n.message||"Um novo cliente preencheu o formulário.")}</p>
    <div>
      <button class="btn gold sm" onclick="markNotificationRead('${n.id}',true);dismissLeadAlert('${n.id}')">Abrir lead</button>
      <button class="btn sm" onclick="markNotificationRead('${n.id}',false);dismissLeadAlert('${n.id}')">Marcar como lida</button>
    </div>`;
  stack.appendChild(card);
  toast("🔔 Novo lead recebido");
  setTimeout(()=>dismissLeadAlert(n.id),20000)
}

function receiveLeadNotification(n){
  if(vimakNotifState.rows.some(x=>x.id===n.id))return;
  vimakNotifState.rows.unshift(n);
  vimakNotifState.rows=vimakNotifState.rows.slice(0,50);
  updateNotificationBadge();
  showLeadAlert(n)
}

async function startLeadNotificationCenter(){
  if(!session||!profile?.company_id)return;
  if(vimakNotifState.startedFor===profile.company_id)return;
  vimakNotifState.startedFor=profile.company_id;
  await loadCrmNotifications();

  if(vimakNotifState.channel)sb.removeChannel(vimakNotifState.channel);
  vimakNotifState.channel=sb.channel("vimak-lead-alerts-"+profile.company_id)
    .on("postgres_changes",{
      event:"INSERT",
      schema:"public",
      table:"crm_notifications",
      filter:`company_id=eq.${profile.company_id}`
    },payload=>receiveLeadNotification(payload.new))
    .subscribe();

  if(vimakNotifState.polling)clearInterval(vimakNotifState.polling);
  vimakNotifState.polling=setInterval(async()=>{
    if(!session||!profile?.company_id)return;
    const prev=new Set(vimakNotifState.rows.map(x=>x.id));
    const {data}=await sb.from("crm_notifications")
      .select("*")
      .eq("company_id",profile.company_id)
      .order("created_at",{ascending:false})
      .limit(20);
    (data||[]).reverse().forEach(n=>{if(!prev.has(n.id))receiveLeadNotification(n)});
  },30000)
}

setInterval(()=>{
  if(session&&profile?.company_id)startLeadNotificationCenter()
},1500);
