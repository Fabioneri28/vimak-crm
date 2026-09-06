# V6.24.4 — Financeiro Refresh Real

Base: V6.24.3 Direct Save.

Correções:
- Após salvar Receita/Despesa, executa `refreshCore()` antes de redesenhar a tela.
- Após criar lançamento em Contas a Receber/Pagar, recarrega os dados reais do Supabase.
- Após marcar Recebido/Pago, recarrega os dados reais do Supabase.
- Caixa consolidado passa a considerar `initial_balance` + recebimentos confirmados - pagamentos confirmados.
- Login, init, loadIdentity, refreshCore, index.html, config.js e sw.js permanecem intactos.
- Nenhuma migration nova.
