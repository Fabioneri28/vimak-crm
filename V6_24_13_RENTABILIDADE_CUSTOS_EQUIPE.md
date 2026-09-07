# V6.24.13 — Rentabilidade + Custos de Funcionários

## Origem
Conversão dos dois módulos Streamlit fornecidos pelo usuário para o CRM web/Supabase.

## Financeiro > Rentabilidade
- Dashboard de faturamento, margem, ponto de equilíbrio e lucro bruto.
- Gestão de análises por projeto/cliente/ambiente.
- Novo Projeto com vínculo a Cliente e Proposta do CRM.
- Custos estruturais e ponto de equilíbrio.
- Custo de equipe integrado automaticamente ao módulo Custos de Funcionários.
- Bens e depreciação mensal.
- Despesas pessoais e pró-labore sugerido.

## Financeiro > Custos de Funcionários
- CLT, MEI e Freelancer.
- Salário/contrato, transporte, benefícios e data de admissão.
- Provisões, encargos, custo mensal/anual e custo-hora.
- Parâmetros de encargos configuráveis.
- Simulador gerencial de desligamento CLT e rompimento PJ.

## Banco
Execute `supabase/migrations/010_profitability_team_costs.sql` uma única vez.

## Estabilidade
- init/login/loadIdentity/refreshCore preservados byte a byte.
- Tabelas novas carregadas somente quando Rentabilidade/Custos de Funcionários são abertos.
- Nenhuma consulta nova adicionada ao refreshCore.
