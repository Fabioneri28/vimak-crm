# VIMAK CRM V6.25.3 — Upgrade Visual do Dashboard Executivo

Reorganização e refinamento visual do Dashboard 360°, sem remover nenhum dado
existente e sem tocar em `init`, `login`, `loadIdentity` ou `refreshCore`.

## Por que mexer
O dashboard acumulava, na ordem antiga, 8 seções empilhadas com bastante
repetição (Central de Pendências, Prioridade Automática, Alertas Executivos
e Fechamento do Dia falavam, em parte, da mesma coisa em formatos
diferentes), pouco espaçamento entre blocos e nenhuma codificação visual de
urgência. Resultado: muita rolagem e informação "achatada" — tudo com o
mesmo peso visual.

## O que mudou

### Nova ordem de leitura (do mais urgente ao mais analítico)
1. **Cabeçalho** — agora mostra direto um selo de "N pontos de atenção" (ou
   "tudo em dia") ao lado do indicador de saúde do negócio, sem precisar
   rolar a página para saber se há algo pegando fogo.
2. **KPIs principais** — trocado de 4 para 5 cartões, com o novo indicador
   **Ticket Médio** (valor médio das propostas aprovadas), que já existia
   como métrica do módulo de Propostas mas não aparecia no dashboard.
3. **Prioridade Automática** — a lista itemizada (o que precisa da sua
   atenção primeiro) subiu para logo após os KPIs, virando o painel de
   destaque da página.
4. **Performance + Operação lado a lado** — o gráfico de 6 meses
   (Vendas/Recebimentos/Pagamentos) ganhou mais altura e respiro, e o painel
   "Operação em Tempo Real" (produção, atrasados, montagens, compras) foi
   para o lado dele — antes ficava mais abaixo, separado de qualquer
   contexto financeiro.
5. **Central de Pendências (Hoje na VIMAK)** — mantida, porém agora com
   **cores por urgência**: vermelho para o que está vencido/atrasado,
   dourado para o que é "hoje" e precisa de ação, verde quando está tudo em
   dia naquele item. Antes todos os 8 blocos tinham a mesma cor neutra.
6. **Funil Comercial + Maiores Propostas** — lado a lado, 2 colunas (o
   painel de Operação saiu daqui porque subiu para o passo 4).
7. **Fechamento do Dia** — reposicionado para o fim, como um resumo de
   encerramento do expediente (onde faz mais sentido cronologicamente).
8. **Atalhos rápidos** — mantidos como rodapé de navegação.

### Refinamento visual
- Espaçamento entre seções padronizado (antes 9px, agora 16–18px) para a
  página respirar mais.
- Painéis com respiro interno consistente (padding lateral/inferior antes
  ausente em vários blocos).
- Gráfico com linhas mais suaves (`stroke-linecap/linejoin: round`) e altura
  maior.
- Ranking de propostas e funil comercial com tipografia mais legível.
- Nenhuma cor ou fonte nova fora da paleta preto/dourado já usada em todo o
  sistema — o visual muda de organização e respiro, não de identidade.

## O que **não** mudou
- Nenhuma função de cálculo (pipeline, forecast, contas a receber/pagar,
  operação, funil, ranking) foi alterada — só a forma como os resultados
  são organizados e estilizados na tela.
- Nenhuma migration de banco necessária.
- `init`, `login`, `loadIdentity`, `refreshCore` preservados.

## Validação
- `node --check app.js` aprovado.
- CSS com chaves balanceadas e todas as classes usadas no dashboard
  conferidas contra o `styles.css` (nenhuma classe órfã).
- Nova classe utilitária `.g5` (grade de 5 colunas) adicionada e com
  comportamento responsivo (2 colunas em telas médias, 1 em celular),
  igual às já existentes `.g2/.g3/.g4`.

## Cache / PWA
- Service Worker atualizado para `vimak-crm-v6-25-3-dashboard`.
- Identidade de versão no login/topo atualizada para "V6.25.3 • Dashboard".

## Vale conferir no ambiente real
1. Abrir o Dashboard e olhar a nova ordem: KPIs → Prioridade → Gráfico +
   Operação → Central de Pendências → Funil/Ranking → Fechamento do dia.
2. Conferir o selo de pontos de atenção no cabeçalho com uma conta vencida
   de teste.
3. Testar a tela em uma janela estreita (tablet/celular) para confirmar o
   empilhamento responsivo.
