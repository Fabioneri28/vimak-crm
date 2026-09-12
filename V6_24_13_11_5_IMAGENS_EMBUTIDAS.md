# V6.24.13.11.5 — Imagens embutidas

Correção definitiva da exibição de fotos no Estoque & Insumos.

- 40 fotos reais existentes foram embutidas no app.js como Data URLs.
- Não dependem mais da pasta assets/stock para aparecer no navegador.
- Produtos sem foto usam placeholder SVG embutido, também sem dependência de arquivo externo.
- Se uma photo_url do Supabase falhar, o card cai automaticamente para a foto local embutida ou placeholder.
- Mantido o botão Atualizar foto para substituir a imagem posteriormente.
- Sem SQL novo.
- Nenhuma mudança em login, Financeiro, Leads, Propostas, Plano de Corte, LEO Plan ou Cortecloud.
