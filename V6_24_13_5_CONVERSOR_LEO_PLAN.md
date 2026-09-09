# V6.24.13.5 — Conversor Promob → LEO Plan

Implementado com base no `modelo.csv` fornecido pelo usuário.

Cabeçalho de saída:
QUANTIDADE;COMPRIMENTO;LARGURA;DESCRICAO_PECA;MATERIAL;FITA_COMPRIMENTO_CIMA;FITA_COMPRIMENTO_BAIXO;FITA_LARGURA_ESQUERDA;FITA_LARGURA_DIREITA;NOME_AMBIENTE

## Recursos
- botão `PROMOB → LEO PLAN` na tela principal de Plano de Corte;
- botão `Converter para LEO Plan` dentro do editor;
- importa TXT/CSV já compatível com o parser Promob existente;
- revisão de fita por lado antes da exportação;
- ambiente padrão;
- fita padrão opcional aplicada apenas em campos vazios;
- exportação CSV UTF-8 com BOM e separador `;`;
- nenhuma migration nova;
- nenhuma alteração no Supabase;
- módulos externos ao Plano de Corte preservados.

Observação: o TXT Promob padrão usado anteriormente não informa necessariamente os quatro lados de fita. Por isso a tela de revisão é proposital e evita enviar filetamento incorreto.
