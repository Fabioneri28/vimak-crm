
const NAV=[
["VISÃO GERAL",[["dashboard","⌂","Dashboard"],["leads","◎","Leads & CRM"]]],
["EMPRESA",[["empresa","◈","Configurações"],["usuarios","♙","Usuários"],["auditoria","◌","Auditoria"],["planos","◆","Assinatura / Planos"]]],
["CADASTROS",[["clientes","♙","Clientes"],["fornecedores","▣","Fornecedores"],["parceiros","◇","Parceiros"],["posvenda","✓","Pós-venda / Garantia"]]],
["PROPOSTAS",[["insumos","▥","Insumos"],["propostas","▤","Propostas"],["modelos","▥","Modelos de Proposta"],["medicoes","⌗","Medições"],["compras","▰","Compras"]]],
["DOCUMENTOS",[["templates","▤","Templates"]]],
["PRODUÇÃO",[["kanban","▦","Kanban"],["corte","▥","Planos de Corte"],["sobras","▱","Estoque de Sobras"]]],
["INTEGRAÇÕES",[["cortecloud","⌁","Integração • CorteCloud"]]],
["MONTAGEM",[["equipes","♧","Equipes de Montagem"],["agenda","◷","Agenda de Montagem"]]],
["FINANCEIRO",[["financeiro","◉","Financeiro"],["maquininhas","▤","Maquininhas & Taxas"]]]
];
const TITLES=Object.fromEntries(NAV.flatMap(g=>g[1].map(i=>[i[0],i[2]])));
let page=location.hash.slice(1)||"dashboard";
let session=null, profile=null, company=null, cache={clients:[],leads:[],proposals:[],proposalItems:[],proposalModels:[],measurements:[],purchaseOrders:[],purchaseOrderItems:[],documentTemplates:[],productionProjects:[],cuttingPlans:[],sheetRemnants:[],integrations:[],installationTeams:[],installationSchedule:[],suppliers:[],partners:[],afterSales:[],inputs:[]};

const sb = supabase.createClient(
  window.VIMAK_CONFIG.supabaseUrl,
  window.VIMAK_CONFIG.supabasePublishableKey
);

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2000)}
function toggleMenu(){sidebar.classList.toggle("open")}
function openModal(title,body,action){modal.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}<div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button>${action?`<button class="btn gold" onclick="${action}">Salvar</button>`:""}</div>`;modalWrap.classList.add("open")}
function closeModal(){modalWrap.classList.remove("open");modal.classList.remove("proposal-modal")}
function shell(title,sub,actions="",body=""){return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}</div></div>${body}`}
function simpleTable(title,sub,button,headers,rows){return shell(title,sub,button,`<div class="filters"><div class="field"><label>Buscar</label><input placeholder="Digite para pesquisar..." oninput="filterTable(this.value)"></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody id="rows">${rows.length?rows.join(""):`<tr><td class="empty" colspan="${headers.length}">Nenhum registro cadastrado.</td></tr>`}</tbody></table></div></div>`)}
function filterTable(q){q=q.toLowerCase();document.querySelectorAll("#rows tr").forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?"":"none")}

