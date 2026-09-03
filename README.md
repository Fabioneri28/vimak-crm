# VIMAK CRM V5 — Cloud Ready

Projeto preparado para **GitHub + Netlify + Supabase/PostgreSQL**.

## Arquitetura
- Front-end: HTML/CSS/JavaScript
- Hospedagem: Netlify
- Autenticação: Supabase Auth
- Banco: PostgreSQL (Supabase)
- Arquivos: Supabase Storage
- Multiempresa: Row Level Security (RLS)
- Versionamento: GitHub
- PWA: manifest + service worker

## Banco incluído
A migration `supabase/migrations/001_initial_schema.sql` cria empresas, perfis, clientes, leads, fornecedores, parceiros, pós-venda, insumos, propostas e itens, modelos, medições, compras, documentos, produção, planos de corte, sobras, integrações, equipes, agenda, centros de custos, contas bancárias, contas a receber, contas a pagar, notas fiscais, maquininhas e auditoria.

Também inclui índices, `updated_at`, RLS por empresa, função de bootstrap e views gerenciais.

## Implantação
1. Criar projeto no Supabase.
2. SQL Editor: executar `supabase/migrations/001_initial_schema.sql`.
3. Executar `supabase/storage.sql`.
4. Criar o primeiro usuário no Supabase Auth.
5. Conectar o front-end ao Supabase com Project URL + anon/publishable key.
6. Criar repositório privado no GitHub e subir esta pasta.
7. No Netlify, importar esse repositório e publicar.

## Segurança
Nunca publique a `service_role` key no GitHub nem no navegador. O `.gitignore` já bloqueia `.env`.

## Estado atual
A base de dados está pronta. O front-end herdado da V4 continua em modo local até a próxima etapa, quando substituiremos o adaptador local por chamadas Supabase reais.
