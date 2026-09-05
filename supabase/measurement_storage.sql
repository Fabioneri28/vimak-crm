-- VIMAK CRM V6.9 - Storage para Medições Técnicas PRO
-- Idempotente: pode ser executado sem apagar dados existentes.
insert into storage.buckets(id,name,public)
values ('crm-documents','crm-documents',false)
on conflict(id) do nothing;

-- As policies principais já existem no storage.sql da aplicação.
-- O caminho utilizado pela V6.9 é:
-- <company_id>/measurements/<measurement_id>/<arquivo>
-- garantindo isolamento multiempresa pela policy tenant_documents.