async function init(){
  const {data:{session:s}} = await sb.auth.getSession();
  if(s){
    session=s;
    const ok=await loadIdentity();
    if(ok) showApp(); else showAuth();
  } else showAuth();

  sb.auth.onAuthStateChange(async (_event,s2)=>{
    session=s2;
    if(session){
      const ok=await loadIdentity();
      if(ok) showApp(); else showAuth();
    } else showAuth();
  });
}
function showAuth(){authScreen.classList.remove("hidden");appShell.classList.add("hidden")}
function showApp(){authScreen.classList.add("hidden");appShell.classList.remove("hidden");syncChrome();render()}
async function login(e){
  e.preventDefault();

  const emailEl = document.getElementById("loginEmail");
  const passEl = document.getElementById("loginPassword");
  const form = document.getElementById("loginForm");
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById("loginStatus");

  const email = emailEl.value.trim();
  const password = passEl.value;

  if(!email || !password){
    status.style.display = "grid";
    status.innerHTML = "<b>Preencha e-mail e senha.</b>";
    return;
  }

  button.disabled = true;
  button.textContent = "Entrando...";
  status.style.display = "grid";
  status.innerHTML = "<span>Conectando ao Supabase...</span>";

  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password});

    if(error){
      status.innerHTML = `<b>Não foi possível entrar</b><span>${esc(error.message)}</span>`;
      return;
    }

    if(!data.session){
      status.innerHTML = "<b>Login não concluído</b><span>O Supabase não retornou uma sessão válida.</span>";
      return;
    }

    status.innerHTML = "<b>Login realizado.</b><span>Carregando sua empresa...</span>";
    toast("Login realizado com sucesso");
  }catch(err){
    console.error(err);
    status.innerHTML = `<b>Erro de conexão</b><span>${esc(err.message || "Falha inesperada")}</span>`;
  }finally{
    button.disabled = false;
    button.textContent = "Entrar no VIMAK CRM";
  }
}
async function logout(){await sb.auth.signOut();toast("Sessão encerrada")}
async function loadIdentity(){
  const uid=session.user.id;

  let {data:p,error}=await sb.from("profiles").select("*").eq("id",uid).single();
  if(error || !p){
    console.error(error);
    profile=null; company=null;
    await sb.auth.signOut();
    const status=document.getElementById("loginStatus");
    if(status){
      status.style.display="grid";
      status.innerHTML="<b>Perfil não encontrado</b><span>Seu login existe no Supabase Auth, mas ainda não está vinculado a uma empresa no CRM.</span>";
    }
    return false;
  }

  profile=p;

  let {data:c,error:companyError}=await sb.from("companies").select("*").eq("id",p.company_id).single();
  if(companyError || !c){
    console.error(companyError);
    profile=null; company=null;
    await sb.auth.signOut();
    const status=document.getElementById("loginStatus");
    if(status){
      status.style.display="grid";
      status.innerHTML="<b>Empresa não encontrada</b><span>O perfil existe, mas a empresa vinculada não foi carregada.</span>";
    }
    return false;
  }

  company=c;
  return true;
}
function can(route){
  if(!profile)return false;
  if(profile.role==="Administrador")return true;
  const perms=Array.isArray(profile.permissions)?profile.permissions:[];
  if(perms.includes("*"))return true;
  const map={dashboard:"dashboard",leads:"leads",clientes:"clientes",propostas:"propostas",kanban:"producao",corte:"producao",sobras:"producao",financeiro:"financeiro",maquininhas:"financeiro",empresa:"empresa",usuarios:"usuarios",auditoria:"empresa",planos:"empresa",fornecedores:"cadastros",parceiros:"cadastros",posvenda:"cadastros",insumos:"cadastros",modelos:"propostas",medicoes:"propostas",compras:"propostas",templates:"documentos",cortecloud:"integracoes",equipes:"montagem",agenda:"montagem"};
  return perms.includes(map[route]||route);
}
function syncChrome(){
  if(!profile||!company)return;
  tenantName.textContent=company.name;tenantPlan.textContent="Plano "+(company.plan||"trial");
  tenantInitial.textContent=company.name.charAt(0).toUpperCase();topCompany.textContent=company.name;
  userName.textContent=profile.name;userRole.textContent=profile.role;
  userInitials.textContent=profile.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  sideBrand.textContent=(company.name.split(" ")[0]||"VIMAK").toUpperCase();
  if(company.logo_url)sideLogo.innerHTML=`<img src="${company.logo_url}" style="max-width:100%;max-height:100%;border-radius:8px">`;
}
function buildNav(){nav.innerHTML=NAV.map(g=>`<div class="nav-title">${g[0]}</div>${g[1].filter(i=>can(i[0])).map(i=>`<button class="nav-btn ${page===i[0]?"active":""}" onclick="go('${i[0]}')"><span>${i[1]}</span>${i[2]}</button>`).join("")}`).join("")}
function go(p){if(!can(p))return toast("Seu perfil não possui acesso");page=p;location.hash=p;render();sidebar.classList.remove("open");scrollTo(0,0)}
async function refreshCore(){
  const [c,l,p,pi,pm,m,po,poi,dt,pp,cp,sr,integ,it,isched,s,pa,as,i]=await Promise.all([
    sb.from("clients").select("*").order("created_at",{ascending:false}),
    sb.from("leads").select("*").order("created_at",{ascending:false}),
    sb.from("proposals").select("*").order("created_at",{ascending:false}),
    sb.from("proposal_items").select("*").order("created_at",{ascending:true}),
    sb.from("proposal_models").select("*").order("created_at",{ascending:false}),
    sb.from("measurements").select("*").order("measured_at",{ascending:false}),
    sb.from("purchase_orders").select("*").order("ordered_at",{ascending:false}),
    sb.from("purchase_order_items").select("*").order("created_at",{ascending:true}),
    sb.from("document_templates").select("*").order("created_at",{ascending:false}),
    sb.from("production_projects").select("*").order("created_at",{ascending:false}),
    sb.from("cutting_plans").select("*").order("created_at",{ascending:false}),
    sb.from("sheet_remnants").select("*").order("created_at",{ascending:false}),
    sb.from("integrations").select("*").order("created_at",{ascending:false}),
    sb.from("installation_teams").select("*").order("created_at",{ascending:false}),
    sb.from("installation_schedule").select("*").order("starts_at",{ascending:false}),
    sb.from("suppliers").select("*").order("created_at",{ascending:false}),
    sb.from("partners").select("*").order("created_at",{ascending:false}),
    sb.from("after_sales_tickets").select("*").order("opened_at",{ascending:false}),
    sb.from("inputs").select("*").order("created_at",{ascending:false})
  ]);
  cache.clients=c.data||[];
  cache.leads=l.data||[];
  cache.proposals=p.data||[];
  cache.proposalItems=pi.data||[];
  cache.proposalModels=pm.data||[];
  cache.measurements=m.data||[];
  cache.purchaseOrders=po.data||[];
  cache.purchaseOrderItems=poi.data||[];
  cache.documentTemplates=dt.data||[];
  cache.productionProjects=pp.data||[];
  cache.cuttingPlans=cp.data||[];
  cache.sheetRemnants=sr.data||[];
  cache.integrations=integ.data||[];
  cache.installationTeams=it.data||[];
  cache.installationSchedule=isched.data||[];
  cache.suppliers=s.data||[];
  cache.partners=pa.data||[];
  cache.afterSales=as.data||[];
  cache.inputs=i.data||[];
}
async function render(){
  if(!session||!profile||!company)return;
  if(!can(page)){page="dashboard";location.hash="dashboard"}
  buildNav();crumb.textContent=TITLES[page]||"Dashboard";
  content.innerHTML=`<div class="card pad">Carregando dados da nuvem...</div>`;
  await refreshCore();
  content.innerHTML=(VIEWS[page]||dashboard)();
}
function dashboard(){
 const total=cache.proposals.reduce((a,x)=>a+Number(x.total||0),0);
 return shell("Dashboard","Dados reais de "+company.name,`<button class="btn gold" onclick="addLead()">+ Novo Lead</button>`,
 `<div class="grid g4"><div class="card kpi"><label>Faturamento potencial</label><strong class="goldtxt">${money(total)}</strong></div><div class="card kpi"><label>Propostas</label><strong>${cache.proposals.length}</strong></div><div class="card kpi"><label>Leads</label><strong>${cache.leads.length}</strong></div><div class="card kpi"><label>Clientes</label><strong>${cache.clients.length}</strong></div></div><div class="section">Status da nuvem</div><div class="notice">Supabase conectado • PostgreSQL ativo • Auth real • RLS multiempresa ativo</div>`);
}
function leads(){
 const stages=["Entrada","Qualificação","Construção de Valor","Pré-compromisso","Apresentação","Fechamento","Pós-venda"];
 return shell("Leads & CRM","Pipeline real salvo no Supabase",`<button class="btn gold" onclick="addLead()">+ Novo Lead</button>`,
 `<div class="pipeline">${stages.map(s=>`<div class="stage"><div class="stage-head">${s}<b class="goldtxt">${cache.leads.filter(x=>x.stage===s).length}</b></div>${cache.leads.filter(x=>x.stage===s).map(x=>`<div class="deal"><b>${esc(x.name)}</b><span>${esc(x.whatsapp||"")}</span><span class="goldtxt">${money(x.estimated_investment)}</span><span>Score ${x.score||0}</span></div>`).join("")||`<div class="empty">Sem leads</div>`}</div>`).join("")}</div>`);
}
function addLead(){openModal("Novo Lead",`<div class="form-grid"><div class="field"><label>Nome</label><input id="ln"></div><div class="field"><label>WhatsApp</label><input id="lt"></div><div class="field"><label>Ambiente</label><input id="la"></div><div class="field"><label>Investimento</label><input id="lv" type="number"></div><div class="field"><label>Etapa</label><select id="le">${["Entrada","Qualificação","Construção de Valor","Pré-compromisso","Apresentação","Fechamento","Pós-venda"].map(x=>`<option>${x}</option>`).join("")}</select></div><div class="field"><label>Score</label><input id="ls" type="number" value="50"></div></div>`,`saveLead()`)}
async function saveLead(){
 if(!ln.value.trim())return toast("Informe o nome");
 const {error}=await sb.from("leads").insert({company_id:profile.company_id,name:ln.value.trim(),whatsapp:lt.value,environments:la.value?[la.value]:[],estimated_investment:Number(lv.value||0),stage:le.value,score:Number(ls.value||50),created_by:session.user.id});
 if(error)return toast("Erro: "+error.message);
 closeModal();toast("Lead salvo na nuvem");render();
}
function clientById(id){return cache.clients.find(x=>x.id===id)}
function clientWhatsApp(v){return String(v||"").replace(/\D/g,"")}
function clientForm(x={}){
 return `<div class="form-grid">
 <div class="field full"><label>Nome / Razão Social *</label><input id="cn" value="${esc(x.name||"")}"></div>
 <div class="field"><label>Tipo</label><select id="ct"><option ${x.type==="Pessoa Física"?"selected":""}>Pessoa Física</option><option ${x.type==="Pessoa Jurídica"?"selected":""}>Pessoa Jurídica</option></select></div>
 <div class="field"><label>CPF / CNPJ</label><input id="cd" value="${esc(x.document||"")}"></div>
 <div class="field"><label>Telefone</label><input id="cp" value="${esc(x.phone||"")}"></div>
 <div class="field"><label>WhatsApp</label><input id="cw" value="${esc(x.whatsapp||"")}"></div>
 <div class="field full"><label>E-mail</label><input id="ce" type="email" value="${esc(x.email||"")}"></div>
 <div class="field"><label>Cidade</label><input id="cc" value="${esc(x.city||"")}"></div>
 <div class="field"><label>Bairro</label><input id="cb" value="${esc(x.neighborhood||"")}"></div>
 <div class="field"><label>Status</label><select id="cs"><option ${x.status==="Ativo"?"selected":""}>Ativo</option><option ${x.status==="Inativo"?"selected":""}>Inativo</option><option ${x.status==="Prospect"?"selected":""}>Prospect</option></select></div>
 <div class="field full"><label>Observações</label><textarea id="cnotes" rows="4">${esc(x.notes||"")}</textarea></div>
 </div>`;
}
function clientes(){
 const ativos=cache.clients.filter(x=>(x.status||"Ativo")==="Ativo").length;
 const cidades=new Set(cache.clients.map(x=>x.city).filter(Boolean)).size;
 const novos=cache.clients.filter(x=>{const d=new Date(x.created_at);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).length;
 const rows=cache.clients.map(x=>`<tr>
 <td><button class="link-client" onclick="viewClient('${x.id}')"><b>${esc(x.name)}</b></button><small>${esc(x.city||"")}${x.neighborhood?" • "+esc(x.neighborhood):""}</small></td>
 <td>${esc(x.type||"")}</td><td>${esc(x.document||"")}</td>
 <td>${esc(x.whatsapp||x.phone||"")}</td><td>${esc(x.email||"")}</td>
 <td><span class="badge ${(x.status||"Ativo")==="Ativo"?"ok":""}">${esc(x.status||"Ativo")}</span></td>
 <td><div class="row-actions"><button class="btn sm" onclick="viewClient('${x.id}')">Ver</button><button class="btn sm" onclick="editClient('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteClient('${x.id}')">Excluir</button></div></td></tr>`);
 return shell("Clientes","Base comercial central da "+company.name,`<button class="btn gold" onclick="addClient()">+ Novo Cliente</button>`,
 `<div class="grid g4 client-kpis"><div class="card kpi"><label>Total de clientes</label><strong>${cache.clients.length}</strong></div><div class="card kpi"><label>Ativos</label><strong class="goldtxt">${ativos}</strong></div><div class="card kpi"><label>Novos no mês</label><strong>${novos}</strong></div><div class="card kpi"><label>Cidades atendidas</label><strong>${cidades}</strong></div></div>
 <div class="filters"><div class="field"><label>Buscar cliente</label><input placeholder="Nome, documento, cidade, telefone..." oninput="filterTable(this.value)"></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Tipo</th><th>Documento</th><th>Contato</th><th>E-mail</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows.length?rows.join(""):`<tr><td class="empty" colspan="7">Nenhum cliente cadastrado. Clique em + Novo Cliente para começar.</td></tr>`}</tbody></table></div></div>`);
}
function addClient(){openModal("Novo Cliente",clientForm(),`saveClient()`)}
async function saveClient(id=null){
 const name=document.getElementById("cn").value.trim();
 if(!name)return toast("Informe o nome do cliente");
 const payload={company_id:profile.company_id,name,type:ct.value,document:cd.value.trim(),phone:cp.value.trim(),whatsapp:cw.value.trim(),email:ce.value.trim(),city:cc.value.trim(),neighborhood:cb.value.trim(),status:cs.value,notes:cnotes.value.trim()};
 let error;
 if(id){({error}=await sb.from("clients").update(payload).eq("id",id));}
 else {payload.created_by=session.user.id;({error}=await sb.from("clients").insert(payload));}
 if(error)return toast("Erro: "+error.message);
 closeModal();toast(id?"Cliente atualizado":"Cliente salvo na nuvem");render();
}
function editClient(id){
 const x=clientById(id); if(!x)return toast("Cliente não encontrado");
 openModal("Editar Cliente",clientForm(x),`saveClient('${id}')`);
}
function viewClient(id){
 const x=clientById(id); if(!x)return toast("Cliente não encontrado");
 const wa=clientWhatsApp(x.whatsapp||x.phone);
 openModal(esc(x.name),`<div class="client-detail">
 <div class="client-hero"><div class="client-avatar">${esc((x.name||"C").charAt(0).toUpperCase())}</div><div><span class="badge ok">${esc(x.status||"Ativo")}</span><p>${esc(x.type||"Cliente")} ${x.document?"• "+esc(x.document):""}</p></div></div>
 <div class="detail-grid"><div><label>WhatsApp</label><b>${esc(x.whatsapp||"—")}</b></div><div><label>Telefone</label><b>${esc(x.phone||"—")}</b></div><div><label>E-mail</label><b>${esc(x.email||"—")}</b></div><div><label>Localização</label><b>${esc([x.city,x.neighborhood].filter(Boolean).join(" • ")||"—")}</b></div></div>
 <div class="detail-notes"><label>Observações</label><p>${esc(x.notes||"Nenhuma observação cadastrada.")}</p></div>
 <div class="client-quick">${wa?`<a class="btn gold" target="_blank" rel="noopener" href="https://wa.me/55${wa.replace(/^55/,"")}">Abrir WhatsApp</a>`:""}<button class="btn" onclick="closeModal();editClient('${id}')">Editar cadastro</button></div>
 </div>`,"");
}
async function deleteClient(id){
 const x=clientById(id); if(!x)return;
 if(!confirm(`Excluir o cliente "${x.name}"? Esta ação não pode ser desfeita.`))return;
 const {error}=await sb.from("clients").delete().eq("id",id);
 if(error)return toast("Erro: "+error.message);
 toast("Cliente excluído");render();
}
let proposalDraftItems=[];
let proposalEditingId=null;

function proposalById(id){return cache.proposals.find(x=>x.id===id)}
function proposalClient(id){return cache.clients.find(x=>x.id===id)}
function proposalPartner(id){return cache.partners.find(x=>x.id===id)}
function proposalItems(id){return cache.proposalItems.filter(x=>x.proposal_id===id)}
function proposalNumber(v){return "PROP-"+String(v||0).padStart(6,"0")}
function proposalStatusClass(s){
  if(s==="Aprovado")return "ok";
  if(["Perdido","Cancelado"].includes(s))return "bad";
  if(["Negociação","Enviado"].includes(s))return "blue";
  return "";
}
function proposalDate(v){return v?new Date(v+"T12:00:00").toLocaleDateString("pt-BR"):"—"}
function proposalItemTotal(x){return Number(x.qty||0)*Number(x.unit_price||0)}
function proposalCostTotal(x){return Number(x.qty||0)*Number(x.cost||0)}
function proposalMetricsFromDraft(){
  const subtotal=proposalDraftItems.reduce((a,x)=>a+proposalItemTotal(x),0);
  const cost=proposalDraftItems.reduce((a,x)=>a+proposalCostTotal(x),0);
  const discount=Number(document.getElementById("pdiscount")?.value||0);
  const assembly=Number(document.getElementById("passembly")?.value||0);
  const freight=Number(document.getElementById("pfreight")?.value||0);
  const total=Math.max(0,subtotal-discount+assembly+freight);
  const margin=total-cost;
  const marginPct=total>0?(margin/total)*100:0;
  return {subtotal,cost,discount,assembly,freight,total,margin,marginPct};
}
function proposalClientOptions(selected=""){
  return cache.clients.map(c=>`<option value="${c.id}" ${selected===c.id?"selected":""}>${esc(c.name)}</option>`).join("");
}
function proposalPartnerOptions(selected=""){
  return cache.partners.filter(x=>x.active!==false).map(p=>`<option value="${p.id}" ${selected===p.id?"selected":""}>${esc(p.name)} • ${esc(p.type||"Parceiro")}</option>`).join("");
}
function proposalInputOptions(){
  return cache.inputs.filter(x=>x.active!==false).map(i=>`<option value="${i.id}">${esc(i.name)} • ${money(i.unit_cost)} / ${esc(i.unit||"un")}</option>`).join("");
}
function proposalForm(x={}){
  const defaultValid=(()=>{const d=new Date();d.setDate(d.getDate()+15);return d.toISOString().slice(0,10)})();
  return `<div class="proposal-editor">
    <div class="proposal-head-grid">
      <div class="field"><label>Cliente *</label><select id="pclient"><option value="">Selecione o cliente...</option>${proposalClientOptions(x.client_id||"")}</select></div>
      <div class="field"><label>Parceiro / Indicador</label><select id="ppartner"><option value="">Sem parceiro</option>${proposalPartnerOptions(x.partner_id||"")}</select></div>
      <div class="field full"><label>Título da proposta *</label><input id="ptitle" value="${esc(x.title||"")}" placeholder="Ex.: Móveis planejados • Cozinha + Área Gourmet"></div>
      <div class="field"><label>Status</label><select id="pstatus">${["Orçado","Enviado","Negociação","Aprovado","Perdido","Cancelado"].map(v=>`<option ${x.status===v?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Validade</label><input id="pvalid" type="date" value="${esc(x.valid_until||defaultValid)}"></div>
      <div class="field"><label>Prazo de entrega (dias)</label><input id="pdelivery" type="number" min="0" value="${Number(x.delivery_days||45)}"></div>
      <div class="field"><label>Garantia (meses)</label><input id="pwarranty" type="number" min="0" value="${Number(x.warranty_months||60)}"></div>
    </div>

    <div class="proposal-items-toolbar">
      <div class="field proposal-input-pick"><label>Adicionar do cadastro de Insumos</label><select id="proposalInputPick"><option value="">Selecione um insumo...</option>${proposalInputOptions()}</select></div>
      <button class="btn gold" type="button" onclick="addProposalInputItem()">+ Adicionar insumo</button>
      <button class="btn" type="button" onclick="addProposalFreeItem()">+ Item livre</button>
    </div>

    <div class="proposal-items-card">
      <div class="table-wrap">
        <table class="table proposal-items-table">
          <thead><tr><th>Ambiente</th><th>Descrição</th><th>Qtd.</th><th>Un.</th><th>Custo</th><th>Preço venda</th><th>Total</th><th></th></tr></thead>
          <tbody id="proposalItemRows"></tbody>
        </table>
      </div>
    </div>

    <div class="proposal-bottom-grid">
      <div>
        <div class="field"><label>Condições de pagamento</label><textarea id="ppayment" rows="4" placeholder="Ex.: 40% entrada + saldo em 6x no cartão">${esc(x.payment_terms||"")}</textarea></div>
        <div class="field" style="margin-top:10px"><label>Observações comerciais</label><textarea id="pnotes" rows="5" placeholder="Detalhes de acabamento, exclusões, premissas, observações...">${esc(x.notes||"")}</textarea></div>
      </div>
      <div class="proposal-totals">
        <div class="field"><label>Desconto (R$)</label><input id="pdiscount" type="number" min="0" step="0.01" value="${Number(x.discount||0)}" oninput="refreshProposalDraft()"></div>
        <div class="field"><label>Taxa de montagem (R$)</label><input id="passembly" type="number" min="0" step="0.01" value="${Number(x.assembly_fee||0)}" oninput="refreshProposalDraft()"></div>
        <div class="field"><label>Frete (R$)</label><input id="pfreight" type="number" min="0" step="0.01" value="${Number(x.freight||0)}" oninput="refreshProposalDraft()"></div>
        <div class="proposal-summary" id="proposalSummary"></div>
      </div>
    </div>
  </div>`;
}
function proposalItemRow(x,idx){
  return `<tr>
    <td><input class="table-input" value="${esc(x.environment||"")}" placeholder="Cozinha" oninput="updateProposalDraftItem(${idx},'environment',this.value)"></td>
    <td><input class="table-input wide" value="${esc(x.description||"")}" placeholder="Descrição do item" oninput="updateProposalDraftItem(${idx},'description',this.value)"></td>
    <td><input class="table-input num" type="number" min="0" step="0.01" value="${Number(x.qty||1)}" oninput="updateProposalDraftItem(${idx},'qty',this.value)"></td>
    <td><input class="table-input unit" value="${esc(x.unit||"un")}" oninput="updateProposalDraftItem(${idx},'unit',this.value)"></td>
    <td><input class="table-input num" type="number" min="0" step="0.01" value="${Number(x.cost||0)}" oninput="updateProposalDraftItem(${idx},'cost',this.value)"></td>
    <td><input class="table-input num" type="number" min="0" step="0.01" value="${Number(x.unit_price||0)}" oninput="updateProposalDraftItem(${idx},'unit_price',this.value)"></td>
    <td><b class="goldtxt">${money(proposalItemTotal(x))}</b></td>
    <td><button class="btn sm danger" type="button" onclick="removeProposalDraftItem(${idx})">×</button></td>
  </tr>`;
}
function refreshProposalDraft(){
  const rows=document.getElementById("proposalItemRows");
  if(rows) rows.innerHTML=proposalDraftItems.length?proposalDraftItems.map(proposalItemRow).join(""):`<tr><td class="empty" colspan="8">Nenhum item. Adicione um insumo ou item livre.</td></tr>`;
  const summary=document.getElementById("proposalSummary");
  if(summary){
    const m=proposalMetricsFromDraft();
    summary.innerHTML=`
      <div><span>Subtotal dos itens</span><b>${money(m.subtotal)}</b></div>
      <div><span>Custo estimado</span><b>${money(m.cost)}</b></div>
      <div><span>Desconto</span><b>- ${money(m.discount)}</b></div>
      <div><span>Montagem + frete</span><b>${money(m.assembly+m.freight)}</b></div>
      <div class="proposal-total-line"><span>VALOR FINAL</span><strong>${money(m.total)}</strong></div>
      <div class="proposal-margin"><span>Margem bruta estimada</span><b class="${m.margin>=0?"green":"red"}">${money(m.margin)} • ${m.marginPct.toFixed(1)}%</b></div>`;
  }
}
function updateProposalDraftItem(idx,key,value){
  if(!proposalDraftItems[idx])return;
  proposalDraftItems[idx][key]=["qty","cost","unit_price"].includes(key)?Number(value||0):value;
  refreshProposalDraft();
}
function addProposalInputItem(){
  const id=document.getElementById("proposalInputPick")?.value;
  if(!id)return toast("Selecione um insumo");
  const i=cache.inputs.find(x=>x.id===id); if(!i)return;
  proposalDraftItems.push({
    description:i.name,
    environment:"",
    qty:1,
    unit:i.unit||"un",
    cost:Number(i.unit_cost||0),
    unit_price:Number(i.unit_cost||0),
    metadata:{input_id:i.id,sku:i.sku||null,type:i.type||null,brand:i.brand||null}
  });
  refreshProposalDraft();
}
function addProposalFreeItem(){
  proposalDraftItems.push({description:"",environment:"",qty:1,unit:"un",cost:0,unit_price:0,metadata:{manual:true}});
  refreshProposalDraft();
}
function removeProposalDraftItem(idx){proposalDraftItems.splice(idx,1);refreshProposalDraft()}
function openProposalEditor(x={}){
  openModal(x.id?`Editar ${proposalNumber(x.number)}`:"Nova Proposta",proposalForm(x),`saveProposal('${x.id||""}')`);
  modal.classList.add("proposal-modal");
  setTimeout(refreshProposalDraft,0);
}
function addProposal(){
  if(!cache.clients.length)return toast("Cadastre um cliente antes de criar uma proposta");
  proposalEditingId=null;
  proposalDraftItems=[];
  openProposalEditor({});
}
function editProposal(id){
  const x=proposalById(id);if(!x)return toast("Proposta não encontrada");
  proposalEditingId=id;
  proposalDraftItems=proposalItems(id).map(i=>({...i,metadata:i.metadata||{}}));
  openProposalEditor(x);
}
async function saveProposal(id=""){
  const client_id=document.getElementById("pclient")?.value;
  const title=document.getElementById("ptitle")?.value.trim();
  if(!client_id)return toast("Selecione o cliente");
  if(!title)return toast("Informe o título");
  if(!proposalDraftItems.length)return toast("Adicione ao menos um item à proposta");
  if(proposalDraftItems.some(x=>!String(x.description||"").trim()))return toast("Há item sem descrição");
  const m=proposalMetricsFromDraft();
  const status=document.getElementById("pstatus").value;
  const payload={
    company_id:profile.company_id,
    client_id,
    partner_id:document.getElementById("ppartner").value||null,
    title,
    status,
    subtotal:m.subtotal,
    discount:m.discount,
    assembly_fee:m.assembly,
    freight:m.freight,
    total:m.total,
    payment_terms:document.getElementById("ppayment").value.trim()||null,
    delivery_days:Number(document.getElementById("pdelivery").value||0)||null,
    warranty_months:Number(document.getElementById("pwarranty").value||0)||null,
    notes:document.getElementById("pnotes").value.trim()||null,
    valid_until:document.getElementById("pvalid").value||null,
    approved_at:status==="Aprovado"?new Date().toISOString():null
  };
  let proposalId=id, error=null;
  if(id){
    ({error}=await sb.from("proposals").update(payload).eq("id",id));
  }else{
    payload.created_by=session.user.id;
    const res=await sb.from("proposals").insert(payload).select("id").single();
    error=res.error; proposalId=res.data?.id;
  }
  if(error||!proposalId)return toast("Erro ao salvar proposta: "+(error?.message||"ID não retornado"));

  const existingIds=new Set(proposalItems(proposalId).map(x=>x.id));
  const keptIds=new Set(proposalDraftItems.map(x=>x.id).filter(Boolean));
  const removed=[...existingIds].filter(x=>!keptIds.has(x));
  if(removed.length){
    const del=await sb.from("proposal_items").delete().in("id",removed);
    if(del.error)return toast("Proposta salva, mas houve erro ao remover itens: "+del.error.message);
  }

  for(const item of proposalDraftItems){
    const itemPayload={
      company_id:profile.company_id,
      proposal_id:proposalId,
      description:String(item.description||"").trim(),
      environment:item.environment||null,
      qty:Number(item.qty||0),
      unit:item.unit||"un",
      unit_price:Number(item.unit_price||0),
      cost:Number(item.cost||0),
      total:proposalItemTotal(item),
      metadata:item.metadata||{}
    };
    let itemError;
    if(item.id){
      ({error:itemError}=await sb.from("proposal_items").update(itemPayload).eq("id",item.id));
    }else{
      ({error:itemError}=await sb.from("proposal_items").insert(itemPayload));
    }
    if(itemError)return toast("Proposta salva, mas um item falhou: "+itemError.message);
  }
  modal.classList.remove("proposal-modal");
  closeModal();
  toast(id?"Proposta atualizada":"Proposta criada com sucesso");
  render();
}
async function updateProposalStatus(id,status){
  const payload={status};
  if(status==="Aprovado")payload.approved_at=new Date().toISOString();
  if(status!=="Aprovado")payload.approved_at=null;
  const {error}=await sb.from("proposals").update(payload).eq("id",id);
  if(error)return toast("Erro: "+error.message);
  toast("Status atualizado para "+status);render();
}
async function duplicateProposal(id){
  const x=proposalById(id);if(!x)return;
  if(!confirm(`Duplicar ${proposalNumber(x.number)}?`))return;
  const payload={...x};
  ["id","number","created_at","updated_at","approved_at"].forEach(k=>delete payload[k]);
  payload.title=(x.title||"Proposta")+" • Cópia";
  payload.status="Orçado";
  payload.created_by=session.user.id;
  const {data,error}=await sb.from("proposals").insert(payload).select("id").single();
  if(error)return toast("Erro: "+error.message);
  const items=proposalItems(id).map(i=>{
    const y={...i};["id","created_at","updated_at"].forEach(k=>delete y[k]);y.proposal_id=data.id;return y;
  });
  if(items.length){
    const ins=await sb.from("proposal_items").insert(items);
    if(ins.error)return toast("Proposta duplicada, mas itens falharam: "+ins.error.message);
  }
  toast("Proposta duplicada");render();
}
async function deleteProposal(id){
  const x=proposalById(id);if(!x)return;
  if(!confirm(`Excluir definitivamente ${proposalNumber(x.number)}? Os itens vinculados também serão removidos.`))return;
  const {error}=await sb.from("proposals").delete().eq("id",id);
  if(error)return toast("Erro: "+error.message);
  toast("Proposta excluída");render();
}
function viewProposal(id){
  const x=proposalById(id);if(!x)return;
  const c=proposalClient(x.client_id);
  const p=proposalPartner(x.partner_id);
  const items=proposalItems(id);
  const cost=items.reduce((a,i)=>a+proposalCostTotal(i),0);
  const margin=Number(x.total||0)-cost;
  const mp=Number(x.total||0)>0?margin/Number(x.total||0)*100:0;
  openModal(`${proposalNumber(x.number)} • ${esc(x.title)}`,`<div class="client-detail">
    <div class="client-hero"><div class="client-avatar">P</div><div><span class="badge ${proposalStatusClass(x.status)}">${esc(x.status)}</span><p>${esc(c?.name||"Cliente")} ${p?"• Parceiro: "+esc(p.name):""}</p></div></div>
    <div class="detail-grid">
      <div><label>Valor final</label><b class="goldtxt">${money(x.total)}</b></div>
      <div><label>Margem estimada</label><b class="${margin>=0?"green":"red"}">${money(margin)} • ${mp.toFixed(1)}%</b></div>
      <div><label>Validade</label><b>${proposalDate(x.valid_until)}</b></div>
      <div><label>Entrega</label><b>${x.delivery_days?x.delivery_days+" dias":"—"}</b></div>
      <div><label>Garantia</label><b>${x.warranty_months?x.warranty_months+" meses":"—"}</b></div>
      <div><label>Criada em</label><b>${new Date(x.created_at).toLocaleDateString("pt-BR")}</b></div>
    </div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Ambiente</th><th>Descrição</th><th>Qtd.</th><th>Preço</th><th>Total</th></tr></thead><tbody>
      ${items.map(i=>`<tr><td>${esc(i.environment||"—")}</td><td>${esc(i.description)}</td><td>${Number(i.qty||0)} ${esc(i.unit||"")}</td><td>${money(i.unit_price)}</td><td><b class="goldtxt">${money(i.total)}</b></td></tr>`).join("")||`<tr><td class="empty" colspan="5">Sem itens</td></tr>`}
    </tbody></table></div></div>
    <div class="detail-notes"><label>Condições de pagamento</label><p>${esc(x.payment_terms||"—")}</p></div>
    <div class="detail-notes"><label>Observações</label><p>${esc(x.notes||"—")}</p></div>
    <div class="client-quick">
      <button class="btn gold" onclick="printProposal('${id}')">Gerar PDF / Imprimir</button>
      <button class="btn" onclick="closeModal();editProposal('${id}')">Editar</button>
      ${x.status!=="Aprovado"?`<button class="btn" onclick="closeModal();updateProposalStatus('${id}','Aprovado')">Aprovar</button>`:""}
      <button class="btn" onclick="closeModal();duplicateProposal('${id}')">Duplicar</button>
    </div>
  </div>`,"");
}
function printProposal(id){
  const x=proposalById(id);if(!x)return;
  const c=proposalClient(x.client_id)||{};
  const p=proposalPartner(x.partner_id);
  const items=proposalItems(id);
  const cost=items.reduce((a,i)=>a+proposalCostTotal(i),0);
  const margin=Number(x.total||0)-cost;
  const w=window.open("","_blank","width=980,height=760");
  if(!w)return toast("Permita pop-ups para gerar o PDF");
  const rows=items.map(i=>`<tr><td>${esc(i.environment||"—")}</td><td>${esc(i.description)}</td><td>${Number(i.qty||0)} ${esc(i.unit||"")}</td><td>${money(i.unit_price)}</td><td>${money(i.total)}</td></tr>`).join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${proposalNumber(x.number)} - ${esc(x.title)}</title>
  <style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1d1b18;margin:0;background:#fff}.page{max-width:900px;margin:auto;padding:38px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c9973f;padding-bottom:20px}.brand{font-size:26px;font-weight:900}.brand span{color:#c9973f}.num{text-align:right}.num b{display:block;font-size:20px}
  .muted{color:#6d675e}.block{margin-top:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #ddd5c8;padding:12px;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#171614;color:#fff;text-align:left;padding:10px;font-size:12px}td{padding:10px;border-bottom:1px solid #e7e0d5;font-size:12px}
  .totals{width:360px;margin-left:auto;margin-top:22px}.totals div{display:flex;justify-content:space-between;padding:7px 0}.grand{border-top:2px solid #c9973f;font-size:18px;font-weight:800}
  .notes{white-space:pre-wrap;line-height:1.5}.footer{margin-top:38px;border-top:1px solid #ddd5c8;padding-top:16px;font-size:11px;color:#746d63}
  @media print{.page{padding:20px}.no-print{display:none}}
  </style></head><body><div class="page">
    <div class="top"><div><div class="brand">${esc(company.name||"VIMAK")} <span>PROPOSTA</span></div><div class="muted">${esc(company.legal_name||"")}</div></div><div class="num"><b>${proposalNumber(x.number)}</b><span class="muted">${new Date(x.created_at).toLocaleDateString("pt-BR")}</span></div></div>
    <div class="block grid"><div class="box"><b>CLIENTE</b><br>${esc(c.name||"—")}<br><span class="muted">${esc(c.document||"")}${c.city?" • "+esc(c.city):""}</span></div><div class="box"><b>PROJETO</b><br>${esc(x.title)}<br><span class="muted">Validade: ${proposalDate(x.valid_until)} • Entrega: ${x.delivery_days||"—"} dias</span></div></div>
    ${p?`<div class="block box"><b>PARCEIRO / INDICAÇÃO:</b> ${esc(p.name)}</div>`:""}
    <div class="block"><h3>Itens da proposta</h3><table><thead><tr><th>Ambiente</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="totals">
      <div><span>Subtotal</span><b>${money(x.subtotal)}</b></div>
      <div><span>Desconto</span><b>- ${money(x.discount)}</b></div>
      <div><span>Montagem</span><b>${money(x.assembly_fee)}</b></div>
      <div><span>Frete</span><b>${money(x.freight)}</b></div>
      <div class="grand"><span>VALOR FINAL</span><b>${money(x.total)}</b></div>
    </div>
    <div class="block box"><b>CONDIÇÕES DE PAGAMENTO</b><div class="notes">${esc(x.payment_terms||"A combinar")}</div></div>
    <div class="block box"><b>OBSERVAÇÕES</b><div class="notes">${esc(x.notes||"")}</div></div>
    <div class="footer">Garantia: ${x.warranty_months||60} meses • Proposta emitida por ${esc(company.name||"VIMAK")}.<span style="display:none">${margin}</span></div>
  </div><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);
  w.document.close();
}
function propostas(){
  const total=cache.proposals.reduce((a,x)=>a+Number(x.total||0),0);
  const aprovadas=cache.proposals.filter(x=>x.status==="Aprovado");
  const aprovadasValor=aprovadas.reduce((a,x)=>a+Number(x.total||0),0);
  const concluidas=cache.proposals.filter(x=>["Aprovado","Perdido","Cancelado"].includes(x.status)).length;
  const conversao=concluidas?aprovadas.length/concluidas*100:0;
  const ticket=aprovadas.length?aprovadasValor/aprovadas.length:0;
  const rows=cache.proposals.map(x=>{
    const c=proposalClient(x.client_id);
    const items=proposalItems(x.id);
    const ambientes=[...new Set(items.map(i=>i.environment).filter(Boolean))];
    return `<tr>
      <td><button class="link-client" onclick="viewProposal('${x.id}')"><b>${proposalNumber(x.number)}</b></button><small>${new Date(x.created_at).toLocaleDateString("pt-BR")}</small></td>
      <td><b>${esc(x.title)}</b><small>${esc(c?.name||"Cliente não vinculado")}</small></td>
      <td>${esc(ambientes.slice(0,3).join(" • ")||"—")}${ambientes.length>3?`<small>+${ambientes.length-3} ambiente(s)</small>`:""}</td>
      <td><span class="badge ${proposalStatusClass(x.status)}">${esc(x.status)}</span></td>
      <td><b class="goldtxt">${money(x.total)}</b></td>
      <td>${proposalDate(x.valid_until)}</td>
      <td><div class="row-actions">
        <button class="btn sm" onclick="viewProposal('${x.id}')">Ver</button>
        <button class="btn sm" onclick="editProposal('${x.id}')">Editar</button>
        <button class="btn sm" onclick="printProposal('${x.id}')">PDF</button>
        <button class="btn sm" onclick="duplicateProposal('${x.id}')">Duplicar</button>
        <button class="btn sm danger" onclick="deleteProposal('${x.id}')">Excluir</button>
      </div></td>
    </tr>`;
  }).join("");
  return shell("Propostas","Orçamento comercial conectado a clientes, parceiros e insumos",
    `<button class="btn gold" onclick="addProposal()">+ Nova Proposta</button>`,
    `<div class="grid g4 proposal-kpis">
      <div class="card kpi"><label>Pipeline em propostas</label><strong class="goldtxt">${money(total)}</strong></div>
      <div class="card kpi"><label>Aprovadas</label><strong>${aprovadas.length}</strong><small>${money(aprovadasValor)}</small></div>
      <div class="card kpi"><label>Taxa de conversão</label><strong>${conversao.toFixed(1)}%</strong></div>
      <div class="card kpi"><label>Ticket médio aprovado</label><strong>${money(ticket)}</strong></div>
    </div>
    <div class="filters">
      <div class="field"><label>Buscar</label><input placeholder="Número, cliente, título, ambiente..." oninput="filterTable(this.value)"></div>
      <div class="proposal-legend"><span class="badge">Orçado</span><span class="badge blue">Negociação</span><span class="badge ok">Aprovado</span><span class="badge bad">Perdido / Cancelado</span></div>
    </div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Proposta / Cliente</th><th>Ambientes</th><th>Status</th><th>Valor final</th><th>Validade</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td class="empty" colspan="7">Nenhuma proposta cadastrada. Clique em + Nova Proposta.</td></tr>`}</tbody></table></div></div>`);
}
async function deleteRow(table,id){
 if(!confirm("Excluir este registro?"))return;
 const {error}=await sb.from(table).delete().eq("id",id);
 if(error)return toast("Erro: "+error.message);
 toast("Registro excluído");render();
}
function empresa(){return shell("Configurações da Empresa","Dados reais do tenant ativo","",`<div class="card pad"><div class="field"><label>Empresa</label><input value="${esc(company.name)}" disabled></div><div class="field" style="margin-top:10px"><label>Plano</label><input value="${esc(company.plan||"trial")}" disabled></div><div class="notice" style="margin-top:12px">Empresa vinculada ao usuário autenticado via Supabase.</div></div>`)}
function usuarios(){return shell("Usuários","Perfis vinculados à empresa","",`<div class="notice">Nesta V6, criação de usuários adicionais será feita pela camada administrativa segura. Seu usuário atual: <b>${esc(profile.email||session.user.email)}</b> • ${esc(profile.role)}</div>`)}
function auditoria(){return simpleTable("Auditoria","Eventos do ambiente","",["Data","Usuário","Ação"],[])}
function planos(){return shell("Assinatura / Planos","Planos comerciais do SaaS","",`<div class="grid g3">${["Essencial","Profissional","Premium"].map(x=>`<div class="card pad"><h2 class="goldtxt">${x}</h2><button class="btn">Selecionar</button></div>`).join("")}</div>`)}
function supplierById(id){return cache.suppliers.find(x=>x.id===id)}
function supplierPhone(v){return String(v||"").replace(/\D/g,"")}
function supplierForm(x={}){
 return `<div class="form-grid">
 <div class="field full"><label>Nome / Razão Social *</label><input id="sn" value="${esc(x.name||"")}"></div>
 <div class="field"><label>Tipo</label><select id="st"><option ${x.type==="MDF / Chapas"?"selected":""}>MDF / Chapas</option><option ${x.type==="Ferragens"?"selected":""}>Ferragens</option><option ${x.type==="Vidros / Espelhos"?"selected":""}>Vidros / Espelhos</option><option ${x.type==="Pedras / Mármores"?"selected":""}>Pedras / Mármores</option><option ${x.type==="Tintas / Laca"?"selected":""}>Tintas / Laca</option><option ${x.type==="Acessórios"?"selected":""}>Acessórios</option><option ${x.type==="Serviços"?"selected":""}>Serviços</option><option ${x.type==="Logística"?"selected":""}>Logística</option><option ${x.type==="Outros"?"selected":""}>Outros</option></select></div>
 <div class="field"><label>CNPJ / CPF</label><input id="sd" value="${esc(x.document||"")}"></div>
 <div class="field"><label>Responsável / Contato</label><input id="sc" value="${esc(x.contact_name||"")}"></div>
 <div class="field"><label>Telefone / WhatsApp</label><input id="sp" value="${esc(x.phone||"")}"></div>
 <div class="field full"><label>E-mail</label><input id="se" type="email" value="${esc(x.email||"")}"></div>
 <div class="field full"><label>Website</label><input id="sw" placeholder="https://..." value="${esc(x.website||"")}"></div>
 <div class="field"><label>Status</label><select id="sa"><option value="true" ${x.active!==false?"selected":""}>Ativo</option><option value="false" ${x.active===false?"selected":""}>Inativo</option></select></div>
 <div class="field full"><label>Observações comerciais</label><textarea id="snotes" rows="5" placeholder="Condições, prazo médio, marcas fornecidas, observações de atendimento...">${esc(x.notes||"")}</textarea></div>
 </div>`;
}
function fornecedores(){
 const ativos=cache.suppliers.filter(x=>x.active!==false).length;
 const tipos=new Set(cache.suppliers.map(x=>x.type).filter(Boolean)).size;
 const novos=cache.suppliers.filter(x=>{const d=new Date(x.created_at);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).length;
 const rows=cache.suppliers.map(x=>`<tr>
 <td><button class="link-client" onclick="viewSupplier('${x.id}')"><b>${esc(x.name)}</b></button><small>${esc(x.contact_name||"Sem contato responsável")}</small></td>
 <td>${esc(x.type||"—")}</td>
 <td>${esc(x.document||"—")}</td>
 <td>${esc(x.phone||"—")}</td>
 <td>${esc(x.email||"—")}</td>
 <td><span class="badge ${x.active!==false?"ok":""}">${x.active!==false?"Ativo":"Inativo"}</span></td>
 <td><div class="row-actions"><button class="btn sm" onclick="viewSupplier('${x.id}')">Ver</button><button class="btn sm" onclick="editSupplier('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteSupplier('${x.id}')">Excluir</button></div></td>
 </tr>`);
 return shell("Fornecedores","Base de fornecimento e relacionamento comercial da "+company.name,
 `<button class="btn gold" onclick="addSupplier()">+ Novo Fornecedor</button>`,
 `<div class="grid g4 client-kpis">
   <div class="card kpi"><label>Total de fornecedores</label><strong>${cache.suppliers.length}</strong></div>
   <div class="card kpi"><label>Ativos</label><strong class="goldtxt">${ativos}</strong></div>
   <div class="card kpi"><label>Novos no mês</label><strong>${novos}</strong></div>
   <div class="card kpi"><label>Categorias</label><strong>${tipos}</strong></div>
 </div>
 <div class="filters"><div class="field"><label>Buscar fornecedor</label><input placeholder="Nome, CNPJ, responsável, telefone, categoria..." oninput="filterTable(this.value)"></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Fornecedor</th><th>Categoria</th><th>Documento</th><th>Contato</th><th>E-mail</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows.length?rows.join(""):`<tr><td class="empty" colspan="7">Nenhum fornecedor cadastrado. Clique em + Novo Fornecedor para começar.</td></tr>`}</tbody></table></div></div>`);
}
function addSupplier(){openModal("Novo Fornecedor",supplierForm(),`saveSupplier()`)}
async function saveSupplier(id=null){
 const name=document.getElementById("sn").value.trim();
 if(!name)return toast("Informe o nome do fornecedor");
 const payload={
   company_id:profile.company_id,
   name,
   type:st.value,
   document:sd.value.trim(),
   contact_name:sc.value.trim(),
   phone:sp.value.trim(),
   email:se.value.trim(),
   website:sw.value.trim(),
   notes:snotes.value.trim(),
   active:sa.value==="true"
 };
 let error;
 if(id){({error}=await sb.from("suppliers").update(payload).eq("id",id));}
 else {({error}=await sb.from("suppliers").insert(payload));}
 if(error)return toast("Erro: "+error.message);
 closeModal();toast(id?"Fornecedor atualizado":"Fornecedor salvo na nuvem");render();
}
function editSupplier(id){
 const x=supplierById(id); if(!x)return toast("Fornecedor não encontrado");
 openModal("Editar Fornecedor",supplierForm(x),`saveSupplier('${id}')`);
}
function viewSupplier(id){
 const x=supplierById(id); if(!x)return toast("Fornecedor não encontrado");
 const phone=supplierPhone(x.phone);
 const site=x.website&&/^https?:\/\//i.test(x.website)?x.website:(x.website?`https://${x.website}`:"");
 openModal(esc(x.name),`<div class="client-detail">
 <div class="client-hero"><div class="client-avatar">${esc((x.name||"F").charAt(0).toUpperCase())}</div><div><span class="badge ${x.active!==false?"ok":""}">${x.active!==false?"Ativo":"Inativo"}</span><p>${esc(x.type||"Fornecedor")} ${x.document?"• "+esc(x.document):""}</p></div></div>
 <div class="detail-grid">
   <div><label>Responsável</label><b>${esc(x.contact_name||"—")}</b></div>
   <div><label>Telefone</label><b>${esc(x.phone||"—")}</b></div>
   <div><label>E-mail</label><b>${esc(x.email||"—")}</b></div>
   <div><label>Website</label><b>${esc(x.website||"—")}</b></div>
 </div>
 <div class="detail-notes"><label>Observações comerciais</label><p>${esc(x.notes||"Nenhuma observação cadastrada.")}</p></div>
 <div class="client-quick">
   ${phone?`<a class="btn gold" target="_blank" rel="noopener" href="https://wa.me/55${phone.replace(/^55/,"")}">Abrir WhatsApp</a>`:""}
   ${site?`<a class="btn" target="_blank" rel="noopener" href="${esc(site)}">Abrir Website</a>`:""}
   <button class="btn" onclick="closeModal();editSupplier('${id}')">Editar cadastro</button>
 </div>
 </div>`,"");
}
async function deleteSupplier(id){
 const x=supplierById(id); if(!x)return;
 if(!confirm(`Excluir o fornecedor "${x.name}"? Compras e insumos vinculados podem impedir a exclusão.`))return;
 const {error}=await sb.from("suppliers").delete().eq("id",id);
 if(error)return toast("Erro: "+error.message);
 toast("Fornecedor excluído");render();
}
function partnerById(id){return cache.partners.find(x=>x.id===id)}
function partnerPhone(v){return String(v||"").replace(/\D/g,"")}
function partnerRate(v){return Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%"}
function partnerForm(x={}){
 return `<div class="form-grid">
 <div class="field full"><label>Nome / Parceiro *</label><input id="pan" value="${esc(x.name||"")}"></div>
 <div class="field"><label>Tipo de parceiro</label><select id="pat">
   <option ${x.type==="Arquiteto(a)"?"selected":""}>Arquiteto(a)</option>
   <option ${x.type==="Designer de Interiores"?"selected":""}>Designer de Interiores</option>
   <option ${x.type==="Corretor(a) de Imóveis"?"selected":""}>Corretor(a) de Imóveis</option>
   <option ${x.type==="Construtora / Incorporadora"?"selected":""}>Construtora / Incorporadora</option>
   <option ${x.type==="Engenheiro(a)"?"selected":""}>Engenheiro(a)</option>
   <option ${x.type==="Indicador / Afiliado"?"selected":""}>Indicador / Afiliado</option>
   <option ${x.type==="Loja / Showroom"?"selected":""}>Loja / Showroom</option>
   <option ${x.type==="Outro"?"selected":""}>Outro</option>
 </select></div>
 <div class="field"><label>Comissão (%)</label><input id="par" type="number" min="0" step="0.01" value="${Number(x.commission_rate||0)}"></div>
 <div class="field"><label>Telefone / WhatsApp</label><input id="pap" value="${esc(x.phone||"")}"></div>
 <div class="field"><label>E-mail</label><input id="pae" type="email" value="${esc(x.email||"")}"></div>
 <div class="field full"><label>Chave PIX</label><input id="papix" value="${esc(x.pix_key||"")}"></div>
 <div class="field"><label>Status</label><select id="paa"><option value="true" ${x.active!==false?"selected":""}>Ativo</option><option value="false" ${x.active===false?"selected":""}>Inativo</option></select></div>
 <div class="field full"><label>Observações</label><textarea id="panotes" rows="5" placeholder="Regras de comissão, região de atuação, perfil dos clientes, acordos comerciais...">${esc(x.notes||"")}</textarea></div>
 </div>`;
}
function parceiros(){
 const ativos=cache.partners.filter(x=>x.active!==false).length;
 const tipos=new Set(cache.partners.map(x=>x.type).filter(Boolean)).size;
 const media=cache.partners.length?cache.partners.reduce((a,x)=>a+Number(x.commission_rate||0),0)/cache.partners.length:0;
 const novos=cache.partners.filter(x=>{const d=new Date(x.created_at);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).length;
 const rows=cache.partners.map(x=>`<tr>
   <td><button class="link-client" onclick="viewPartner('${x.id}')"><b>${esc(x.name)}</b></button><small>${esc(x.type||"Parceiro")}</small></td>
   <td>${esc(x.phone||"—")}</td>
   <td>${esc(x.email||"—")}</td>
   <td><span class="goldtxt"><b>${partnerRate(x.commission_rate)}</b></span></td>
   <td>${esc(x.pix_key||"—")}</td>
   <td><span class="badge ${x.active!==false?"ok":""}">${x.active!==false?"Ativo":"Inativo"}</span></td>
   <td><div class="row-actions"><button class="btn sm" onclick="viewPartner('${x.id}')">Ver</button><button class="btn sm" onclick="editPartner('${x.id}')">Editar</button><button class="btn sm danger" onclick="deletePartner('${x.id}')">Excluir</button></div></td>
 </tr>`);
 return shell("Parceiros","Rede estratégica de indicação e relacionamento da "+company.name,
 `<button class="btn gold" onclick="addPartner()">+ Novo Parceiro</button>`,
 `<div class="grid g4 client-kpis">
   <div class="card kpi"><label>Total de parceiros</label><strong>${cache.partners.length}</strong></div>
   <div class="card kpi"><label>Ativos</label><strong class="goldtxt">${ativos}</strong></div>
   <div class="card kpi"><label>Novos no mês</label><strong>${novos}</strong></div>
   <div class="card kpi"><label>Comissão média</label><strong>${partnerRate(media)}</strong></div>
 </div>
 <div class="filters"><div class="field"><label>Buscar parceiro</label><input placeholder="Nome, tipo, telefone, e-mail, PIX..." oninput="filterTable(this.value)"></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Parceiro</th><th>Contato</th><th>E-mail</th><th>Comissão</th><th>PIX</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows.length?rows.join(""):`<tr><td class="empty" colspan="7">Nenhum parceiro cadastrado. Clique em + Novo Parceiro para começar.</td></tr>`}</tbody></table></div></div>`);
}
function addPartner(){openModal("Novo Parceiro",partnerForm(),`savePartner()`)}
async function savePartner(id=null){
 const name=document.getElementById("pan").value.trim();
 if(!name)return toast("Informe o nome do parceiro");
 const payload={
   company_id:profile.company_id,
   name,
   type:pat.value,
   phone:pap.value.trim(),
   email:pae.value.trim(),
   commission_rate:Number(par.value||0),
   pix_key:papix.value.trim(),
   notes:panotes.value.trim(),
   active:paa.value==="true"
 };
 let error;
 if(id){({error}=await sb.from("partners").update(payload).eq("id",id));}
 else {({error}=await sb.from("partners").insert(payload));}
 if(error)return toast("Erro: "+error.message);
 closeModal();toast(id?"Parceiro atualizado":"Parceiro salvo na nuvem");render();
}
function editPartner(id){
 const x=partnerById(id); if(!x)return toast("Parceiro não encontrado");
 openModal("Editar Parceiro",partnerForm(x),`savePartner('${id}')`);
}
function viewPartner(id){
 const x=partnerById(id); if(!x)return toast("Parceiro não encontrado");
 const phone=partnerPhone(x.phone);
 openModal(esc(x.name),`<div class="client-detail">
   <div class="client-hero"><div class="client-avatar">${esc((x.name||"P").charAt(0).toUpperCase())}</div><div><span class="badge ${x.active!==false?"ok":""}">${x.active!==false?"Ativo":"Inativo"}</span><p>${esc(x.type||"Parceiro")}</p></div></div>
   <div class="detail-grid">
     <div><label>Telefone / WhatsApp</label><b>${esc(x.phone||"—")}</b></div>
     <div><label>E-mail</label><b>${esc(x.email||"—")}</b></div>
     <div><label>Comissão</label><b class="goldtxt">${partnerRate(x.commission_rate)}</b></div>
     <div><label>Chave PIX</label><b>${esc(x.pix_key||"—")}</b></div>
   </div>
   <div class="detail-notes"><label>Observações</label><p>${esc(x.notes||"Nenhuma observação cadastrada.")}</p></div>
   <div class="client-quick">
     ${phone?`<a class="btn gold" target="_blank" rel="noopener" href="https://wa.me/55${phone.replace(/^55/,"")}">Abrir WhatsApp</a>`:""}
     <button class="btn" onclick="closeModal();editPartner('${id}')">Editar cadastro</button>
   </div>
 </div>`,"");
}
async function deletePartner(id){
 const x=partnerById(id); if(!x)return;
 if(!confirm(`Excluir o parceiro "${x.name}"? Propostas vinculadas podem impedir a exclusão.`))return;
 const {error}=await sb.from("partners").delete().eq("id",id);
 if(error)return toast("Erro: "+error.message);
 toast("Parceiro excluído");render();
}
function afterSaleById(id){return cache.afterSales.find(x=>x.id===id)}
function afterSaleClient(id){return cache.clients.find(x=>x.id===id)}
function afterSaleProposal(id){return cache.proposals.find(x=>x.id===id)}
function afterSaleStatusClass(status){return status==="Concluído"?"ok":status==="Em atendimento"?"":"warn"}
function afterSaleForm(x={}){
 const clientOptions=cache.clients.map(c=>`<option value="${c.id}" ${x.client_id===c.id?"selected":""}>${esc(c.name)}</option>`).join("");
 const proposalOptions=cache.proposals.map(p=>`<option value="${p.id}" ${x.proposal_id===p.id?"selected":""}>${esc(p.number||"")} ${esc(p.title||"Proposta")}</option>`).join("");
 return `<div class="form-grid">
   <div class="field full"><label>Cliente *</label><select id="asc"><option value="">Selecione...</option>${clientOptions}</select></div>
   <div class="field"><label>Tipo de atendimento</label><select id="ast">
     ${["Garantia","Assistência técnica","Ajuste","Manutenção","Reparo","Vistoria","Orientação de uso","Outro"].map(v=>`<option ${x.service_type===v?"selected":""}>${v}</option>`).join("")}
   </select></div>
   <div class="field"><label>Prioridade</label><select id="asp">
     ${["Baixa","Normal","Alta","Urgente"].map(v=>`<option ${x.priority===v?"selected":""}>${v}</option>`).join("")}
   </select></div>
   <div class="field"><label>Status</label><select id="ass">
     ${["Aberto","Em atendimento","Aguardando cliente","Aguardando peça","Agendado","Concluído","Cancelado"].map(v=>`<option ${x.status===v?"selected":""}>${v}</option>`).join("")}
   </select></div>
   <div class="field"><label>Custo estimado / realizado</label><input id="asco" type="number" min="0" step="0.01" value="${Number(x.cost||0)}"></div>
   <div class="field full"><label>Proposta vinculada</label><select id="aspr"><option value="">Sem proposta vinculada</option>${proposalOptions}</select></div>
   <div class="field full"><label>Descrição do chamado *</label><textarea id="asd" rows="6" placeholder="Descreva o problema, ambiente, peça, ocorrência e providências...">${esc(x.description||"")}</textarea></div>
 </div>`;
}
function posvenda(){
 const abertos=cache.afterSales.filter(x=>["Aberto","Em atendimento","Aguardando cliente","Aguardando peça","Agendado"].includes(x.status)).length;
 const urgentes=cache.afterSales.filter(x=>x.priority==="Urgente"&&x.status!=="Concluído"&&x.status!=="Cancelado").length;
 const concluidos=cache.afterSales.filter(x=>x.status==="Concluído").length;
 const custo=cache.afterSales.reduce((a,x)=>a+Number(x.cost||0),0);
 const rows=cache.afterSales.map(x=>{
   const c=afterSaleClient(x.client_id);
   const opened=x.opened_at?new Date(x.opened_at).toLocaleDateString("pt-BR"):"—";
   return `<tr>
     <td><button class="link-client" onclick="viewAfterSale('${x.id}')"><b>${esc(c?.name||"Cliente não vinculado")}</b></button><small>${opened}</small></td>
     <td>${esc(x.service_type||"—")}</td>
     <td>${esc(x.description||"")}</td>
     <td><span class="badge ${afterSaleStatusClass(x.status)}">${esc(x.status||"Aberto")}</span></td>
     <td><span class="badge">${esc(x.priority||"Normal")}</span></td>
     <td>${money(x.cost)}</td>
     <td><div class="row-actions"><button class="btn sm" onclick="viewAfterSale('${x.id}')">Ver</button><button class="btn sm" onclick="editAfterSale('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteAfterSale('${x.id}')">Excluir</button></div></td>
   </tr>`;
 }).join("");
 return shell("Pós-venda / Garantia","Central de assistência, garantia e relacionamento após a entrega",
 `<button class="btn gold" onclick="addAfterSale()">+ Novo Chamado</button>`,
 `<div class="grid g4 client-kpis">
   <div class="card kpi"><label>Chamados em aberto</label><strong class="goldtxt">${abertos}</strong></div>
   <div class="card kpi"><label>Urgentes</label><strong>${urgentes}</strong></div>
   <div class="card kpi"><label>Concluídos</label><strong>${concluidos}</strong></div>
   <div class="card kpi"><label>Custo acumulado</label><strong>${money(custo)}</strong></div>
 </div>
 <div class="filters"><div class="field"><label>Buscar chamado</label><input placeholder="Cliente, serviço, status, descrição..." oninput="filterTable(this.value)"></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Serviço</th><th>Descrição</th><th>Status</th><th>Prioridade</th><th>Custo</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td class="empty" colspan="7">Nenhum chamado de pós-venda cadastrado.</td></tr>`}</tbody></table></div></div>`);
}
function addAfterSale(){
 if(!cache.clients.length)return toast("Cadastre um cliente antes de abrir um chamado");
 openModal("Novo Chamado • Pós-venda / Garantia",afterSaleForm(),`saveAfterSale()`);
}
async function saveAfterSale(id=null){
 const clientId=document.getElementById("asc").value;
 const description=document.getElementById("asd").value.trim();
 if(!clientId)return toast("Selecione o cliente");
 if(!description)return toast("Descreva o chamado");
 const status=ass.value;
 const payload={
   company_id:profile.company_id,
   client_id:clientId,
   proposal_id:aspr.value||null,
   service_type:ast.value,
   description,
   status,
   priority:asp.value,
   cost:Number(asco.value||0),
   closed_at:status==="Concluído"?new Date().toISOString():null
 };
 let error;
 if(id){({error}=await sb.from("after_sales_tickets").update(payload).eq("id",id));}
 else {({error}=await sb.from("after_sales_tickets").insert(payload));}
 if(error)return toast("Erro: "+error.message);
 closeModal();toast(id?"Chamado atualizado":"Chamado aberto na nuvem");render();
}
function editAfterSale(id){
 const x=afterSaleById(id); if(!x)return toast("Chamado não encontrado");
 openModal("Editar Chamado",afterSaleForm(x),`saveAfterSale('${id}')`);
}
function viewAfterSale(id){
 const x=afterSaleById(id); if(!x)return toast("Chamado não encontrado");
 const c=afterSaleClient(x.client_id);
 const p=afterSaleProposal(x.proposal_id);
 const opened=x.opened_at?new Date(x.opened_at).toLocaleString("pt-BR"):"—";
 const closed=x.closed_at?new Date(x.closed_at).toLocaleString("pt-BR"):"—";
 openModal(`Chamado • ${esc(c?.name||"Cliente")}`,`<div class="client-detail">
   <div class="client-hero"><div class="client-avatar">✓</div><div><span class="badge ${afterSaleStatusClass(x.status)}">${esc(x.status||"Aberto")}</span><p>${esc(x.service_type||"Pós-venda")} • Prioridade ${esc(x.priority||"Normal")}</p></div></div>
   <div class="detail-grid">
     <div><label>Cliente</label><b>${esc(c?.name||"—")}</b></div>
     <div><label>Proposta</label><b>${esc(p?.number||p?.title||"—")}</b></div>
     <div><label>Aberto em</label><b>${opened}</b></div>
     <div><label>Concluído em</label><b>${closed}</b></div>
     <div><label>Custo</label><b class="goldtxt">${money(x.cost)}</b></div>
     <div><label>Prioridade</label><b>${esc(x.priority||"Normal")}</b></div>
   </div>
   <div class="detail-notes"><label>Descrição do chamado</label><p>${esc(x.description||"—")}</p></div>
   <div class="client-quick"><button class="btn gold" onclick="closeModal();editAfterSale('${id}')">Atualizar chamado</button>${c?`<button class="btn" onclick="closeModal();viewClient('${c.id}')">Ver cliente</button>`:""}</div>
 </div>`,"");
}
async function deleteAfterSale(id){
 const x=afterSaleById(id); if(!x)return;
 if(!confirm("Excluir este chamado de pós-venda? Esta ação não pode ser desfeita."))return;
 const {error}=await sb.from("after_sales_tickets").delete().eq("id",id);
 if(error)return toast("Erro: "+error.message);
 toast("Chamado excluído");render();
}
function inputById(id){return cache.inputs.find(x=>x.id===id)}
function inputSupplier(id){return cache.suppliers.find(x=>x.id===id)}
function inputStock(x){return Number(x.stock_qty??x.stock??0)}
function inputMinStock(x){return Number(x.min_stock??x.minimum_stock??0)}
function inputForm(x={}){
 const supplierOptions=cache.suppliers.map(s=>`<option value="${s.id}" ${x.supplier_id===s.id?"selected":""}>${esc(s.name)}</option>`).join("");
 const types=["MDF / MDP","Ferragem","Vidro / Espelho","Perfil / Alumínio","Fita de Borda","Cola / Adesivo","Laca / Pintura","Acessório","Iluminação","Embalagem","Serviço Terceirizado","Outro"];
 const units=["un","m","m²","m³","kg","g","L","ml","chapa","par","kit","caixa"];
 return `<div class="form-grid">
   <div class="field full"><label>Nome do insumo *</label><input id="inn" value="${esc(x.name||"")}" placeholder="Ex.: MDF Carvalho 18mm"></div>
   <div class="field"><label>Tipo / Categoria</label><select id="int">${types.map(v=>`<option ${x.type===v?"selected":""}>${v}</option>`).join("")}</select></div>
   <div class="field"><label>Unidade</label><select id="inu">${units.map(v=>`<option ${x.unit===v?"selected":""}>${v}</option>`).join("")}</select></div>
   <div class="field"><label>Custo unitário (R$)</label><input id="inc" type="number" min="0" step="0.01" value="${Number(x.unit_cost||0)}"></div>
   <div class="field"><label>Estoque atual</label><input id="ins" type="number" min="0" step="0.01" value="${inputStock(x)}"></div>
   <div class="field"><label>Estoque mínimo</label><input id="inm" type="number" min="0" step="0.01" value="${inputMinStock(x)}"></div>
   <div class="field"><label>Fornecedor principal</label><select id="inf"><option value="">Sem fornecedor</option>${supplierOptions}</select></div>
   <div class="field"><label>Código / SKU</label><input id="insk" value="${esc(x.sku||x.code||"")}" placeholder="Código interno"></div>
   <div class="field"><label>Marca</label><input id="inb" value="${esc(x.brand||"")}" placeholder="Ex.: Duratex, Guararapes..."></div>
   <div class="field"><label>Status</label><select id="ina"><option value="true" ${x.active!==false?"selected":""}>Ativo</option><option value="false" ${x.active===false?"selected":""}>Inativo</option></select></div>
   <div class="field full"><label>Observações</label><textarea id="ino" rows="4" placeholder="Cor, espessura, acabamento, referência do fornecedor...">${esc(x.notes||"")}</textarea></div>
 </div>`;
}
function insumos(){
 const total=cache.inputs.length;
 const ativos=cache.inputs.filter(x=>x.active!==false).length;
 const baixos=cache.inputs.filter(x=>inputMinStock(x)>0&&inputStock(x)<=inputMinStock(x)).length;
 const valor=cache.inputs.reduce((a,x)=>a+(inputStock(x)*Number(x.unit_cost||0)),0);
 const rows=cache.inputs.map(x=>{
   const low=inputMinStock(x)>0&&inputStock(x)<=inputMinStock(x);
   const supplier=inputSupplier(x.supplier_id);
   return `<tr>
    <td><button class="link-client" onclick="viewInput('${x.id}')"><b>${esc(x.name||"—")}</b></button><small>${esc(x.brand||x.sku||"")}</small></td>
    <td>${esc(x.type||"—")}</td>
    <td>${esc(x.unit||"—")}</td>
    <td>${money(x.unit_cost)}</td>
    <td><span class="badge ${low?"warn":"ok"}">${inputStock(x)} ${esc(x.unit||"")}</span>${inputMinStock(x)>0?`<small>Mín.: ${inputMinStock(x)}</small>`:""}</td>
    <td>${esc(supplier?.name||"—")}</td>
    <td><span class="badge ${x.active===false?"warn":"ok"}">${x.active===false?"Inativo":"Ativo"}</span></td>
    <td><div class="row-actions"><button class="btn sm" onclick="viewInput('${x.id}')">Ver</button><button class="btn sm" onclick="editInput('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteInput('${x.id}')">Excluir</button></div></td>
   </tr>`;
 }).join("");
 return shell("Insumos","Base de materiais, ferragens, acessórios e serviços da VIMAK",
 `<button class="btn gold" onclick="addInput()">+ Novo Insumo</button>`,
 `<div class="grid g4 client-kpis">
   <div class="card kpi"><label>Total de insumos</label><strong>${total}</strong></div>
   <div class="card kpi"><label>Ativos</label><strong class="goldtxt">${ativos}</strong></div>
   <div class="card kpi"><label>Estoque baixo</label><strong>${baixos}</strong></div>
   <div class="card kpi"><label>Valor em estoque</label><strong>${money(valor)}</strong></div>
 </div>
 ${baixos?`<div class="cloudbar" style="margin-bottom:14px"><b>Atenção:</b> ${baixos} insumo(s) atingiram o estoque mínimo.</div>`:""}
 <div class="filters"><div class="field"><label>Buscar insumo</label><input placeholder="Nome, tipo, marca, fornecedor..." oninput="filterTable(this.value)"></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th>Tipo</th><th>Unidade</th><th>Custo Unit.</th><th>Estoque</th><th>Fornecedor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td class="empty" colspan="8">Nenhum insumo cadastrado.</td></tr>`}</tbody></table></div></div>`);
}
function addInput(){openModal("Novo Insumo",inputForm(),`saveInput()`)}
async function saveInput(id=null){
 const name=inn.value.trim(); if(!name)return toast("Informe o nome do insumo");
 const payload={
   company_id:profile.company_id,
   name,
   type:int.value,
   unit:inu.value,
   unit_cost:Number(inc.value||0),
   stock_qty:Number(ins.value||0),
   min_stock:Number(inm.value||0),
   supplier_id:inf.value||null,
   sku:insk.value.trim()||null,
   brand:inb.value.trim()||null,
   active:ina.value==="true",
   notes:ino.value.trim()||null
 };
 let error;
 if(id){({error}=await sb.from("inputs").update(payload).eq("id",id));}
 else {({error}=await sb.from("inputs").insert(payload));}
 if(error)return toast("Erro: "+error.message);
 closeModal();toast(id?"Insumo atualizado":"Insumo salvo na nuvem");render();
}
function editInput(id){const x=inputById(id);if(!x)return toast("Insumo não encontrado");openModal("Editar Insumo",inputForm(x),`saveInput('${id}')`)}
function viewInput(id){
 const x=inputById(id);if(!x)return toast("Insumo não encontrado");
 const supplier=inputSupplier(x.supplier_id);
 const low=inputMinStock(x)>0&&inputStock(x)<=inputMinStock(x);
 openModal(esc(x.name||"Insumo"),`<div class="client-detail">
  <div class="client-hero"><div class="client-avatar">I</div><div><span class="badge ${low?"warn":"ok"}">${low?"Estoque baixo":"Estoque OK"}</span><p>${esc(x.type||"Insumo")} • ${esc(x.brand||"Sem marca")}</p></div></div>
  <div class="detail-grid">
   <div><label>Código / SKU</label><b>${esc(x.sku||x.code||"—")}</b></div>
   <div><label>Fornecedor</label><b>${esc(supplier?.name||"—")}</b></div>
   <div><label>Unidade</label><b>${esc(x.unit||"—")}</b></div>
   <div><label>Custo unitário</label><b class="goldtxt">${money(x.unit_cost)}</b></div>
   <div><label>Estoque atual</label><b>${inputStock(x)} ${esc(x.unit||"")}</b></div>
   <div><label>Estoque mínimo</label><b>${inputMinStock(x)} ${esc(x.unit||"")}</b></div>
  </div>
  <div class="detail-notes"><label>Observações</label><p>${esc(x.notes||"—")}</p></div>
  <div class="client-quick"><button class="btn gold" onclick="closeModal();editInput('${id}')">Editar insumo</button></div>
 </div>`,"");
}
async function deleteInput(id){
 if(!confirm("Excluir este insumo? Esta ação não pode ser desfeita."))return;
 const {error}=await sb.from("inputs").delete().eq("id",id);
 if(error)return toast("Erro: "+error.message);
 toast("Insumo excluído");render();
}
let modelDraftItems=[];

function proposalModelById(id){return cache.proposalModels.find(x=>x.id===id)}
function proposalModelBody(x){return (x&&x.body&&typeof x.body==="object")?x.body:{}}
function modelItemTotal(x){return Number(x.qty||0)*Number(x.unit_price||0)}
function modelCostTotal(x){return Number(x.qty||0)*Number(x.cost||0)}
function modelInputOptions(){
  return cache.inputs.filter(x=>x.active!==false).map(i=>`<option value="${i.id}">${esc(i.name)} • ${money(i.unit_cost)} / ${esc(i.unit||"un")}</option>`).join("");
}
function modelForm(x={}){
  const b=proposalModelBody(x);
  return `<div class="proposal-editor model-editor">
    <div class="proposal-head-grid">
      <div class="field full"><label>Nome do modelo *</label><input id="mname" value="${esc(x.name||"")}" placeholder="Ex.: Cozinha Premium • Padrão VIMAK"></div>
      <div class="field full"><label>Ambientes padrão</label><input id="menvs" value="${esc((x.environments||[]).join(", "))}" placeholder="Cozinha, Área Gourmet, Lavanderia"></div>
      <div class="field"><label>Validade padrão (dias)</label><input id="mvalid" type="number" min="1" value="${Number(b.validity_days||15)}"></div>
      <div class="field"><label>Prazo de entrega (dias)</label><input id="mdelivery" type="number" min="0" value="${Number(b.delivery_days||45)}"></div>
      <div class="field"><label>Garantia (meses)</label><input id="mwarranty" type="number" min="0" value="${Number(b.warranty_months||60)}"></div>
      <div class="field"><label>Status</label><select id="mactive"><option value="true" ${x.active!==false?"selected":""}>Ativo</option><option value="false" ${x.active===false?"selected":""}>Inativo</option></select></div>
    </div>

    <div class="proposal-items-toolbar">
      <div class="field proposal-input-pick"><label>Adicionar Insumo ao modelo</label><select id="modelInputPick"><option value="">Selecione um insumo...</option>${modelInputOptions()}</select></div>
      <button class="btn gold" type="button" onclick="addModelInputItem()">+ Adicionar insumo</button>
      <button class="btn" type="button" onclick="addModelFreeItem()">+ Item livre</button>
    </div>

    <div class="proposal-items-card">
      <div class="table-wrap">
        <table class="table proposal-items-table">
          <thead><tr><th>Ambiente</th><th>Descrição</th><th>Qtd.</th><th>Un.</th><th>Custo</th><th>Preço venda</th><th>Total</th><th></th></tr></thead>
          <tbody id="modelItemRows"></tbody>
        </table>
      </div>
    </div>

    <div class="proposal-bottom-grid">
      <div>
        <div class="field"><label>Condições de pagamento padrão</label><textarea id="mpayment" rows="4" placeholder="Ex.: 40% entrada + saldo em 6x">${esc(b.payment_terms||"")}</textarea></div>
        <div class="field" style="margin-top:10px"><label>Observações padrão</label><textarea id="mnotes" rows="5" placeholder="Textos e condições que entrarão automaticamente na proposta">${esc(b.notes||"")}</textarea></div>
      </div>
      <div class="proposal-totals">
        <div class="field"><label>Desconto padrão (R$)</label><input id="mdiscount" type="number" min="0" step="0.01" value="${Number(b.discount||0)}" oninput="refreshModelDraft()"></div>
        <div class="field"><label>Montagem padrão (R$)</label><input id="massembly" type="number" min="0" step="0.01" value="${Number(b.assembly_fee||0)}" oninput="refreshModelDraft()"></div>
        <div class="field"><label>Frete padrão (R$)</label><input id="mfreight" type="number" min="0" step="0.01" value="${Number(b.freight||0)}" oninput="refreshModelDraft()"></div>
        <div class="proposal-summary" id="modelSummary"></div>
      </div>
    </div>
  </div>`;
}
function modelItemRow(x,idx){
  return `<tr>
    <td><input class="table-input" value="${esc(x.environment||"")}" placeholder="Cozinha" oninput="updateModelDraftItem(${idx},'environment',this.value)"></td>
    <td><input class="table-input wide" value="${esc(x.description||"")}" placeholder="Descrição do item" oninput="updateModelDraftItem(${idx},'description',this.value)"></td>
    <td><input class="table-input num" type="number" min="0" step="0.01" value="${Number(x.qty||1)}" oninput="updateModelDraftItem(${idx},'qty',this.value)"></td>
    <td><input class="table-input unit" value="${esc(x.unit||"un")}" oninput="updateModelDraftItem(${idx},'unit',this.value)"></td>
    <td><input class="table-input num" type="number" min="0" step="0.01" value="${Number(x.cost||0)}" oninput="updateModelDraftItem(${idx},'cost',this.value)"></td>
    <td><input class="table-input num" type="number" min="0" step="0.01" value="${Number(x.unit_price||0)}" oninput="updateModelDraftItem(${idx},'unit_price',this.value)"></td>
    <td><b class="goldtxt">${money(modelItemTotal(x))}</b></td>
    <td><button class="btn sm danger" type="button" onclick="removeModelDraftItem(${idx})">×</button></td>
  </tr>`;
}
function modelDraftMetrics(){
  const subtotal=modelDraftItems.reduce((a,x)=>a+modelItemTotal(x),0);
  const cost=modelDraftItems.reduce((a,x)=>a+modelCostTotal(x),0);
  const discount=Number(document.getElementById("mdiscount")?.value||0);
  const assembly=Number(document.getElementById("massembly")?.value||0);
  const freight=Number(document.getElementById("mfreight")?.value||0);
  const total=Math.max(0,subtotal-discount+assembly+freight);
  const margin=total-cost;
  const marginPct=total?margin/total*100:0;
  return {subtotal,cost,discount,assembly,freight,total,margin,marginPct};
}
function refreshModelDraft(){
  const rows=document.getElementById("modelItemRows");
  if(rows)rows.innerHTML=modelDraftItems.length?modelDraftItems.map(modelItemRow).join(""):`<tr><td class="empty" colspan="8">Modelo sem itens. Adicione insumos ou itens livres.</td></tr>`;
  const summary=document.getElementById("modelSummary");
  if(summary){
    const m=modelDraftMetrics();
    summary.innerHTML=`
      <div><span>Subtotal padrão</span><b>${money(m.subtotal)}</b></div>
      <div><span>Custo estimado</span><b>${money(m.cost)}</b></div>
      <div><span>Desconto</span><b>- ${money(m.discount)}</b></div>
      <div><span>Montagem + frete</span><b>${money(m.assembly+m.freight)}</b></div>
      <div class="proposal-total-line"><span>VALOR BASE</span><strong>${money(m.total)}</strong></div>
      <div class="proposal-margin"><span>Margem estimada</span><b class="${m.margin>=0?"green":"red"}">${money(m.margin)} • ${m.marginPct.toFixed(1)}%</b></div>`;
  }
}
function updateModelDraftItem(idx,key,value){
  if(!modelDraftItems[idx])return;
  modelDraftItems[idx][key]=["qty","cost","unit_price"].includes(key)?Number(value||0):value;
  refreshModelDraft();
}
function addModelInputItem(){
  const id=document.getElementById("modelInputPick")?.value;
  if(!id)return toast("Selecione um insumo");
  const i=cache.inputs.find(x=>x.id===id);if(!i)return;
  modelDraftItems.push({
    description:i.name,
    environment:"",
    qty:1,
    unit:i.unit||"un",
    cost:Number(i.unit_cost||0),
    unit_price:Number(i.unit_cost||0),
    metadata:{input_id:i.id,sku:i.sku||null,type:i.type||null,brand:i.brand||null}
  });
  refreshModelDraft();
}
function addModelFreeItem(){
  modelDraftItems.push({description:"",environment:"",qty:1,unit:"un",cost:0,unit_price:0,metadata:{manual:true}});
  refreshModelDraft();
}
function removeModelDraftItem(idx){modelDraftItems.splice(idx,1);refreshModelDraft()}
function addProposalModel(){
  modelDraftItems=[];
  openModal("Novo Modelo de Proposta",modelForm(),`saveProposalModel()`);modal.classList.add("proposal-modal");setTimeout(refreshModelDraft,0);
}
function editProposalModel(id){
  const x=proposalModelById(id);if(!x)return toast("Modelo não encontrado");
  const b=proposalModelBody(x);
  modelDraftItems=Array.isArray(b.items)?b.items.map(i=>({...i,metadata:i.metadata||{}})):[];
  openModal("Editar Modelo de Proposta",modelForm(x),`saveProposalModel('${id}')`);modal.classList.add("proposal-modal");setTimeout(refreshModelDraft,0);
}
async function saveProposalModel(id=""){
  const name=document.getElementById("mname")?.value.trim();
  if(!name)return toast("Informe o nome do modelo");
  if(modelDraftItems.some(x=>!String(x.description||"").trim()))return toast("Há item sem descrição");
  const environments=(document.getElementById("menvs")?.value||"").split(",").map(x=>x.trim()).filter(Boolean);
  const body={
    items:modelDraftItems,
    validity_days:Number(document.getElementById("mvalid").value||15),
    delivery_days:Number(document.getElementById("mdelivery").value||0),
    warranty_months:Number(document.getElementById("mwarranty").value||0),
    payment_terms:document.getElementById("mpayment").value.trim()||null,
    notes:document.getElementById("mnotes").value.trim()||null,
    discount:Number(document.getElementById("mdiscount").value||0),
    assembly_fee:Number(document.getElementById("massembly").value||0),
    freight:Number(document.getElementById("mfreight").value||0)
  };
  const payload={company_id:profile.company_id,name,environments,body,active:document.getElementById("mactive").value==="true"};
  let error;
  if(id){({error}=await sb.from("proposal_models").update(payload).eq("id",id));}
  else{({error}=await sb.from("proposal_models").insert(payload));}
  if(error)return toast("Erro: "+error.message);
  modal.classList.remove("proposal-modal");closeModal();toast(id?"Modelo atualizado":"Modelo salvo na nuvem");render();
}
async function duplicateProposalModel(id){
  const x=proposalModelById(id);if(!x)return;
  const payload={company_id:profile.company_id,name:(x.name||"Modelo")+" • Cópia",environments:x.environments||[],body:x.body||{},active:true};
  const {error}=await sb.from("proposal_models").insert(payload);
  if(error)return toast("Erro: "+error.message);
  toast("Modelo duplicado");render();
}
async function toggleProposalModel(id){
  const x=proposalModelById(id);if(!x)return;
  const {error}=await sb.from("proposal_models").update({active:!x.active}).eq("id",id);
  if(error)return toast("Erro: "+error.message);
  toast(!x.active?"Modelo ativado":"Modelo inativado");render();
}
async function deleteProposalModel(id){
  const x=proposalModelById(id);if(!x)return;
  if(!confirm(`Excluir o modelo "${x.name}"?`))return;
  const {error}=await sb.from("proposal_models").delete().eq("id",id);
  if(error)return toast("Erro: "+error.message);
  toast("Modelo excluído");render();
}
function viewProposalModel(id){
  const x=proposalModelById(id);if(!x)return;
  const b=proposalModelBody(x),items=Array.isArray(b.items)?b.items:[];
  const subtotal=items.reduce((a,i)=>a+modelItemTotal(i),0);
  const total=Math.max(0,subtotal-Number(b.discount||0)+Number(b.assembly_fee||0)+Number(b.freight||0));
  openModal(esc(x.name),`<div class="client-detail">
    <div class="client-hero"><div class="client-avatar">M</div><div><span class="badge ${x.active?"ok":""}">${x.active?"Ativo":"Inativo"}</span><p>${esc((x.environments||[]).join(" • ")||"Modelo comercial")}</p></div></div>
    <div class="detail-grid">
      <div><label>Itens padrão</label><b>${items.length}</b></div>
      <div><label>Valor base</label><b class="goldtxt">${money(total)}</b></div>
      <div><label>Validade</label><b>${Number(b.validity_days||15)} dias</b></div>
      <div><label>Entrega</label><b>${Number(b.delivery_days||0)||"—"} dias</b></div>
      <div><label>Garantia</label><b>${Number(b.warranty_months||0)||"—"} meses</b></div>
      <div><label>Criado em</label><b>${new Date(x.created_at).toLocaleDateString("pt-BR")}</b></div>
    </div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Ambiente</th><th>Descrição</th><th>Qtd.</th><th>Venda</th><th>Total</th></tr></thead><tbody>
      ${items.map(i=>`<tr><td>${esc(i.environment||"—")}</td><td>${esc(i.description||"")}</td><td>${Number(i.qty||0)} ${esc(i.unit||"")}</td><td>${money(i.unit_price)}</td><td><b class="goldtxt">${money(modelItemTotal(i))}</b></td></tr>`).join("")||`<tr><td class="empty" colspan="5">Modelo sem itens</td></tr>`}
    </tbody></table></div></div>
    <div class="detail-notes"><label>Condições de pagamento</label><p>${esc(b.payment_terms||"—")}</p></div>
    <div class="detail-notes"><label>Observações padrão</label><p>${esc(b.notes||"—")}</p></div>
    <div class="client-quick">
      <button class="btn gold" onclick="closeModal();applyProposalModel('${id}')">Usar em nova proposta</button>
      <button class="btn" onclick="closeModal();editProposalModel('${id}')">Editar modelo</button>
      <button class="btn" onclick="closeModal();duplicateProposalModel('${id}')">Duplicar</button>
    </div>
  </div>`,"");
}
function applyProposalModel(id){
  const x=proposalModelById(id);if(!x)return toast("Modelo não encontrado");
  if(!cache.clients.length)return toast("Cadastre um cliente antes de criar uma proposta");
  const b=proposalModelBody(x);
  const days=Number(b.validity_days||15);
  const d=new Date();d.setDate(d.getDate()+days);
  modelDraftItems=[];
  proposalDraftItems=(Array.isArray(b.items)?b.items:[]).map(i=>{
    const y={...i,metadata:{...(i.metadata||{})}};
    const inputId=y.metadata?.input_id;
    const current=inputId?cache.inputs.find(z=>z.id===inputId):null;
    if(current)y.cost=Number(current.unit_cost||y.cost||0);
    delete y.id;delete y.proposal_id;delete y.company_id;delete y.created_at;delete y.updated_at;
    return y;
  });
  openProposalEditor({
    title:x.name,
    status:"Orçado",
    valid_until:d.toISOString().slice(0,10),
    delivery_days:Number(b.delivery_days||45),
    warranty_months:Number(b.warranty_months||60),
    payment_terms:b.payment_terms||"",
    notes:b.notes||"",
    discount:Number(b.discount||0),
    assembly_fee:Number(b.assembly_fee||0),
    freight:Number(b.freight||0)
  });
  toast("Modelo aplicado. Selecione o cliente e revise os valores.");
}
function modelos(){
  const ativos=cache.proposalModels.filter(x=>x.active).length;
  const totalItens=cache.proposalModels.reduce((a,x)=>a+((proposalModelBody(x).items||[]).length),0);
  const usados=cache.proposals.filter(p=>cache.proposalModels.some(m=>m.name===p.title)).length;
  const rows=cache.proposalModels.map(x=>{
    const b=proposalModelBody(x),items=Array.isArray(b.items)?b.items:[];
    const subtotal=items.reduce((a,i)=>a+modelItemTotal(i),0);
    const total=Math.max(0,subtotal-Number(b.discount||0)+Number(b.assembly_fee||0)+Number(b.freight||0));
    return `<tr>
      <td><button class="link-client" onclick="viewProposalModel('${x.id}')"><b>${esc(x.name)}</b></button><small>${items.length} item(ns) padrão</small></td>
      <td>${esc((x.environments||[]).join(" • ")||"—")}</td>
      <td><b class="goldtxt">${money(total)}</b></td>
      <td>${Number(b.delivery_days||0)||"—"} dias</td>
      <td><span class="badge ${x.active?"ok":""}">${x.active?"Ativo":"Inativo"}</span></td>
      <td><div class="row-actions">
        <button class="btn sm gold" onclick="applyProposalModel('${x.id}')">Aplicar</button>
        <button class="btn sm" onclick="viewProposalModel('${x.id}')">Ver</button>
        <button class="btn sm" onclick="editProposalModel('${x.id}')">Editar</button>
        <button class="btn sm" onclick="duplicateProposalModel('${x.id}')">Duplicar</button>
        <button class="btn sm" onclick="toggleProposalModel('${x.id}')">${x.active?"Inativar":"Ativar"}</button>
        <button class="btn sm danger" onclick="deleteProposalModel('${x.id}')">Excluir</button>
      </div></td>
    </tr>`;
  }).join("");
  return shell("Modelos de Proposta","Padronize propostas comerciais e crie orçamentos em poucos cliques",
    `<button class="btn gold" onclick="addProposalModel()">+ Novo Modelo</button>`,
    `<div class="grid g4 proposal-kpis">
      <div class="card kpi"><label>Total de modelos</label><strong>${cache.proposalModels.length}</strong></div>
      <div class="card kpi"><label>Modelos ativos</label><strong class="goldtxt">${ativos}</strong></div>
      <div class="card kpi"><label>Itens padronizados</label><strong>${totalItens}</strong></div>
      <div class="card kpi"><label>Propostas pelo modelo</label><strong>${usados}</strong></div>
    </div>
    <div class="notice model-notice"><b>Atalho comercial:</b> use um modelo pronto, selecione o cliente e ajuste somente os detalhes específicos do projeto.</div>
    <div class="filters"><div class="field"><label>Buscar modelo</label><input placeholder="Nome, ambiente, status..." oninput="filterTable(this.value)"></div></div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Modelo</th><th>Ambientes</th><th>Valor base</th><th>Entrega</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td class="empty" colspan="6">Nenhum modelo cadastrado. Crie seu primeiro modelo de proposta.</td></tr>`}</tbody></table></div></div>`);
}

let measurementEditorId=null;
let measurementDraft=null;
let measurementTab="dados";
let measurementActiveEnvironment=0;
let measurementCanvasState={tool:"draw",drawing:false,startX:0,startY:0,lastX:0,lastY:0};

function measurementById(id){return cache.measurements.find(x=>x.id===id)}
function measurementData(x){return (x&&x.measurements&&typeof x.measurements==="object")?x.measurements:{}}
function measurementAttachments(x){return Array.isArray(x?.attachments)?x.attachments:[]}
function measurementStatus(x){return measurementData(x).status||"Rascunho"}
function measurementCode(x){
  const d=measurementData(x);
  return d.code||("MED-"+String(cache.measurements.indexOf(x)+1).padStart(5,"0"));
}
function measurementClient(id){return cache.clients.find(x=>x.id===id)}
function measurementProposal(id){return cache.proposals.find(x=>x.id===id)}
function measurementStatusClass(s){
  if(["Concluída","Finalizada"].includes(s))return "ok";
  if(["Em andamento","Em Medição"].includes(s))return "blue";
  if(["Pendente","Aguardando projeto"].includes(s))return "";
  if(["Cancelada"].includes(s))return "bad";
  return "";
}
function measurementFormatDate(v){return v?new Date(v).toLocaleDateString("pt-BR"):"—"}
function measurementTodayInput(v){
  const d=v?new Date(v):new Date();
  const off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}
function measurementNewCode(){
  const now=new Date();
  const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,"0"),d=String(now.getDate()).padStart(2,"0");
  const n=String(cache.measurements.length+1).padStart(3,"0");
  return `MED-${y}${m}${d}-${n}`;
}
function measurementEmptyEnvironment(name="Novo Ambiente"){
  return {
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),
    name,
    status:"Pendente",
    dimensions:[],
    openings:[],
    electrical:[],
    plumbing:[],
    obstacles:[],
    notes:"",
    ceiling_height:"",
    floor_level:"",
    wall_condition:"",
    squareness:"",
    baseboard:"",
    photos:[]
  };
}
function measurementBuildDraft(x={}){
  const d=measurementData(x);
  return {
    id:x.id||null,
    client_id:x.client_id||"",
    proposal_id:x.proposal_id||"",
    measured_at:measurementTodayInput(x.measured_at),
    notes:x.notes||"",
    attachments:measurementAttachments(x).map(a=>({...a})),
    data:{
      code:d.code||measurementNewCode(),
      status:d.status||"Rascunho",
      address:d.address||"",
      team:d.team||"Técnico",
      environments:Array.isArray(d.environments)&&d.environments.length?d.environments.map(e=>({...measurementEmptyEnvironment(),...e})):[],
      checklist:d.checklist||{
        paredes:false,esquadro:false,nivel:false,rodape:false,teto:false,
        eletrica:false,hidraulica:false,gas:false,ar:false,revestimentos:false,
        portas:false,janelas:false,eletros:false,interferencias:false
      },
      history:Array.isArray(d.history)?d.history:[],
      general_notes:d.general_notes||"",
      tags:Array.isArray(d.tags)?d.tags:[]
    }
  };
}
function measurementProposalOptions(selected="",clientId=""){
  return cache.proposals
    .filter(p=>!clientId||p.client_id===clientId)
    .map(p=>`<option value="${p.id}" ${selected===p.id?"selected":""}>${proposalNumber(p.number)} • ${esc(p.title)}</option>`).join("");
}
function measurementClientOptions(selected=""){
  return cache.clients.map(c=>`<option value="${c.id}" ${selected===c.id?"selected":""}>${esc(c.name)}${c.city?" • "+esc(c.city):""}</option>`).join("");
}
function startMeasurement(){
  measurementEditorId=null;
  measurementDraft=measurementBuildDraft({});
  measurementTab="dados";measurementActiveEnvironment=0;
  render();
}
function editMeasurement(id){
  const x=measurementById(id);if(!x)return toast("Medição não encontrada");
  measurementEditorId=id;
  measurementDraft=measurementBuildDraft(x);
  measurementTab="dados";measurementActiveEnvironment=0;
  render();
}
function closeMeasurementEditor(){
  measurementEditorId=null;measurementDraft=null;measurementTab="dados";measurementActiveEnvironment=0;render();
}
function measurementSwitchTab(tab){
  measurementTab=tab;
  document.querySelectorAll(".measurement-tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));
  document.querySelectorAll(".measurement-panel").forEach(x=>x.classList.toggle("active",x.dataset.panel===tab));
  if(tab==="croqui")setTimeout(initMeasurementCanvas,40);
}
function measurementSyncGeneral(){
  if(!measurementDraft)return;
  const q=id=>document.getElementById(id);
  if(q("measureClient"))measurementDraft.client_id=q("measureClient").value;
  if(q("measureProposal"))measurementDraft.proposal_id=q("measureProposal").value;
  if(q("measureDate"))measurementDraft.measured_at=q("measureDate").value;
  if(q("measureStatus"))measurementDraft.data.status=q("measureStatus").value;
  if(q("measureAddress"))measurementDraft.data.address=q("measureAddress").value;
  if(q("measureTeam"))measurementDraft.data.team=q("measureTeam").value;
  if(q("measureGeneralNotes"))measurementDraft.data.general_notes=q("measureGeneralNotes").value;
}
function measurementRefreshProposalSelect(){
  measurementSyncGeneral();
  const el=document.getElementById("measureProposal");
  if(el)el.innerHTML=`<option value="">Sem proposta vinculada</option>${measurementProposalOptions(measurementDraft.proposal_id,measurementDraft.client_id)}`;
}
function measurementAddEnvironment(){
  measurementSyncGeneral();
  const name=prompt("Nome do ambiente:","Cozinha");
  if(!name||!name.trim())return;
  measurementDraft.data.environments.push(measurementEmptyEnvironment(name.trim()));
  measurementActiveEnvironment=measurementDraft.data.environments.length-1;
  measurementTab="ambientes";render();
}
function measurementDeleteEnvironment(idx){
  if(!confirm("Excluir este ambiente e suas medidas?"))return;
  measurementDraft.data.environments.splice(idx,1);
  measurementActiveEnvironment=Math.max(0,Math.min(measurementActiveEnvironment,measurementDraft.data.environments.length-1));
  render();
}
function measurementSetEnvironment(idx){measurementActiveEnvironment=idx;render()}
function measurementEnvironment(){
  return measurementDraft?.data?.environments?.[measurementActiveEnvironment]||null;
}
function measurementAddDimension(){
  const env=measurementEnvironment();if(!env)return toast("Adicione um ambiente primeiro");
  const label=document.getElementById("quickDimLabel")?.value.trim()||"Medida";
  const value=Number(document.getElementById("quickDimValue")?.value||0);
  const unit=document.getElementById("quickDimUnit")?.value||"mm";
  const type=document.getElementById("quickDimType")?.value||"Geral";
  if(!value)return toast("Informe o valor da medida");
  env.dimensions.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),label,value,unit,type});
  render();
}
function measurementRemoveDimension(idx){
  const env=measurementEnvironment();if(!env)return;
  env.dimensions.splice(idx,1);render();
}
function measurementUpdateEnvField(field,value){
  const env=measurementEnvironment();if(!env)return;
  env[field]=value;
}
function measurementAddTechnicalPoint(kind){
  const env=measurementEnvironment();if(!env)return toast("Adicione um ambiente");
  const labels={electrical:"Ponto elétrico",plumbing:"Ponto hidráulico",openings:"Porta / Janela",obstacles:"Interferência"};
  const desc=prompt(labels[kind]+" — descrição:");
  if(!desc)return;
  const h=prompt("Altura do piso (mm), se aplicável:","");
  env[kind].push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),description:desc,height:h?Number(h):null});
  render();
}
function measurementRemoveTechnicalPoint(kind,idx){
  const env=measurementEnvironment();if(!env)return;
  env[kind].splice(idx,1);render();
}
function measurementToggleCheck(key,checked){measurementDraft.data.checklist[key]=checked}
function measurementFileIcon(a){
  const t=String(a.type||"").toLowerCase();
  if(t.startsWith("image/"))return "📷";
  if(t.includes("pdf"))return "📕";
  if(t.includes("dwg")||t.includes("dxf"))return "📐";
  if(t.includes("zip"))return "🗜";
  if(t.includes("sheet")||t.includes("excel"))return "📊";
  return "📎";
}
function measurementFileAccept(){
  return ".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.gif,.bmp,.tif,.tiff,.pdf,.dwg,.dxf,.skp,.zip,.rar,.7z,.xls,.xlsx,.csv,.doc,.docx,.txt,.rtf";
}
function measurementUploadArea(){
  const cats=["Fotos do ambiente","Visão geral","Detalhes","Elétrica","Hidráulica","Portas e janelas","Interferências","Planta baixa","Projeto","Documento"];
  return `<div class="measurement-upload-wrap">
    <div class="measurement-dropzone" id="measurementDropzone"
      ondragover="event.preventDefault();this.classList.add('drag')"
      ondragleave="this.classList.remove('drag')"
      ondrop="measurementHandleDrop(event)">
      <div class="upload-cloud">☁</div>
      <b>Arraste arquivos aqui ou clique para selecionar</b>
      <span>Fotos, plantas, desenhos, PDFs e documentos técnicos</span>
      <small>JPG, PNG, WEBP, HEIC, PDF, DWG, DXF, SKP, ZIP, XLSX, DOCX e outros • até 50 MB por arquivo</small>
      <button class="btn gold" type="button" onclick="document.getElementById('measurementFiles').click()">+ Escolher arquivos</button>
      <input id="measurementFiles" type="file" multiple accept="${measurementFileAccept()}" hidden onchange="measurementUploadFiles(this.files)">
    </div>
    <div class="field" style="margin-top:10px"><label>Categoria dos próximos uploads</label>
      <select id="measurementUploadCategory">${cats.map(x=>`<option>${x}</option>`).join("")}</select>
    </div>
  </div>`;
}
async function measurementHandleDrop(event){
  event.preventDefault();event.currentTarget.classList.remove("drag");
  await measurementUploadFiles(event.dataTransfer.files);
}
async function ensureMeasurementDraft(){
  measurementSyncGeneral();
  if(!measurementDraft.client_id){toast("Selecione o cliente antes de enviar arquivos");return null}
  if(measurementDraft.id)return measurementDraft.id;
  measurementDraft.data.history.push({at:new Date().toISOString(),action:"Medição iniciada",user:profile.name});
  const payload={
    company_id:profile.company_id,
    client_id:measurementDraft.client_id||null,
    proposal_id:measurementDraft.proposal_id||null,
    environments:measurementDraft.data.environments.map(e=>e.name),
    measurements:measurementDraft.data,
    attachments:measurementDraft.attachments,
    measured_at:new Date(measurementDraft.measured_at+"T12:00:00").toISOString(),
    responsible_id:session.user.id,
    notes:measurementDraft.notes||null
  };
  const {data,error}=await sb.from("measurements").insert(payload).select("id").single();
  if(error){toast("Erro ao iniciar medição: "+error.message);return null}
  measurementDraft.id=data.id;measurementEditorId=data.id;
  return data.id;
}
async function measurementUploadFiles(fileList){
  const files=[...(fileList||[])];
  if(!files.length)return;
  const measurementId=await ensureMeasurementDraft();if(!measurementId)return;
  const category=document.getElementById("measurementUploadCategory")?.value||"Documento";
  const max=50*1024*1024;
  for(const file of files){
    if(file.size>max){toast(`${file.name}: excede 50 MB`);continue}
    const clean=file.name.replace(/[^\w.\-]+/g,"_");
    const path=`${profile.company_id}/measurements/${measurementId}/${Date.now()}_${clean}`;
    toast("Enviando "+file.name+"...");
    const {error}=await sb.storage.from("crm-documents").upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(error){toast("Falha no upload: "+error.message);continue}
    measurementDraft.attachments.push({
      id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),
      name:file.name,path,type:file.type||"application/octet-stream",size:file.size,category,
      uploaded_at:new Date().toISOString()
    });
  }
  await saveMeasurement("Rascunho",true);
  toast("Arquivos enviados e vinculados à medição");
}
async function measurementOpenAttachment(path){
  const {data,error}=await sb.storage.from("crm-documents").createSignedUrl(path,3600);
  if(error)return toast("Erro ao abrir arquivo: "+error.message);
  window.open(data.signedUrl,"_blank");
}
async function measurementDeleteAttachment(idx){
  const a=measurementDraft.attachments[idx];if(!a)return;
  if(!confirm("Excluir este arquivo da medição?"))return;
  if(a.path){
    const {error}=await sb.storage.from("crm-documents").remove([a.path]);
    if(error)return toast("Erro ao excluir arquivo: "+error.message);
  }
  measurementDraft.attachments.splice(idx,1);
  await saveMeasurement("Rascunho",true);render();
}
function measurementAttachmentCards(){
  const arr=measurementDraft.attachments||[];
  if(!arr.length)return `<div class="empty measurement-empty-files">Nenhum arquivo enviado ainda.</div>`;
  return arr.map((a,idx)=>`<div class="measurement-file-card">
    <div class="measurement-file-icon">${measurementFileIcon(a)}</div>
    <div class="measurement-file-meta"><b>${esc(a.name)}</b><span>${esc(a.category||"Arquivo")} • ${(Number(a.size||0)/1024/1024).toFixed(1)} MB</span></div>
    <div class="row-actions"><button class="btn sm" onclick="measurementOpenAttachment('${esc(a.path)}')">Abrir</button><button class="btn sm danger" onclick="measurementDeleteAttachment(${idx})">Excluir</button></div>
  </div>`).join("");
}
function measurementChecklist(){
  const c=measurementDraft.data.checklist||{};
  const items=[
    ["paredes","Paredes conferidas"],["esquadro","Esquadro / diagonais"],["nivel","Nível de piso"],
    ["rodape","Rodapés"],["teto","Pé-direito / teto"],["eletrica","Pontos elétricos"],["hidraulica","Hidráulica"],
    ["gas","Ponto de gás"],["ar","Ar-condicionado"],["revestimentos","Revestimentos"],["portas","Portas"],
    ["janelas","Janelas"],["eletros","Eletrodomésticos"],["interferencias","Interferências"]
  ];
  return `<div class="measurement-check-grid">${items.map(([k,l])=>`<label class="measurement-check ${c[k]?"done":""}"><input type="checkbox" ${c[k]?"checked":""} onchange="measurementToggleCheck('${k}',this.checked);this.parentElement.classList.toggle('done',this.checked)"><span>✓</span>${l}</label>`).join("")}</div>`;
}
function measurementEnvironmentList(){
  const envs=measurementDraft.data.environments||[];
  return `<div class="measurement-env-list">
    ${envs.map((e,i)=>`<button class="measurement-env-item ${i===measurementActiveEnvironment?"active":""}" onclick="measurementSetEnvironment(${i})">
      <div><b>${esc(e.name)}</b><span>${e.dimensions?.length||0} medidas • ${(e.electrical?.length||0)+(e.plumbing?.length||0)} pontos técnicos</span></div>
      <span class="badge ${e.status==="Concluído"?"ok":e.status==="Em andamento"?"blue":""}">${esc(e.status||"Pendente")}</span>
    </button>`).join("")||`<div class="empty">Nenhum ambiente adicionado.</div>`}
    <button class="btn gold full" onclick="measurementAddEnvironment()">+ Adicionar Ambiente</button>
  </div>`;
}
function measurementEnvironmentEditor(){
  const e=measurementEnvironment();
  if(!e)return `<div class="card pad measurement-empty-env"><h3>Comece pelos ambientes</h3><p>Adicione cozinha, dormitório, banheiro, lavanderia, sala ou qualquer outro ambiente que será medido.</p><button class="btn gold" onclick="measurementAddEnvironment()">+ Adicionar primeiro ambiente</button></div>`;
  const technical=(kind,title)=>`<div class="measurement-tech-block"><div class="measurement-tech-head"><b>${title}</b><button class="btn sm" onclick="measurementAddTechnicalPoint('${kind}')">+ Adicionar</button></div>${(e[kind]||[]).map((p,i)=>`<div class="measurement-tech-row"><span>${esc(p.description)}${p.height!=null?` • h ${p.height} mm`:""}</span><button onclick="measurementRemoveTechnicalPoint('${kind}',${i})">×</button></div>`).join("")||`<small>Nenhum registro.</small>`}</div>`;
  return `<div class="measurement-env-editor">
    <div class="measurement-env-title">
      <div><span>AMBIENTE ATIVO</span><input value="${esc(e.name)}" oninput="measurementUpdateEnvField('name',this.value)"></div>
      <select onchange="measurementUpdateEnvField('status',this.value)">${["Pendente","Em andamento","Concluído"].map(s=>`<option ${e.status===s?"selected":""}>${s}</option>`).join("")}</select>
      <button class="btn sm danger" onclick="measurementDeleteEnvironment(${measurementActiveEnvironment})">Excluir ambiente</button>
    </div>
    <div class="measurement-room-grid">
      <div class="field"><label>Pé-direito (mm)</label><input type="number" value="${esc(e.ceiling_height||"")}" oninput="measurementUpdateEnvField('ceiling_height',this.value)"></div>
      <div class="field"><label>Desnível do piso (mm)</label><input type="number" value="${esc(e.floor_level||"")}" oninput="measurementUpdateEnvField('floor_level',this.value)"></div>
      <div class="field"><label>Condição das paredes</label><select onchange="measurementUpdateEnvField('wall_condition',this.value)"><option></option>${["Regular","Irregular","Fora de prumo","Revestida","Drywall"].map(v=>`<option ${e.wall_condition===v?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Esquadro</label><select onchange="measurementUpdateEnvField('squareness',this.value)"><option></option>${["Conferido","Fora de esquadro","A conferir"].map(v=>`<option ${e.squareness===v?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Rodapé</label><input value="${esc(e.baseboard||"")}" placeholder="Ex.: 100 mm, granito..." oninput="measurementUpdateEnvField('baseboard',this.value)"></div>
    </div>
    <div class="measurement-dim-table">
      <div class="measurement-section-title"><h3>Medidas registradas</h3><span>${e.dimensions?.length||0} medidas</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Unidade</th><th></th></tr></thead><tbody>
        ${(e.dimensions||[]).map((d,i)=>`<tr><td>${esc(d.type||"Geral")}</td><td><b>${esc(d.label)}</b></td><td class="goldtxt"><b>${Number(d.value).toLocaleString("pt-BR")}</b></td><td>${esc(d.unit||"mm")}</td><td><button class="btn sm danger" onclick="measurementRemoveDimension(${i})">Excluir</button></td></tr>`).join("")||`<tr><td class="empty" colspan="5">Nenhuma medida registrada.</td></tr>`}
      </tbody></table></div>
    </div>
    <div class="measurement-tech-grid">
      ${technical("electrical","⚡ Pontos elétricos")}
      ${technical("plumbing","💧 Hidráulica")}
      ${technical("openings","▣ Portas e janelas")}
      ${technical("obstacles","⚠ Interferências")}
    </div>
    <div class="field"><label>Observações do ambiente</label><textarea rows="5" oninput="measurementUpdateEnvField('notes',this.value)" placeholder="Prumo, parede oca, tubulação, recortes, acabamento, detalhes críticos...">${esc(e.notes||"")}</textarea></div>
  </div>`;
}
function measurementQuickPanel(){
  return `<div class="measurement-quick">
    <h3>Medidas Rápidas</h3>
    <div class="field"><label>Tipo</label><select id="quickDimType">${["Largura","Altura","Profundidade","Vão","Parede","Bancada","Eletro","Geral"].map(x=>`<option>${x}</option>`).join("")}</select></div>
    <div class="field"><label>Descrição</label><input id="quickDimLabel" placeholder="Ex.: Parede principal"></div>
    <div class="field"><label>Valor</label><input id="quickDimValue" type="number" step="0.1" placeholder="3200"></div>
    <div class="field"><label>Unidade</label><select id="quickDimUnit"><option>mm</option><option>cm</option><option>m</option></select></div>
    <button class="btn gold full" onclick="measurementAddDimension()">+ Adicionar Medida</button>
    <div class="measurement-quick-tip"><b>Padrão recomendado:</b><span>registre medidas lineares em milímetros para reduzir erros de conversão na produção.</span></div>
  </div>`;
}
function measurementCanvasHTML(){
  return `<div class="measurement-canvas-shell">
    <div class="measurement-canvas-toolbar">
      <button class="btn sm active" data-tool="draw" onclick="measurementCanvasTool('draw',this)">✎ Desenhar</button>
      <button class="btn sm" data-tool="line" onclick="measurementCanvasTool('line',this)">╱ Linha</button>
      <button class="btn sm" data-tool="erase" onclick="measurementCanvasTool('erase',this)">⌫ Borracha</button>
      <button class="btn sm" onclick="measurementCanvasClear()">Limpar</button>
      <button class="btn sm gold" onclick="saveMeasurementSketch()">Salvar croqui como PNG</button>
    </div>
    <div class="measurement-canvas-wrap"><canvas id="measurementCanvas" width="1100" height="600"></canvas></div>
    <small class="muted">Use mouse ou toque para registrar croquis rápidos. O croqui pode ser salvo diretamente nos arquivos da medição.</small>
  </div>`;
}
function measurementCanvasTool(tool,btn){
  measurementCanvasState.tool=tool;
  document.querySelectorAll(".measurement-canvas-toolbar [data-tool]").forEach(x=>x.classList.remove("active"));
  if(btn)btn.classList.add("active");
}
function initMeasurementCanvas(){
  const canvas=document.getElementById("measurementCanvas");if(!canvas||canvas.dataset.ready)return;
  canvas.dataset.ready="1";
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle="#dedede";ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=25){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}
  for(let y=0;y<canvas.height;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}
  const pos=e=>{
    const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;
    return {x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height};
  };
  const start=e=>{e.preventDefault();const p=pos(e);measurementCanvasState.drawing=true;measurementCanvasState.startX=p.x;measurementCanvasState.startY=p.y;measurementCanvasState.lastX=p.x;measurementCanvasState.lastY=p.y};
  const move=e=>{
    if(!measurementCanvasState.drawing)return;e.preventDefault();
    const p=pos(e);ctx.lineCap="round";
    if(measurementCanvasState.tool==="draw"||measurementCanvasState.tool==="erase"){
      ctx.strokeStyle=measurementCanvasState.tool==="erase"?"#ffffff":"#111111";ctx.lineWidth=measurementCanvasState.tool==="erase"?18:3;
      ctx.beginPath();ctx.moveTo(measurementCanvasState.lastX,measurementCanvasState.lastY);ctx.lineTo(p.x,p.y);ctx.stroke();
      measurementCanvasState.lastX=p.x;measurementCanvasState.lastY=p.y;
    }
  };
  const end=e=>{
    if(!measurementCanvasState.drawing)return;measurementCanvasState.drawing=false;
    if(measurementCanvasState.tool==="line"){
      const p=pos(e.changedTouches?{touches:[e.changedTouches[0]]}:e);
      ctx.strokeStyle="#111";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(measurementCanvasState.startX,measurementCanvasState.startY);ctx.lineTo(p.x,p.y);ctx.stroke();
    }
  };
  canvas.addEventListener("mousedown",start);canvas.addEventListener("mousemove",move);window.addEventListener("mouseup",end);
  canvas.addEventListener("touchstart",start,{passive:false});canvas.addEventListener("touchmove",move,{passive:false});canvas.addEventListener("touchend",end,{passive:false});
}
function measurementCanvasClear(){
  const c=document.getElementById("measurementCanvas");if(!c)return;
  c.dataset.ready="";initMeasurementCanvas();
}
async function saveMeasurementSketch(){
  const canvas=document.getElementById("measurementCanvas");if(!canvas)return;
  const id=await ensureMeasurementDraft();if(!id)return;
  const blob=await new Promise(r=>canvas.toBlob(r,"image/png",0.95));
  const name=`croqui_${measurementDraft.data.code}_${Date.now()}.png`;
  const path=`${profile.company_id}/measurements/${id}/${name}`;
  const {error}=await sb.storage.from("crm-documents").upload(path,blob,{contentType:"image/png"});
  if(error)return toast("Erro ao salvar croqui: "+error.message);
  measurementDraft.attachments.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,path,type:"image/png",size:blob.size,category:"Croqui",uploaded_at:new Date().toISOString()});
  await saveMeasurement("Rascunho",true);toast("Croqui salvo nos arquivos da medição");
}
async function saveMeasurement(statusOverride="",silent=false){
  measurementSyncGeneral();
  if(!measurementDraft.client_id){if(!silent)toast("Selecione o cliente");return false}
  if(statusOverride)measurementDraft.data.status=statusOverride;
  const historyAction=statusOverride==="Concluída"?"Medição finalizada":"Medição salva";
  const last=measurementDraft.data.history.at(-1);
  if(!last||last.action!==historyAction||Date.now()-new Date(last.at).getTime()>30000)
    measurementDraft.data.history.push({at:new Date().toISOString(),action:historyAction,user:profile.name});
  const payload={
    company_id:profile.company_id,
    client_id:measurementDraft.client_id||null,
    proposal_id:measurementDraft.proposal_id||null,
    environments:measurementDraft.data.environments.map(e=>e.name).filter(Boolean),
    measurements:measurementDraft.data,
    attachments:measurementDraft.attachments,
    measured_at:new Date(measurementDraft.measured_at+"T12:00:00").toISOString(),
    responsible_id:session.user.id,
    notes:measurementDraft.data.general_notes||null
  };
  let error,data;
  if(measurementDraft.id){
    ({error}=await sb.from("measurements").update(payload).eq("id",measurementDraft.id));
  }else{
    ({data,error}=await sb.from("measurements").insert(payload).select("id").single());
    if(data?.id){measurementDraft.id=data.id;measurementEditorId=data.id}
  }
  if(error){if(!silent)toast("Erro ao salvar: "+error.message);return false}
  if(!silent)toast(statusOverride==="Concluída"?"Medição finalizada com sucesso":"Rascunho salvo na nuvem");
  if(statusOverride==="Concluída"){measurementEditorId=null;measurementDraft=null}
  await refreshCore();render();return true;
}
async function deleteMeasurement(id){
  const x=measurementById(id);if(!x)return;
  if(!confirm(`Excluir ${measurementCode(x)}? Os arquivos vinculados também serão removidos.`))return;
  const paths=measurementAttachments(x).map(a=>a.path).filter(Boolean);
  if(paths.length)await sb.storage.from("crm-documents").remove(paths);
  const {error}=await sb.from("measurements").delete().eq("id",id);
  if(error)return toast("Erro: "+error.message);
  toast("Medição excluída");render();
}
function viewMeasurement(id){editMeasurement(id)}
function measurementHistoryHTML(){
  const h=measurementDraft.data.history||[];
  return `<div class="measurement-history">${[...h].reverse().map(x=>`<div class="measurement-history-row"><span class="measurement-history-dot"></span><div><b>${esc(x.action)}</b><span>${new Date(x.at).toLocaleString("pt-BR")} • ${esc(x.user||"Sistema")}</span></div></div>`).join("")||`<div class="empty">Histórico ainda vazio.</div>`}</div>`;
}
function measurementEditor(){
  if(!measurementDraft)measurementDraft=measurementBuildDraft(measurementEditorId?measurementById(measurementEditorId):{});
  const d=measurementDraft.data;
  const c=measurementClient(measurementDraft.client_id);
  const p=measurementProposal(measurementDraft.proposal_id);
  setTimeout(()=>{measurementSwitchTab(measurementTab);if(measurementTab==="croqui")initMeasurementCanvas()},0);
  return `<div class="measurement-pro-shell">
    <div class="measurement-pro-header">
      <div class="measurement-title-wrap"><button class="measurement-back" onclick="closeMeasurementEditor()">←</button><div><div class="measurement-version">V6.9 • MEDIÇÕES PRO</div><h1>Medições Técnicas PRO</h1><p>Registre medidas, ambientes, fotos, plantas, croquis e pontos técnicos em um único lugar.</p></div></div>
      <div class="measurement-header-actions"><button class="btn" onclick="saveMeasurement('Rascunho')">Salvar Rascunho</button><button class="btn gold" onclick="saveMeasurement('Concluída')">✓ Finalizar Medição</button></div>
    </div>

    <div class="measurement-top-summary">
      <div><span>Código</span><b>${esc(d.code)}</b></div>
      <div><span>Cliente</span><b>${esc(c?.name||"Não selecionado")}</b></div>
      <div><span>Projeto</span><b>${esc(p?.title||"Sem proposta")}</b></div>
      <div><span>Status</span><b><span class="badge ${measurementStatusClass(d.status)}">${esc(d.status)}</span></b></div>
      <div><span>Ambientes</span><b>${d.environments.length}</b></div>
      <div><span>Arquivos</span><b>${measurementDraft.attachments.length}</b></div>
    </div>

    <div class="measurement-tabs">
      ${[["dados","▤","Dados Gerais"],["ambientes","▦","Ambientes"],["arquivos","▣","Fotos & Arquivos"],["croqui","✎","Croqui & Medidas"],["checklist","✓","Checklist Técnico"],["observacoes","≡","Observações"],["historico","◷","Histórico"]].map(([id,ic,l])=>`<button class="measurement-tab ${measurementTab===id?"active":""}" data-tab="${id}" onclick="measurementSwitchTab('${id}')"><span>${ic}</span>${l}</button>`).join("")}
    </div>

    <div class="measurement-panel ${measurementTab==="dados"?"active":""}" data-panel="dados">
      <div class="measurement-main-grid">
        <div class="card pad">
          <div class="measurement-section-title"><h2>Dados da Medição</h2><span>Identificação do atendimento técnico</span></div>
          <div class="form-grid">
            <div class="field"><label>Cliente *</label><select id="measureClient" onchange="measurementRefreshProposalSelect()"><option value="">Selecione um cliente...</option>${measurementClientOptions(measurementDraft.client_id)}</select></div>
            <div class="field"><label>Código da medição</label><input value="${esc(d.code)}" disabled></div>
            <div class="field"><label>Projeto / Proposta</label><select id="measureProposal" onchange="measurementSyncGeneral()"><option value="">Sem proposta vinculada</option>${measurementProposalOptions(measurementDraft.proposal_id,measurementDraft.client_id)}</select></div>
            <div class="field"><label>Data da medição</label><input id="measureDate" type="date" value="${esc(measurementDraft.measured_at)}" onchange="measurementSyncGeneral()"></div>
            <div class="field full"><label>Endereço da medição</label><input id="measureAddress" value="${esc(d.address||"")}" placeholder="Rua, número, bairro, cidade..." oninput="measurementSyncGeneral()"></div>
            <div class="field"><label>Status</label><select id="measureStatus" onchange="measurementSyncGeneral()">${["Rascunho","Pendente","Em andamento","Aguardando projeto","Concluída","Cancelada"].map(s=>`<option ${d.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
            <div class="field"><label>Responsável técnico</label><input value="${esc(profile.name)}" disabled></div>
            <div class="field"><label>Equipe</label><select id="measureTeam" onchange="measurementSyncGeneral()">${["Técnico","Projetista","Comercial + Técnico","Montagem","Terceirizado"].map(s=>`<option ${d.team===s?"selected":""}>${s}</option>`).join("")}</select></div>
          </div>
        </div>
        <div class="card pad measurement-start-card">
          <div class="measurement-section-title"><h2>Fluxo recomendado</h2><span>Reduza retrabalho na fábrica e montagem</span></div>
          <div class="measurement-flow-step"><b>1</b><div><strong>Dados gerais</strong><span>Cliente, projeto, endereço e responsável.</span></div></div>
          <div class="measurement-flow-step"><b>2</b><div><strong>Ambientes</strong><span>Cadastre cada cômodo e suas medidas.</span></div></div>
          <div class="measurement-flow-step"><b>3</b><div><strong>Fotos & arquivos</strong><span>Documente paredes, pontos e interferências.</span></div></div>
          <div class="measurement-flow-step"><b>4</b><div><strong>Checklist</strong><span>Valide tudo antes de finalizar.</span></div></div>
          <button class="btn gold full" onclick="measurementSwitchTab('ambientes')">Começar pelos Ambientes →</button>
        </div>
      </div>
    </div>

    <div class="measurement-panel ${measurementTab==="ambientes"?"active":""}" data-panel="ambientes">
      <div class="measurement-layout">
        <div class="card pad">${measurementEnvironmentList()}</div>
        <div class="card pad">${measurementEnvironmentEditor()}</div>
        <div class="card pad">${measurementQuickPanel()}</div>
      </div>
    </div>

    <div class="measurement-panel ${measurementTab==="arquivos"?"active":""}" data-panel="arquivos">
      <div class="measurement-files-grid">
        <div class="card pad"><div class="measurement-section-title"><h2>Fotos & Arquivos</h2><span>Upload técnico multiformato</span></div>${measurementUploadArea()}</div>
        <div class="card pad"><div class="measurement-section-title"><h2>Arquivos vinculados</h2><span>${measurementDraft.attachments.length} arquivo(s)</span></div><div class="measurement-file-list">${measurementAttachmentCards()}</div></div>
      </div>
      <div class="measurement-photo-guide">
        ${[["📷","Visão geral","Fotografe o ambiente inteiro."],["⚡","Elétrica","Tomadas, interruptores e saídas."],["💧","Hidráulica","Água, esgoto e registros."],["▣","Vãos","Portas, janelas e passagens."],["⚠","Interferências","Tubos, vigas, pilares e recortes."],["📐","Planta","Anexe plantas, DWG, DXF ou PDF."]].map(([ic,t,s])=>`<div class="measurement-guide-card"><b>${ic}</b><strong>${t}</strong><span>${s}</span></div>`).join("")}
      </div>
    </div>

    <div class="measurement-panel ${measurementTab==="croqui"?"active":""}" data-panel="croqui">
      <div class="measurement-croqui-grid">
        <div class="card pad"><div class="measurement-section-title"><h2>Croqui e Anotações</h2><span>Desenho rápido para apoio da medição</span></div>${measurementCanvasHTML()}</div>
        <div class="card pad">${measurementQuickPanel()}</div>
      </div>
    </div>

    <div class="measurement-panel ${measurementTab==="checklist"?"active":""}" data-panel="checklist">
      <div class="card pad"><div class="measurement-section-title"><h2>Checklist Técnico de Conferência</h2><span>Itens essenciais antes de liberar o projeto</span></div>${measurementChecklist()}</div>
    </div>

    <div class="measurement-panel ${measurementTab==="observacoes"?"active":""}" data-panel="observacoes">
      <div class="card pad"><div class="measurement-section-title"><h2>Observações Gerais</h2><span>Registre tudo que pode afetar projeto, produção ou instalação</span></div>
        <div class="field"><label>Observações técnicas</label><textarea id="measureGeneralNotes" rows="14" oninput="measurementSyncGeneral()" placeholder="Ex.: parede fora de prumo, cliente ainda fará troca de piso, ponto hidráulico será deslocado, eletrodoméstico ainda não comprado...">${esc(d.general_notes||"")}</textarea></div>
      </div>
    </div>

    <div class="measurement-panel ${measurementTab==="historico"?"active":""}" data-panel="historico">
      <div class="card pad"><div class="measurement-section-title"><h2>Histórico da Medição</h2><span>Registro cronológico de alterações</span></div>${measurementHistoryHTML()}</div>
    </div>

    <div class="measurement-footer-actions"><button class="btn" onclick="closeMeasurementEditor()">Cancelar</button><div><button class="btn" onclick="saveMeasurement('Rascunho')">Salvar Rascunho</button><button class="btn gold" onclick="saveMeasurement('Concluída')">✓ Finalizar Medição</button></div></div>
  </div>`;
}
function medicoes(){
  if(measurementDraft||measurementEditorId)return measurementEditor();
  const total=cache.measurements.length;
  const andamento=cache.measurements.filter(x=>["Em andamento","Rascunho"].includes(measurementStatus(x))).length;
  const aguardando=cache.measurements.filter(x=>measurementStatus(x)==="Aguardando projeto").length;
  const concluidas=cache.measurements.filter(x=>measurementStatus(x)==="Concluída").length;
  const arquivos=cache.measurements.reduce((a,x)=>a+measurementAttachments(x).length,0);
  const rows=cache.measurements.map(x=>{
    const c=measurementClient(x.client_id),p=measurementProposal(x.proposal_id),d=measurementData(x),envs=x.environments||[];
    return `<tr>
      <td><button class="link-client" onclick="editMeasurement('${x.id}')"><b>${esc(measurementCode(x))}</b></button><small>${measurementFormatDate(x.measured_at)}</small></td>
      <td><b>${esc(c?.name||"Cliente não vinculado")}</b><small>${esc(p?.title||d.address||"Sem proposta")}</small></td>
      <td>${envs.length?esc(envs.slice(0,3).join(" • ")):"—"}${envs.length>3?`<small>+${envs.length-3} ambiente(s)</small>`:""}</td>
      <td><span class="badge ${measurementStatusClass(measurementStatus(x))}">${esc(measurementStatus(x))}</span></td>
      <td>${measurementAttachments(x).length}</td>
      <td><div class="row-actions"><button class="btn sm gold" onclick="editMeasurement('${x.id}')">Abrir</button><button class="btn sm danger" onclick="deleteMeasurement('${x.id}')">Excluir</button></div></td>
    </tr>`;
  }).join("");
  return shell("Medições Técnicas PRO","Medição de campo completa com ambientes, fotos, croquis, checklist e arquivos técnicos",
    `<button class="btn gold" onclick="startMeasurement()">+ Nova Medição</button>`,
    `<div class="measurement-list-hero">
      <div><span class="measurement-version">V6.9 • MEDIÇÕES PRO</span><h2>Precisão na medição. Segurança na produção.</h2><p>Centralize tudo que o projetista, a fábrica e a montagem precisam saber antes de produzir.</p></div>
      <div class="measurement-list-hero-actions"><button class="btn" onclick="toast('Use o botão Nova Medição para iniciar um atendimento técnico')">Guia rápido</button><button class="btn gold" onclick="startMeasurement()">+ Nova Medição</button></div>
    </div>
    <div class="grid g5 measurement-kpis">
      <div class="card kpi"><label>Medições realizadas</label><strong>${total}</strong></div>
      <div class="card kpi"><label>Em andamento</label><strong class="goldtxt">${andamento}</strong></div>
      <div class="card kpi"><label>Aguardando projeto</label><strong>${aguardando}</strong></div>
      <div class="card kpi"><label>Concluídas</label><strong>${concluidas}</strong></div>
      <div class="card kpi"><label>Arquivos técnicos</label><strong>${arquivos}</strong></div>
    </div>
    <div class="filters"><div class="field"><label>Buscar medição</label><input placeholder="Código, cliente, proposta, ambiente..." oninput="filterTable(this.value)"></div></div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nº / Data</th><th>Cliente / Projeto</th><th>Ambientes</th><th>Status</th><th>Arquivos</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td class="empty" colspan="6">Nenhuma medição cadastrada. Clique em + Nova Medição.</td></tr>`}</tbody></table></div></div>`);
}

let purchaseDraftItems=[];
function purchaseOrderById(id){return cache.purchaseOrders.find(x=>x.id===id)}
function purchaseSupplier(id){return cache.suppliers.find(x=>x.id===id)}
function purchaseItems(id){return cache.purchaseOrderItems.filter(x=>x.purchase_order_id===id)}
function purchaseProposal(id){return cache.proposals.find(x=>x.id===id)}
function purchaseCode(x){return "PC-"+String(cache.purchaseOrders.indexOf(x)+1).padStart(5,"0")}
function purchaseStatusClass(x){return x==="Recebido"?"ok":x==="Pedido enviado"?"blue":x==="Cancelado"?"bad":""}
function purchaseSupplierOptions(selected=""){return cache.suppliers.filter(x=>x.active!==false).map(x=>`<option value="${x.id}" ${selected===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}
function purchaseProposalOptions(selected=""){return cache.proposals.map(x=>`<option value="${x.id}" ${selected===x.id?"selected":""}>${proposalNumber(x.number)} • ${esc(x.title)}</option>`).join("")}
function purchaseInputOptions(){return cache.inputs.filter(x=>x.active!==false).map(x=>`<option value="${x.id}">${esc(x.name)} • ${money(x.unit_cost)} / ${esc(x.unit||"un")}</option>`).join("")}
function purchaseDraftTotal(){return purchaseDraftItems.reduce((a,x)=>a+Number(x.qty||0)*Number(x.unit_cost||0),0)}
function purchaseRow(x,i){return `<tr>
<td><select class="table-input" onchange="purchaseDraftItems[${i}].input_id=this.value||null">${`<option value="">Item livre</option>`+cache.inputs.map(z=>`<option value="${z.id}" ${x.input_id===z.id?"selected":""}>${esc(z.name)}</option>`).join("")}</select></td>
<td><input class="table-input wide" value="${esc(x.description||"")}" oninput="purchaseDraftItems[${i}].description=this.value"></td>
<td><input class="table-input num" type="number" min="0" step=".01" value="${Number(x.qty||1)}" oninput="purchaseDraftItems[${i}].qty=Number(this.value||0);refreshPurchaseDraft()"></td>
<td><input class="table-input num" type="number" min="0" step=".01" value="${Number(x.unit_cost||0)}" oninput="purchaseDraftItems[${i}].unit_cost=Number(this.value||0);refreshPurchaseDraft()"></td>
<td><b class="goldtxt">${money(Number(x.qty||0)*Number(x.unit_cost||0))}</b></td>
<td><button class="btn sm danger" onclick="purchaseDraftItems.splice(${i},1);refreshPurchaseDraft()">×</button></td></tr>`}
function refreshPurchaseDraft(){
 const b=document.getElementById("purchaseItemRows");if(b)b.innerHTML=purchaseDraftItems.length?purchaseDraftItems.map(purchaseRow).join(""):`<tr><td colspan="6" class="empty">Adicione insumos ao pedido.</td></tr>`;
 const t=document.getElementById("purchaseTotal");if(t)t.textContent=money(purchaseDraftTotal());
}
function addPurchaseInput(){
 const id=document.getElementById("purchaseInputPick")?.value;if(!id)return toast("Selecione um insumo");
 const x=cache.inputs.find(i=>i.id===id);if(!x)return;
 purchaseDraftItems.push({input_id:x.id,description:x.name,qty:1,unit_cost:Number(x.unit_cost||0)});refreshPurchaseDraft();
}
function addPurchaseFree(){purchaseDraftItems.push({input_id:null,description:"",qty:1,unit_cost:0});refreshPurchaseDraft()}
function importProposalToPurchase(){
 const id=document.getElementById("purchaseProposal")?.value;if(!id)return toast("Selecione uma proposta");
 const items=cache.proposalItems.filter(x=>x.proposal_id===id);
 if(!items.length)return toast("A proposta não possui itens");
 items.forEach(x=>purchaseDraftItems.push({input_id:x.input_id||null,description:x.description,qty:Number(x.qty||1),unit_cost:Number(x.cost||x.unit_cost||0)}));
 refreshPurchaseDraft();toast("Itens da proposta adicionados ao pedido");
}
function purchaseForm(x={}){
 return `<div class="purchase-editor">
 <div class="form-grid">
  <div class="field"><label>Fornecedor *</label><select id="purchaseSupplier"><option value="">Selecione...</option>${purchaseSupplierOptions(x.supplier_id)}</select></div>
  <div class="field"><label>Proposta / Projeto</label><select id="purchaseProposal"><option value="">Sem vínculo</option>${purchaseProposalOptions(x.proposal_id)}</select></div>
  <div class="field"><label>Status</label><select id="purchaseStatus">${["Aberto","Cotação","Aguardando aprovação","Pedido enviado","Parcialmente recebido","Recebido","Cancelado"].map(v=>`<option ${x.status===v?"selected":""}>${v}</option>`).join("")}</select></div>
  <div class="field"><label>Previsão de entrega</label><input id="purchaseExpected" type="date" value="${x.expected_at?x.expected_at.slice(0,10):""}"></div>
  <div class="field full"><label>Chave NF-e</label><input id="purchaseInvoiceKey" value="${esc(x.invoice_key||"")}" placeholder="44 dígitos — opcional"></div>
 </div>
 <div class="proposal-items-toolbar">
  <div class="field proposal-input-pick"><label>Adicionar do cadastro de Insumos</label><select id="purchaseInputPick"><option value="">Selecione...</option>${purchaseInputOptions()}</select></div>
  <button class="btn gold" onclick="addPurchaseInput()">+ Insumo</button><button class="btn" onclick="addPurchaseFree()">+ Item livre</button><button class="btn" onclick="importProposalToPurchase()">Importar itens da proposta</button>
 </div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th>Descrição</th><th>Qtd.</th><th>Custo unit.</th><th>Total</th><th></th></tr></thead><tbody id="purchaseItemRows"></tbody></table></div></div>
 <div class="purchase-bottom"><div class="field"><label>Observações / condições comerciais</label><textarea id="purchaseNotes" rows="5">${esc(x.notes||"")}</textarea></div><div class="purchase-total-box"><span>TOTAL DO PEDIDO</span><strong id="purchaseTotal">${money(purchaseDraftTotal())}</strong></div></div>
 </div>`;
}
function addPurchase(){purchaseDraftItems=[];openModal("Novo Pedido de Compra",purchaseForm(),`savePurchase()`);modal.classList.add("proposal-modal");setTimeout(refreshPurchaseDraft,0)}
function editPurchase(id){
 const x=purchaseOrderById(id);if(!x)return;
 purchaseDraftItems=purchaseItems(id).map(i=>({id:i.id,input_id:i.input_id,description:i.description,qty:Number(i.qty),unit_cost:Number(i.unit_cost)}));
 openModal(`Editar ${purchaseCode(x)}`,purchaseForm(x),`savePurchase('${id}')`);modal.classList.add("proposal-modal");setTimeout(refreshPurchaseDraft,0)
}
async function savePurchase(id=""){
 const supplier_id=document.getElementById("purchaseSupplier")?.value;if(!supplier_id)return toast("Selecione o fornecedor");
 if(!purchaseDraftItems.length)return toast("Adicione ao menos um item");
 if(purchaseDraftItems.some(x=>!String(x.description||"").trim()))return toast("Há item sem descrição");
 const total=purchaseDraftTotal();
 const payload={company_id:profile.company_id,supplier_id,proposal_id:document.getElementById("purchaseProposal").value||null,status:document.getElementById("purchaseStatus").value,total,invoice_key:document.getElementById("purchaseInvoiceKey").value.trim()||null,notes:document.getElementById("purchaseNotes").value.trim()||null,expected_at:document.getElementById("purchaseExpected").value?new Date(document.getElementById("purchaseExpected").value+"T12:00:00").toISOString():null,created_by:session.user.id};
 let orderId=id,error;
 if(id){({error}=await sb.from("purchase_orders").update(payload).eq("id",id));if(!error){const r=await sb.from("purchase_order_items").delete().eq("purchase_order_id",id);error=r.error}}
 else{const r=await sb.from("purchase_orders").insert(payload).select("id").single();error=r.error;orderId=r.data?.id}
 if(error)return toast("Erro: "+error.message);
 const rows=purchaseDraftItems.map(i=>({company_id:profile.company_id,purchase_order_id:orderId,input_id:i.input_id||null,description:i.description,qty:Number(i.qty||0),unit_cost:Number(i.unit_cost||0),total:Number(i.qty||0)*Number(i.unit_cost||0)}));
 const ins=await sb.from("purchase_order_items").insert(rows);if(ins.error)return toast("Pedido salvo, mas houve erro nos itens: "+ins.error.message);
 closeModal();toast(id?"Pedido atualizado":"Pedido de compra criado");render()
}
async function purchaseSetStatus(id,status){
 const patch={status};if(status==="Recebido")patch.received_at=new Date().toISOString();
 const {error}=await sb.from("purchase_orders").update(patch).eq("id",id);if(error)return toast("Erro: "+error.message);
 toast("Status atualizado");render()
}
async function deletePurchase(id){
 const x=purchaseOrderById(id);if(!x||!confirm(`Excluir ${purchaseCode(x)}?`))return;
 const {error}=await sb.from("purchase_orders").delete().eq("id",id);if(error)return toast("Erro: "+error.message);toast("Pedido excluído");render()
}
function viewPurchase(id){
 const x=purchaseOrderById(id);if(!x)return;const sup=purchaseSupplier(x.supplier_id),prop=purchaseProposal(x.proposal_id),it=purchaseItems(id);
 openModal(purchaseCode(x),`<div class="client-detail">
 <div class="client-hero"><div class="client-avatar">C</div><div><span class="badge ${purchaseStatusClass(x.status)}">${esc(x.status)}</span><h3>${esc(sup?.name||"Fornecedor")}</h3><p>${esc(prop?.title||"Compra avulsa")}</p></div></div>
 <div class="detail-grid"><div><label>Total</label><b class="goldtxt">${money(x.total)}</b></div><div><label>Pedido em</label><b>${new Date(x.ordered_at).toLocaleDateString("pt-BR")}</b></div><div><label>Previsão</label><b>${x.expected_at?new Date(x.expected_at).toLocaleDateString("pt-BR"):"—"}</b></div><div><label>NF-e</label><b>${esc(x.invoice_key||"—")}</b></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qtd.</th><th>Custo</th><th>Total</th></tr></thead><tbody>${it.map(i=>`<tr><td>${esc(i.description)}</td><td>${Number(i.qty)}</td><td>${money(i.unit_cost)}</td><td><b>${money(i.total)}</b></td></tr>`).join("")}</tbody></table></div></div>
 <div class="detail-notes"><label>Observações</label><p>${esc(x.notes||"—")}</p></div>
 <div class="client-quick"><button class="btn gold" onclick="closeModal();editPurchase('${id}')">Editar</button><button class="btn" onclick="purchaseSetStatus('${id}','Pedido enviado');closeModal()">Marcar enviado</button><button class="btn" onclick="purchaseSetStatus('${id}','Recebido');closeModal()">Receber pedido</button></div></div>`,"")
}
function purchaseCsv(){
 const lines=[["Pedido","Fornecedor","Proposta","Status","Total","Pedido em","Previsão"]];
 cache.purchaseOrders.forEach(x=>lines.push([purchaseCode(x),purchaseSupplier(x.supplier_id)?.name||"",purchaseProposal(x.proposal_id)?.title||"",x.status,x.total,x.ordered_at,x.expected_at||""]));
 const csv=lines.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="compras_vimak.csv";a.click();URL.revokeObjectURL(a.href)
}
function compras(){
 const total=cache.purchaseOrders.reduce((a,x)=>a+Number(x.total||0),0);
 const aberto=cache.purchaseOrders.filter(x=>!["Recebido","Cancelado"].includes(x.status)).reduce((a,x)=>a+Number(x.total||0),0);
 const recebidos=cache.purchaseOrders.filter(x=>x.status==="Recebido").length;
 const atrasados=cache.purchaseOrders.filter(x=>x.expected_at&&new Date(x.expected_at)<new Date()&&!["Recebido","Cancelado"].includes(x.status)).length;
 const rows=cache.purchaseOrders.map(x=>{const sup=purchaseSupplier(x.supplier_id),prop=purchaseProposal(x.proposal_id);return `<tr>
 <td><button class="link-client" onclick="viewPurchase('${x.id}')"><b>${purchaseCode(x)}</b></button><small>${new Date(x.ordered_at).toLocaleDateString("pt-BR")}</small></td>
 <td><b>${esc(sup?.name||"—")}</b></td><td>${esc(prop?.title||"Compra avulsa")}</td><td><b class="goldtxt">${money(x.total)}</b></td>
 <td>${x.expected_at?new Date(x.expected_at).toLocaleDateString("pt-BR"):"—"}</td><td><span class="badge ${purchaseStatusClass(x.status)}">${esc(x.status)}</span></td>
 <td><div class="row-actions"><button class="btn sm gold" onclick="viewPurchase('${x.id}')">Ver</button><button class="btn sm" onclick="editPurchase('${x.id}')">Editar</button><button class="btn sm danger" onclick="deletePurchase('${x.id}')">Excluir</button></div></td></tr>`}).join("");
 return shell("Compras PRO","Controle de pedidos, fornecedores, insumos, projetos e recebimentos em uma única operação",
 `<button class="btn" onclick="purchaseCsv()">Exportar CSV</button><button class="btn gold" onclick="addPurchase()">+ Novo Pedido</button>`,
 `<div class="purchase-hero"><div><span class="measurement-version">V6.10 • COMPRAS PRO</span><h2>Da proposta aprovada ao material recebido.</h2><p>Compre com rastreabilidade, custo real e vínculo direto ao projeto.</p></div><button class="btn gold" onclick="addPurchase()">+ Novo Pedido de Compra</button></div>
 <div class="grid g4 proposal-kpis"><div class="card kpi"><label>Compras registradas</label><strong>${money(total)}</strong></div><div class="card kpi"><label>Em aberto</label><strong class="goldtxt">${money(aberto)}</strong></div><div class="card kpi"><label>Pedidos recebidos</label><strong>${recebidos}</strong></div><div class="card kpi"><label>Entregas atrasadas</label><strong class="${atrasados?"red":""}">${atrasados}</strong></div></div>
 <div class="purchase-shortcuts"><button onclick="addPurchase()">🛒 Novo pedido<span>Fornecedor + itens</span></button><button onclick="toast('Selecione uma proposta dentro do Novo Pedido e use Importar itens da proposta')">📋 Comprar por proposta<span>Importe itens do projeto</span></button><button onclick="location.hash='#/fornecedores'">🏭 Fornecedores<span>Cadastro e contatos</span></button><button onclick="location.hash='#/insumos'">▦ Insumos<span>Custos e materiais</span></button></div>
 <div class="filters"><div class="field"><label>Buscar compra</label><input placeholder="Pedido, fornecedor, proposta, status..." oninput="filterTable(this.value)"></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Proposta / Projeto</th><th>Valor</th><th>Previsão</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td colspan="7" class="empty">Nenhum pedido de compra. Clique em + Novo Pedido.</td></tr>`}</tbody></table></div></div>`)
}
let templatePreviewContext={client_id:"",proposal_id:""};
function docTemplateById(id){return cache.documentTemplates.find(x=>x.id===id)}
function docTemplateTypes(){return ["Contrato","Proposta Comercial","Termo de Aceite","Medição Técnica","Ordem de Serviço","Garantia","Declaração","Recibo","Outro"]}
function docVariables(){return [
 ["{{empresa_nome}}","Empresa"],["{{empresa_documento}}","CNPJ/CPF empresa"],["{{cliente_nome}}","Cliente"],["{{cliente_documento}}","CPF/CNPJ cliente"],["{{cliente_telefone}}","Telefone"],["{{cliente_email}}","E-mail"],["{{cliente_cidade}}","Cidade"],
 ["{{proposta_numero}}","Nº proposta"],["{{proposta_titulo}}","Projeto"],["{{proposta_valor}}","Valor final"],["{{proposta_validade}}","Validade"],["{{prazo_entrega}}","Prazo entrega"],["{{garantia}}","Garantia"],["{{condicoes_pagamento}}","Pagamento"],["{{data_atual}}","Data atual"],["{{responsavel}}","Responsável"]
]}
function defaultTemplateContent(type){const base={
"Contrato":`CONTRATO DE FORNECIMENTO DE MÓVEIS PLANEJADOS\n\nCONTRATADA: {{empresa_nome}}\nCONTRATANTE: {{cliente_nome}}, documento {{cliente_documento}}.\n\nOBJETO\nFornecimento de móveis planejados referentes ao projeto {{proposta_titulo}}, proposta {{proposta_numero}}.\n\nVALOR E PAGAMENTO\nValor total: {{proposta_valor}}.\nCondições: {{condicoes_pagamento}}.\n\nPRAZO\nPrazo previsto: {{prazo_entrega}}.\n\nGARANTIA\n{{garantia}}.\n\nLocal e data: {{cliente_cidade}}, {{data_atual}}.`,
"Proposta Comercial":`PROPOSTA COMERCIAL\n\nCliente: {{cliente_nome}}\nProjeto: {{proposta_titulo}}\nProposta: {{proposta_numero}}\n\nINVESTIMENTO\n{{proposta_valor}}\n\nCondições de pagamento: {{condicoes_pagamento}}\nPrazo de entrega: {{prazo_entrega}}\nGarantia: {{garantia}}\nValidade desta proposta: {{proposta_validade}}.\n\n{{empresa_nome}}`,
"Termo de Aceite":`TERMO DE ACEITE DO PROJETO\n\nEu, {{cliente_nome}}, declaro que revisei e aprovo o projeto {{proposta_titulo}}, vinculado à proposta {{proposta_numero}}, autorizando o prosseguimento para as próximas etapas.\n\nData: {{data_atual}}.\n\nCliente: ______________________________\nResponsável: {{responsavel}}`,
"Garantia":`TERMO DE GARANTIA\n\nCliente: {{cliente_nome}}\nProjeto: {{proposta_titulo}}\nGarantia contratual: {{garantia}}.\n\nEste documento registra a garantia aplicável ao fornecimento contratado, conforme condições comerciais e orientações de uso entregues ao cliente.\n\n{{empresa_nome}} • {{data_atual}}`
};return base[type]||`{{empresa_nome}}\n\nDOCUMENTO\n\nCliente: {{cliente_nome}}\nProjeto: {{proposta_titulo}}\nData: {{data_atual}}\n\nDigite aqui o conteúdo do documento.`}
function templateForm(x={}){const type=x.type||"Contrato";return `<div class="template-editor">
<div class="form-grid"><div class="field"><label>Nome do template *</label><input id="tplName" value="${esc(x.name||'')}"></div><div class="field"><label>Tipo *</label><select id="tplType" onchange="templateTypeChanged(this.value)">${docTemplateTypes().map(v=>`<option ${type===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Status</label><select id="tplActive"><option value="true" ${x.active!==false?'selected':''}>Ativo</option><option value="false" ${x.active===false?'selected':''}>Inativo</option></select></div><div class="field"><label>Variáveis detectadas</label><input id="tplVarCount" disabled value="0 variáveis"></div></div>
<div class="template-workspace"><div><div class="template-toolbar"><b>Editor do documento</b><span>Use as variáveis para preenchimento automático</span></div><textarea id="tplContent" class="template-content" oninput="refreshTemplateVars()">${esc(x.content||defaultTemplateContent(type))}</textarea></div>
<div class="template-vars"><h3>Variáveis Inteligentes</h3><p>Clique para inserir no documento.</p>${docVariables().map(([v,l])=>`<button type="button" onclick="insertTemplateVar('${v}')"><b>${esc(l)}</b><span>${esc(v)}</span></button>`).join('')}</div></div></div>`}
function templateTypeChanged(type){const ta=document.getElementById('tplContent');if(ta&&!ta.value.trim())ta.value=defaultTemplateContent(type);refreshTemplateVars()}
function insertTemplateVar(v){const ta=document.getElementById('tplContent');if(!ta)return;const a=ta.selectionStart,b=ta.selectionEnd;ta.value=ta.value.slice(0,a)+v+ta.value.slice(b);ta.focus();ta.selectionStart=ta.selectionEnd=a+v.length;refreshTemplateVars()}
function refreshTemplateVars(){const txt=document.getElementById('tplContent')?.value||'';const vars=[...new Set(txt.match(/{{[^}]+}}/g)||[])];const el=document.getElementById('tplVarCount');if(el)el.value=`${vars.length} variáveis`}
function addDocTemplate(){openModal('Novo Template de Documento',templateForm(),`saveDocTemplate()`);modal.classList.add('proposal-modal');setTimeout(refreshTemplateVars,0)}
function editDocTemplate(id){const x=docTemplateById(id);if(!x)return;openModal('Editar Template',templateForm(x),`saveDocTemplate('${id}')`);modal.classList.add('proposal-modal');setTimeout(refreshTemplateVars,0)}
async function saveDocTemplate(id=''){const name=document.getElementById('tplName').value.trim(),type=document.getElementById('tplType').value,content=document.getElementById('tplContent').value;if(!name)return toast('Informe o nome do template');if(!content.trim())return toast('Digite o conteúdo');const variables=[...new Set(content.match(/{{[^}]+}}/g)||[])];const payload={company_id:profile.company_id,name,type,content,variables,active:document.getElementById('tplActive').value==='true'};let error;if(id)({error}=await sb.from('document_templates').update(payload).eq('id',id));else({error}=await sb.from('document_templates').insert(payload));if(error)return toast('Erro: '+error.message);closeModal();toast(id?'Template atualizado':'Template criado');render()}
async function duplicateDocTemplate(id){const x=docTemplateById(id);if(!x)return;const {error}=await sb.from('document_templates').insert({company_id:profile.company_id,name:x.name+' • Cópia',type:x.type,content:x.content,variables:x.variables||[],active:true});if(error)return toast('Erro: '+error.message);toast('Template duplicado');render()}
async function toggleDocTemplate(id){const x=docTemplateById(id);if(!x)return;const {error}=await sb.from('document_templates').update({active:!x.active}).eq('id',id);if(error)return toast('Erro: '+error.message);toast('Status atualizado');render()}
async function deleteDocTemplate(id){const x=docTemplateById(id);if(!x||!confirm(`Excluir o template "${x.name}"?`))return;const {error}=await sb.from('document_templates').delete().eq('id',id);if(error)return toast('Erro: '+error.message);toast('Template excluído');render()}
function templateClientOptions(){return cache.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
function templateProposalOptions(client=''){return cache.proposals.filter(p=>!client||p.client_id===client).map(p=>`<option value="${p.id}">${proposalNumber(p.number)} • ${esc(p.title)}</option>`).join('')}
function templateContextForm(id){return `<div class="template-generate"><div class="notice"><b>Documento inteligente:</b> escolha cliente e proposta. O CRM preencherá automaticamente as variáveis do template.</div><div class="form-grid"><div class="field"><label>Cliente *</label><select id="docClient" onchange="refreshDocProposal()"><option value="">Selecione...</option>${templateClientOptions()}</select></div><div class="field"><label>Proposta / Projeto</label><select id="docProposal"><option value="">Sem proposta</option>${templateProposalOptions()}</select></div></div><div id="docLivePreview" class="document-preview-empty">Selecione os dados e clique em Visualizar Documento.</div><div class="client-quick"><button class="btn gold" onclick="previewGeneratedDocument('${id}')">Visualizar Documento</button><button class="btn" onclick="printGeneratedDocument('${id}')">Gerar PDF / Imprimir</button></div></div>`}
function refreshDocProposal(){const c=document.getElementById('docClient')?.value||'';const p=document.getElementById('docProposal');if(p)p.innerHTML=`<option value="">Sem proposta</option>${templateProposalOptions(c)}`}
function templateResolve(id){const t=docTemplateById(id),cid=document.getElementById('docClient')?.value,pid=document.getElementById('docProposal')?.value,c=cache.clients.find(x=>x.id===cid),p=cache.proposals.find(x=>x.id===pid);if(!t||!c)return null;const vars={empresa_nome:company?.name||'VIMAK Planejados',empresa_documento:company?.document||company?.cnpj||'',cliente_nome:c.name||'',cliente_documento:c.document||c.cpf_cnpj||'',cliente_telefone:c.phone||'',cliente_email:c.email||'',cliente_cidade:c.city||'',proposta_numero:p?proposalNumber(p.number):'',proposta_titulo:p?.title||'',proposta_valor:p?money(p.final_value||p.total||0):'',proposta_validade:p?.valid_until?new Date(p.valid_until).toLocaleDateString('pt-BR'):'',prazo_entrega:p?.delivery_days?`${p.delivery_days} dias`:'',garantia:p?.warranty_months?`${p.warranty_months} meses`:'',condicoes_pagamento:p?.payment_terms||'',data_atual:new Date().toLocaleDateString('pt-BR'),responsavel:profile.name||''};let text=t.content;Object.entries(vars).forEach(([k,v])=>text=text.replaceAll(`{{${k}}}`,v||'—'));return {t,c,p,text}}
function docHtml(res){return `<div class="document-paper"><div class="document-brand"><div><b>${esc(company?.name||'VIMAK Planejados')}</b><span>Documento gerado pelo VIMAK CRM</span></div><span>${new Date().toLocaleDateString('pt-BR')}</span></div><div class="document-body">${esc(res.text).replaceAll('\n','<br>')}</div><div class="document-footer">${esc(company?.name||'VIMAK Planejados')} • Documento eletrônico gerado pelo CRM</div></div>`}
function generateDocTemplate(id){openModal('Gerar Documento',templateContextForm(id),'');modal.classList.add('proposal-modal')}
function previewGeneratedDocument(id){const r=templateResolve(id);if(!r)return toast('Selecione o cliente');document.getElementById('docLivePreview').innerHTML=docHtml(r)}
function printGeneratedDocument(id){const r=templateResolve(id);if(!r)return toast('Selecione o cliente');const w=window.open('','_blank');w.document.write(`<html><head><title>${esc(r.t.name)}</title><style>body{font-family:Arial;margin:0;background:#eee}.paper{max-width:800px;margin:30px auto;background:white;padding:60px;color:#222;line-height:1.65}.brand{border-bottom:2px solid #c9973f;padding-bottom:18px;margin-bottom:30px;font-size:22px;font-weight:bold}.foot{border-top:1px solid #ddd;margin-top:40px;padding-top:15px;font-size:10px;color:#777}@media print{body{background:white}.paper{margin:0;box-shadow:none}}</style></head><body><div class="paper"><div class="brand">${esc(company?.name||'VIMAK Planejados')}</div>${esc(r.text).replaceAll('\n','<br>')}<div class="foot">Gerado em ${new Date().toLocaleString('pt-BR')} • VIMAK CRM</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function viewDocTemplate(id){const x=docTemplateById(id);if(!x)return;openModal(x.name,`<div class="client-detail"><div class="client-hero"><div class="client-avatar">D</div><div><span class="badge ${x.active?'ok':''}">${x.active?'Ativo':'Inativo'}</span><h3>${esc(x.type)}</h3><p>${(x.variables||[]).length} variáveis inteligentes</p></div></div><div class="document-paper compact"><div class="document-body">${esc(x.content).replaceAll('\n','<br>')}</div></div><div class="client-quick"><button class="btn gold" onclick="closeModal();generateDocTemplate('${id}')">Gerar Documento</button><button class="btn" onclick="closeModal();editDocTemplate('${id}')">Editar</button><button class="btn" onclick="duplicateDocTemplate('${id}')">Duplicar</button></div></div>`,'')}
function seedDocTemplates(){const defs=[['Contrato Padrão VIMAK','Contrato'],['Proposta Comercial Premium','Proposta Comercial'],['Termo de Aceite do Projeto','Termo de Aceite'],['Termo de Garantia','Garantia']];Promise.all(defs.map(([name,type])=>sb.from('document_templates').insert({company_id:profile.company_id,name,type,content:defaultTemplateContent(type),variables:[...new Set(defaultTemplateContent(type).match(/{{[^}]+}}/g)||[])],active:true}))).then(()=>{toast('Modelos profissionais criados');render()})}
function templates(){const ativos=cache.documentTemplates.filter(x=>x.active).length,tipos=new Set(cache.documentTemplates.map(x=>x.type)).size,vars=cache.documentTemplates.reduce((a,x)=>a+(x.variables||[]).length,0);const rows=cache.documentTemplates.map(x=>`<tr><td><button class="link-client" onclick="viewDocTemplate('${x.id}')"><b>${esc(x.name)}</b></button><small>${(x.variables||[]).length} variáveis</small></td><td>${esc(x.type)}</td><td><span class="badge ${x.active?'ok':''}">${x.active?'Ativo':'Inativo'}</span></td><td>${new Date(x.updated_at||x.created_at).toLocaleDateString('pt-BR')}</td><td><div class="row-actions"><button class="btn sm gold" onclick="generateDocTemplate('${x.id}')">Gerar PDF</button><button class="btn sm" onclick="editDocTemplate('${x.id}')">Editar</button><button class="btn sm" onclick="duplicateDocTemplate('${x.id}')">Duplicar</button><button class="btn sm" onclick="toggleDocTemplate('${x.id}')">${x.active?'Inativar':'Ativar'}</button><button class="btn sm danger" onclick="deleteDocTemplate('${x.id}')">Excluir</button></div></td></tr>`).join('');return shell('Documentos & Templates PRO','Contratos, propostas, termos e documentos inteligentes preenchidos automaticamente pelo CRM',`<button class="btn" onclick="seedDocTemplates()">+ Modelos VIMAK</button><button class="btn gold" onclick="addDocTemplate()">+ Novo Template</button>`,`<div class="document-hero"><div><span class="measurement-version">V6.11 • DOCUMENTOS PRO</span><h2>Do CRM para o documento, sem redigitar informações.</h2><p>Crie templates reutilizáveis e gere documentos personalizados usando dados reais de clientes e propostas.</p></div><button class="btn gold" onclick="addDocTemplate()">+ Criar Template</button></div><div class="grid g4 proposal-kpis"><div class="card kpi"><label>Templates</label><strong>${cache.documentTemplates.length}</strong></div><div class="card kpi"><label>Ativos</label><strong class="goldtxt">${ativos}</strong></div><div class="card kpi"><label>Tipos de documento</label><strong>${tipos}</strong></div><div class="card kpi"><label>Variáveis configuradas</label><strong>${vars}</strong></div></div><div class="document-type-cards">${[['▤','Contrato','Contratos personalizados'],['▧','Proposta Comercial','Apresentação comercial'],['✓','Termo de Aceite','Aprovação formal'],['◇','Garantia','Pós-venda profissional']].map(([i,t,d])=>`<button onclick="addDocTemplate()"><b>${i}</b><strong>${t}</strong><span>${d}</span></button>`).join('')}</div><div class="filters"><div class="field"><label>Buscar template</label><input placeholder="Nome, tipo, status..." oninput="filterTable(this.value)"></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Template</th><th>Tipo</th><th>Status</th><th>Atualizado</th><th>Ações</th></tr></thead><tbody id="rows">${rows||`<tr><td colspan="5" class="empty">Nenhum template. Use + Modelos VIMAK para começar com uma biblioteca profissional.</td></tr>`}</tbody></table></div></div>`)}
const PROD_STAGES=["Orçado","Aprovado / Medição","Compras","Corte / Usinagem","Montagem Interna","Expedição","Em Montagem","Entregue"];
const PROD_STAGE_PROGRESS={"Orçado":5,"Aprovado / Medição":15,"Compras":30,"Corte / Usinagem":50,"Montagem Interna":70,"Expedição":82,"Em Montagem":92,"Entregue":100};
let productionView="kanban",productionFilter="todos",productionSearch="";
function prodById(id){return cache.productionProjects.find(x=>x.id===id)}
function prodClient(id){return cache.clients.find(x=>x.id===id)}
function prodProposal(id){return cache.proposals.find(x=>x.id===id)}
function prodStageClass(s){return s==='Entregue'?'ok':s==='Em Montagem'?'blue':s==='Corte / Usinagem'?'gold':''}
function prodPriorityClass(p){return p==='Urgente'?'bad':p==='Alta'?'gold':p==='Baixa'?'ok':''}
function prodIsLate(x){return x.due_date&&new Date(x.due_date+'T23:59:59')<new Date()&&x.stage!=='Entregue'}
function prodDays(x){if(!x.due_date)return null;return Math.ceil((new Date(x.due_date+'T23:59:59')-new Date())/86400000)}
function prodFiltered(){return cache.productionProjects.filter(x=>{const c=prodClient(x.client_id),p=prodProposal(x.proposal_id),q=productionSearch.toLowerCase();const okq=!q||[x.title,c?.name,p?.title,x.stage,x.priority].some(v=>String(v||'').toLowerCase().includes(q));const okf=productionFilter==='todos'||(productionFilter==='atrasados'&&prodIsLate(x))||(productionFilter==='urgentes'&&x.priority==='Urgente')||x.stage===productionFilter;return okq&&okf})}
function prodProposalOptions(selected=''){return cache.proposals.map(x=>`<option value="${x.id}" ${selected===x.id?'selected':''}>${proposalNumber(x.number)} • ${esc(x.title)}</option>`).join('')}
function prodClientOptions(selected=''){return cache.clients.map(x=>`<option value="${x.id}" ${selected===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}
function prodForm(x={}){return `<div class="production-editor"><div class="form-grid"><div class="field full"><label>Projeto / Ordem de Produção *</label><input id="prodTitle" value="${esc(x.title||'')}" placeholder="Ex.: Cozinha + Área Gourmet — Família Silva"></div><div class="field"><label>Cliente *</label><select id="prodClient"><option value="">Selecione...</option>${prodClientOptions(x.client_id)}</select></div><div class="field"><label>Proposta vinculada</label><select id="prodProposal"><option value="">Sem proposta</option>${prodProposalOptions(x.proposal_id)}</select></div><div class="field"><label>Etapa atual</label><select id="prodStage" onchange="prodStageAutoProgress()">${PROD_STAGES.map(v=>`<option ${x.stage===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Prioridade</label><select id="prodPriority">${['Baixa','Normal','Alta','Urgente'].map(v=>`<option ${x.priority===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Progresso (%)</label><input id="prodProgress" type="number" min="0" max="100" value="${Number(x.progress||0)}"></div><div class="field"><label>Prazo de entrega</label><input id="prodDue" type="date" value="${x.due_date||''}"></div><div class="field full"><label>Observações de produção</label><textarea id="prodNotes" rows="7" placeholder="Materiais especiais, ferragens, detalhes críticos, sequência de fabricação, pendências...">${esc(x.notes||'')}</textarea></div></div><div class="production-quality-tip"><b>Controle industrial VIMAK</b><span>Use o Kanban para mover o projeto entre as etapas. O progresso é atualizado automaticamente e pode ser refinado manualmente.</span></div></div>`}
function prodStageAutoProgress(){const s=document.getElementById('prodStage')?.value,p=document.getElementById('prodProgress');if(p&&s)p.value=PROD_STAGE_PROGRESS[s]||0}
function addProduction(){openModal('Nova Ordem de Produção',prodForm({stage:'Orçado',priority:'Normal',progress:5}),`saveProduction()`);modal.classList.add('proposal-modal')}
function editProduction(id){const x=prodById(id);if(!x)return;openModal('Editar Ordem de Produção',prodForm(x),`saveProduction('${id}')`);modal.classList.add('proposal-modal')}
async function saveProduction(id=''){const title=document.getElementById('prodTitle').value.trim(),client_id=document.getElementById('prodClient').value;if(!title)return toast('Informe o nome do projeto');if(!client_id)return toast('Selecione o cliente');const payload={company_id:profile.company_id,title,client_id,proposal_id:document.getElementById('prodProposal').value||null,stage:document.getElementById('prodStage').value,priority:document.getElementById('prodPriority').value,progress:Math.max(0,Math.min(100,Number(document.getElementById('prodProgress').value||0))),due_date:document.getElementById('prodDue').value||null,responsible_id:session.user.id,notes:document.getElementById('prodNotes').value.trim()||null};let error;if(id)({error}=await sb.from('production_projects').update(payload).eq('id',id));else({error}=await sb.from('production_projects').insert(payload));if(error)return toast('Erro: '+error.message);closeModal();toast(id?'Produção atualizada':'Ordem de produção criada');render()}
async function deleteProduction(id){const x=prodById(id);if(!x||!confirm(`Excluir a ordem "${x.title}"?`))return;const {error}=await sb.from('production_projects').delete().eq('id',id);if(error)return toast('Erro: '+error.message);toast('Ordem excluída');render()}
async function moveProduction(id,stage){const x=prodById(id);if(!x||x.stage===stage)return;const progress=Math.max(Number(x.progress||0),PROD_STAGE_PROGRESS[stage]||0);const {error}=await sb.from('production_projects').update({stage,progress:stage==='Entregue'?100:progress}).eq('id',id);if(error)return toast('Erro ao mover: '+error.message);toast(`Movido para ${stage}`);render()}
function prodDragStart(e,id){e.dataTransfer.setData('text/plain',id);e.currentTarget.classList.add('dragging')}
function prodDrop(e,stage){e.preventDefault();e.currentTarget.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');moveProduction(id,stage)}
function prodCard(x){const c=prodClient(x.client_id),p=prodProposal(x.proposal_id),days=prodDays(x),late=prodIsLate(x);return `<article class="production-card ${late?'late':''}" draggable="true" ondragstart="prodDragStart(event,'${x.id}')" ondragend="this.classList.remove('dragging')"><div class="production-card-top"><span class="badge ${prodPriorityClass(x.priority)}">${esc(x.priority||'Normal')}</span>${late?'<span class="production-late">ATRASADO</span>':''}</div><button class="production-card-title" onclick="viewProduction('${x.id}')">${esc(x.title)}</button><div class="production-client">${esc(c?.name||'Cliente')}<small>${esc(p?.title||'Sem proposta vinculada')}</small></div><div class="production-progress"><div><span>Progresso</span><b>${Number(x.progress||0)}%</b></div><div class="production-progress-bar"><i style="width:${Number(x.progress||0)}%"></i></div></div><div class="production-card-foot"><span>${x.due_date?(late?`⚠ ${Math.abs(days)}d atraso`:days===0?'Hoje':days>0?`${days}d restantes`:'Prazo'):'Sem prazo'}</span><button onclick="event.stopPropagation();editProduction('${x.id}')">•••</button></div></article>`}
function viewProduction(id){const x=prodById(id);if(!x)return;const c=prodClient(x.client_id),p=prodProposal(x.proposal_id),m=cache.measurements.filter(z=>z.client_id===x.client_id),po=cache.purchaseOrders.filter(z=>z.proposal_id&&z.proposal_id===x.proposal_id);openModal('Ordem de Produção',`<div class="client-detail"><div class="production-detail-hero"><div><span class="badge ${prodStageClass(x.stage)}">${esc(x.stage)}</span><h2>${esc(x.title)}</h2><p>${esc(c?.name||'Cliente')} • ${esc(p?.title||'Sem proposta')}</p></div><div class="production-big-progress"><strong>${Number(x.progress||0)}%</strong><span>concluído</span></div></div><div class="detail-grid"><div><label>Prioridade</label><b>${esc(x.priority||'Normal')}</b></div><div><label>Prazo</label><b class="${prodIsLate(x)?'red':''}">${x.due_date?new Date(x.due_date+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</b></div><div><label>Medições do cliente</label><b>${m.length}</b></div><div><label>Pedidos vinculados</label><b>${po.length}</b></div></div><div class="production-timeline">${PROD_STAGES.map(st=>`<button class="${PROD_STAGES.indexOf(st)<=PROD_STAGES.indexOf(x.stage)?'done':''} ${st===x.stage?'current':''}" onclick="moveProduction('${id}','${st}');closeModal()"><i>✓</i><span>${st}</span></button>`).join('')}</div><div class="detail-notes"><label>Observações de produção</label><p>${esc(x.notes||'Nenhuma observação.')}</p></div><div class="client-quick"><button class="btn gold" onclick="closeModal();editProduction('${id}')">Editar Ordem</button><button class="btn" onclick="closeModal();location.hash='#/medicoes'">Abrir Medições</button><button class="btn" onclick="closeModal();location.hash='#/compras'">Abrir Compras</button></div></div>`,'')}
async function createProductionFromProposal(id){const p=prodProposal(id);if(!p)return;const exists=cache.productionProjects.find(x=>x.proposal_id===id);if(exists)return viewProduction(exists.id);const c=prodClient(p.client_id);const payload={company_id:profile.company_id,proposal_id:p.id,client_id:p.client_id,title:p.title||`Projeto ${c?.name||''}`,stage:'Aprovado / Medição',progress:15,priority:'Normal',responsible_id:session.user.id,notes:'Ordem criada a partir da proposta '+proposalNumber(p.number)};const {error}=await sb.from('production_projects').insert(payload);if(error)return toast('Erro: '+error.message);toast('Ordem criada a partir da proposta');render()}
function productionProposalImport(){const opts=cache.proposals.filter(p=>!cache.productionProjects.some(x=>x.proposal_id===p.id)).map(p=>`<option value="${p.id}">${proposalNumber(p.number)} • ${esc(p.title)} • ${esc(prodClient(p.client_id)?.name||'')}</option>`).join('');openModal('Enviar Proposta para Produção',`<div class="notice"><b>Integração comercial → fábrica:</b> escolha uma proposta e o CRM criará a Ordem de Produção já vinculada ao cliente.</div><div class="field" style="margin-top:12px"><label>Proposta</label><select id="prodImportProposal"><option value="">Selecione...</option>${opts}</select></div>`,`createProductionFromProposal(document.getElementById('prodImportProposal').value);closeModal()`)}
function productionSetView(v){productionView=v;render()}
function productionSetFilter(v){productionFilter=v;render()}
function productionSetSearch(v){productionSearch=v;render()}
function productionKanban(){const items=prodFiltered();return `<div class="production-board">${PROD_STAGES.map(stage=>{const list=items.filter(x=>x.stage===stage);return `<section class="production-column" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="prodDrop(event,'${stage}')"><header><div><span class="production-stage-dot"></span><b>${stage}</b></div><strong>${list.length}</strong></header><div class="production-column-total">${list.length?Math.round(list.reduce((a,x)=>a+Number(x.progress||0),0)/list.length):0}% médio</div><div class="production-cards">${list.map(prodCard).join('')||'<div class="production-drop-empty">Arraste um projeto para esta etapa</div>'}</div></section>`}).join('')}</div>`}
function productionTable(){const items=prodFiltered();return `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Projeto</th><th>Cliente</th><th>Etapa</th><th>Prioridade</th><th>Progresso</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>${items.map(x=>`<tr><td><button class="link-client" onclick="viewProduction('${x.id}')"><b>${esc(x.title)}</b></button></td><td>${esc(prodClient(x.client_id)?.name||'—')}</td><td><span class="badge ${prodStageClass(x.stage)}">${esc(x.stage)}</span></td><td>${esc(x.priority||'Normal')}</td><td><b>${x.progress}%</b></td><td class="${prodIsLate(x)?'red':''}">${x.due_date?new Date(x.due_date+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td><td><div class="row-actions"><button class="btn sm gold" onclick="viewProduction('${x.id}')">Ver</button><button class="btn sm" onclick="editProduction('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteProduction('${x.id}')">Excluir</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nenhum projeto encontrado.</td></tr>'}</tbody></table></div></div>`}
function kanban(){const total=cache.productionProjects.length,active=cache.productionProjects.filter(x=>x.stage!=='Entregue').length,late=cache.productionProjects.filter(prodIsLate).length,urgent=cache.productionProjects.filter(x=>x.priority==='Urgente'&&x.stage!=='Entregue').length,avg=total?Math.round(cache.productionProjects.reduce((a,x)=>a+Number(x.progress||0),0)/total):0;return shell('Produção • Kanban PRO','Gestão visual da fábrica, prazos e avanço de cada projeto em tempo real',`<button class="btn" onclick="productionProposalImport()">↗ Importar Proposta</button><button class="btn gold" onclick="addProduction()">+ Nova Ordem</button>`,`<div class="production-command"><div><span class="measurement-version">V6.12 • PRODUÇÃO KANBAN PRO</span><h2>Torre de Controle da Produção</h2><p>Do projeto aprovado à entrega: visualize gargalos, prioridades, atrasos e progresso da fábrica.</p></div><div class="production-command-score"><strong>${avg}%</strong><span>avanço médio</span></div></div><div class="grid g5 measurement-kpis"><div class="card kpi"><label>Projetos</label><strong>${total}</strong></div><div class="card kpi"><label>Em produção</label><strong class="goldtxt">${active}</strong></div><div class="card kpi"><label>Atrasados</label><strong class="${late?'red':''}">${late}</strong></div><div class="card kpi"><label>Urgentes</label><strong class="${urgent?'red':''}">${urgent}</strong></div><div class="card kpi"><label>Avanço médio</label><strong>${avg}%</strong></div></div><div class="production-controls"><div class="production-filters"><button class="${productionFilter==='todos'?'active':''}" onclick="productionSetFilter('todos')">Todos</button><button class="${productionFilter==='atrasados'?'active':''}" onclick="productionSetFilter('atrasados')">Atrasados</button><button class="${productionFilter==='urgentes'?'active':''}" onclick="productionSetFilter('urgentes')">Urgentes</button></div><div class="production-search"><input value="${esc(productionSearch)}" placeholder="Buscar projeto, cliente, etapa..." oninput="productionSetSearch(this.value)"></div><div class="production-view"><button class="${productionView==='kanban'?'active':''}" onclick="productionSetView('kanban')">▦ Kanban</button><button class="${productionView==='lista'?'active':''}" onclick="productionSetView('lista')">☷ Lista</button></div></div>${productionView==='kanban'?productionKanban():productionTable()}`)}
let cutDraft={pieces:[],layouts:[],settings:{sheetW:2750,sheetH:1850,kerf:4,trim:10,minRemnantW:300,minRemnantH:300,grain:true},source:'Manual'};
function cutById(id){return cache.cuttingPlans.find(x=>x.id===id)}
function cutProject(id){return cache.productionProjects.find(x=>x.id===id)}
let ccTab='enviar',ccDraft={source:'Promob',pieces:[],fileName:'',settings:{sheetW:2750,sheetH:1850,kerf:4,trim:2,useRemnants:true,groupMaterial:true,optimize:true,respectGrain:true}};
function ccRecords(){return cache.integrations.filter(x=>String(x.type||x.provider||x.name||'').toLowerCase().includes('cortecloud'))}
function ccConfig(){return ccRecords().find(x=>x.status==='Configurado'||x.status==='Conectado')||ccRecords()[0]}
function ccData(x){return x?.config||x?.data||{}}
function ccSetTab(v){ccTab=v;render()}
function ccSetSource(v){ccDraft.source=v;document.querySelectorAll('.cc-source').forEach(x=>x.classList.toggle('active',x.dataset.source===v))}
function ccPick(row,names){const norm=k=>String(k||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');let m={};Object.keys(row).forEach(k=>m[norm(k)]=row[k]);for(const n of names)if(m[norm(n)]!==undefined&&m[norm(n)]!=='')return m[norm(n)];return ''}
function ccDelimited(text){const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];const d=[';','\t',',','|'].sort((a,b)=>lines[0].split(b).length-lines[0].split(a).length)[0],split=l=>l.split(d).map(x=>x.replace(/^"|"$/g,'').trim()),h=split(lines[0]);return lines.slice(1).map(l=>{let a=split(l),o={};h.forEach((k,i)=>o[k]=a[i]||'');return o})}
function ccParseFile(input){const f=input.files?.[0];if(!f)return;ccDraft.fileName=f.name;const r=new FileReader();r.onload=()=>{try{let rows=[],txt=String(r.result||'');if(f.name.toLowerCase().endsWith('.xml')){const d=new DOMParser().parseFromString(txt,'text/xml');rows=[...d.querySelectorAll('piece,peca,item,part')].map(n=>{let o={};[...n.attributes].forEach(a=>o[a.name]=a.value);[...n.children].forEach(c=>o[c.tagName]=c.textContent.trim());return o})}else rows=ccDelimited(txt);ccDraft.pieces=[];rows.forEach((x,i)=>{let w=Number(String(ccPick(x,['comprimento','length','largura','width'])).replace(',','.'))||0,h=Number(String(ccPick(x,['largura','width','altura','height'])).replace(',','.'))||0,q=Math.max(1,parseInt(ccPick(x,['quantidade','qty','qtd','quantity']))||1);for(let n=0;n<q;n++)if(w&&h)ccDraft.pieces.push({name:ccPick(x,['descricao','descrição','nome','peca','peça','description'])||`Peça ${i+1}`,w,h,t:Number(String(ccPick(x,['espessura','thickness','esp'])).replace(',','.'))||15,material:ccPick(x,['material','chapa','decor','cor'])||'MDF',edge:ccPick(x,['fita','borda','edge'])||'',grain:!['s','1','sim','true'].includes(String(ccPick(x,['ignorarveio','ignoregrain'])).toLowerCase())})});ccPreview();toast(`${ccDraft.pieces.length} peças carregadas`)}catch(e){toast('Não foi possível ler: '+e.message)}};r.readAsText(f);input.value=''}
function ccPreview(){const b=document.getElementById('ccPreviewRows');if(!b)return;b.innerHTML=ccDraft.pieces.slice(0,100).map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td>${x.w}</td><td>${x.h}</td><td>${x.t}</td><td>${esc(x.material)}</td><td>1</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Importe uma lista para pré-visualizar.</td></tr>';const area=ccDraft.pieces.reduce((a,x)=>a+x.w*x.h/1e6,0);document.getElementById('ccPreviewStats')&&(document.getElementById('ccPreviewStats').innerHTML=`<span>Total: <b>${ccDraft.pieces.length}</b> peças</span><span>Área: <b>${area.toFixed(2)} m²</b></span>`)}
function ccSimulate(){if(!ccDraft.pieces.length)return toast('Importe peças primeiro');cutDraft={pieces:ccDraft.pieces.map(x=>({...x,id:crypto.randomUUID(),source:ccDraft.source})),layouts:[],settings:{sheetW:+document.getElementById('ccSheetW').value||2750,sheetH:+document.getElementById('ccSheetH').value||1850,kerf:+document.getElementById('ccKerf').value||4,trim:+document.getElementById('ccTrim').value||2,minRemnantW:300,minRemnantH:300,grain:document.getElementById('ccGrain').checked},source:'Cortecloud'};openModal('Simulação SmartCut',`<div id="cutResultKpis" class="cut-result-kpis"></div><div id="cutPreview" class="cut-preview"></div>`,'');setTimeout(()=>{cutOptimize();renderCutPreview()},50)}
function ccExportPayload(){if(!ccDraft.pieces.length)return toast('Importe peças primeiro');const rows=ccDraft.pieces.map(x=>[x.name,x.w,x.h,x.t,1,x.material,x.edge||'',x.grain?'':'S']);const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download=`cortecloud_${ccDraft.fileName||'lista_vimak'}.csv`;a.click();URL.revokeObjectURL(a.href);toast('Arquivo preparado para importação no Cortecloud')}
async function ccSaveConfig(){const endpoint=document.getElementById('ccEndpoint').value.trim(),token=document.getElementById('ccToken').value.trim(),central=document.getElementById('ccCentral').value.trim(),existing=ccConfig(),config={endpoint,central,has_token:!!token,mode:'homologacao',updated_at:new Date().toISOString()};if(token)config.token=token;const payload={company_id:profile.company_id,name:'Cortecloud',type:'Cortecloud',status:token?'Configurado':'Pendente',config};let r=existing?await sb.from('integrations').update(payload).eq('id',existing.id):await sb.from('integrations').insert(payload);if(r.error)return toast('Erro: '+r.error.message);toast('Configuração Cortecloud salva');render()}
function ccHelp(){openModal('Integração Cortecloud • Como funciona',`<div class="client-detail"><div class="notice"><b>Modo seguro de interoperabilidade:</b> a V6.15 prepara, valida e exporta listas para o fluxo oficial de importação do Cortecloud.</div><div class="detail-notes"><h3>Fluxo homologado</h3><p>Promob pode gerar arquivo para Corte Certo/Cut Planning e o Cortecloud permite importar esse arquivo. Também existe importação por dados de Excel. Para integração direta via API, é necessário token de testes, desenvolvimento conforme manual e homologação do fornecedor.</p></div><div class="detail-notes"><h3>Segurança</h3><p>Não coloque token definitivo em repositório público. Para produção SaaS, o envio por API deve passar por backend/Edge Function, mantendo credenciais fora do navegador.</p></div></div>`,'')}
function ccSend(){if(!ccDraft.pieces.length)return toast('Importe a lista primeiro');const cfg=ccConfig();if(!cfg||!ccData(cfg).token){ccExportPayload();return toast('Lista preparada. API direta requer token/homologação Cortecloud.')}toast('Conector configurado. Envio direto deve ser ativado via backend homologado; gerando arquivo seguro.');ccExportPayload()}
function ccHistory(){const rows=ccRecords().map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('pt-BR')}</td><td>${esc(x.name||'Cortecloud')}</td><td><span class="badge ${x.status==='Conectado'||x.status==='Configurado'?'ok':'gold'}">${esc(x.status||'Pendente')}</span></td><td>${esc(ccData(x).central||'—')}</td></tr>`).join('');return `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Integração</th><th>Status</th><th>Central</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">Nenhuma configuração registrada.</td></tr>'}</tbody></table></div></div>`}
function ccSettings(){const c=ccData(ccConfig());return `<div class="card cc-settings"><h3>Configuração Cortecloud</h3><div class="notice">API direta somente após credenciais e homologação oficial. O token deve migrar para backend/Edge Function antes de produção.</div><div class="form-grid"><div class="field"><label>Endpoint / ambiente fornecido</label><input id="ccEndpoint" value="${esc(c.endpoint||'')}" placeholder="Fornecido na homologação"></div><div class="field"><label>Central / identificação</label><input id="ccCentral" value="${esc(c.central||'')}" placeholder="Central vinculada"></div><div class="field full"><label>Token de testes</label><input id="ccToken" type="password" placeholder="${c.has_token?'Token já configurado — informe somente para substituir':'Cole apenas token de TESTES'}"></div></div><button class="btn gold" onclick="ccSaveConfig()">Salvar configuração</button></div>`}
function ccSendView(){return `<div class="cc-workspace"><section class="cc-left"><h3>1. Selecione a origem da lista de peças</h3><div class="cc-sources">${[['Promob','P','XML / TXT / CSV'],['SketchUp','S','CSV / OpenCutList'],['Corte Certo','CC','CSV / XML'],['Arquivo Manual','▤','CSV / TXT / XML']].map(x=>`<button class="cc-source ${ccDraft.source===x[0]?'active':''}" data-source="${x[0]}" onclick="ccSetSource('${x[0]}')"><b>${x[1]}</b><strong>${x[0]}</strong><span>${x[2]}</span></button>`).join('')}</div><h3>2. Envie o arquivo</h3><label class="cc-drop"><input type="file" accept=".csv,.txt,.tsv,.xml" onchange="ccParseFile(this)"><b>☁</b><strong>Clique para selecionar o arquivo</strong><span>CSV, TXT, XML • listas exportadas de softwares compatíveis</span></label><h3>3. Parâmetros de corte</h3><div class="form-grid cc-params"><div class="field"><label>Chapa L</label><input id="ccSheetW" value="2750"></div><div class="field"><label>Chapa A</label><input id="ccSheetH" value="1850"></div><div class="field"><label>Serra</label><input id="ccKerf" value="4"></div><div class="field"><label>Refilo</label><input id="ccTrim" value="2"></div></div><div class="cc-toggles"><label><input type="checkbox" checked> Considerar sobras V6.14</label><label><input type="checkbox" checked> Agrupar material/espessura</label><label><input type="checkbox" checked> Otimizar aproveitamento</label><label><input id="ccGrain" type="checkbox" checked> Respeitar veio</label></div><h3>4. Preparar para Cortecloud</h3><div class="client-quick"><button class="btn gold" onclick="ccSend()">⇧ Enviar / Preparar Cortecloud</button><button class="btn" onclick="ccSimulate()">⌕ Simular Otimização</button><button class="btn" onclick="ccExportPayload()">▤ Exportar Lista</button></div></section><section class="cc-right"><div class="cc-link-card"><div class="cc-cloud">☁ <strong>cortecloud</strong></div><span>⇄</span><img src="assets/vimak-logo.jpg" alt="VIMAK Planejados"><div class="cc-connect"><b class="badge ${ccConfig()?'ok':'gold'}">${ccConfig()?'Configurado':'Aguardando configuração'}</b></div></div><div class="card"><h3>Pré-visualização da lista</h3><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Peça</th><th>Comp.</th><th>Larg.</th><th>Esp.</th><th>Material</th><th>Qtde</th></tr></thead><tbody id="ccPreviewRows"></tbody></table></div><div id="ccPreviewStats" class="cc-preview-stats"></div></div><div class="cc-zero"><b>V6.14 ZERO WASTE ATIVO</b><span>Antes de abrir uma chapa nova, use o Estoque de Sobras + SmartCut para verificar reaproveitamento.</span></div></section></div>`}
function cutSources(){return ['Manual','Promob','Cortecloud','SketchUp / OpenCutList','Corte Certo','CSV / Excel','XML / TXT']}
function cutEditor(x={}){const d=x.data||{},st=d.settings||cutDraft.settings;cutDraft={pieces:(d.pieces||[]).map(z=>({...z,id:z.id||crypto.randomUUID()})),layouts:d.layouts||[],settings:{...cutDraft.settings,...st},source:x.source||'Manual'};return `<div class="cut-editor"><div class="cut-editor-head"><div class="form-grid"><div class="field"><label>Nome do plano *</label><input id="cutName" value="${esc(x.name||'')}"></div><div class="field"><label>Projeto de produção</label><select id="cutProject"><option value="">Sem vínculo</option>${cutProjectOptions(x.production_project_id)}</select></div><div class="field"><label>Origem / Integração</label><select id="cutSource">${cutSources().map(v=>`<option ${cutDraft.source===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Status</label><select id="cutStatus">${['Rascunho','Importado','Otimizado','Liberado para Corte','Concluído'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></div></div></div><div class="cut-integrations"><label class="cut-upload"><input type="file" accept=".csv,.txt,.xml,.tsv" onchange="cutImportFile(this)"><b>⇧ Importar arquivo</b><span>Promob • Cortecloud • Corte Certo • CSV/TXT/XML</span></label><button onclick="cutAddPiece()"><b>＋ Peça manual</b><span>Cadastre medidas individualmente</span></button><button onclick="cutLoadDemo()"><b>◇ Projeto exemplo</b><span>Teste imediato do otimizador</span></button></div><div class="cut-tabs-grid"><section><div class="cut-section-title"><div><h3>Lista de Peças</h3><span id="cutPieceCount">${cutDraft.pieces.length} peças</span></div></div><div class="table-wrap cut-pieces-table"><table class="table"><thead><tr><th>Peça</th><th>Material</th><th>Comp.</th><th>Larg.</th><th>Esp.</th><th>Veio</th><th>Fita</th><th></th></tr></thead><tbody id="cutPieceRows"></tbody></table></div></section><aside class="cut-settings"><h3>Parâmetros de Corte</h3><div class="form-grid"><div class="field"><label>Chapa L (mm)</label><input id="cutSheetW" type="number" value="${st.sheetW}"></div><div class="field"><label>Chapa A (mm)</label><input id="cutSheetH" type="number" value="${st.sheetH}"></div><div class="field"><label>Serra (mm)</label><input id="cutKerf" type="number" step=".1" value="${st.kerf}"></div><div class="field"><label>Refilo (mm)</label><input id="cutTrim" type="number" value="${st.trim}"></div><div class="field"><label>Sobra mín. L</label><input id="cutMinRemnantW" type="number" value="${st.minRemnantW}"></div><div class="field"><label>Sobra mín. A</label><input id="cutMinRemnantH" type="number" value="${st.minRemnantH}"></div></div><label class="cut-check"><input id="cutGrain" type="checkbox" ${st.grain?'checked':''}> Respeitar sentido do veio</label><button class="btn gold cut-optimize" onclick="cutOptimize()">⚙ OTIMIZAR PLANO</button><p class="cut-algo-note">Otimização guilhotina determinística com agrupamento por material/espessura, serra, refilo, rotação e sobras.</p></aside></div><div id="cutResultKpis" class="cut-result-kpis"></div><div id="cutPreview" class="cut-preview"></div><div class="cut-export-bar"><b>Exportação / Interoperabilidade</b><button class="btn" onclick="cutExport('generic')">CSV Universal</button><button class="btn" onclick="cutExport('cortecerto')">Corte Certo</button><button class="btn" onclick="cutExport('cortecloud')">Cortecloud</button><button class="btn" onclick="cutExport('opencutlist')">SketchUp / OpenCutList</button><button class="btn" onclick="cutPrint()">Imprimir Plano</button></div></div>`}
function cutLoadDemo(){cutDraft.pieces=[['Lateral Esq.',720,560],['Lateral Dir.',720,560],['Base',900,560],['Tampo',900,580],['Prateleira',864,540],['Porta 1',715,445],['Porta 2',715,445],['Travessa',864,120]].map(([name,w,h],i)=>({id:crypto.randomUUID(),name,w,h,t:15,material:'MDF Branco TX',grain:i>4,edge:'1mm',source:'Demo'}));refreshCutPieces();toast('Projeto exemplo carregado')}
function addCutPlan(){cutDraft={pieces:[],layouts:[],settings:{sheetW:2750,sheetH:1850,kerf:4,trim:10,minRemnantW:300,minRemnantH:300,grain:true},source:'Manual'};openModal('Novo Plano de Corte PRO',cutEditor(),`saveCutPlan()`);modal.classList.add('cut-modal');setTimeout(()=>{refreshCutPieces();renderCutPreview()},0)}
function editCutPlan(id){const x=cutById(id);if(!x)return;openModal('Editar Plano de Corte',cutEditor(x),`saveCutPlan('${id}')`);modal.classList.add('cut-modal');setTimeout(()=>{refreshCutPieces();renderCutPreview()},0)}
async function saveCutPlan(id=''){cutSettingsFromForm();const name=document.getElementById('cutName')?.value.trim();if(!name)return toast('Informe o nome do plano');const sheets=cutDraft.layouts.length,area=cutDraft.layouts.reduce((a,x)=>a+x.w*x.h,0),used=cutDraft.layouts.reduce((a,x)=>a+(x.used||0),0),util=area?used/area*100:0;const data={version:'6.13',pieces:cutDraft.pieces,layouts:cutDraft.layouts,settings:cutDraft.settings,stats:{pieces:cutDraft.pieces.length,sheets,utilization:util,waste:100-util}};const payload={company_id:profile.company_id,production_project_id:document.getElementById('cutProject').value||null,name,source:document.getElementById('cutSource').value,status:document.getElementById('cutStatus').value,sheets_count:sheets,utilization_pct:util,waste_pct:100-util,data};let error;if(id)({error}=await sb.from('cutting_plans').update(payload).eq('id',id));else({error}=await sb.from('cutting_plans').insert(payload));if(error)return toast('Erro: '+error.message);closeModal();toast(id?'Plano atualizado':'Plano de corte salvo');render()}
async function deleteCutPlan(id){const x=cutById(id);if(!x||!confirm(`Excluir o plano "${x.name}"?`))return;const {error}=await sb.from('cutting_plans').delete().eq('id',id);if(error)return toast('Erro: '+error.message);toast('Plano excluído');render()}
function viewCutPlan(id){const x=cutById(id);if(!x)return;cutDraft={pieces:x.data?.pieces||[],layouts:x.data?.layouts||[],settings:x.data?.settings||{},source:x.source};openModal(x.name,`<div class="cut-view"><div class="cut-view-head"><div><span class="badge gold">${esc(x.source)}</span><h2>${esc(x.name)}</h2><p>${esc(cutProject(x.production_project_id)?.title||'Plano avulso')}</p></div><div><strong>${Number(x.utilization_pct||0).toFixed(1)}%</strong><span>aproveitamento</span></div></div><div id="cutResultKpis" class="cut-result-kpis"></div><div id="cutPreview" class="cut-preview"></div><div class="client-quick"><button class="btn gold" onclick="closeModal();editCutPlan('${id}')">Editar / Reotimizar</button><button class="btn" onclick="cutPrint()">Imprimir</button></div></div>`,'');modal.classList.add('cut-modal');setTimeout(renderCutPreview,0)}
function cutCsvText(mode){let h;if(mode==='opencutlist')h=['Designation','Length','Width','Thickness','Quantity','Material','Tags'];else if(mode==='cortecerto')h=['DESCRICAO','COMPRIMENTO','LARGURA','ESPESSURA','QUANTIDADE','MATERIAL','FITA'];else if(mode==='cortecloud')h=['Descricao','Comprimento','Largura','Quantidade','Material','Espessura','Fita'];else h=['peca','material','comprimento_mm','largura_mm','espessura_mm','quantidade','veio','fita'];const rows=cutDraft.pieces.map(p=>mode==='opencutlist'?[p.name,p.w,p.h,p.t,1,p.material,p.grain?'grain':''] : mode==='cortecerto'?[p.name,p.w,p.h,p.t,1,p.material,p.edge||''] : mode==='cortecloud'?[p.name,p.w,p.h,1,p.material,p.t,p.edge||''] : [p.name,p.material,p.w,p.h,p.t,1,p.grain?'SIM':'NAO',p.edge||'']);return [h,...rows].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n')}
function cutExport(mode){if(!cutDraft.pieces.length)return toast('Não há peças para exportar');const names={generic:'universal',cortecerto:'corte_certo',cortecloud:'cortecloud',opencutlist:'opencutlist'};const blob=new Blob(['\ufeff'+cutCsvText(mode)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`vimak_${names[mode]||mode}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);toast('Arquivo de interoperabilidade gerado')}
function cutPrint(){if(!cutDraft.layouts.length)return toast('Otimize o plano antes de imprimir');const w=window.open('','_blank');w.document.write(`<html><head><title>Plano de Corte VIMAK</title><style>body{font-family:Arial;color:#222;padding:25px}h1{margin-bottom:3px}.sheet{page-break-inside:avoid;margin:25px 0;border-top:1px solid #ccc;padding-top:15px}.sheet svg{width:100%;max-height:650px}.meta{display:flex;gap:25px;font-size:12px}@media print{button{display:none}}</style></head><body><h1>Plano de Corte • ${esc(company?.name||'VIMAK')}</h1><p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>${cutDraft.layouts.map((sh,i)=>`<div class="sheet"><h3>Chapa ${i+1} — ${esc(sh.key)}</h3><div class="meta"><b>${sh.placed.length} peças</b><b>${sh.util.toFixed(1)}% aproveitamento</b><b>${sh.waste.toFixed(1)}% perda</b></div>${cutSvgSheet(sh)}</div>`).join('')}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function corte(){const total=cache.cuttingPlans.length,optimized=cache.cuttingPlans.filter(x=>Number(x.sheets_count)>0),avg=optimized.length?optimized.reduce((a,x)=>a+Number(x.utilization_pct||0),0)/optimized.length:0,sheets=cache.cuttingPlans.reduce((a,x)=>a+Number(x.sheets_count||0),0),waste=optimized.length?optimized.reduce((a,x)=>a+Number(x.waste_pct||0),0)/optimized.length:0;const rows=cache.cuttingPlans.map(x=>`<tr><td><button class="link-client" onclick="viewCutPlan('${x.id}')"><b>${esc(x.name)}</b></button><small>${esc(x.source)}</small></td><td>${esc(cutProject(x.production_project_id)?.title||'Avulso')}</td><td>${Number(x.sheets_count||0)}</td><td><b class="goldtxt">${Number(x.utilization_pct||0).toFixed(1)}%</b></td><td>${Number(x.waste_pct||0).toFixed(1)}%</td><td><span class="badge ${x.status==='Concluído'?'ok':x.status==='Liberado para Corte'?'blue':''}">${esc(x.status)}</span></td><td><div class="row-actions"><button class="btn sm gold" onclick="viewCutPlan('${x.id}')">Ver</button><button class="btn sm" onclick="editCutPlan('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteCutPlan('${x.id}')">Excluir</button></div></td></tr>`).join('');return shell('Plano de Corte PRO','Central de importação, otimização, visualização e interoperabilidade para a produção moveleira',`<button class="btn gold" onclick="addCutPlan()">+ Novo Plano</button>`,`<div class="cut-command"><div><span class="measurement-version">V6.13 • SMARTCUT INTEGRATION HUB</span><h2>Plano de Corte Inteligente</h2><p>Promob, Cortecloud, SketchUp/OpenCutList e Corte Certo em um fluxo único de peças, chapas, otimização e produção.</p></div><button class="btn gold" onclick="addCutPlan()">＋ IMPORTAR / CRIAR PLANO</button></div><div class="grid g4 proposal-kpis"><div class="card kpi"><label>Planos de corte</label><strong>${total}</strong></div><div class="card kpi"><label>Aproveitamento médio</label><strong class="goldtxt">${avg.toFixed(1)}%</strong></div><div class="card kpi"><label>Chapas processadas</label><strong>${sheets}</strong></div><div class="card kpi"><label>Perda média</label><strong>${waste.toFixed(1)}%</strong></div></div><div class="cut-source-cards"><div><b>P</b><strong>Promob</strong><span>CSV • TXT • XML • Cut Planning</span></div><div><b>C</b><strong>Cortecloud</strong><span>Lista de peças • CSV</span></div><div><b>S</b><strong>SketchUp</strong><span>OpenCutList • CSV • DXF workflow</span></div><div><b>CC</b><strong>Corte Certo</strong><span>CSV • TXT • integração por arquivo</span></div></div><div class="cut-tech-note"><b>Hub de interoperabilidade VIMAK</b><span>Importe arquivos compatíveis, normalize as peças, otimize internamente e exporte listas padronizadas. Integrações diretas por API dependem de credenciais/plugins oficiais de cada fornecedor.</span></div><div class="filters"><div class="field"><label>Buscar plano</label><input placeholder="Plano, projeto, origem, status..." oninput="filterTable(this.value)"></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Plano</th><th>Projeto</th><th>Chapas</th><th>Aproveitamento</th><th>Perda</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows||'<tr><td colspan="7" class="empty">Nenhum plano criado. Importe um arquivo do seu software de projeto ou crie manualmente.</td></tr>'}</tbody></table></div></div>`)}
let remnantFilter='disponivel',remnantSearch='';
function remById(id){return cache.sheetRemnants.find(x=>x.id===id)}
function remArea(x){return Number(x.width_mm||0)*Number(x.height_mm||0)/1000000}
function remCode(x){return x.label_code||('SOB-'+String(x.id||'').slice(0,8).toUpperCase())}
function remUsable(x){return x.status==='Disponível'&&Number(x.width_mm)>0&&Number(x.height_mm)>0}
function remStatusClass(s){return s==='Disponível'?'ok':s==='Reservada'?'gold':s==='Consumida'?'blue':s==='Descartada'?'bad':''}
function remForm(x={}){return `<div class="rem-editor"><div class="form-grid"><div class="field"><label>Material *</label><input id="remMaterial" value="${esc(x.material||'')}" placeholder="Ex.: MDF Branco TX"></div><div class="field"><label>Espessura (mm)</label><input id="remThickness" type="number" step=".1" value="${Number(x.thickness_mm||15)}"></div><div class="field"><label>Comprimento (mm) *</label><input id="remW" type="number" value="${Number(x.width_mm||0)}"></div><div class="field"><label>Largura (mm) *</label><input id="remH" type="number" value="${Number(x.height_mm||0)}"></div><div class="field"><label>Sentido do veio</label><select id="remGrain"><option value="false" ${!x.grain?'selected':''}>Sem restrição</option><option value="true" ${x.grain?'selected':''}>Com veio</option></select></div><div class="field"><label>Status</label><select id="remStatus">${['Disponível','Reservada','Consumida','Descartada'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Rua / Localização</label><input id="remLocation" value="${esc(x.location||'')}" placeholder="Ex.: Rack A • Nível 2"></div><div class="field"><label>Origem</label><input id="remOrigin" value="${esc(x.origin||'Plano de Corte VIMAK')}" placeholder="Projeto / chapa"></div><div class="field full"><label>Observações</label><textarea id="remNotes" rows="4">${esc(x.notes||'')}</textarea></div></div><div class="rem-rule"><b>Regra Zero Desperdício</b><span>Cadastre a dimensão retangular realmente utilizável da sobra. Defeitos e recortes irregulares devem ser descontados.</span></div></div>`}
function addRemnant(){openModal('Cadastrar Sobra de MDF',remForm({status:'Disponível',thickness_mm:15}),`saveRemnant()`)}
function editRemnant(id){const x=remById(id);if(x)openModal('Editar Sobra',remForm(x),`saveRemnant('${id}')`)}
async function saveRemnant(id=''){const material=document.getElementById('remMaterial').value.trim(),width_mm=+document.getElementById('remW').value,height_mm=+document.getElementById('remH').value;if(!material||width_mm<=0||height_mm<=0)return toast('Preencha material e dimensões válidas');const payload={company_id:profile.company_id,material,thickness_mm:+document.getElementById('remThickness').value||15,width_mm,height_mm,area_m2:width_mm*height_mm/1e6,grain:document.getElementById('remGrain').value==='true',status:document.getElementById('remStatus').value,location:document.getElementById('remLocation').value.trim()||null,origin:document.getElementById('remOrigin').value.trim()||null,notes:document.getElementById('remNotes').value.trim()||null};if(!id)payload.label_code='SOB-'+Date.now().toString(36).toUpperCase();const r=id?await sb.from('sheet_remnants').update(payload).eq('id',id):await sb.from('sheet_remnants').insert(payload);if(r.error)return toast('Erro: '+r.error.message);closeModal();toast('Sobra salva');render()}
async function remSetStatus(id,status){const {error}=await sb.from('sheet_remnants').update({status}).eq('id',id);if(error)return toast('Erro: '+error.message);toast('Status atualizado');render()}
async function deleteRemnant(id){if(!confirm('Excluir esta sobra?'))return;const {error}=await sb.from('sheet_remnants').delete().eq('id',id);if(error)return toast('Erro: '+error.message);toast('Sobra excluída');render()}
function remFiltered(){return cache.sheetRemnants.filter(x=>{const q=remnantSearch.toLowerCase(),okq=!q||[remCode(x),x.material,x.location,x.origin,x.status].some(v=>String(v||'').toLowerCase().includes(q));const okf=remnantFilter==='todos'||(remnantFilter==='disponivel'&&x.status==='Disponível')||(remnantFilter==='grandes'&&remArea(x)>=1&&x.status==='Disponível')||(remnantFilter==='pequenas'&&remArea(x)<1&&x.status==='Disponível')||x.status===remnantFilter;return okq&&okf})}
function remSetFilter(v){remnantFilter=v;render()} function remSetSearch(v){remnantSearch=v;render()}
function remCanFit(p,r){const normal=p.w<=r.width_mm&&p.h<=r.height_mm,rot=(!p.grain)&&p.h<=r.width_mm&&p.w<=r.height_mm;return normal||rot}
function remFindForPiece(p){return cache.sheetRemnants.filter(remUsable).filter(r=>String(r.material||'').toLowerCase()===String(p.material||'').toLowerCase()&&Math.abs(Number(r.thickness_mm||0)-Number(p.t||0))<.2&&remCanFit(p,r)).sort((a,b)=>(a.width_mm*a.height_mm-p.w*p.h)-(b.width_mm*b.height_mm-p.w*p.h))}
function remSmartAudit(){const plans=cache.cuttingPlans.filter(x=>x.data?.pieces?.length),matches=plans.flatMap(plan=>(plan.data.pieces||[]).map(piece=>({plan,piece,rs:remFindForPiece(piece)}))).filter(x=>x.rs.length);openModal('Motor Zero Waste • Compatibilidades',`<div class="rem-ai-hero"><b>${matches.length}</b><span>peças podem potencialmente ser produzidas usando sobras cadastradas</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Peça</th><th>Plano</th><th>Material</th><th>Medida</th><th>Melhor sobra</th><th>Dimensão</th><th></th></tr></thead><tbody>${matches.slice(0,100).map(({plan,piece,rs})=>{const r=rs[0];return `<tr><td><b>${esc(piece.name)}</b></td><td>${esc(plan.name)}</td><td>${esc(piece.material)}</td><td>${piece.w}×${piece.h}</td><td><b class="goldtxt">${remCode(r)}</b></td><td>${r.width_mm}×${r.height_mm}</td><td><button class="btn sm gold" onclick="remSetStatus('${r.id}','Reservada');closeModal()">Reservar</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Nenhuma compatibilidade encontrada.</td></tr>'}</tbody></table></div><div class="rem-ai-note">Compatibilidade por material, espessura e geometria. Confirme fisicamente veio, defeitos e acabamento antes do corte.</div>`,'');modal.classList.add('proposal-modal')}
function remImportFromCutPlans(){let cand=[];cache.cuttingPlans.forEach(plan=>(plan.data?.layouts||[]).forEach((sh,si)=>(sh.remnants||[]).forEach(r=>{const [material,t]=String(sh.key||'MDF|15').split('|');if(r.w>=300&&r.h>=300)cand.push({plan_id:plan.id,plan_name:plan.name,material,thickness:+t||15,w:Math.round(r.w),h:Math.round(r.h),si})})));if(!cand.length)return toast('Nenhuma sobra útil encontrada nos planos otimizados');window._remCand=cand;openModal('Importar Sobras do SmartCut',`<div class="notice"><b>${cand.length} sobras potenciais encontradas.</b> Marque apenas as que foram realmente separadas e guardadas.</div><div class="rem-import-list">${cand.map((r,i)=>`<label><input type="checkbox" class="remImportCheck" data-i="${i}" checked><div><b>${esc(r.material)} • ${r.w}×${r.h}×${r.thickness} mm</b><span>${esc(r.plan_name)} • Chapa ${r.si+1}</span></div><strong>${(r.w*r.h/1e6).toFixed(2)} m²</strong></label>`).join('')}</div><button class="btn gold" onclick="remCommitImports()">Cadastrar selecionadas</button>`,'');modal.classList.add('proposal-modal')}
async function remCommitImports(){const c=window._remCand||[],ids=[...document.querySelectorAll('.remImportCheck:checked')].map(x=>+x.dataset.i),stamp=Date.now().toString(36).toUpperCase(),rows=ids.map((i,n)=>{const r=c[i];return {company_id:profile.company_id,label_code:`SOB-${stamp}-${n+1}`,material:r.material,thickness_mm:r.thickness,width_mm:r.w,height_mm:r.h,area_m2:r.w*r.h/1e6,status:'Disponível',grain:false,origin:`Plano ${r.plan_name} • Chapa ${r.si+1}`,notes:'Importada do SmartCut VIMAK'}});if(!rows.length)return toast('Selecione sobras');const {error}=await sb.from('sheet_remnants').insert(rows);if(error)return toast('Erro: '+error.message);closeModal();toast(`${rows.length} sobras cadastradas`);render()}
function remLabelHtml(x){return `<div class="rem-label"><div class="rem-label-brand">VIMAK <span>ZERO WASTE</span></div><div class="rem-label-code">${remCode(x)}</div><b>${esc(x.material)}</b><strong>${x.width_mm} × ${x.height_mm} × ${Number(x.thickness_mm||0)} mm</strong><div>${remArea(x).toFixed(3)} m² • ${esc(x.location||'Sem localização')}</div><div class="rem-label-bars">|||| ||| ||||| || ||||</div></div>`}
function printRemLabel(id){const x=remById(id);if(!x)return;const w=window.open('','_blank');w.document.write(`<html><head><title>${remCode(x)}</title><style>body{font-family:Arial}.l{width:82mm;border:2px solid;padding:7mm}.b{font-size:22px;font-weight:900}.c{font-family:monospace;margin:8px 0}.bars{font-size:22px;letter-spacing:3px;margin-top:10px}</style></head><body><div class="l"><div class="b">VIMAK • ZERO WASTE</div><div class="c">${remCode(x)}</div><b>${esc(x.material)}</b><h3>${x.width_mm} × ${x.height_mm} × ${x.thickness_mm} mm</h3><div>${remArea(x).toFixed(3)} m² • ${esc(x.location||'')}</div><div class="bars">|||| ||| ||||| || ||||</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function viewRemnant(id){const x=remById(id);if(!x)return;openModal(remCode(x),`<div class="rem-view-hero">${remLabelHtml(x)}<div><span class="badge ${remStatusClass(x.status)}">${esc(x.status)}</span><h2>${esc(x.material)}</h2><strong>${x.width_mm} × ${x.height_mm} × ${x.thickness_mm} mm</strong><p>${remArea(x).toFixed(3)} m²</p><div class="client-quick"><button class="btn gold" onclick="printRemLabel('${id}')">Imprimir Etiqueta</button><button class="btn" onclick="closeModal();editRemnant('${id}')">Editar</button>${x.status==='Disponível'?`<button class="btn" onclick="remSetStatus('${id}','Reservada');closeModal()">Reservar</button>`:''}${x.status==='Reservada'?`<button class="btn" onclick="remSetStatus('${id}','Disponível');closeModal()">Liberar</button>`:''}</div></div></div>`,'')}
function remExportCsv(){const rows=[['Etiqueta','Material','Espessura','Comprimento','Largura','Area','Status','Local'],...cache.sheetRemnants.map(x=>[remCode(x),x.material,x.thickness_mm,x.width_mm,x.height_mm,remArea(x).toFixed(3),x.status,x.location||''])],csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='sobras_mdf_vimak.csv';a.click();URL.revokeObjectURL(a.href)}
function sobras(){const av=cache.sheetRemnants.filter(remUsable),area=av.reduce((a,x)=>a+remArea(x),0),reserved=cache.sheetRemnants.filter(x=>x.status==='Reservada').length,mats=new Set(av.map(x=>`${x.material}|${x.thickness_mm}`)).size,rows=remFiltered().map(x=>`<tr><td><button class="link-client" onclick="viewRemnant('${x.id}')"><b>${remCode(x)}</b></button><small>${esc(x.origin||'Manual')}</small></td><td><b>${esc(x.material)}</b><small>${x.thickness_mm} mm</small></td><td>${x.width_mm} × ${x.height_mm}</td><td><b class="goldtxt">${remArea(x).toFixed(3)} m²</b></td><td>${esc(x.location||'—')}</td><td><span class="badge ${remStatusClass(x.status)}">${esc(x.status)}</span></td><td><div class="row-actions"><button class="btn sm gold" onclick="viewRemnant('${x.id}')">Ver</button><button class="btn sm" onclick="printRemLabel('${x.id}')">Etiqueta</button><button class="btn sm" onclick="editRemnant('${x.id}')">Editar</button><button class="btn sm danger" onclick="deleteRemnant('${x.id}')">Excluir</button></div></td></tr>`).join('');return shell('Estoque Inteligente de Sobras','Use primeiro o retalho certo e só depois abra uma chapa nova',`<button class="btn" onclick="remExportCsv()">Exportar CSV</button><button class="btn" onclick="remImportFromCutPlans()">↙ Importar do SmartCut</button><button class="btn gold" onclick="addRemnant()">+ Cadastrar Sobra</button>`,`<div class="rem-command"><div><span class="measurement-version">V6.14 • ZERO WASTE MDF</span><h2>Central de Reaproveitamento de MDF</h2><p>Capturar → etiquetar → localizar → reservar → consumir. Sobras deixam de ser lixo e viram estoque rastreável.</p></div><button class="btn gold" onclick="remSmartAudit()">✦ ENCONTRAR REAPROVEITAMENTOS</button></div><div class="grid g4 proposal-kpis"><div class="card kpi"><label>Sobras disponíveis</label><strong>${av.length}</strong></div><div class="card kpi"><label>Área recuperável</label><strong class="goldtxt">${area.toFixed(2)} m²</strong></div><div class="card kpi"><label>Reservadas</label><strong>${reserved}</strong></div><div class="card kpi"><label>Materiais / espessuras</label><strong>${mats}</strong></div></div><div class="rem-zero-flow">${[['01','CAPTURAR','Do SmartCut para o estoque'],['02','ETIQUETAR','Código + medida + endereço'],['03','LOCALIZAR','Cruzar peças e retalhos'],['04','RESERVAR','Separar antes da produção'],['05','CONSUMIR','Baixa após o corte']].map((x,i)=>`${i?'<i>→</i>':''}<div><b>${x[0]}</b><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('')}</div><div class="rem-controls"><div class="production-filters"><button class="${remnantFilter==='disponivel'?'active':''}" onclick="remSetFilter('disponivel')">Disponíveis</button><button class="${remnantFilter==='grandes'?'active':''}" onclick="remSetFilter('grandes')">Grandes ≥1m²</button><button class="${remnantFilter==='pequenas'?'active':''}" onclick="remSetFilter('pequenas')">Pequenas</button><button class="${remnantFilter==='Reservada'?'active':''}" onclick="remSetFilter('Reservada')">Reservadas</button><button class="${remnantFilter==='todos'?'active':''}" onclick="remSetFilter('todos')">Todos</button></div><input value="${esc(remnantSearch)}" placeholder="Etiqueta, material, localização..." oninput="remSetSearch(this.value)"></div><div class="rem-rule-banner"><b>ZERO WASTE:</b><span>antes de liberar chapa nova, rode Encontrar Reaproveitamentos para cruzar os planos de corte com o estoque disponível.</span></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Etiqueta</th><th>Material</th><th>Dimensão mm</th><th>Área</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead><tbody id="rows">${rows||'<tr><td colspan="7" class="empty">Nenhuma sobra neste filtro. Importe do SmartCut ou cadastre manualmente.</td></tr>'}</tbody></table></div></div>`)}
function cortecloud(){const rec=ccRecords(),configured=!!ccConfig(),plans=cache.cuttingPlans.length,avg=cache.cuttingPlans.length?cache.cuttingPlans.reduce((a,x)=>a+Number(x.utilization_pct||0),0)/cache.cuttingPlans.length:0;const body=`<div class="cc-hero"><div class="cc-brand-title"><img src="assets/vimak-logo.jpg"><div><span class="measurement-version">V6.15 • INTEGRAÇÃO CORTECLOUD</span><h2>Integração Cortecloud</h2><p>Promob, SketchUp/OpenCutList, Corte Certo e VIMAK SmartCut em um fluxo único.</p></div></div><button class="btn" onclick="ccHelp()">? Como integrar</button></div><div class="grid g4 proposal-kpis"><div class="card kpi"><label>Planos SmartCut</label><strong>${plans}</strong></div><div class="card kpi"><label>Integração</label><strong class="${configured?'green':'goldtxt'}">${configured?'Configurada':'Pendente'}</strong></div><div class="card kpi"><label>Registros</label><strong>${rec.length}</strong></div><div class="card kpi"><label>Aproveitamento médio</label><strong class="goldtxt">${avg.toFixed(1)}%</strong></div></div><div class="cc-tabs">${[['enviar','▣ Enviar Lista'],['historico','▤ Histórico'],['config','⚙ Configurações'],['ajuda','? Ajuda']].map(x=>`<button class="${ccTab===x[0]?'active':''}" onclick="ccSetTab('${x[0]}')">${x[1]}</button>`).join('')}</div>${ccTab==='enviar'?ccSendView():ccTab==='historico'?ccHistory():ccTab==='config'?ccSettings():`<div class="card"><h3>Fluxo recomendado</h3><p>Importe a lista, confira materiais/fitas, simule o aproveitamento com SmartCut e sobras, depois gere o arquivo compatível. O envio API direto deve ser ativado apenas após homologação e token oficial.</p><button class="btn gold" onclick="ccHelp()">Abrir guia</button></div>`}`;setTimeout(ccPreview,0);return shell('Integração Cortecloud','Conector industrial VIMAK para listas de peças e produção',`<button class="btn gold" onclick="ccSetTab('enviar')">+ Nova Integração</button>`,body)}

function cutProjectOptions(selected=''){return cache.productionProjects.map(x=>`<option value="${x.id}" ${selected===x.id?'selected':''}>${esc(x.title)} • ${esc(prodClient(x.client_id)?.name||'')}</option>`).join('')}
function cutNum(v){const n=Number(String(v??'').replace(',','.').replace(/[^0-9.\-]/g,''));return isFinite(n)?n:0}
function cutNormalizeKey(k){return String(k||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function cutPick(row,names){const map={};Object.keys(row).forEach(k=>map[cutNormalizeKey(k)]=row[k]);for(const n of names){const v=map[cutNormalizeKey(n)];if(v!==undefined&&v!=='')return v}return ''}
function cutDetectDelimiter(line){const opts=[';','\t',',','|'];return opts.sort((a,b)=>(line.split(b).length-line.split(a).length))[0]}
function cutParseDelimited(text){const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];const d=cutDetectDelimiter(lines[0]);const split=line=>{let out=[],cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===d&&!q){out.push(cur.trim());cur=''}else cur+=ch}out.push(cur.trim());return out};const h=split(lines[0]);return lines.slice(1).map(l=>{const a=split(l),o={};h.forEach((k,i)=>o[k||`col${i+1}`]=a[i]||'');return o})}
function cutParseXML(text){const doc=new DOMParser().parseFromString(text,'text/xml');const nodes=[...doc.querySelectorAll('piece,peca,item,part,component')];return nodes.map(n=>{const o={};[...n.attributes].forEach(a=>o[a.name]=a.value);[...n.children].forEach(c=>o[c.tagName]=c.textContent.trim());return o})}
function cutRowsToPieces(rows,source){const out=[];rows.forEach((r,idx)=>{let name=cutPick(r,['descricao','descrição','description','designation','nome','name','peca','peça','part','componente','component','referencia','reference']);let w=cutNum(cutPick(r,['comprimento','length','largura','width','dimx','x','medida1']));let h=cutNum(cutPick(r,['largura','width','altura','height','dimy','y','medida2']));let t=cutNum(cutPick(r,['espessura','thickness','thick','esp','z']));let qty=Math.max(1,Math.round(cutNum(cutPick(r,['quantidade','quantity','qty','qtd']))||1));let material=cutPick(r,['material','chapa','sheet','board','decor','cor','color'])||'MDF';let grain=String(cutPick(r,['veio','grain','sentido','direction'])).toLowerCase();let edge=cutPick(r,['fita','borda','edge','edgeband','edge_band'])||'';if(w>0&&h>0){for(let q=0;q<qty;q++)out.push({id:crypto.randomUUID(),name:name||`Peça ${idx+1}`,w,h,t:t||15,material,grain:grain&&!['nao','não','none','0','false'].includes(grain),edge,source})}});return out}
function cutImportFile(input){const f=input.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const text=String(reader.result||'');let rows=f.name.toLowerCase().endsWith('.xml')?cutParseXML(text):cutParseDelimited(text);const pcs=cutRowsToPieces(rows,document.getElementById('cutSource')?.value||'Arquivo');if(!pcs.length)return toast('Não encontrei colunas de medidas reconhecíveis. Use CSV/TXT/XML com comprimento e largura.');cutDraft.pieces.push(...pcs);refreshCutPieces();toast(`${pcs.length} peças importadas de ${f.name}`)}catch(e){toast('Falha ao ler arquivo: '+e.message)}};reader.readAsText(f);input.value=''}
function cutAddPiece(){cutDraft.pieces.push({id:crypto.randomUUID(),name:'Nova peça',w:600,h:400,t:15,material:'MDF Branco',grain:false,edge:'',source:'Manual'});refreshCutPieces()}
function cutRemovePiece(i){cutDraft.pieces.splice(i,1);refreshCutPieces()}
function cutPieceRow(x,i){return `<tr><td><input class="table-input wide" value="${esc(x.name)}" oninput="cutDraft.pieces[${i}].name=this.value"></td><td><input class="table-input" value="${esc(x.material)}" oninput="cutDraft.pieces[${i}].material=this.value"></td><td><input class="table-input num" type="number" value="${x.w}" oninput="cutDraft.pieces[${i}].w=cutNum(this.value)"></td><td><input class="table-input num" type="number" value="${x.h}" oninput="cutDraft.pieces[${i}].h=cutNum(this.value)"></td><td><input class="table-input num" type="number" value="${x.t}" oninput="cutDraft.pieces[${i}].t=cutNum(this.value)"></td><td><input type="checkbox" ${x.grain?'checked':''} onchange="cutDraft.pieces[${i}].grain=this.checked"></td><td><input class="table-input" value="${esc(x.edge||'')}" oninput="cutDraft.pieces[${i}].edge=this.value"></td><td><button class="btn sm danger" onclick="cutRemovePiece(${i})">×</button></td></tr>`}
function refreshCutPieces(){const b=document.getElementById('cutPieceRows');if(b)b.innerHTML=cutDraft.pieces.length?cutDraft.pieces.map(cutPieceRow).join(''):'<tr><td colspan="8" class="empty">Importe uma lista ou adicione peças manualmente.</td></tr>';const n=document.getElementById('cutPieceCount');if(n)n.textContent=cutDraft.pieces.length+' peças'}
function cutSettingsFromForm(){['sheetW','sheetH','kerf','trim','minRemnantW','minRemnantH'].forEach(k=>{const el=document.getElementById('cut'+k[0].toUpperCase()+k.slice(1));if(el)cutDraft.settings[k]=cutNum(el.value)});cutDraft.settings.grain=document.getElementById('cutGrain')?.checked!==false}
function cutTryPlace(sheet,p,settings){const k=settings.kerf;let choices=[];for(const r of sheet.free){const variants=[{w:p.w,h:p.h,rot:false}];if((!p.grain||!settings.grain)&&p.w!==p.h)variants.push({w:p.h,h:p.w,rot:true});for(const v of variants)if(v.w<=r.w&&v.h<=r.h)choices.push({r,v,score:(r.w-v.w)*(r.h-v.h)+Math.min(r.w-v.w,r.h-v.h)*.01})}if(!choices.length)return false;choices.sort((a,b)=>a.score-b.score);const {r,v}=choices[0];sheet.placed.push({...p,x:r.x,y:r.y,pw:v.w,ph:v.h,rot:v.rot});sheet.free=sheet.free.filter(x=>x!==r);const rw=r.w-v.w-k,bh=r.h-v.h-k;if(rw>0)sheet.free.push({x:r.x+v.w+k,y:r.y,w:rw,h:v.h});if(bh>0)sheet.free.push({x:r.x,y:r.y+v.h+k,w:r.w,h:bh});return true}
function cutOptimize(){cutSettingsFromForm();const st=cutDraft.settings;if(!cutDraft.pieces.length)return toast('Adicione ou importe peças primeiro');if(st.sheetW<=0||st.sheetH<=0)return toast('Informe a dimensão da chapa');const usableW=st.sheetW-2*st.trim,usableH=st.sheetH-2*st.trim;if(usableW<=0||usableH<=0)return toast('Refilo maior que a chapa');const groups={};cutDraft.pieces.forEach(p=>{const key=`${p.material}|${p.t}`;(groups[key]??=[]).push(p)});let layouts=[];for(const [key,pieces] of Object.entries(groups)){const sorted=[...pieces].sort((a,b)=>Math.max(b.w,b.h)*Math.min(b.w,b.h)-Math.max(a.w,a.h)*Math.min(a.w,a.h));let sheets=[];for(const p of sorted){let ok=false;for(const sh of sheets)if(cutTryPlace(sh,p,st)){ok=true;break}if(!ok){const sh={key,index:sheets.length+1,w:st.sheetW,h:st.sheetH,placed:[],free:[{x:st.trim,y:st.trim,w:usableW,h:usableH}]};if(!cutTryPlace(sh,p,st)){p.unplaced=true}else sheets.push(sh)}}layouts.push(...sheets)}layouts.forEach(sh=>{sh.used=sh.placed.reduce((a,p)=>a+p.w*p.h,0);sh.util=sh.used/(sh.w*sh.h)*100;sh.waste=100-sh.util;sh.remnants=sh.free.filter(r=>r.w>=st.minRemnantW&&r.h>=st.minRemnantH)});cutDraft.layouts=layouts;renderCutPreview();toast(`Otimização concluída: ${layouts.length} chapa(s)`) }
function cutColor(i){return `hsl(${(i*47)%360} 45% 58%)`}
function cutSvgSheet(sh){const scale=700/sh.w,H=Math.max(280,sh.h*scale);return `<svg viewBox="0 0 ${sh.w} ${sh.h}" class="cut-svg" style="aspect-ratio:${sh.w}/${sh.h}"><rect x="0" y="0" width="${sh.w}" height="${sh.h}" fill="#e8e2d5" stroke="#9b7b42" stroke-width="8"/>${sh.placed.map((p,i)=>`<g><rect x="${p.x}" y="${p.y}" width="${p.pw}" height="${p.ph}" fill="${cutColor(i)}" fill-opacity=".72" stroke="#242424" stroke-width="4"/><text x="${p.x+p.pw/2}" y="${p.y+p.ph/2}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(28,Math.min(58,p.pw/8))}" fill="#111">${esc(p.name)}</text><text x="${p.x+p.pw/2}" y="${p.y+p.ph/2+55}" text-anchor="middle" font-size="32" fill="#222">${p.w}×${p.h}${p.rot?' ↻':''}</text></g>`).join('')}</svg>`}
function renderCutPreview(){const box=document.getElementById('cutPreview');if(!box)return;if(!cutDraft.layouts.length){box.innerHTML='<div class="cut-empty-preview">Execute a otimização para visualizar as chapas.</div>';return}box.innerHTML=cutDraft.layouts.map((sh,i)=>`<article class="cut-sheet-card"><header><div><b>Chapa ${i+1}</b><span>${esc(sh.key.replace('|',' • '))}</span></div><strong>${sh.util.toFixed(1)}% aproveitamento</strong></header>${cutSvgSheet(sh)}<footer><span>${sh.placed.length} peças</span><span>${sh.remnants.length} sobras aproveitáveis</span><span>Perda ${sh.waste.toFixed(1)}%</span></footer></article>`).join('');const k=document.getElementById('cutResultKpis');if(k){const u=cutDraft.layouts.reduce((a,x)=>a+x.used,0),area=cutDraft.layouts.reduce((a,x)=>a+x.w*x.h,0),util=area?u/area*100:0,rem=cutDraft.layouts.reduce((a,x)=>a+x.remnants.length,0);k.innerHTML=`<div><b>${cutDraft.layouts.length}</b><span>Chapas</span></div><div><b>${util.toFixed(1)}%</b><span>Aproveitamento</span></div><div><b>${(100-util).toFixed(1)}%</b><span>Perda</span></div><div><b>${rem}</b><span>Sobras úteis</span></div>`}}
let teamFilter='ativas',teamSearch='';
function teamById(id){return cache.installationTeams.find(x=>x.id===id)}
function teamMeta(x){return x.metadata||{}}
function teamJobs(id){return cache.installationSchedule.filter(x=>x.team_id===id)}
function teamStatus(x){return x.active===false?'Inativa':(teamMeta(x).status||'Disponível')}
function teamStatusClass(v){return v==='Disponível'?'ok':v==='Em montagem'?'gold':v==='Indisponível'?'bad':v==='Folga'?'blue':''}
function teamScore(x){const m=teamMeta(x),jobs=teamJobs(x.id),done=jobs.filter(j=>['Concluído','Finalizado'].includes(j.status)).length,base=Number(m.rating||0);return base?base:done?Math.min(5,4+done/50):0}
function teamUtilization(x){const jobs=teamJobs(x.id),now=new Date(),month=now.getMonth(),year=now.getFullYear(),days=new Set(jobs.filter(j=>{let d=new Date(j.starts_at);return d.getMonth()===month&&d.getFullYear()===year&&!['Cancelado'].includes(j.status)}).map(j=>new Date(j.starts_at).toISOString().slice(0,10))).size;return Math.min(100,Math.round(days/22*100))}
function teamForm(x={}){const m=teamMeta(x),members=m.members||[];return `<div class="team-editor">
<div class="team-form-hero"><div><span class="measurement-version">V6.16 • PEOPLE & INSTALLATION OPS</span><h3>${x.id?'Editar equipe':'Nova equipe de montagem'}</h3><p>Capacidade, competências, segurança, custos e performance em uma ficha operacional.</p></div><div class="team-avatar">${esc((x.name||'EQ').slice(0,2).toUpperCase())}</div></div>
<div class="form-grid">
<div class="field"><label>Nome da equipe *</label><input id="teamName" value="${esc(x.name||'')}"></div>
<div class="field"><label>Responsável *</label><input id="teamResponsible" value="${esc(x.responsible||'')}"></div>
<div class="field"><label>Telefone / WhatsApp</label><input id="teamPhone" value="${esc(x.phone||'')}"></div>
<div class="field"><label>Status operacional</label><select id="teamStatus">${['Disponível','Em montagem','Folga','Indisponível'].map(v=>`<option ${teamStatus(x)===v?'selected':''}>${v}</option>`).join('')}</select></div>
<div class="field"><label>Capacidade da equipe</label><input id="teamCapacity" type="number" min="1" value="${Number(m.capacity||2)}"></div>
<div class="field"><label>Custo/dia estimado (R$)</label><input id="teamDailyCost" type="number" step=".01" value="${Number(m.daily_cost||0)}"></div>
<div class="field"><label>Veículo</label><input id="teamVehicle" value="${esc(m.vehicle||'')}" placeholder="Ex.: Fiorino ABC1D23"></div>
<div class="field"><label>Região de atendimento</label><input id="teamRegion" value="${esc(m.region||'')}" placeholder="Ex.: Bragança / Extrema / SP"></div>
<div class="field full"><label>Especialidades</label><input id="teamSkills" value="${esc((m.skills||[]).join(', '))}" placeholder="Cozinhas, ripados, vidro, painéis, ferragens premium..."></div>
<div class="field"><label>Nota interna (0–5)</label><input id="teamRating" type="number" min="0" max="5" step=".1" value="${Number(m.rating||0)}"></div>
<div class="field"><label>Meta de qualidade (%)</label><input id="teamQualityTarget" type="number" min="0" max="100" value="${Number(m.quality_target||95)}"></div>
<div class="field full"><label>Observações operacionais</label><textarea id="teamNotes" rows="3">${esc(m.notes||'')}</textarea></div>
</div>
<div class="team-members-head"><div><h3>Composição da Equipe</h3><span>Função, contato e competências individuais</span></div><button class="btn" onclick="teamAddMember()">+ Integrante</button></div>
<div id="teamMembers" class="team-members"></div>
<div class="team-safety"><b>Checklist obrigatório de saída</b><label><input id="teamPpe" type="checkbox" ${m.ppe_check!==false?'checked':''}> EPI conferido</label><label><input id="teamTools" type="checkbox" ${m.tools_check!==false?'checked':''}> Ferramentas conferidas</label><label><input id="teamVehicleCheck" type="checkbox" ${m.vehicle_check!==false?'checked':''}> Veículo conferido</label></div>
</div>`}
let teamMemberDraft=[];
function teamRenderMembers(){const b=document.getElementById('teamMembers');if(!b)return;b.innerHTML=teamMemberDraft.map((m,i)=>`<div class="team-member-row"><input value="${esc(m.name||'')}" placeholder="Nome" oninput="teamMemberDraft[${i}].name=this.value"><input value="${esc(m.role||'')}" placeholder="Função" oninput="teamMemberDraft[${i}].role=this.value"><input value="${esc(m.phone||'')}" placeholder="Telefone" oninput="teamMemberDraft[${i}].phone=this.value"><input value="${esc(m.skills||'')}" placeholder="Competências" oninput="teamMemberDraft[${i}].skills=this.value"><button class="btn sm danger" onclick="teamMemberDraft.splice(${i},1);teamRenderMembers()">×</button></div>`).join('')||'<div class="empty">Nenhum integrante cadastrado.</div>'}
function teamAddMember(){teamMemberDraft.push({name:'',role:'Montador',phone:'',skills:''});teamRenderMembers()}
function addTeam(){teamMemberDraft=[];openModal('Equipe de Montagem PRO',teamForm({active:true}),`saveTeam()`);modal.classList.add('proposal-modal');setTimeout(teamRenderMembers,0)}
function editTeam(id){const x=teamById(id);if(!x)return;teamMemberDraft=[...(teamMeta(x).members||[])];openModal('Editar Equipe',teamForm(x),`saveTeam('${id}')`);modal.classList.add('proposal-modal');setTimeout(teamRenderMembers,0)}
async function saveTeam(id=''){const name=document.getElementById('teamName').value.trim(),responsible=document.getElementById('teamResponsible').value.trim();if(!name||!responsible)return toast('Informe nome da equipe e responsável');const metadata={status:document.getElementById('teamStatus').value,capacity:+document.getElementById('teamCapacity').value||1,daily_cost:+document.getElementById('teamDailyCost').value||0,vehicle:document.getElementById('teamVehicle').value.trim(),region:document.getElementById('teamRegion').value.trim(),skills:document.getElementById('teamSkills').value.split(',').map(x=>x.trim()).filter(Boolean),rating:+document.getElementById('teamRating').value||0,quality_target:+document.getElementById('teamQualityTarget').value||95,notes:document.getElementById('teamNotes').value.trim(),members:teamMemberDraft.filter(x=>x.name.trim()),ppe_check:document.getElementById('teamPpe').checked,tools_check:document.getElementById('teamTools').checked,vehicle_check:document.getElementById('teamVehicleCheck').checked};const payload={company_id:profile.company_id,name,responsible,phone:document.getElementById('teamPhone').value.trim()||null,active:true,metadata};let r=id?await sb.from('installation_teams').update(payload).eq('id',id):await sb.from('installation_teams').insert(payload);if(r.error)return toast('Erro: '+r.error.message);closeModal();toast(id?'Equipe atualizada':'Equipe criada');render()}
async function teamToggle(id){const x=teamById(id);if(!x)return;const {error}=await sb.from('installation_teams').update({active:!x.active}).eq('id',id);if(error)return toast('Erro: '+error.message);toast(x.active?'Equipe inativada':'Equipe reativada');render()}
async function deleteTeam(id){const x=teamById(id);if(!x||!confirm(`Excluir a equipe "${x.name}"?`))return;const {error}=await sb.from('installation_teams').delete().eq('id',id);if(error)return toast('Erro: '+error.message);toast('Equipe excluída');render()}
function teamFiltered(){return cache.installationTeams.filter(x=>{const m=teamMeta(x),q=teamSearch.toLowerCase(),okq=!q||[x.name,x.responsible,x.phone,m.region,(m.skills||[]).join(' ')].some(v=>String(v||'').toLowerCase().includes(q)),okf=teamFilter==='todas'||(teamFilter==='ativas'&&x.active!==false)||(teamFilter==='disponiveis'&&teamStatus(x)==='Disponível')||(teamFilter==='ocupadas'&&teamStatus(x)==='Em montagem')||(teamFilter==='inativas'&&x.active===false);return okq&&okf})}
function teamSetFilter(v){teamFilter=v;render()} function teamSetSearch(v){teamSearch=v;render()}
function teamNextJob(id){return teamJobs(id).filter(j=>new Date(j.starts_at)>=new Date()&&!['Cancelado'].includes(j.status)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]}
function teamClient(id){return cache.clients.find(x=>x.id===id)}
function teamView(id){const x=teamById(id);if(!x)return;const m=teamMeta(x),jobs=teamJobs(id).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at)),done=jobs.filter(j=>['Concluído','Finalizado'].includes(j.status)).length;openModal(x.name,`<div class="team-detail">
<div class="team-detail-hero"><div class="team-avatar big">${esc(x.name.slice(0,2).toUpperCase())}</div><div><span class="badge ${teamStatusClass(teamStatus(x))}">${teamStatus(x)}</span><h2>${esc(x.name)}</h2><p>${esc(x.responsible)} • ${esc(x.phone||'Sem telefone')}</p></div><div class="team-score"><strong>${teamScore(x).toFixed(1)}</strong><span>★ performance</span></div></div>
<div class="team-detail-kpis"><div><b>${(m.members||[]).length||m.capacity||1}</b><span>integrantes</span></div><div><b>${jobs.length}</b><span>montagens</span></div><div><b>${done}</b><span>concluídas</span></div><div><b>${teamUtilization(x)}%</b><span>ocupação mês</span></div></div>
<div class="detail-grid"><div><label>Região</label><b>${esc(m.region||'—')}</b></div><div><label>Veículo</label><b>${esc(m.vehicle||'—')}</b></div><div><label>Custo/dia</label><b>${money(m.daily_cost||0)}</b></div><div><label>Meta qualidade</label><b>${Number(m.quality_target||95)}%</b></div></div>
<div class="team-skills">${(m.skills||[]).map(v=>`<span>${esc(v)}</span>`).join('')||'<span>Sem especialidades cadastradas</span>'}</div>
<h3>Integrantes</h3><div class="team-roster">${(m.members||[]).map(v=>`<div><b>${esc(v.name)}</b><span>${esc(v.role||'Montador')}</span><small>${esc(v.skills||'')}</small></div>`).join('')||'<div class="empty">Cadastre a composição da equipe.</div>'}</div>
<h3>Histórico de Montagens</h3><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Cliente</th><th>Endereço</th><th>Status</th></tr></thead><tbody>${jobs.slice(0,20).map(j=>`<tr><td>${new Date(j.starts_at).toLocaleDateString('pt-BR')}</td><td>${esc(teamClient(j.client_id)?.name||'—')}</td><td>${esc(j.job_address||'—')}</td><td><span class="badge">${esc(j.status||'Agendado')}</span></td></tr>`).join('')||'<tr><td colspan="4" class="empty">Sem montagens registradas.</td></tr>'}</tbody></table></div>
<div class="client-quick"><button class="btn gold" onclick="closeModal();editTeam('${id}')">Editar Equipe</button><button class="btn" onclick="location.hash='#agenda';closeModal()">Abrir Agenda</button></div></div>`,'');modal.classList.add('proposal-modal')}
function teamRanking(){const ranked=[...cache.installationTeams].filter(x=>x.active!==false).sort((a,b)=>teamScore(b)-teamScore(a));openModal('Ranking Operacional das Equipes',`<div class="team-ranking">${ranked.map((x,i)=>{const m=teamMeta(x);return `<div><b class="team-rank-pos">${i+1}º</b><div><strong>${esc(x.name)}</strong><span>${esc(x.responsible)} • ${teamJobs(x.id).length} montagens</span></div><div class="team-rank-score"><b>${teamScore(x).toFixed(1)} ★</b><span>${teamUtilization(x)}% ocupação</span></div></div>`}).join('')||'<div class="empty">Cadastre equipes para gerar ranking.</div>'}</div><div class="rem-ai-note">A nota considera a avaliação interna cadastrada; ocupação usa dias agendados no mês. A V6.16 evita transformar volume em sinônimo automático de qualidade.</div>`,'')}
function teamCapacityBoard(){const teams=cache.installationTeams.filter(x=>x.active!==false);openModal('Mapa de Capacidade • Montagem',`<div class="team-capacity-board">${teams.map(x=>{const u=teamUtilization(x),next=teamNextJob(x.id);return `<div><header><b>${esc(x.name)}</b><span class="badge ${teamStatusClass(teamStatus(x))}">${teamStatus(x)}</span></header><div class="team-capacity-bar"><i style="width:${u}%"></i></div><p><b>${u}%</b> de ocupação estimada no mês</p><small>${next?`Próxima: ${new Date(next.starts_at).toLocaleDateString('pt-BR')} • ${esc(teamClient(next.client_id)?.name||'Cliente')}`:'Sem próxima montagem agendada'}</small></div>`}).join('')}</div>`,'')}
function equipes(){const active=cache.installationTeams.filter(x=>x.active!==false),available=active.filter(x=>teamStatus(x)==='Disponível'),jobsMonth=cache.installationSchedule.filter(j=>{let d=new Date(j.starts_at),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()&&!['Cancelado'].includes(j.status)}).length,avg=active.length?active.reduce((a,x)=>a+teamScore(x),0)/active.length:0;const cards=teamFiltered().map(x=>{const m=teamMeta(x),next=teamNextJob(x.id),u=teamUtilization(x);return `<article class="team-card"><header><div class="team-avatar">${esc(x.name.slice(0,2).toUpperCase())}</div><div><span class="badge ${teamStatusClass(teamStatus(x))}">${teamStatus(x)}</span><h3>${esc(x.name)}</h3><p>${esc(x.responsible)}</p></div><strong>${teamScore(x).toFixed(1)} ★</strong></header><div class="team-card-info"><span>♧ ${(m.members||[]).length||m.capacity||1} integrantes</span><span>⌖ ${esc(m.region||'Região não definida')}</span><span>▣ ${esc(m.vehicle||'Veículo não definido')}</span></div><div class="team-skills">${(m.skills||[]).slice(0,4).map(v=>`<span>${esc(v)}</span>`).join('')}</div><div class="team-capacity-line"><div><b>Ocupação do mês</b><span>${u}%</span></div><i><em style="width:${u}%"></em></i></div><div class="team-next"><label>Próxima montagem</label>${next?`<b>${new Date(next.starts_at).toLocaleDateString('pt-BR')} • ${esc(teamClient(next.client_id)?.name||'Cliente')}</b><span>${esc(next.job_address||'Endereço não informado')}</span>`:'<b>Agenda livre</b><span>Disponível para novo projeto</span>'}</div><footer><button class="btn sm gold" onclick="teamView('${x.id}')">Central da Equipe</button><button class="btn sm" onclick="editTeam('${x.id}')">Editar</button><button class="btn sm" onclick="teamToggle('${x.id}')">${x.active?'Inativar':'Ativar'}</button></footer></article>`}).join('');return shell('Equipes de Montagem PRO','Gestão de capacidade, competências, qualidade, segurança e performance das equipes',`<button class="btn" onclick="teamRanking()">★ Ranking</button><button class="btn" onclick="teamCapacityBoard()">▦ Capacidade</button><button class="btn gold" onclick="addTeam()">+ Nova Equipe</button>`,`<div class="team-command"><div><span class="measurement-version">V6.16 • INSTALLATION PEOPLE OPS</span><h2>Centro de Comando das Equipes</h2><p>Escala inteligente, competências certas, segurança, produtividade e qualidade de montagem.</p></div><div class="team-command-actions"><button class="btn" onclick="location.hash='#agenda'">◷ Agenda de Montagem</button><button class="btn gold" onclick="teamCapacityBoard()">▦ MAPA DE CAPACIDADE</button></div></div>
<div class="grid g4 proposal-kpis"><div class="card kpi"><label>Equipes ativas</label><strong>${active.length}</strong></div><div class="card kpi"><label>Disponíveis agora</label><strong class="green">${available.length}</strong></div><div class="card kpi"><label>Montagens no mês</label><strong>${jobsMonth}</strong></div><div class="card kpi"><label>Nota média</label><strong class="goldtxt">${avg.toFixed(1)} ★</strong></div></div>
<div class="team-principles"><div><b>01</b><strong>PESSOA CERTA</strong><span>Competência adequada ao projeto</span></div><div><b>02</b><strong>CAPACIDADE REAL</strong><span>Evite sobrecarga e atrasos</span></div><div><b>03</b><strong>SAÍDA SEGURA</strong><span>EPI, ferramentas e veículo</span></div><div><b>04</b><strong>QUALIDADE</strong><span>Meta e histórico por equipe</span></div><div><b>05</b><strong>EVOLUÇÃO</strong><span>Dados para treinamento contínuo</span></div></div>
<div class="rem-controls"><div class="production-filters"><button class="${teamFilter==='ativas'?'active':''}" onclick="teamSetFilter('ativas')">Ativas</button><button class="${teamFilter==='disponiveis'?'active':''}" onclick="teamSetFilter('disponiveis')">Disponíveis</button><button class="${teamFilter==='ocupadas'?'active':''}" onclick="teamSetFilter('ocupadas')">Em montagem</button><button class="${teamFilter==='inativas'?'active':''}" onclick="teamSetFilter('inativas')">Inativas</button><button class="${teamFilter==='todas'?'active':''}" onclick="teamSetFilter('todas')">Todas</button></div><input value="${esc(teamSearch)}" placeholder="Equipe, responsável, região, especialidade..." oninput="teamSetSearch(this.value)"></div>
<div class="team-grid">${cards||'<div class="card empty">Nenhuma equipe encontrada. Cadastre sua primeira equipe de montagem.</div>'}</div>`)}
function agenda(){return simpleTable("Agenda de Montagem","Tabela installation_schedule pronta","",["Cliente","Equipe","Início","Status"],[])}
function financeiro(){return shell("Financeiro","Estrutura financeira criada no PostgreSQL","",`<div class="modules">${["Contas a Receber","Contas a Pagar","Centro de Custos","Contas Bancárias","Notas Fiscais","Fluxo de Caixa","DRE"].map(x=>`<div class="module"><h3>${x}</h3><p>Estrutura de banco pronta.</p></div>`).join("")}</div>`)}
function maquininhas(){return simpleTable("Maquininhas & Taxas","Tabela card_machines pronta","",["Maquininha","Débito","Crédito","Ações"],[])}

const VIEWS={dashboard,leads,empresa,usuarios,auditoria,planos,clientes,fornecedores,parceiros,posvenda,insumos,propostas,modelos,medicoes,compras,templates,kanban,corte,sobras,cortecloud,equipes,agenda,financeiro,maquininhas};
window.addEventListener("hashchange",()=>{page=location.hash.slice(1)||"dashboard";if(session)render()});
init();
