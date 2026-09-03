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
const PERMISSIONS=["dashboard","leads","clientes","propostas","producao","financeiro","empresa","usuarios","cadastros","montagem","documentos","integracoes"];
const APPKEY="vimak_v4_saas";
let page=location.hash.slice(1)||"dashboard";
let session=null;

function seed(){
 return {
  companies:[
   {id:"vimak",name:"VIMAK Planejados",slug:"vimak",plan:"Profissional",logo:"",status:"Ativa"},
   {id:"demo",name:"Móveis Prime Demo",slug:"moveis-prime",plan:"Essencial",logo:"",status:"Ativa"}
  ],
  users:[
   {id:1,companyId:"vimak",name:"Administrador VIMAK",email:"admin@vimak.com.br",password:"123456",role:"Administrador",active:true,permissions:["*"]},
   {id:2,companyId:"vimak",name:"Equipe Comercial",email:"vendas@vimak.com.br",password:"123456",role:"Vendedor",active:true,permissions:["dashboard","leads","clientes","propostas"]},
   {id:3,companyId:"demo",name:"Admin Demo",email:"admin@moveisprime.com.br",password:"123456",role:"Administrador",active:true,permissions:["*"]}
  ],
  tenantData:{
   vimak:{
    clientes:[{id:1,nome:"João da Silva",tipo:"Pessoa Física",doc:"***.***.***-**",telefone:"(44) 99999-0000",email:"joao@email.com",status:"Ativo"}],
    leads:[
     {id:1,nome:"Mariana Costa",telefone:"(44) 99991-1000",ambiente:"Cozinha",valor:18000,score:92,etapa:"Entrada"},
     {id:2,nome:"João Silva",telefone:"(44) 99992-2000",ambiente:"Suíte",valor:24000,score:82,etapa:"Qualificação"},
     {id:3,nome:"Ana Paula",telefone:"(44) 99993-3000",ambiente:"Sala",valor:32000,score:76,etapa:"Construção de Valor"}
    ],
    propostas:[{id:25,titulo:"Cozinha Planejada",cliente:"João da Silva",status:"Negociação",valor:28500,data:"03/09/2026"}],
    fornecedores:[],parceiros:[],chamados:[],insumos:[],compras:[],equipes:[],agenda:[],maquininhas:[],audit:[]
   },
   demo:{clientes:[],leads:[],propostas:[],fornecedores:[],parceiros:[],chamados:[],insumos:[],compras:[],equipes:[],agenda:[],maquininhas:[],audit:[]}
  }
 };
}
function state(){try{return JSON.parse(localStorage.getItem(APPKEY))||seed()}catch(e){return seed()}}
function saveState(s){localStorage.setItem(APPKEY,JSON.stringify(s))}
function company(){if(!session)return null;return state().companies.find(c=>c.id===session.companyId)}
function data(){let s=state();if(!s.tenantData[session.companyId])s.tenantData[session.companyId]=seed().tenantData.demo;return s.tenantData[session.companyId]}
function mutate(fn,action="Alteração"){let s=state(),t=s.tenantData[session.companyId];fn(t,s);t.audit=t.audit||[];t.audit.unshift({id:Date.now(),at:new Date().toLocaleString("pt-BR"),user:session.name,action});t.audit=t.audit.slice(0,100);saveState(s)}
function uid(a){return a.length?Math.max(...a.map(x=>Number(x.id)||0))+1:1}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1900)}
function can(p){return session&&(session.permissions.includes("*")||session.permissions.includes(p))}
function sectionAllowed(route){if(["usuarios","auditoria","planos","empresa"].includes(route))return can("empresa")||can("usuarios");if(["leads"].includes(route))return can("leads");if(["clientes","fornecedores","parceiros","posvenda","insumos"].includes(route))return can("cadastros")||can("clientes");if(["propostas","modelos","medicoes","compras"].includes(route))return can("propostas");if(["kanban","corte","sobras"].includes(route))return can("producao");if(["financeiro","maquininhas"].includes(route))return can("financeiro");if(["equipes","agenda"].includes(route))return can("montagem");if(route==="templates")return can("documentos");if(route==="cortecloud")return can("integracoes");return can("dashboard")}

