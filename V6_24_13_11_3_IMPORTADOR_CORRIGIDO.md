# V6.24.13.11.3 — Importador corrigido

Correção do importador de Estoque & Insumos.

- Remove dependência de `upsert(... onConflict=company_id,sku)` que podia falhar com o índice parcial criado na migration 012.
- Agora procura o SKU existente e executa UPDATE ou INSERT explicitamente.
- Mantém importação de CSV + pasta de imagens ou ZIP.
- Mostra progresso real durante a importação.
- Exibe resumo final com importados, novos, atualizados, fotos e falhas.
- Exibe mensagens reais de erro por SKU/foto em vez de falhar silenciosamente.
- Atualiza `cache.inputs` e a tela imediatamente ao final.
- Nenhum SQL adicional necessário.
