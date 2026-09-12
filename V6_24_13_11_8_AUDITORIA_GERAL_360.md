# V6.24.13.11.8 — Auditoria Geral 360°

## O que passa a ser rastreado
A migration 014 instala triggers de banco para registrar automaticamente INSERT, UPDATE e DELETE, independentemente da tela ou app que realizou a operação.

Mapeamento inclui: Empresa, Usuários, Clientes, Leads, Fornecedores, Parceiros, Insumos, Movimentações de Estoque, Propostas/Projetos, Itens de Proposta, Modelos, Medições, Compras, Documentos, Produção, Plano de Corte, Sobras, Pós-venda, Manutenção/OS, Integrações, Equipes/Agenda de Montagem, Centros de Custo, Contas Bancárias, Contas a Receber/Pagar, Notas/Faturas, Maquininhas, Financeiro Enterprise, Rentabilidade, Patrimônio e Custos de Funcionários.

## Dados capturados
- Data/hora
- Usuário / e-mail
- Ação (CADASTRO, ALTERAÇÃO, EXCLUSÃO, MOVIMENTAÇÃO)
- Módulo e tabela
- Registro afetado
- Campos alterados
- Dados antes/depois (com remoção de campos sensíveis)
- Resumo da ação

## Segurança
O histórico de `audit_logs` passa a ser somente leitura para usuários autenticados. Inserção é feita pelo trigger do banco. Campos sensíveis conhecidos (senha, secret, tokens, API keys e config) são removidos antes da gravação.

## Interface
Empresa > Auditoria agora possui KPIs, busca, filtros por módulo/ação/usuário/período, detalhe Antes x Depois e exportação CSV.

## Instalação
Executar uma única vez `supabase/migrations/014_auditoria_geral_360.sql` no SQL Editor do Supabase e depois publicar esta versão no Netlify.
