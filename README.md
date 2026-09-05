# VIMAK CRM V6.7 — PROPOSTAS PRO

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


## V6.6 — Insumos PRO
- Cadastro cloud em `inputs`.
- Tipos de materiais, ferragens, vidros, perfis, fitas, colas, laca, acessórios, iluminação, embalagens, serviços e outros.
- Unidade, custo unitário, estoque atual, estoque mínimo e fornecedor principal.
- SKU/código interno, marca, status e observações.
- KPIs de total, ativos, estoque baixo e valor estimado em estoque.
- Alertas automáticos de estoque mínimo.
- Busca, visualização, edição e exclusão.
- Mantém módulos PRO anteriores, Auth, RLS e Service Worker seguro.


## V6.7 — Propostas PRO

- Propostas reais vinculadas a clientes e parceiros.
- Itens da proposta gravados em `proposal_items`.
- Adição de itens a partir do cadastro de Insumos.
- Itens livres para serviços e composições personalizadas.
- Ambiente, quantidade, unidade, custo, preço de venda e total por item.
- Subtotal, desconto, montagem, frete e valor final automáticos.
- Margem bruta estimada em R$ e %.
- Validade, prazo de entrega, garantia e condições de pagamento.
- Status: Orçado, Enviado, Negociação, Aprovado, Perdido e Cancelado.
- Visualização detalhada.
- Edição completa.
- Duplicação de proposta.
- Aprovação e mudança de status.
- Exclusão com confirmação.
- Geração de layout profissional para impressão / Salvar como PDF.
- KPIs: pipeline, aprovadas, conversão e ticket médio.
- Preserva Clientes PRO, Fornecedores PRO, Parceiros PRO, Pós-venda PRO e Insumos PRO.
- Mantém o Project URL correto, Auth, RLS multiempresa e Service Worker seguro.

### Banco de dados
A V6.7 utiliza as tabelas `proposals` e `proposal_items` que já existem na migration inicial.
Não é necessária uma nova migration para o módulo Propostas PRO.
