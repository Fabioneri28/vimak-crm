# V6.24.7.1 — Etiquetas de Produção / Cache Fix

Causa confirmada: o pacote V6.24.7 contém o botão `🏷 Etiquetas Produção` e todo o motor de etiquetas,
porém o service worker ainda usava um identificador antigo de cache.

Alteração única de runtime:
- `sw.js`: novo CACHE `vimak-crm-v6-24-7-1-etiquetas-producao`.

Preservados byte a byte:
- app.js
- index.html
- config.js

Recursos confirmados no app.js:
- cutLabelsOpen()
- cutLabelsPrint()
- Code 128
- botão Etiquetas Produção