function init(){
 const raw=sessionStorage.getItem("vimak_session");
 if(raw){try{session=JSON.parse(raw)}catch(e){}}
 if(session){showApp()} else showAuth();
}
function showAuth(){document.getElementById("authScreen").classList.remove("hidden");document.getElementById("appShell").classList.add("hidden")}
function showApp(){document.getElementById("authScreen").classList.add("hidden");document.getElementById("appShell").classList.remove("hidden");syncChrome();render()}
function login(e){
 e.preventDefault();
 const s=state(), email=loginEmail.value.trim().toLowerCase(), pass=loginPassword.value;
 const u=s.users.find(x=>x.email.toLowerCase()===email&&x.password===pass&&x.active);
 if(!u)return toast("E-mail ou senha inválidos");
 session={userId:u.id,companyId:u.companyId,name:u.name,email:u.email,role:u.role,permissions:u.permissions};
 sessionStorage.setItem("vimak_session",JSON.stringify(session));
 showApp(); toast("Bem-vindo ao VIMAK CRM V5");
}
function logout(){sessionStorage.removeItem("vimak_session");session=null;showAuth();toast("Sessão encerrada")}
function showCreateCompany(){
 openModal("Criar empresa de demonstração",`<div class="form-grid"><div class="field"><label>Nome da empresa</label><input id="newCompany"></div><div class="field"><label>Seu nome</label><input id="newAdmin"></div><div class="field"><label>E-mail de acesso</label><input id="newEmail" type="email"></div><div class="field"><label>Senha</label><input id="newPass" type="password" value="123456"></div></div><div class="notice" style="margin-top:12px">Nesta V4 a empresa é criada localmente no navegador para testar a arquitetura multiempresa.</div>`,`createCompany()`)
}
function createCompany(){
 if(!newCompany.value.trim()||!newEmail.value.trim())return toast("Preencha empresa e e-mail");
 let s=state(); const cid="c"+Date.now();
 s.companies.push({id:cid,name:newCompany.value.trim(),slug:cid,plan:"Trial",logo:"",status:"Ativa"});
 s.users.push({id:uid(s.users),companyId:cid,name:newAdmin.value||"Administrador",email:newEmail.value.trim(),password:newPass.value||"123456",role:"Administrador",active:true,permissions:["*"]});
 s.tenantData[cid]={clientes:[],leads:[],propostas:[],fornecedores:[],parceiros:[],chamados:[],insumos:[],compras:[],equipes:[],agenda:[],maquininhas:[],audit:[]};
 saveState(s);closeModal();toast("Empresa criada. Use o e-mail informado para entrar.");
}

