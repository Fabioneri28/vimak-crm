
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
let session=null, profile=null, company=null, cache={clients:[],leads:[],proposals:[],proposalItems:[],suppliers:[],partners:[],afterSales:[],inputs:[]};

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
  const [c,l,p,pi,s,pa,as,i]=await Promise.all([
    sb.from("clients").select("*").order("created_at",{ascending:false}),
    sb.from("leads").select("*").order("created_at",{ascending:false}),
    sb.from("proposals").select("*").order("created_at",{ascending:false}),
    sb.from("proposal_items").select("*").order("created_at",{ascending:true}),
    sb.from("suppliers").select("*").order("created_at",{ascending:false}),
    sb.from("partners").select("*").order("created_at",{ascending:false}),
    sb.from("after_sales_tickets").select("*").order("opened_at",{ascending:false}),
    sb.from("inputs").select("*").order("created_at",{ascending:false})
  ]);
  cache.clients=c.data||[];
  cache.leads=l.data||[];
  cache.proposals=p.data||[];
  cache.proposalItems=pi.data||[];
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
function modelos(){return simpleTable("Modelos de Proposta","Módulo conectado na próxima expansão","",["Nome","Ambientes","Ações"],[])}
function medicoes(){return simpleTable("Medições Técnicas","Módulo conectado na próxima expansão","",["Cliente","Ambientes","Data","Ações"],[])}
function compras(){return simpleTable("Compras","Módulo conectado na próxima expansão","",["Fornecedor","Valor","Status","Ações"],[])}
function templates(){return simpleTable("Templates de Documentos","Módulo conectado na próxima expansão","",["Nome","Tipo","Ações"],[])}
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
