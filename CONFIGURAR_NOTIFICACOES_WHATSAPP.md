# V6.24.9 — Novo Lead: WhatsApp + Notificação CRM + Alerta CRM

## O que funciona depois da migration 008
1. Cliente envia `captura.html`.
2. Lead entra na tabela `leads`.
3. Trigger cria uma linha em `crm_notifications`.
4. CRM recebe o evento em tempo real.
5. Sino mostra contador de não lidas.
6. Um alerta aparece automaticamente no canto superior direito.
7. Clicar em "Abrir lead" leva para a ficha do lead.

## WhatsApp automático
O pacote inclui a Supabase Edge Function:
`supabase/functions/notify-new-lead/index.ts`

Ela usa a API oficial WhatsApp Cloud da Meta.
Nenhum token fica no navegador.

### Secrets necessários na Edge Function
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_NOTIFY_TO  (opcional; se vazio usa `companies.phone`)
- WHATSAPP_TEMPLATE_NAME = novo_lead_vimak
- WHATSAPP_TEMPLATE_LANGUAGE = pt_BR
- WHATSAPP_API_VERSION = v23.0

### Template recomendado na Meta
Nome: `novo_lead_vimak`
Idioma: Português (Brasil)

Corpo:
🔔 NOVO LEAD VIMAK

Cliente: {{1}}
WhatsApp: {{2}}
Cidade: {{3}}
Ambientes: {{4}}
Investimento: {{5}}
Score: {{6}}

Novo lead recebido pelo formulário VIMAK.

> O template precisa ser aprovado pela Meta para mensagens iniciadas pela empresa.

## Ordem de implantação
1. Execute `supabase/migrations/008_lead_notifications.sql`.
2. Publique a Edge Function `notify-new-lead` com `verify_jwt=false`.
3. Configure os secrets acima.
4. Crie/aprove o template no WhatsApp Manager.
5. Publique o ZIP no Netlify.
6. Envie um lead de teste pelo `captura.html`.

## Segurança
- service_role fica somente na Edge Function.
- Front-end usa apenas chave publishable.
- RLS de notificações isola por company_id.
- Falha no WhatsApp NÃO impede o lead de ser salvo.