function syncChrome(){
 const c=company(); if(!c)return;
 tenantName.textContent=c.name;tenantPlan.textContent="Plano "+c.plan;tenantInitial.textContent=c.name.charAt(0).toUpperCase();topCompany.textContent=c.name;
 userName.textContent=session.name;userRole.textContent=session.role;userInitials.textContent=session.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
 sideBrand.textContent=(c.name.split(" ")[0]||"VIMAK").toUpperCase();
 if(c.logo){sideLogo.innerHTML=`<img src="${c.logo}" style="max-width:100%;max-height:100%;border-radius:8px">`}else sideLogo.textContent=c.name.charAt(0).toUpperCase();
}
function openTenantSwitcher(){
 if(session.role!=="Administrador")return toast("Troca de empresa restrita ao administrador");
 const s=state(), mine=s.companies.filter(c=>s.users.some(u=>u.companyId===c.id&&u.email===session.email));
 const all=session.email==="admin@vimak.com.br"?s.companies:mine;
 openModal("Trocar ambiente",`<div style="display:grid;gap:9px">${all.map(c=>`<button class="btn ${c.id===session.companyId?"gold":""}" onclick="switchTenant('${c.id}')">${esc(c.name)} • ${esc(c.plan)}</button>`).join("")}</div>`,`closeModal()`)
}
function switchTenant(cid){
 const s=state(); let u=s.users.find(x=>x.companyId===cid&&x.email===session.email);
 if(!u&&session.email==="admin@vimak.com.br")u={id:session.userId,companyId:cid,name:session.name,email:session.email,role:"Administrador",permissions:["*"]};
 if(!u)return toast("Sem acesso a esta empresa");
 session={...session,companyId:cid,role:u.role,permissions:u.permissions};sessionStorage.setItem("vimak_session",JSON.stringify(session));closeModal();syncChrome();page="dashboard";location.hash="dashboard";render();toast("Empresa alterada")
}
function toggleMenu(){sidebar.classList.toggle("open")}
function go(p){if(!sectionAllowed(p))return toast("Seu perfil não possui acesso a este módulo");page=p;location.hash=p;render();sidebar.classList.remove("open");scrollTo(0,0)}
function buildNav(){nav.innerHTML=NAV.map(g=>`<div class="nav-title">${g[0]}</div>${g[1].filter(i=>sectionAllowed(i[0])).map(i=>`<button class="nav-btn ${page===i[0]?"active":""}" onclick="go('${i[0]}')"><span>${i[1]}</span>${i[2]}</button>`).join("")}`).join("")}
function shell(title,sub,actions="",body=""){return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}</div></div>${body}`}
function openModal(title,body,action){modal.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}<div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button>${action?`<button class="btn gold" onclick="${action}">Salvar</button>`:""}</div>`;modalWrap.classList.add("open")}
function closeModal(){modalWrap.classList.remove("open")}
function simpleTable(title,sub,button,headers,rows){return shell(title,sub,button,`<div class="filters"><div class="field"><label>Buscar</label><input placeholder="Digite para pesquisar..." oninput="filterTable(this.value)"></div><button class="btn gold" onclick="toast('Filtro aplicado')">Filtrar</button></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody id="rows">${rows.length?rows.join(""):`<tr><td class="empty" colspan="${headers.length}">Nenhum registro cadastrado nesta empresa.</td></tr>`}</tbody></table></div></div>`)}
function filterTable(q){q=q.toLowerCase();document.querySelectorAll("#rows tr").forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?"":"none")}

