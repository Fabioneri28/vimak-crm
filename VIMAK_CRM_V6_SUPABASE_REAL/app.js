
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
let session=null, profile=null, company=null, cache={clients:[],leads:[],proposals:[]};

const sb = supabase.createClient(
  window.VIMAK_CONFIG.supabaseUrl,
  window.VIMAK_CONFIG.supabasePublishableKey
);

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2000)}
function toggleMenu(){sidebar.classList.toggle("open")}
function openModal(title,body,action){modal.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}<div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button>${action?`<button class="btn gold" onclick="${action}">Salvar</button>`:""}</div>`;modalWrap.classList.add("open")}
function closeModal(){modalWrap.classList.remove("open")}
function shell(title,sub,actions="",body=""){return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}</div></div>${body}`}
function simpleTable(title,sub,button,headers,rows){return shell(title,sub,button,`<div class="filters"><div class="field"><label>Buscar</label><input placeholder="Digite para pesquisar..." oninput="filterTable(this.value)"></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody id="rows">${rows.length?rows.join(""):`<tr><td class="empty" colspan="${headers.length}">Nenhum registro cadastrado.</td></tr>`}</tbody></table></div></div>`)}
function filterTable(q){q=q.toLowerCase();document.querySelectorAll("#rows tr").forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?"":"none")}

async function init(){
  const {data:{session:s}} = await sb.auth.getSession();
  if(s){session=s; await loadIdentity(); showApp();} else showAuth();
  sb.auth.onAuthStateChange(async (_event,s2)=>{
    session=s2;
    if(session){await loadIdentity();showApp()} else showAuth();
  });
}
function showAuth(){authScreen.classList.remove("hidden");appShell.classList.add("hidden")}
function showApp(){authScreen.classList.add("hidden");appShell.classList.remove("hidden");syncChrome();render()}
async function login(e){
  e.preventDefault();
  const {error}=await sb.auth.signInWithPassword({email:loginEmail.value.trim(),password:loginPassword.value});
  if(error)return toast("Login inválido: "+error.message);
  toast("Login realizado com sucesso");
}
async function logout(){await sb.auth.signOut();toast("Sessão encerrada")}
async function loadIdentity(){
  const uid=session.user.id;
  let {data:p,error}=await sb.from("profiles").select("*").eq("id",uid).single();
  if(error){console.error(error);toast("Perfil não encontrado no banco");return}
  profile=p;
  let {data:c}=await sb.from("companies").select("*").eq("id",p.company_id).single();
  company=c;
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
  const [c,l,p]=await Promise.all([
    sb.from("clients").select("*").order("created_at",{ascending:false}),
    sb.from("leads").select("*").order("created_at",{ascending:false}),
    sb.from("proposals").select("*").order("created_at",{ascending:false})
  ]);
  cache.clients=c.data||[];cache.leads=l.data||[];cache.proposals=p.data||[];
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
function clientes(){return simpleTable("Clientes","Clientes reais no PostgreSQL",`<button class="btn gold" onclick="addClient()">+ Novo Cliente</button>`,["Nome","Tipo","Documento","Telefone","E-mail","Status","Ações"],cache.clients.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.type||"")}</td><td>${esc(x.document||"")}</td><td>${esc(x.phone||"")}</td><td>${esc(x.email||"")}</td><td><span class="badge ok">${esc(x.status||"Ativo")}</span></td><td><button class="btn sm danger" onclick="deleteRow('clients','${x.id}')">Excluir</button></td></tr>`))}
function addClient(){openModal("Novo Cliente",`<div class="form-grid"><div class="field"><label>Nome</label><input id="cn"></div><div class="field"><label>Tipo</label><select id="ct"><option>Pessoa Física</option><option>Pessoa Jurídica</option></select></div><div class="field"><label>CPF/CNPJ</label><input id="cd"></div><div class="field"><label>Telefone</label><input id="cp"></div><div class="field full"><label>E-mail</label><input id="ce"></div></div>`,`saveClient()`)}
async function saveClient(){
 if(!cn.value.trim())return toast("Informe o nome");
 const {error}=await sb.from("clients").insert({company_id:profile.company_id,name:cn.value.trim(),type:ct.value,document:cd.value,phone:cp.value,email:ce.value,created_by:session.user.id});
 if(error)return toast("Erro: "+error.message);
 closeModal();toast("Cliente salvo na nuvem");render();
}
function propostas(){return simpleTable("Propostas","Propostas reais no PostgreSQL",`<button class="btn gold" onclick="addProposal()">+ Nova Proposta</button>`,["Nº","Título","Status","Valor","Criado em","Ações"],cache.proposals.map(x=>`<tr><td>${x.number||""}</td><td>${esc(x.title)}</td><td><span class="badge">${esc(x.status)}</span></td><td>${money(x.total)}</td><td>${new Date(x.created_at).toLocaleDateString("pt-BR")}</td><td><button class="btn sm danger" onclick="deleteRow('proposals','${x.id}')">Excluir</button></td></tr>`))}
function addProposal(){openModal("Nova Proposta",`<div class="form-grid"><div class="field"><label>Título</label><input id="pt"></div><div class="field"><label>Valor</label><input id="pv" type="number"></div><div class="field"><label>Status</label><select id="ps"><option>Orçado</option><option>Negociação</option><option>Aprovado</option><option>Perdido</option></select></div></div>`,`saveProposal()`)}
async function saveProposal(){
 if(!pt.value.trim())return toast("Informe o título");
 const {error}=await sb.from("proposals").insert({company_id:profile.company_id,title:pt.value.trim(),status:ps.value,total:Number(pv.value||0),created_by:session.user.id});
 if(error)return toast("Erro: "+error.message);
 closeModal();toast("Proposta salva na nuvem");render();
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
function fornecedores(){return simpleTable("Fornecedores","Módulo conectado na próxima expansão","",["Nome","Documento","Contato","Ações"],[])}
function parceiros(){return simpleTable("Parceiros","Módulo conectado na próxima expansão","",["Nome","Tipo","Contato","Ações"],[])}
function posvenda(){return simpleTable("Pós-venda / Garantia","Módulo conectado na próxima expansão","",["Cliente","Serviço","Status","Ações"],[])}
function insumos(){return simpleTable("Insumos","Módulo conectado na próxima expansão","",["Nome","Tipo","Estoque","Ações"],[])}
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
