# V6.24.13.11.10 — Correção dos botões de Etiquetas

## Causa encontrada
A V6.24.13.11.9 utilizava `cutLabelAscii()` na geração do código de barras e do cartão da etiqueta,
mas essa função não existia no `app.js`. Isso interrompia o JavaScript exatamente ao tentar montar
a prévia ou imprimir as etiquetas.

## Correções
- adicionada `cutLabelAscii()`;
- mantido o desenho técnico/fita de borda;
- botões definidos como `type="button"`;
- feedback visível ao atualizar a prévia;
- tratamento de erro na prévia;
- cache/versionamento atualizado para 6.24.13.11.10;
- nenhum SQL novo;
- importação TXT do Promob preservada.
