import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

function digits(v:string|null|undefined){return String(v||"").replace(/\D/g,"")}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const {lead_id}=await req.json();
    if(!lead_id)throw new Error("lead_id obrigatório");

    const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WA_TOKEN=Deno.env.get("WHATSAPP_ACCESS_TOKEN")||"";
    const WA_PHONE_ID=Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")||"";
    const WA_TO_OVERRIDE=Deno.env.get("WHATSAPP_NOTIFY_TO")||"";
    const WA_TEMPLATE=Deno.env.get("WHATSAPP_TEMPLATE_NAME")||"novo_lead_vimak";
    const WA_LANG=Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE")||"pt_BR";
    const WA_VERSION=Deno.env.get("WHATSAPP_API_VERSION")||"v23.0";

    const sb=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
    const {data:lead,error:leadError}=await sb.from("leads").select("*").eq("id",lead_id).single();
    if(leadError||!lead)throw new Error("Lead não encontrado");

    const {data:company}=await sb.from("companies").select("id,name,phone").eq("id",lead.company_id).single();
    const to=digits(WA_TO_OVERRIDE||company?.phone);
    if(!WA_TOKEN||!WA_PHONE_ID||!to){
      await sb.from("crm_notifications").update({
        whatsapp_status:"not_configured",
        metadata:{whatsapp_error:"Configure WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_NOTIFY_TO ou companies.phone"}
      }).eq("lead_id",lead.id).eq("type","new_lead");
      return new Response(JSON.stringify({ok:false,status:"not_configured"}),{status:200,headers:{...corsHeaders,"Content-Type":"application/json"}})
    }

    const env=Array.isArray(lead.environments)?lead.environments.join(", "):"";
    const amount=Number(lead.estimated_investment||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

    const body={
      messaging_product:"whatsapp",
      to,
      type:"template",
      template:{
        name:WA_TEMPLATE,
        language:{code:WA_LANG},
        components:[{
          type:"body",
          parameters:[
            {type:"text",text:String(lead.name||"Novo lead")},
            {type:"text",text:String(lead.whatsapp||"—")},
            {type:"text",text:String(lead.city||"—")},
            {type:"text",text:env||"—"},
            {type:"text",text:amount},
            {type:"text",text:String(lead.score||0)}
          ]
        }]
      }
    };

    const r=await fetch(`https://graph.facebook.com/${WA_VERSION}/${WA_PHONE_ID}/messages`,{
      method:"POST",
      headers:{"Authorization":`Bearer ${WA_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    const result=await r.json();
    const messageId=result?.messages?.[0]?.id||null;

    await sb.from("crm_notifications").update({
      whatsapp_status:r.ok?"sent":"error",
      whatsapp_message_id:messageId,
      metadata:{whatsapp_response:result}
    }).eq("lead_id",lead.id).eq("type","new_lead");

    return new Response(JSON.stringify({ok:r.ok,result}),{
      status:r.ok?200:502,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    })
  }catch(err){
    return new Response(JSON.stringify({ok:false,error:String(err?.message||err)}),{
      status:400,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    })
  }
});
