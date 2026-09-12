# V6.24.13.11.4 — Importador Direto

Correção estrutural do importador de estoque:
- botão principal abre o seletor CSV diretamente, sem depender do modal anterior;
- seleção de pasta/ZIP separada;
- gravação de produtos primeiro e fotos depois;
- consulta única dos SKUs existentes;
- UPDATE por id e INSERT em lotes de 25, sem UPSERT/ON CONFLICT;
- erro real do Supabase exibido em tela;
- refresh do estoque após a importação;
- nenhuma migration nova.