function dashboard(){
 const d=data(), total=d.propostas.reduce((a,x)=>a+Number(x.valor||0),0), approved=d.propostas.filter(x=>x.status==="Aprovado").length;
 return shell("Dashboard","Visão executiva de "+company().name,`<button class="btn">Setembro 2026 ▾</button><button class="btn gold" onclick="addLead()">+ Novo Lead</button>`,
 `<div class="grid g4">
 <div class="card kpi"><label>Faturamento potencial</label><strong class="goldtxt">${money(total)}</strong><small>Propostas cadastradas</small></div>
 <div class="card kpi"><label>Propostas</label><strong>${d.propostas.length}</strong><small>${approved} aprovada(s)</small></div>
 <div class="card kpi"><label>Leads ativos</label><strong>${d.leads.length}</strong><small>Pipeline comercial</small></div>
 <div class="card kpi"><label>Clientes</label><strong>${d.clientes.length}</strong><small>Base exclusiva desta empresa</small></div></div>
 <div class="section">Arquitetura SaaS</div><div class="grid g4">
 <div class="card kpi"><label>Empresa ativa</label><strong class="goldtxt">${esc(company().name)}</strong><small>Dados isolados por tenant</small></div>
 <div class="card kpi"><label>Seu perfil</label><strong>${esc(session.role)}</strong><small>Permissões por usuário</small></div>
 <div class="card kpi"><label>Plano</label><strong>${esc(company().plan)}</strong><small>Pronto para cobrança futura</small></div>
 <div class="card kpi"><label>Versão</label><strong>V4</strong><small>PWA + SaaS ready</small></div></div>
 <div class="section">Acesso rápido</div><div class="modules">${[["◎","Leads & CRM","Funil comercial separado por empresa.","leads"],["▤","Propostas","Orçamentos e negociações.","propostas"],["▦","Kanban","Produção dos projetos.","kanban"],["◉","Financeiro","Indicadores e DRE.","financeiro"],["◷","Agenda","Planejamento de montagens.","agenda"],["♙","Usuários","Perfis e permissões.","usuarios"]].filter(x=>sectionAllowed(x[3])).map(m=>`<div class="module" onclick="go('${m[3]}')" style="cursor:pointer"><i>${m[0]}</i><h3>${m[1]}</h3><p>${m[2]}</p></div>`).join("")}</div>`);
}
function leads(){
 const d=data(), stages=["Entrada","Qualificação","Construção de Valor","Pré-compromisso","Apresentação","Fechamento","Pós-venda"];
 return shell("Leads & CRM","Pipeline comercial exclusivo de "+company().name,`<button class="btn gold" onclick="addLead()">+ Novo Lead</button>`,
 `<div class="grid g4"><div class="card kpi"><label>Novos</label><strong class="goldtxt">${d.leads.filter(x=>x.etapa==="Entrada").length}</strong></div><div class="card kpi"><label>Em atendimento</label><strong class="blue">${d.leads.filter(x=>x.etapa==="Qualificação").length}</strong></div><div class="card kpi"><label>Score médio</label><strong class="green">${d.leads.length?Math.round(d.leads.reduce((a,x)=>a+x.score,0)/d.leads.length):0}</strong></div><div class="card kpi"><label>Valor potencial</label><strong>${money(d.leads.reduce((a,x)=>a+x.valor,0))}</strong></div></div>
 <div class="section">Pipeline</div><div class="pipeline">${stages.map(s=>`<div class="stage"><div class="stage-head">${s}<b class="goldtxt">${d.leads.filter(x=>x.etapa===s).length}</b></div>${d.leads.filter(x=>x.etapa===s).map(x=>`<div class="deal"><b>${esc(x.nome)}</b><span>${esc(x.telefone)} • ${esc(x.ambiente)}</span><span class="goldtxt">${money(x.valor)}</span><span>Score ${x.score}</span></div>`).join("")||`<div class="empty">Sem leads</div>`}</div>`).join("")}</div>`);
}
function addLead(){openModal("Novo Lead",`<div class="form-grid"><div class="field"><label>Nome</label><input id="ln"></div><div class="field"><label>WhatsApp</label><input id="lt"></div><div class="field"><label>Ambiente</label><input id="la"></div><div class="field"><label>Investimento</label><input id="lv" type="number"></div><div class="field"><label>Etapa</label><select id="le">${["Entrada","Qualificação","Construção de Valor","Pré-compromisso","Apresentação","Fechamento","Pós-venda"].map(x=>`<option>${x}</option>`).join("")}</select></div><div class="field"><label>Lead Score</label><input id="ls" type="number" value="50" min="0" max="100"></div></div>`,`saveLead()`)}
function saveLead(){if(!ln.value.trim())return toast("Informe o nome");mutate(d=>d.leads.push({id:uid(d.leads),nome:ln.value,telefone:lt.value,ambiente:la.value,valor:Number(lv.value||0),etapa:le.value,score:Number(ls.value||0)}),"Lead cadastrado");closeModal();toast("Lead cadastrado");go("leads")}

function clientes(){const d=data();return simpleTable("Clientes","Base exclusiva de "+company().name,`<button class="btn gold" onclick="addClient()">+ Novo Cliente</button>`,["Nome","Tipo","CPF/CNPJ","Telefone","E-mail","Status","Ações"],d.clientes.map(x=>`<tr><td>${esc(x.nome)}</td><td>${esc(x.tipo)}</td><td>${esc(x.doc)}</td><td>${esc(x.telefone)}</td><td>${esc(x.email)}</td><td><span class="badge ok">${esc(x.status)}</span></td><td><button class="btn sm" onclick="editClient(${x.id})">Editar</button> <button class="btn sm danger" onclick="del('clientes',${x.id})">Excluir</button></td></tr>`))}
function addClient(){openModal("Novo Cliente",`<div class="form-grid"><div class="field"><label>Nome / Razão Social</label><input id="cn"></div><div class="field"><label>Tipo</label><select id="ct"><option>Pessoa Física</option><option>Pessoa Jurídica</option></select></div><div class="field"><label>CPF/CNPJ</label><input id="cd"></div><div class="field"><label>Telefone</label><input id="cp"></div><div class="field full"><label>E-mail</label><input id="ce"></div></div>`,`saveClient()`)}
function saveClient(){if(!cn.value.trim())return toast("Informe o nome");mutate(d=>d.clientes.push({id:uid(d.clientes),nome:cn.value,tipo:ct.value,doc:cd.value,telefone:cp.value,email:ce.value,status:"Ativo"}),"Cliente cadastrado");closeModal();toast("Cliente cadastrado");go("clientes")}
function editClient(n){let x=data().clientes.find(v=>v.id===n);if(!x)return;openModal("Editar Cliente",`<div class="form-grid"><div class="field"><label>Nome</label><input id="ecn" value="${esc(x.nome)}"></div><div class="field"><label>Telefone</label><input id="ecp" value="${esc(x.telefone)}"></div><div class="field full"><label>E-mail</label><input id="ece" value="${esc(x.email)}"></div></div>`,`updateClient(${n})`)}
function updateClient(n){mutate(d=>{let x=d.clientes.find(v=>v.id===n);x.nome=ecn.value;x.telefone=ecp.value;x.email=ece.value},"Cliente atualizado");closeModal();toast("Cliente atualizado");go("clientes")}

