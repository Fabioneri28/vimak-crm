# V6.24.8 — Captura de Leads pelo WhatsApp

Fluxo:
WhatsApp → link `captura.html` → formulário em 4 etapas → Supabase → tabela `leads` → etapa `Entrada` do CRM.

## Instalação
1. Publique este pacote no mesmo Netlify do CRM.
2. No Supabase SQL Editor, execute `supabase/migrations/007_public_lead_capture.sql`.
3. Compartilhe a URL `https://SEU-SITE.netlify.app/captura.html`.

## Dados capturados
Nome, WhatsApp, e-mail, cidade, bairro, melhor horário, ambientes, área, projeto/planta,
prazo, investimento, situação do imóvel, decisor, observações, score e classificação.

## Anexos
PDF/imagem até 10 MB é enviado para o bucket privado `lead-attachments`.
No CRM, ao abrir o lead, o botão de anexo gera URL assinada temporária.

## Segurança
- Nenhuma service_role no navegador.
- Formulário usa apenas chave publishable.
- Inserção pública passa por RPC SECURITY DEFINER com validação.
- RLS normal do CRM permanece intacto.
