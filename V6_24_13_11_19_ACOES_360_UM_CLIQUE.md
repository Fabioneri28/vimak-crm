# V6.24.13.11.19 — Ações 360 de Um Clique

Evolução do Projeto 360° com execução assistida e pré-preenchimento.

- Medição: abre nova medição com cliente e proposta vinculados; se já houver medição aberta, abre o registro existente.
- Compras: abre novo pedido já vinculado à proposta do projeto.
- Produção: cria formulário de nova ordem com cliente, proposta e título pré-preenchidos; se estiver em andamento, abre a ordem existente.
- Montagem: abre agendamento com cliente, proposta, contato, telefone, endereço disponível e checklists de medição/produção preparados; se já houver agenda, abre o registro existente.
- Pós-venda: abre chamado vinculado ao cliente/proposta com acompanhamento pós-entrega preparado; se já houver chamado, abre o existente.
- Propostas: mantém navegação segura para o módulo comercial.

Nenhuma tabela ou migration SQL nova. As gravações continuam usando as rotinas nativas de cada módulo, evitando duplicidade e preservando as validações existentes.
