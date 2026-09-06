# V6.24.7 — Etiquetas de Produção

## O que foi adicionado
- Botão `🏷 Etiquetas Produção` no Plano de Corte.
- Geração automática de uma etiqueta para cada peça otimizada.
- Identificação técnica por chapa/peça: `C01-P01`, `C01-P02`, etc.
- Cliente, Projeto, Ambiente/Módulo e Ordem de Produção configuráveis.
- Nome da peça, material, dimensão, espessura, sentido do veio e fita/borda.
- Código original do Promob preservado na importação e usado na etiqueta.
- Dois códigos de barras Code 128 gerados localmente, sem biblioteca externa.
- Código de barras lateral inspirado na etiqueta industrial de referência.
- Impressão em 100×70 mm, 90×50 mm e 80×50 mm.
- Prévia das etiquetas dentro do CRM.
- Identificação `P01`, `P02`... dentro do desenho das chapas.

## Segurança / estabilidade
- Importador TXT Promob preservado.
- Otimizador de corte preservado.
- Salvamento do Plano de Corte preservado.
- `init`, `login`, `loadIdentity`, `refreshCore` preservados.
- `index.html`, `config.js`, `sw.js` preservados.
- Nenhuma migration nova.