function propostas(){const d=data();return shell("Propostas","Orçamentos e oportunidades da empresa ativa",`<button class="btn gold" onclick="addProposal()">+ Nova Proposta</button>`,
 `<div class="grid g4"><div class="card kpi"><label>Total</label><strong>${d.propostas.length}</strong></div><div class="card kpi"><label>Em negociação</label><strong class="goldtxt">${d.propostas.filter(x=>x.status==="Negociação").length}</strong></div><div class="card kpi"><label>Aprovadas</label><strong class="green">${d.propostas.filter(x=>x.status==="Aprovado").length}</strong></div><div class="card kpi"><label>Valor total</label><strong>${money(d.propostas.reduce((a,x)=>a+x.valor,0))}</strong></div></div><div class="section">Propostas cadastradas</div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Título</th><th>Cliente</th><th>Status</th><th>Valor</th><th>Data</th><th>Ações</th></tr></thead><tbody>${d.propostas.map(x=>`<tr><td>ORC-${String(x.id).padStart(5,"0")}</td><td>${esc(x.titulo)}</td><td>${esc(x.cliente)}</td><td><span class="badge">${esc(x.status)}</span></td><td>${money(x.valor)}</td><td>${esc(x.data)}</td><td><button class="btn sm danger" onclick="del('propostas',${x.id})">Excluir</button></td></tr>`).join("")}</tbody></table></div></div>`) }
function addProposal(){openModal("Nova Proposta",`<div class="form-grid"><div class="field"><label>Título</label><input id="pt"></div><div class="field"><label>Cliente</label><input id="pc"></div><div class="field"><label>Valor</label><input id="pv" type="number"></div><div class="field"><label>Status</label><select id="ps"><option>Orçado</option><option>Negociação</option><option>Aprovado</option><option>Perdido</option></select></div></div>`,`saveProposal()`)}
function saveProposal(){if(!pt.value.trim())return toast("Informe o título");mutate(d=>d.propostas.push({id:uid(d.propostas)+100,titulo:pt.value,cliente:pc.value,status:ps.value,valor:Number(pv.value||0),data:new Date().toLocaleDateString("pt-BR")}),"Proposta criada");closeModal();toast("Proposta criada");go("propostas")}
function del(k,n){mutate(d=>d[k]=d[k].filter(x=>x.id!==n),`Registro excluído em ${k}`);toast("Registro removido");render()}

function empresa(){const c=company();return shell("Configurações da Empresa","Identidade e dados do tenant ativo",`<button class="btn gold" onclick="saveCompany()">Salvar Configurações</button>`,
 `<div class="grid g2"><div class="card pad"><div class="section" style="margin-top:0">Dados Gerais</div><div class="field"><label>Nome da Empresa</label><input id="er" value="${esc(c.name)}"></div><div class="field" style="margin-top:10px"><label>Plano Atual</label><input value="${esc(c.plan)}" disabled></div><div class="field" style="margin-top:10px"><label>Status</label><input value="${esc(c.status)}" disabled></div><div class="notice" style="margin-top:12px">Cada empresa possui dados, usuários e identidade separados.</div></div>
 <div class="card pad"><div class="section" style="margin-top:0">Identidade Visual</div><div class="field"><label>Logo da empresa</label><input type="file" id="elogo" accept="image/*" onchange="previewLogo(event)"></div><div id="logoPreview" style="height:110px;border:1px dashed #604a21;border-radius:8px;margin-top:12px;display:grid;place-items:center;overflow:hidden">${c.logo?`<img src="${c.logo}" style="max-width:100%;max-height:100%">`:"Prévia da logo"}</div></div></div>`)}
