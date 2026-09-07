# V6.24.11 — Pós-venda / Garantia + Manutenção / OS

## Novo módulo dentro de Pós-venda
- Aba `Chamados / Garantia` preservada.
- Nova aba `Manutenção / OS`.
- Agendamento com data, período, horário, técnico e acompanhante.
- Tipo: garantia, preventiva, corretiva, assistência, ajuste, vistoria.
- Prioridade e status.
- Cliente, projeto, ambiente e endereço.
- Solicitação e diagnóstico técnico.
- Lista de serviços executados.
- Lista de materiais utilizados.
- Fotos antes e depois, em bucket privado.
- Observações, avaliação, retorno necessário e aceite.
- Número automático de OS.
- Visualização completa da OS.
- Impressão/PDF profissional A4.

## Banco
Execute `supabase/migrations/009_maintenance_orders.sql` uma única vez.

## Segurança
- Login/init/loadIdentity/refreshCore preservados.
- Manutenções carregam de forma lazy somente ao abrir Pós-venda.
- Nenhuma alteração em módulos já homologados.
