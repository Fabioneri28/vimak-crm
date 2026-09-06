# VIMAK CRM V6.21 — CEO DASHBOARD 360

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


## V6.8 — Modelos de Proposta PRO

- Cadastro real em `proposal_models`.
- Modelos por ambiente e padrão comercial.
- Itens do modelo com ambiente, descrição, quantidade, unidade, custo e preço.
- Adição direta de Insumos PRO ao modelo.
- Itens livres para serviços e composições.
- Validade, prazo de entrega e garantia padrão.
- Condições de pagamento e observações padronizadas.
- Desconto, montagem e frete padrão.
- Valor base e margem estimada do modelo.
- Ativar/inativar, editar, visualizar, duplicar e excluir.
- Botão **Aplicar** cria uma nova proposta usando o modelo.
- Ao aplicar, o custo dos insumos é atualizado com o valor atual do cadastro.
- Cliente é escolhido antes de salvar a nova proposta.
- Preserva toda a V6.7 Propostas PRO e módulos anteriores.

### Banco
Utiliza a tabela `proposal_models`, que já existe desde a migration inicial.
Nenhuma nova migration é necessária para esta versão.


## V6.9 — Medições Técnicas PRO

A V6.9 transforma o módulo de Medições em uma central técnica de campo.

### Recursos
- Medições reais gravadas na tabela `measurements`.
- Vínculo com Cliente e Proposta.
- Código automático de medição.
- Status: Rascunho, Pendente, Em andamento, Aguardando projeto, Concluída e Cancelada.
- Cadastro de múltiplos ambientes.
- Medidas rápidas por tipo: largura, altura, profundidade, vão, parede, bancada, eletro e geral.
- Registro recomendado em milímetros.
- Pé-direito, desnível, parede, esquadro e rodapé.
- Pontos elétricos e hidráulicos.
- Portas, janelas, vãos e interferências.
- Observações individuais por ambiente.
- Checklist técnico completo.
- Histórico de salvamentos/finalização.
- Upload por botão, seleção múltipla ou arrastar e soltar.
- Categorias para fotos e arquivos.
- Suporte de interface para JPG, JPEG, PNG, WEBP, HEIC, HEIF, AVIF, GIF, BMP, TIFF, PDF, DWG, DXF, SKP, ZIP, RAR, 7Z, XLS, XLSX, CSV, DOC, DOCX, TXT e RTF.
- Limite de 50 MB por arquivo no cliente.
- Upload real para o bucket privado `crm-documents`.
- Arquivos isolados por empresa e medição.
- Links temporários assinados para abrir arquivos privados.
- Exclusão de arquivos do Storage.
- Croqui técnico com desenho livre, linhas e borracha.
- Croqui salvo como PNG diretamente no Storage.
- KPIs de medições, andamento, aguardando projeto, concluídas e arquivos técnicos.
- Layout responsivo inspirado no conceito premium preto/dourado do VIMAK.

### Banco de dados
Usa a tabela `measurements`, já existente na migration inicial. Não exige alteração de schema.

### Storage
A V6.9 utiliza o bucket privado `crm-documents`. O arquivo `supabase/measurement_storage.sql` documenta a configuração.
A policy existente isola os arquivos pelo primeiro diretório do caminho, que é o `company_id`.


## V6.10 — Compras PRO
- Pedidos de compra reais em `purchase_orders` e `purchase_order_items`.
- Fornecedor e proposta/projeto vinculados.
- Importação de itens da proposta para o pedido.
- Adição de Insumos PRO e itens livres.
- Custos, quantidades, total automático, previsão, NF-e e observações.
- Fluxo de status até recebimento.
- KPIs de compras, aberto, recebidos e atrasos.
- Exportação CSV.
- Nenhuma nova migration necessária.


## V6.11 — Documentos & Templates PRO
- Templates reais em `document_templates`.
- Contrato, Proposta Comercial, Termo de Aceite, Garantia e outros tipos.
- Editor profissional com variáveis inteligentes.
- Preenchimento automático com Empresa, Cliente e Proposta.
- Biblioteca inicial VIMAK com 4 modelos.
- Visualização do documento antes da impressão.
- Gerar PDF via diálogo de impressão do navegador.
- Editar, duplicar, ativar/inativar e excluir.
- Nenhuma nova migration necessária.


## V6.12 — Produção Kanban PRO
- Torre de controle industrial com 8 etapas.
- Drag & drop real entre etapas com persistência no Supabase.
- Ordens de produção em `production_projects`.
- Cliente e proposta vinculados.
- Importação de proposta para produção.
- Prioridade, prazo, progresso e alertas de atraso.
- Progresso automático por etapa e ajuste manual.
- KPIs de projetos, ativos, atrasados, urgentes e avanço médio.
- Visual Kanban e visual Lista.
- Filtros de atrasados e urgentes + busca.
- Timeline completa da ordem e atalhos para Medições e Compras.
- Nenhuma migration nova necessária.


## V6.13 — Plano de Corte / SmartCut Integration Hub
- Importação normalizada de CSV, TXT, TSV e XML.
- Perfis de origem: Promob, Cortecloud, SketchUp/OpenCutList, Corte Certo e arquivos universais.
- Reconhecimento flexível de colunas de peça, material, comprimento, largura, espessura, quantidade, veio e fita.
- Otimizador interno guilhotina com agrupamento por material e espessura.
- Configuração de chapa, espessura de serra, refilo, sentido do veio e sobra mínima.
- Visualização gráfica SVG das chapas e peças.
- KPIs de chapas, aproveitamento, perda e sobras úteis.
- Persistência completa em `cutting_plans.data` no Supabase.
- Exportação CSV Universal, Corte Certo, Cortecloud e SketchUp/OpenCutList.
- Impressão técnica do plano de corte.
- Integrações diretas por API ficam condicionadas a credenciais/plugins oficiais dos fornecedores.
- Nenhuma migration nova necessária.


