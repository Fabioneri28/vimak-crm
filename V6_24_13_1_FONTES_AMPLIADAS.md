# V6.24.13.1 — Fontes ampliadas em todo o CRM

## Objetivo
Deixar a leitura no notebook confortável em zoom do navegador 100%, reproduzindo aproximadamente a percepção visual que antes exigia zoom 125%.

## Alteração
- Todos os `font-size` em pixels do `styles.css` foram ampliados em 25%.
- A página pública `captura.html` também recebeu a mesma escala tipográfica através do `captura.css`.
- Não foi aplicado `zoom` CSS no sistema inteiro, evitando distorções de largura, sidebar, modais e grids.
- Larguras, alturas, paddings e regras responsivas foram preservados.
- Inputs, selects, tabelas e botões mantêm a estrutura original, com tipografia maior.
- Service Worker recebeu novo identificador de cache.

## Segurança / estabilidade
- `app.js`: preservado byte a byte.
- `index.html`: preservado byte a byte.
- `config.js`: preservado byte a byte.
- Nenhuma migration nova.
- Nenhuma alteração no Supabase.
- Nenhuma alteração em login, gravação ou módulos financeiros.
