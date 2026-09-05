
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
let session=null, profile=null, company=null, cache={clients:[],leads:[],proposals:[],proposalItems:[],proposalModels:[],measurements:[],purchaseOrders:[],purchaseOrderItems:[],documentTemplates:[],suppliers:[],partners:[],afterSales:[],inputs:[]};

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
  const [c,l,p,pi,pm,m,po,poi,dt,s,pa,as,i]=await Promise.all([
    sb.from("clients").select("*").order("created_at",{ascending:false}),
    sb.from("leads").select("*").order("created_at",{ascending:false}),
    sb.from("proposals").select("*").order("created_at",{ascending:false}),
    sb.from("proposal_items").select("*").order("created_at",{ascending:true}),
    sb.from("proposal_models").select("*").order("created_at",{ascending:false}),
    sb.from("measurements").select("*").order("measured_at",{ascending:false}),
    sb.from("purchase_orders").select("*").order("ordered_at",{ascending:false}),
    sb.from("purchase_order_items").select("*").order("created_at",{ascending:true}),
    sb.from("document_templates").select("*").order("created_at",{ascending:false}),
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
function kanban(){return shell("Kanban de Produção","Estrutura do banco já preparada para production_projects","",`<div class="pipeline" style="grid-template-columns:repeat(5,minmax(190px,1fr))">${["Orçado","Aprovado / Medição","Em Produção","Em Montagem","Entregue"].map(s=>`<div class="stage"><div class="stage-head">${s}<b class="goldtxt">0</b></div></div>`).join("")}</div>`)}
function corte(){return simpleTable("Planos de Corte","Tabela cutting_plans pronta no Supabase","",["Plano","Projeto","Aproveitamento","Status"],[])}
function sobras(){return simpleTable("Estoque de Sobras","Tabela sheet_remnants pronta no Supabase","",["Material","Dimensão","Área","Status"],[])}
function cortecloud(){return shell("Integração • CorteCloud","Tabela integrations pronta no Supabase","",`<div class="notice">Credenciais sensíveis devem ser tratadas no backend/edge functions, nunca expostas no navegador.</div>`)}
function equipes(){return simpleTable("Equipes de Montagem","Tabela installation_teams pronta","",["Equipe","Responsável","Telefone"],[])}
function agenda(){return simpleTable("Agenda de Montagem","Tabela installation_schedule pronta","",["Cliente","Equipe","Início","Status"],[])}
function financeiro(){return shell("Financeiro","Estrutura financeira criada no PostgreSQL","",`<div class="modules">${["Contas a Receber","Contas a Pagar","Centro de Custos","Contas Bancárias","Notas Fiscais","Fluxo de Caixa","DRE"].map(x=>`<div class="module"><h3>${x}</h3><p>Estrutura de banco pronta.</p></div>`).join("")}</div>`)}
function maquininhas(){return simpleTable("Maquininhas & Taxas","Tabela card_machines pronta","",["Maquininha","Débito","Crédito","Ações"],[])}

const VIEWS={dashboard,leads,empresa,usuarios,auditoria,planos,clientes,fornecedores,parceiros,posvenda,insumos,propostas,modelos,medicoes,compras,templates,kanban,corte,sobras,cortecloud,equipes,agenda,financeiro,maquininhas};
window.addEventListener("hashchange",()=>{page=location.hash.slice(1)||"dashboard";if(session)render()});
init();
