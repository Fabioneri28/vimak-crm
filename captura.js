const SUPABASE_URL="https://kpsoigxkpwfcddgvwmgd.supabase.co";
const SUPABASE_KEY="sb_publishable_gbTa-v_gAn37JhzRek1B_A_8_a1BxYn";
const COMPANY_ID="4bc11558-9b39-4f08-8b08-1d802d431995";
const sbLead=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let step=1;
const selectedEnvs=new Set();
let deadline="",investment=0;
const $=id=>document.getElementById(id);
const steps=[...document.querySelectorAll(".step")];

function showStep(n){
 step=n;
 steps.forEach(x=>x.classList.toggle("active",Number(x.dataset.step)===n));
 $("progressBar").style.width=(n*25)+"%";
 $("backBtn").hidden=n===1;
 $("nextBtn").hidden=n===4;
 $("submitBtn").hidden=n!==4;
 if(n===4)renderSummary();
 window.scrollTo({top:0,behavior:"smooth"})
}
function cleanPhone(v){return String(v||"").replace(/\D/g,"")}
function scoreLead(){
 let s=30;
 if(selectedEnvs.size>=2)s+=10;
 if(selectedEnvs.has("Apartamento Inteiro"))s+=15;
 if(investment>=35000)s+=15; else if(investment>=20000)s+=10;
 if(["O quanto antes","30 a 60 dias"].includes(deadline))s+=15; else if(deadline==="2 a 4 meses")s+=8;
 if($("has_project").value==="true")s+=8;
 if($("decision_maker").value==="Eu decido")s+=7;
 return Math.max(0,Math.min(100,s))
}
function classification(s){return s>=80?"Quente":s>=60?"Qualificado":s>=40?"Em avaliação":"Nutrição"}
function validateStep(){
 $("formError").textContent="";
 if(step===1){
  if(!$("name").value.trim()||cleanPhone($("whatsapp").value).length<10||!$("city").value.trim()){
   $("formError").textContent="Preencha nome, WhatsApp e cidade.";return false
  }
 }
 if(step===2&&!selectedEnvs.size){$("formError").textContent="Selecione pelo menos um ambiente.";return false}
 if(step===3&&(!deadline||!investment)){$("formError").textContent="Selecione prazo e faixa de investimento.";return false}
 return true
}
document.querySelectorAll("#environmentChoices button").forEach(b=>b.onclick=()=>{
 const v=b.dataset.value;
 if(selectedEnvs.has(v)){selectedEnvs.delete(v);b.classList.remove("active")}
 else{selectedEnvs.add(v);b.classList.add("active")}
});
document.querySelectorAll(".choice-grid.single").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>{
 g.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 if(g.id==="deadlineChoices")deadline=b.dataset.value;
 if(g.id==="investmentChoices")investment=Number(b.dataset.value)
}));
$("nextBtn").onclick=()=>{if(validateStep())showStep(Math.min(4,step+1))};
$("backBtn").onclick=()=>showStep(Math.max(1,step-1));
$("attachment").onchange=e=>$("fileName").textContent=e.target.files?.[0]?.name||"Nenhum arquivo selecionado";

function renderSummary(){
 const s=scoreLead();
 $("summary").innerHTML=`<b>Resumo</b><br>${[...selectedEnvs].join(" • ")}<br>Prazo: ${deadline}<br>Faixa indicada: R$ ${Number(investment).toLocaleString("pt-BR")}<br>Classificação automática: ${classification(s)}`
}
async function uploadAttachment(){
 const f=$("attachment").files?.[0];
 if(!f)return null;
 if(f.size>10*1024*1024)throw new Error("O anexo deve ter no máximo 10 MB.");
 const ext=(f.name.split(".").pop()||"bin").toLowerCase();
 const path=`${COMPANY_ID}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
 const {error}=await sbLead.storage.from("lead-attachments").upload(path,f,{contentType:f.type||"application/octet-stream",upsert:false});
 if(error)throw error;
 return path
}
$("leadForm").onsubmit=async e=>{
 e.preventDefault();
 if($("website").value)return;
 if(!validateStep())return;
 const btn=$("submitBtn");btn.disabled=true;btn.textContent="Enviando...";$("formError").textContent="";
 try{
  const attachment=await uploadAttachment();
  const score=scoreLead();
  const args={
   p_company_id:COMPANY_ID,
   p_name:$("name").value.trim(),
   p_whatsapp:cleanPhone($("whatsapp").value),
   p_email:$("email").value.trim()||null,
   p_city:$("city").value.trim(),
   p_neighborhood:$("neighborhood").value.trim()||null,
   p_best_contact_time:$("best_contact_time").value,
   p_environments:[...selectedEnvs],
   p_approximate_area:Number($("approximate_area").value||0)||null,
   p_has_project:$("has_project").value==="true",
   p_attachment_url:attachment,
   p_desired_deadline:deadline,
   p_estimated_investment:investment,
   p_property_status:$("property_status").value,
   p_decision_maker:$("decision_maker").value,
   p_notes:$("notes").value.trim()||null,
   p_score:score,
   p_classification:classification(score),
   p_source:"WhatsApp / Formulário"
  };
  const {error}=await sbLead.rpc("capture_public_lead",args);
  if(error)throw error;
  $("leadForm").hidden=true;$("success").hidden=false
 }catch(err){
  console.error(err);$("formError").textContent="Não foi possível enviar agora. Tente novamente em instantes.";
  btn.disabled=false;btn.textContent="Enviar solicitação"
 }
};
showStep(1);