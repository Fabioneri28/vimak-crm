/* V6.24.1 — Maquininhas & Taxas isolated extension */
(function(){
  const S = {
    tab: "simulador",
    inf: {
      "ate20":{label:"Até R$ 20 mil/mês",pix:0,debit:1.37,credit:[3.15,5.39,6.12,6.85,7.57,8.28,8.99,9.69,10.38,11.06,11.74,12.40]},
      "20":{label:"Acima de R$ 20 mil/mês",pix:0,debit:.85,credit:[2.89,4.22,4.83,5.44,6.05,6.64,7.24,7.82,8.41,8.98,9.56,10.12]},
      "40":{label:"Acima de R$ 40 mil/mês",pix:0,debit:.79,credit:[2.79,4.08,4.65,5.21,5.77,6.32,6.87,7.42,7.96,8.49,9.03,9.56]},
      "80":{label:"Acima de R$ 80 mil/mês",pix:0,debit:.75,credit:[2.69,3.94,4.46,4.98,5.49,5.99,6.51,6.99,7.51,7.99,8.49,8.99]}
    },
    mp: {
      "3":{label:"Até R$ 3 mil/mês",pix:.49,debit:1.99,credit:[4.98,9.90,11.28,12.64,13.97,15.27,16.55,17.81,19.04,20.24,21.43,22.59,23.73,24.85,25.95,27.02,28.08,29.12]},
      "6":{label:"R$ 3 a 6 mil/mês",pix:.49,debit:1.50,credit:[3.48,7.39,8.67,9.33,10.20,10.88,11.89,12.74,13.06,13.15,13.19,13.23,14.86,15.80,16.82,17.93,19.15,20.44]},
      "10":{label:"R$ 6 a 10 mil/mês",pix:.49,debit:1.40,credit:[3.42,7.19,8.26,9.14,10.01,10.87,11.70,12.55,12.61,12.77,12.86,12.99,14.67,15.62,16.65,17.76,18.98,20.29]},
      "20":{label:"R$ 10 a 20 mil/mês",pix:.49,debit:1.39,credit:[3.29,6.69,7.94,8.64,9.51,10.87,11.70,12.05,12.11,12.12,12.16,12.22,14.17,15.12,16.15,17.26,18.48,19.79]},
      "50":{label:"R$ 20 a 50 mil/mês",pix:.49,debit:1.29,credit:[3.10,6.44,7.49,8.39,9.26,10.87,11.63,11.84,11.86,11.87,11.91,11.99,13.92,14.87,15.90,17.01,18.23,19.54]},
      "50plus":{label:"Acima de R$ 50 mil/mês",pix:.49,debit:1.25,credit:[3.08,6.29,7.34,8.24,9.11,10.72,11.60,11.69,11.71,11.72,11.78,11.89,13.77,14.72,15.75,16.86,18.08,19.39]}
    }
  };

  function key(){ return `vimak-payment-${company?.id||"local"}`; }
  function cfg(){ try{return JSON.parse(localStorage.getItem(key())||"{}")}catch(_){return {}} }
  function saveCfg(v){ localStorage.setItem(key(),JSON.stringify(v)); }
  function leo(){
    const x=cfg().leo||{};
    return {pix:x.pix??null,debit:x.debit??null,credit:Array.from({length:18},(_,i)=>(x.credit||[])[i]??null)};
  }
  function rate(provider,kind,n,infTier,mpTier){
    n=Math.max(1,Number(n)||1);
    if(provider==="InfinitePay"){
      const d=S.inf[infTier]||S.inf["ate20"];
      return kind==="Pix"?d.pix:kind==="Débito"?d.debit:(n<=12?d.credit[n-1]:null);
    }
    if(provider==="Mercado Pago"){
      const d=S.mp[mpTier]||S.mp["3"];
      return kind==="Pix"?d.pix:kind==="Débito"?d.debit:d.credit[Math.min(n,18)-1];
    }
    const d=leo();
    return kind==="Pix"?d.pix:kind==="Débito"?d.debit:d.credit[Math.min(n,18)-1];
  }
  function calc(provider,value,kind,n,infTier,mpTier){
    const r=rate(provider,kind,n,infTier,mpTier);
    if(r===null||r===undefined||r==="")return null;
    const pct=Number(r), fee=value*pct/100;
    return {provider,rate:pct,fee,net:value-fee,per:value/n};
  }

  window.paySafeSetTab=function(v){S.tab=v;render()};
  window.paySafeRemember=function(){
    const c=cfg();
    c.inf=document.getElementById("payInf")?.value||c.inf;
    c.mp=document.getElementById("payMp")?.value||c.mp;
    saveCfg(c); window.paySafeRun();
  };
  window.paySafeMode=function(){
    const k=document.getElementById("payKind"),n=document.getElementById("payN");
    if(k&&n){n.disabled=k.value!=="Crédito";if(n.disabled)n.value="1"}
    window.paySafeRun();
  };
  window.paySafeRun=function(){
    const value=Number(document.getElementById("payValue")?.value||0),
          kind=document.getElementById("payKind")?.value||"Crédito",
          n=kind==="Crédito"?Number(document.getElementById("payN")?.value||1):1,
          inf=document.getElementById("payInf")?.value||"ate20",
          mp=document.getElementById("payMp")?.value||"3",
          box=document.getElementById("payResult");
    if(!box)return;
    if(!value){box.innerHTML='<div class="notice">Informe o valor da venda.</div>';return}
    const rows=["InfinitePay","Mercado Pago","Leozinha"].map(p=>calc(p,value,kind,n,inf,mp)).filter(Boolean).sort((a,b)=>b.net-a.net);
    if(!rows.length){box.innerHTML='<div class="notice">Não há taxas cadastradas para esta condição.</div>';return}
    box.innerHTML=`<div class="card pad pay-safe-winner"><div class="fin-panel-head"><div><span>MELHOR OPÇÃO</span><h3>${rows[0].provider}</h3></div><b class="goldtxt">${rows[0].rate.toFixed(2)}%</b></div>
      <div class="grid g3">${rows.map((x,i)=>`<div class="card kpi ${i===0?"pay-safe-best":""}"><label>${i===0?"★ MELHOR • ":""}${x.provider}</label><strong>${x.rate.toFixed(2)}%</strong><small>Taxa ${money(x.fee)} • Líquido ${money(x.net)}${kind==="Crédito"?` • ${n}x de ${money(x.per)}`:""}</small></div>`).join("")}</div></div>`;
  };
  window.paySafeLeoSave=function(){
    const c=cfg(),credit=[];
    for(let i=1;i<=18;i++){const v=document.getElementById("leo"+i).value;credit.push(v===""?null:Number(v))}
    c.leo={
      pix:document.getElementById("leoPix").value===""?null:Number(document.getElementById("leoPix").value),
      debit:document.getElementById("leoDeb").value===""?null:Number(document.getElementById("leoDeb").value),
      credit
    };
    saveCfg(c);toast("Taxas da Leozinha salvas");render();
  };

  function simulator(){
    const c=cfg(),inf=c.inf||"ate20",mp=c.mp||"3";
    setTimeout(window.paySafeRun,0);
    return `<div class="grid g2"><section class="card pad"><div class="fin-panel-head"><div><span>SMART PAYMENT ROUTER</span><h3>Simular venda</h3></div></div><div class="form-grid">
      <div class="field"><label>Valor</label><input id="payValue" type="number" step=".01" value="10000" oninput="paySafeRun()"></div>
      <div class="field"><label>Modalidade</label><select id="payKind" onchange="paySafeMode()"><option>Crédito</option><option>Débito</option><option>Pix</option></select></div>
      <div class="field"><label>Parcelas</label><select id="payN" onchange="paySafeRun()">${Array.from({length:18},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===12?"selected":""}>${n}x</option>`).join("")}</select></div>
      <div class="field"><label>Faixa InfinitePay</label><select id="payInf" onchange="paySafeRemember()">${Object.entries(S.inf).map(([k,v])=>`<option value="${k}" ${inf===k?"selected":""}>${v.label}</option>`).join("")}</select></div>
      <div class="field full"><label>Faixa Mercado Pago</label><select id="payMp" onchange="paySafeRemember()">${Object.entries(S.mp).map(([k,v])=>`<option value="${k}" ${mp===k?"selected":""}>${v.label}</option>`).join("")}</select></div>
    </div><div class="notice">Comparação estimada. Promoções, bandeiras, antecipação e condições contratuais podem alterar o custo final.</div></section><section id="payResult"></section></div>`;
  }
  function rates(){
    const c=cfg(),inf=c.inf||"ate20",mp=c.mp||"3",l=leo();
    return `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Parcelas</th><th>InfinitePay</th><th>Mercado Pago</th><th>Leozinha</th></tr></thead><tbody>${Array.from({length:18},(_,i)=>i+1).map(n=>`<tr><td>${n}x</td><td>${n<=12?S.inf[inf].credit[n-1].toFixed(2)+"%":"—"}</td><td>${S.mp[mp].credit[n-1].toFixed(2)}%</td><td>${l.credit[n-1]==null?"Configurar":Number(l.credit[n-1]).toFixed(2)+"%"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }
  function leoEdit(){
    const l=leo();
    return `<div class="card pad"><div class="fin-panel-head"><div><span>LEOZINHA</span><h3>Taxas do seu contrato</h3></div></div><div class="notice">Cadastre exatamente as taxas da sua operação. O CRM não inventa valores contratuais.</div>
      <div class="form-grid safe-admin-gap"><div class="field"><label>Pix %</label><input id="leoPix" type="number" step=".01" value="${l.pix??""}"></div><div class="field"><label>Débito %</label><input id="leoDeb" type="number" step=".01" value="${l.debit??""}"></div></div>
      <div class="pay-safe-rate-grid">${Array.from({length:18},(_,i)=>`<div class="field"><label>${i+1}x %</label><input id="leo${i+1}" type="number" step=".01" value="${l.credit[i]??""}"></div>`).join("")}</div>
      <button class="btn gold safe-admin-gap" onclick="paySafeLeoSave()">Salvar taxas</button></div>`;
  }
  function renderer(){
    const tabs=[["simulador","◎ Simulador"],["taxas","% Tabela de Taxas"],["leozinha","▣ Leozinha"]];
    return shell("Maquininhas & Taxas","InfinitePay • Mercado Pago • Leozinha • comparação inteligente de custo líquido",
      `<button class="btn gold" onclick="paySafeSetTab('simulador')">◎ Simular venda</button>`,
      `<div class="fin-command"><div><span class="measurement-version">V6.24.1 • SAFE MODULE</span><h2>Central Inteligente de Pagamentos</h2><p>O módulo roda isolado do login e do carregamento principal.</p></div><div class="fin-command-badge"><span>ISOLATED ENGINE</span><b class="green">ATIVO</b></div></div>
      <div class="grid g3 proposal-kpis"><div class="card kpi"><label>InfinitePay</label><strong>1x–12x</strong><small>Pix • Débito • Crédito</small></div><div class="card kpi"><label>Mercado Pago</label><strong>1x–18x</strong><small>Pix • Débito • Crédito</small></div><div class="card kpi"><label>Leozinha</label><strong>Personalizada</strong><small>Taxas do contrato</small></div></div>
      <div class="fin-tabs">${tabs.map(x=>`<button class="${S.tab===x[0]?"active":""}" onclick="paySafeSetTab('${x[0]}')">${x[1]}</button>`).join("")}</div>
      ${S.tab==="simulador"?simulator():S.tab==="taxas"?rates():leoEdit()}`);
  }

  if(window.VIMAK_MODULES){
    window.VIMAK_MODULES.register("maquininhas",renderer,{version:"6.24.1",isolated:true});
    if(page==="maquininhas" && session){ try{render()}catch(_){} }
  }
})();