## V6.14 — Estoque Inteligente de Sobras
- `sheet_remnants` integrado ao SmartCut V6.13.
- Importação de sobras geométricas dos planos salvos.
- Etiquetas individuais, localização física e rastreabilidade.
- Motor best-fit cruza peças x sobras por material, espessura e geometria.
- Reserva antes do corte; estados Disponível, Reservada, Consumida e Descartada.
- KPIs de área recuperável e materiais/espessuras.
- Impressão de etiquetas e exportação CSV.
- Sem migration nova.

O objetivo é maximizar o reaproveitamento; 100% físico não é garantível devido a serra, refilo, defeitos, veio e formatos irregulares.


## V6.15 — Integração Cortecloud PRO
- Logo oficial VIMAK incorporada em `assets/vimak-logo.jpg`.
- Hub Cortecloud conectado ao SmartCut V6.13 e Zero Waste V6.14.
- Importação de CSV/TXT/XML de Promob, Corte Certo, SketchUp/OpenCutList e listas genéricas.
- Pré-visualização de peças, materiais, dimensões e área.
- Simulação usando o motor SmartCut antes do envio.
- Exportação de lista para fluxo de importação do Cortecloud.
- Configuração de ambiente/central/token de testes na tabela `integrations`.
- API direta mantida em modo seguro até obtenção de token oficial e homologação.
- Nenhuma migration nova necessária.

### Segurança
Para produção SaaS, tokens Cortecloud devem ficar em backend/Edge Function, nunca em repositório público ou JavaScript do navegador.


### Hotfix V6.15.1
- Corrigido roteamento de `#cortecloud`: a rota agora renderiza o dashboard completo da Integração Cortecloud.
- Restaurada `cutSources()` do SmartCut V6.13.
- Cache do Service Worker renovado para publicação limpa.


## V6.16 — Equipes de Montagem PRO
- Central de equipes com capacidade, disponibilidade, região, veículo e competências.
- Composição individual da equipe (nome, função, telefone e competências).
- Custo/dia, nota interna, meta de qualidade e checklists de EPI/ferramentas/veículo.
- Histórico real vinculado a `installation_schedule`.
- Ocupação mensal estimada, próxima montagem, ranking e mapa de capacidade.
- Busca e filtros operacionais.
- Migration aditiva `003_installation_teams_pro.sql` adiciona apenas `metadata jsonb`.
- Preserva V6.13 SmartCut, V6.14 Zero Waste e V6.15 Cortecloud.


## V6.17 — Agenda de Montagem PRO
- Torre de Controle com visualizações Dia, Semana, Mês e Lista.
- KPIs de montagens do dia, próximas instalações, conflitos e atrasos.
- Filtros por equipe, status e busca operacional.
- Agendamento ligado a cliente, proposta/projeto e Equipe PRO V6.16.
- Detecção de sobreposição de horários por equipe antes de salvar.
- Sugestão de equipes considerando conflito, nota e carga mensal.
- Endereço, ambientes, cidade, contato, volumes, dias previstos e instruções.
- Checklist pré-montagem: medição, produção, ferragens e confirmação do cliente.
- Central da Ordem de Montagem com início/conclusão rápida.
- Painel lateral de capacidade e próxima montagem por equipe.
- Migration aditiva `004_installation_schedule_pro.sql`.


## V6.18 — Financeiro Enterprise
CFO Command Center inspirado em práticas de ERP corporativo:
- Cockpit executivo: caixa, recebíveis, pagamentos, inadimplência, aging e riscos.
- Contas a receber e a pagar com centro de custo.
- Tesouraria e projeções D+7/D+15/D+30/D+60/D+90.
- DRE gerencial de 12 meses.
- Budget & Forecast (FP&A).
- Governança: aprovações, entidades/unidades e controles internos.
- Estrutura multi-entidade e multimoeda preparada para expansão.
- Migration aditiva `005_finance_enterprise.sql`.
- A implementação não substitui escrituração contábil/fiscal oficial nem integrações bancárias homologadas.


## V6.21 — CEO Dashboard 360
- Construída diretamente sobre a V6.18 enviada pelo usuário como última base estável.
- Dashboard executivo com pipeline, forecast, contas a receber/pagar, performance de 6 meses, alertas, funil, produção, montagem, compras e ranking de propostas.
- Nenhuma migration nova.
- Núcleo crítico preservado: init, login, loadIdentity e refreshCore não foram alterados.


## V6.22.1 ADMIN SAFE
Construída diretamente sobre a V6.21 enviada e confirmada como funcional.
- Configurações da Empresa completas.
- Usuários carregados somente ao abrir a página.
- Auditoria carregada somente ao abrir a página.
- Planos informativos sem cobrança automática.
- Nenhuma migration nova.
- Nenhuma alteração em config.js, index.html ou sw.js.
- init/login/loadIdentity/refreshCore preservados byte a byte.


## V6.23 — Financeiro Inteligente
- Botões rápidos `+ Receita` e `+ Despesa`.
- Lançamentos por Pix, Transferência, Maquininha, Dinheiro, Boleto ou Outro.
- Parcelamento de 1x a 24x.
- Cálculo automático do valor por parcela.
- Forma de pagamento, parcelas, origem e observações gravadas no metadata de `finance_transactions`.
- Lançamentos rápidos passam a compor a DRE/visão gerencial sem alterar o núcleo de autenticação.
- Nenhuma migration nova.
