# V6.24.14 — Contratos Inteligentes VIMAK

Implementado dentro do grupo PROPOSTAS, preservando login, Supabase e módulos existentes.

## Entregue
- Nova rota **Contratos** no menu Propostas.
- Botão **Contrato** em cada proposta.
- Reaproveitamento automático de cliente, CPF/CNPJ, endereço, proposta, valor e condições comerciais.
- Editor antes da emissão: status, prazo, entrada, saldo, pagamento, MDF interno, portas/frentes, corrediças, dobradiças e observações.
- Número automático no padrão `CT-ANO-NNNN`.
- Status: Rascunho, Gerado, Enviado, Aguardando assinatura, Assinado e Cancelado.
- PDF/impressão em layout premium VIMAK preto/dourado.
- Texto-base reorganizado em 11 seções, derivado do contrato operacional fornecido pela VIMAK.
- Painel com contratos gerados, aguardando assinatura, assinados e valor vinculado.

## Persistência
Nesta versão os metadados específicos do contrato são armazenados no navegador, separados por `company.id`, para evitar exigir alteração imediata no schema Supabase e reduzir risco de quebrar a versão estável. Os dados centrais continuam vindo das tabelas atuais de propostas/clientes.

## Próxima evolução recomendada
Criar tabela `contracts` no Supabase para sincronização multiusuário, histórico de versões, assinatura eletrônica e auditoria de envio/visualização.
