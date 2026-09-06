# V6.24.3 — Financeiro Direct Save

Correção feita sobre a V6.24.1 confirmada como funcional.

O erro “Could not find the table” era causado pelo uso de `finance_transactions`, tabela que não existe no banco ativo.

Agora:
- Receita grava diretamente em `accounts_receivable`.
- Despesa grava diretamente em `accounts_payable`.
- Usa somente colunas que já existem no schema inicial.
- Não depende de migration nova.
- Após salvar, abre automaticamente a aba Receber/Pagar para conferir o registro.
- Login/init/loadIdentity/refreshCore/index/config/sw preservados.
