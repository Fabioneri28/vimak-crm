# RELATÓRIO MINUCIOSO — VIMAK CRM V6.24.5 PERSISTÊNCIA TOTAL

## 1. Base auditada
- Base: `VIMAK_CRM_V6_24_4_FINANCEIRO_REFRESH_REAL.zip`
- Núcleo protegido sem alteração: `init`, `login`, `loadIdentity`, `refreshCore`
- `index.html`, `config.js`, `sw.js`: preservados byte a byte
- JavaScript: validado com `node --check`

## 2. Diagnóstico encontrado
O CRM já possuía várias operações reais de INSERT/UPDATE/DELETE no Supabase. O problema estrutural era que muitas rotinas gravavam no banco e chamavam apenas `render()`, que redesenhava a tela com o cache antigo. Isso fazia a aplicação parecer apenas visual mesmo quando o registro já existia no banco.

Também foram encontrados erros reais de compatibilidade de schema:
- `integrations`: o código usava `name` e `type`; o banco usa `provider`.
- `sheet_remnants`: o código usava `label_code`, `location`, `grain` e `notes`; o banco real usa `label` e `storage_location`.
- Maquininhas / Leozinha: taxas eram gravadas apenas em `localStorage`; agora também são persistidas em `card_machines`.

## 3. Módulos corrigidos
Leads; Clientes; Propostas e Itens; Modelos de Proposta; Fornecedores; Parceiros; Pós-venda; Insumos; Medições; Compras; Templates; Produção/Kanban; Planos de Corte; Estoque de Sobras; CorteCloud; Equipes; Agenda; Financeiro; Budget; Maquininhas/Leozinha; Configurações da Empresa.

## 4. Padrão de persistência implementado
Foi criada a função `persistRefresh()`:
1. operação grava no Supabase;
2. `refreshCore()` recarrega a fonte real;
3. a tela é redesenhada;
4. a confirmação só aparece depois.

## 5. Financeiro
Receita e Despesa continuam gravando nas tabelas existentes `accounts_receivable` e `accounts_payable`.
Foi mantido o refresh imediato já validado.
Também foi incluída a migration `006_persistence_completeness.sql` para criar, se faltarem, as tabelas enterprise que o front-end consulta:
- finance_entities
- finance_budgets
- finance_budget_items
- finance_transactions
- finance_approvals

Ela é idempotente e não apaga dados.

## 6. Maquininhas
As taxas contratuais da Leozinha agora são gravadas em `card_machines`.
Os campos temporários do simulador permanecem locais porque são estado de simulação, não cadastro operacional.

## 7. Usuários
O módulo de usuários continua somente leitura no navegador. Criar usuários do Supabase Auth diretamente no front-end exigiria credencial administrativa e seria inseguro. Isso não foi alterado.

## 8. Varredura estática
Funções com mutação de dados detectadas em `app.js`: 50
Funções que ainda não chamam refresh automático após mutação: 1
Pendentes: ensureMeasurementDraft

## 9. Validação
- Login intacto: OK
- Init intacto: OK
- Identidade intacta: OK
- refreshCore intacto: OK
- Service worker intacto: OK
- Config intacto: OK
- JS sintaticamente válido: OK

## 10. Passo obrigatório no Supabase
O Netlify não executa migration SQL automaticamente.
Execute uma única vez no SQL Editor:
`supabase/migrations/006_persistence_completeness.sql`

## 11. Resultado esperado
Após salvar, editar, excluir ou mudar status, a alteração deve aparecer imediatamente na tela e permanecer após fechar/reabrir o CRM, pois o Supabase passa a ser a fonte de verdade operacional.
