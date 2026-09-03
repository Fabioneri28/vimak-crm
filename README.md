# VIMAK CRM V6.5 — PÓS-VENDA / GARANTIA PRO

Atualização construída sobre a V6.1 funcional.

## O que mudou
- Mantém login real Supabase e arquitetura multiempresa.
- Clientes com cadastro ampliado.
- Edição de clientes.
- Visualização detalhada.
- Busca.
- KPIs de clientes.
- Atalho para WhatsApp.
- Status Ativo/Inativo/Prospect.
- Cidade, bairro, observações, telefone e WhatsApp separados.
- Exclusão com confirmação.
- Sem alteração destrutiva no schema atual.

## Deploy
Substitua os arquivos do projeto no GitHub/Netlify pelos arquivos desta pasta.
O cache do Service Worker foi alterado para `vimak-crm-v6-2-clientes-pro`.


## Correção V6.2.1
- Project URL Supabase corrigida para o projeto real confirmado no Dashboard/DNS.
- Service Worker corrigido para nunca interceptar autenticação/API externa.
- Cache PWA atualizado para evitar reutilização da V6.1/V6.2.


## V6.3 — Fornecedores PRO
- Cadastro real de fornecedores no Supabase.
- Categorias de fornecimento.
- CNPJ/CPF, responsável, telefone/WhatsApp, e-mail e website.
- Status ativo/inativo.
- Observações comerciais.
- KPIs de fornecedores.
- Busca inteligente.
- Visualização detalhada.
- Edição e exclusão com confirmação.
- Atalhos para WhatsApp e website.
- Mantém Clientes PRO, autenticação, RLS, Project URL correto e Service Worker seguro.
- Sem alteração destrutiva no schema atual.


## V6.4 — Parceiros PRO
- Cadastro real de parceiros no Supabase.
- Tipos: arquitetos, designers, corretores, construtoras, engenheiros, indicadores e outros.
- Comissão percentual por parceiro.
- Chave PIX.
- Telefone/WhatsApp e e-mail.
- Status ativo/inativo.
- Observações comerciais.
- KPIs de parceiros.
- Busca.
- Visualização detalhada.
- Edição e exclusão com confirmação.
- Atalho para WhatsApp.
- Preserva Clientes PRO, Fornecedores PRO, Auth, RLS, Project URL correto e Service Worker seguro.


## V6.5 — Pós-venda / Garantia PRO
- Chamados reais gravados em `after_sales_tickets`.
- Vinculação com cliente e proposta.
- Tipos de atendimento: garantia, assistência técnica, ajuste, manutenção, reparo, vistoria e orientação.
- Prioridades e status operacionais.
- Custo por chamado.
- Data de abertura e encerramento.
- KPIs de abertos, urgentes, concluídos e custo acumulado.
- Busca, visualização detalhada, edição e exclusão.
- Mantém Clientes PRO, Fornecedores PRO, Parceiros PRO, Auth, RLS, URL correta e Service Worker seguro.
- Sem alteração destrutiva no schema atual.
