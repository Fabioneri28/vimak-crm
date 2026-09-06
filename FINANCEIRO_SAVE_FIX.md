# V6.24.2 — Financeiro Save Fix

Base exata: V6.24.1 Arquitetura Estável enviada pelo usuário.

Correção única: `finQuickSave(type)`.

1. O INSERT principal continua em `finance_transactions`.
2. Foi removido `.select().single()` do INSERT para evitar falso erro após gravação.
3. Em caso de falha real da tabela principal, há fallback automático:
   - Receita -> `accounts_receivable`
   - Despesa -> `accounts_payable`
4. O botão Salvar fica desabilitado enquanto grava para impedir duplo clique.
5. O valor aceita vírgula ou ponto.
6. Erros agora são exibidos e registrados no console.
7. `init`, `login`, `loadIdentity`, `refreshCore`, `index.html`, `config.js` e `sw.js` foram preservados.
8. Nenhuma migration nova.
