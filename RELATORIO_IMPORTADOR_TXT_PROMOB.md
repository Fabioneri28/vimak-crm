# V6.24.6 — Importador TXT Promob

## Arquivo testado
`LISTA DE PEÇAS CAROL ERICK.txt`

Formato detectado:
`índice;quantidade;área;código;descrição;comprimento;espessura;largura;`

## Resultado do parser
- Linhas de peças MDF válidas: 127
- Peças expandidas pela quantidade: 169
- Materiais reconhecidos:
  - Branco: 110 peças
  - Masisa Carvalho: 19 peças
  - Masisa Marmara Erik: 40 peças

## Regras
- Aceita TXT Promob sem cabeçalho.
- Separador `;`.
- Exclui ferragens, módulos e linhas de Processo de Fabricação.
- Importa somente linhas cujo código contém `.MDF`.
- Interpreta medidas como comprimento × largura e espessura separada.
- Extrai o material do código Promob.
- Mantém suporte anterior a CSV/TXT com cabeçalho, TSV e XML.
- O mesmo formato também passa a ser entendido na tela CorteCloud.

## Segurança
`init`, `login`, `loadIdentity`, `refreshCore`, `index.html`, `config.js` e `sw.js` não foram alterados.