function previewLogo(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>logoPreview.innerHTML=`<img src="${r.result}" style="max-width:100%;max-height:100%">`;r.readAsDataURL(f)}
function saveCompany(){let s=state(),c=s.companies.find(x=>x.id===session.companyId);c.name=er.value.trim()||c.name;let f=elogo.files[0];const finish=()=>{saveState(s);syncChrome();toast("Empresa atualizada")};if(f){let r=new FileReader();r.onload=()=>{c.logo=r.result;finish()};r.readAsDataURL(f)}else finish()}

function usuarios(){
 let s=state(), users=s.users.filter(u=>u.companyId===session.companyId);
 return simpleTable("Usuários da Equipe","Perfis e permissões de "+company().name,`<button class="btn gold" onclick="addUser()">+ Novo Usuário</button>`,["Nome","E-mail","Perfil","Status","Permissões","Ações"],users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td><span class="badge ${u.active?"ok":"bad"}">${u.active?"Ativo":"Inativo"}</span></td><td>${u.permissions.includes("*")?"Todas":u.permissions.length+" módulos"}</td><td><button class="btn sm" onclick="editUser(${u.id})">Permissões</button></td></tr>`))
}
function addUser(){openModal("Novo Usuário",`<div class="form-grid"><div class="field"><label>Nome</label><input id="un"></div><div class="field"><label>E-mail</label><input id="ue" type="email"></div><div class="field"><label>Senha inicial</label><input id="up" value="123456"></div><div class="field"><label>Perfil</label><select id="ur"><option>Vendedor</option><option>Projetista</option><option>Produção</option><option>Financeiro</option><option>Administrador</option></select></div><div class="full"><div class="section" style="margin:8px 0">Permissões</div><div class="permission-grid">${PERMISSIONS.map(p=>`<label class="permission"><input class="uperm" type="checkbox" value="${p}" checked> ${p}</label>`).join("")}</div></div></div>`,`saveUser()`)}
function saveUser(){if(!un.value.trim()||!ue.value.trim())return toast("Preencha nome e e-mail");let s=state();if(s.users.some(x=>x.email.toLowerCase()===ue.value.trim().toLowerCase()))return toast("Este e-mail já está cadastrado");let perms=[...document.querySelectorAll(".uperm:checked")].map(x=>x.value);s.users.push({id:uid(s.users),companyId:session.companyId,name:un.value,email:ue.value.trim(),password:up.value||"123456",role:ur.value,active:true,permissions:ur.value==="Administrador"?["*"]:perms});saveState(s);closeModal();toast("Usuário criado");go("usuarios")}
function editUser(n){let s=state(),u=s.users.find(x=>x.id===n&&x.companyId===session.companyId);if(!u)return;openModal("Permissões de "+esc(u.name),`<div class="form-grid"><div class="field"><label>Perfil</label><select id="eur">${["Vendedor","Projetista","Produção","Financeiro","Administrador"].map(r=>`<option ${u.role===r?"selected":""}>${r}</option>`).join("")}</select></div><div class="field"><label>Status</label><select id="eua"><option value="1" ${u.active?"selected":""}>Ativo</option><option value="0" ${!u.active?"selected":""}>Inativo</option></select></div><div class="full"><div class="section" style="margin:8px 0">Módulos permitidos</div><div class="permission-grid">${PERMISSIONS.map(p=>`<label class="permission"><input class="eperm" type="checkbox" value="${p}" ${(u.permissions.includes("*")||u.permissions.includes(p))?"checked":""}> ${p}</label>`).join("")}</div></div></div>`,`saveUserEdit(${n})`)}
function saveUserEdit(n){let s=state(),u=s.users.find(x=>x.id===n&&x.companyId===session.companyId);u.role=eur.value;u.active=eua.value==="1";u.permissions=u.role==="Administrador"?["*"]:[...document.querySelectorAll(".eperm:checked")].map(x=>x.value);saveState(s);closeModal();toast("Permissões atualizadas");go("usuarios")}

function auditoria(){let a=data().audit||[];return simpleTable("Auditoria","Histórico de alterações do ambiente atual","",["Data/Hora","Usuário","Ação"],a.map(x=>`<tr><td>${esc(x.at)}</td><td>${esc(x.user)}</td><td>${esc(x.action)}</td></tr>`))}
function planos(){return shell("Assinatura / Planos","Estrutura comercial preparada para o SaaS","",`<div class="grid g3">${[["Essencial","CRM + clientes + propostas","R$ 99/mês"],["Profissional","CRM + produção + financeiro + usuários","R$ 199/mês"],["Premium","Operação completa + integrações","R$ 349/mês"]].map((x,i)=>`<div class="card pad"><span class="badge ${i===1?"ok":""}">${i===1?"RECOMENDADO":"PLANO"}</span><h2 class="goldtxt">${x[0]}</h2><p class="muted">${x[1]}</p><h3>${x[2]}</h3><button class="btn ${i===1?"gold":""}" onclick="toast('Cobrança será conectada na etapa de pagamentos')">Selecionar</button></div>`).join("")}</div>`)}
function fornecedores(){return simpleTable("Fornecedores","Cadastro da empresa ativa",`<button class="btn gold" onclick="toast('CRUD de fornecedores será a próxima expansão')">+ Novo Fornecedor</button>`,["Razão Social","Tipo","CNPJ","Contato","Telefone","Ações"],[])}
function parceiros(){return simpleTable("Parceiros","Arquitetos e especificadores da empresa ativa",`<button class="btn gold" onclick="toast('Novo parceiro')">+ Novo Parceiro</button>`,["Nome","Tipo","Telefone","E-mail","Comissão","Ações"],[])}
function posvenda(){return simpleTable("Pós-venda / Garantia","Assistência e garantia por empresa",`<button class="btn gold" onclick="toast('Novo chamado')">+ Novo Chamado</button>`,["Cliente","Serviço","Descrição","Status","Custo","Aberto em","Ações"],[])}
function insumos(){return simpleTable("Insumos","Materiais, ferragens e componentes",`<button class="btn gold" onclick="toast('Novo insumo')">+ Novo Insumo</button>`,["Nome","Tipo","Unidade","Custo Unitário","Estoque","Fornecedor","Ações"],[])}
function modelos(){return simpleTable("Modelos de Proposta","Modelos reutilizáveis",`<button class="btn gold" onclick="toast('Novo modelo')">+ Novo Modelo</button>`,["Nome","Ambientes","Aplicação","Ações"],[])}
function medicoes(){return simpleTable("Medições Técnicas","Medições por cliente e ambiente",`<button class="btn gold" onclick="toast('Nova medição')">+ Iniciar Medição</button>`,["Nº","Cliente","Ambientes","Data","Responsável","Ações"],[])}
function compras(){return simpleTable("Compras","Pedidos de compra e abastecimento",`<button class="btn gold" onclick="toast('Novo pedido')">+ Criar Pedido</button>`,["Fornecedor","Proposta","Itens","Valor","Status","Data","Ações"],[])}
function templates(){return simpleTable("Templates de Documentos","Contratos, propostas e termos",`<button class="btn gold" onclick="toast('Novo template')">+ Novo Template</button>`,["Nome","Tipo","Ações"],[`<tr><td>Contrato de Prestação de Serviços</td><td>Contrato</td><td><button class="btn sm">Gerar PDF</button></td></tr>`,`<tr><td>Proposta Comercial</td><td>Proposta</td><td><button class="btn sm">Gerar PDF</button></td></tr>`,`<tr><td>Termo de Aceite</td><td>Termo</td><td><button class="btn sm">Gerar PDF</button></td></tr>`])}
function kanban(){return shell("Kanban de Produção","Projetos da empresa ativa","",`<div class="pipeline" style="grid-template-columns:repeat(5,minmax(190px,1fr))">${["Orçado","Aprovado / Medição","Em Produção","Em Montagem","Entregue"].map((s,i)=>`<div class="stage"><div class="stage-head">${s}<b class="goldtxt">${[3,2,1,2,5][i]}</b></div>${i<4?`<div class="deal"><b>Projeto ${company().name}</b><span>Cliente • Ambiente</span><span>Atualizado hoje</span></div>`:""}</div>`).join("")}</div>`)}
function corte(){return simpleTable("Planos de Corte","Planos vinculados à produção",`<button class="btn gold" onclick="toast('Novo plano')">+ Novo Plano</button>`,["Plano","Projeto","Chapas","Aproveitamento","Status","Ações"],[])}
function sobras(){return simpleTable("Estoque de Sobras de Chapas","Retalhos disponíveis e reservados",`<button class="btn" onclick="toast('Etiquetas preparadas')">Imprimir etiquetas</button>`,["Etiqueta","Material","Dimensão","Área","Origem","Status","Criado em","Ações"],[])}
function cortecloud(){return shell("Integração • CorteCloud","Credenciais isoladas por empresa",`<button class="btn gold" onclick="toast('Credenciais salvas localmente na demonstração')">Salvar credenciais</button>`,`<div class="card pad" style="max-width:620px"><div class="field"><label>E-mail da conta</label><input></div><div class="field" style="margin-top:10px"><label>API Key</label><input></div><div class="field" style="margin-top:10px"><label>Ambiente</label><select><option>Produção</option><option>Teste</option></select></div></div>`)}
function equipes(){return simpleTable("Equipes de Montagem","Equipes da empresa ativa",`<button class="btn gold" onclick="toast('Nova equipe')">+ Adicionar Equipe</button>`,["Equipe","Responsável","Telefone","Ações"],[])}
function agenda(){return simpleTable("Agenda de Montagem","Planejamento de instalações",`<button class="btn gold" onclick="toast('Novo agendamento')">+ Agendar</button>`,["Orçamento","Cliente","Equipe","Início","Fim","Status","Ações"],[])}
function financeiro(){return shell("Financeiro","Visão gerencial da empresa ativa",`<button class="btn gold" onclick="toast('Novo lançamento')">+ Novo Lançamento</button>`,`<div class="modules">${[["↗","Contas a Receber","Valores a receber dos clientes."],["↘","Contas a Pagar","Despesas e compromissos."],["▣","Centro de Custos","Organização dos gastos."],["▤","Contas Bancárias","Entradas e saídas por conta."],["▥","Notas Fiscais","Registro de notas."],["◉","Fluxo de Caixa","Previsão financeira."],["◈","DRE","Resultado gerencial."]].map(x=>`<div class="module"><i>${x[0]}</i><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join("")}</div><div class="section">Dashboard Financeiro</div><div class="grid g3"><div class="card kpi"><label>A receber</label><strong class="green">R$ 0,00</strong></div><div class="card kpi"><label>A pagar</label><strong class="red">R$ 0,00</strong></div><div class="card kpi"><label>Contas atrasadas</label><strong>0</strong></div></div>`)}
function maquininhas(){return simpleTable("Maquininhas & Taxas de Cartão","Taxas por adquirente da empresa ativa",`<button class="btn gold" onclick="toast('Nova maquininha')">+ Adicionar Maquininha</button>`,["Maquininha","Débito","Crédito 1x","Parcelado","Ações"],[])}

const VIEWS={dashboard,leads,empresa,usuarios,auditoria,planos,clientes,fornecedores,parceiros,posvenda,insumos,propostas,modelos,medicoes,compras,templates,kanban,corte,sobras,cortecloud,equipes,agenda,financeiro,maquininhas};
function render(){if(!session)return;buildNav();if(!sectionAllowed(page)){page="dashboard";location.hash="dashboard"}crumb.textContent=TITLES[page]||"Dashboard";content.innerHTML=(VIEWS[page]||dashboard)()}
window.addEventListener("hashchange",()=>{page=location.hash.slice(1)||"dashboard";if(session)render()});
init();
