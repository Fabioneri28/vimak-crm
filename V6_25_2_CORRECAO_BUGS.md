# VIMAK CRM V6.25.2 — Correção de Bugs (Varredura Técnica)

Versão corretiva sobre a V6.25.1, a partir de uma varredura completa do `app.js`.

## Bugs corrigidos

### 1. Filtro de status da Agenda de Montagem não funcionava
Havia duas funções chamadas `agSetStatus` no código: uma para o filtro do
dropdown de status e outra (assíncrona) para gravar a mudança de status de
um agendamento no banco. Como JavaScript usa a última função declarada
quando há nomes repetidos, a versão de banco sobrescrevia a do filtro — ou
seja, selecionar um status no filtro da Agenda não filtrava nada.
**Correção:** a função do filtro foi renomeada para `agSetStatusFilter`,
mantendo `agSetStatus(id, status)` exclusiva para a gravação real do status.

### 2. Botão "+ Integrante" abria a tela errada nas Equipes de Montagem
Também havia duas funções `teamAddMember`: uma para adicionar uma linha em
branco na composição da Equipe de Montagem, e outra (num módulo totalmente
diferente, "Custos de Funcionários") que abre o cadastro de folha de
pagamento. A segunda sobrescrevia a primeira, então o botão "+ Integrante"
dentro do cadastro de Equipe de Montagem abria o modal de custo de
funcionário (CLT/MEI/Freelancer) em vez de adicionar o integrante da equipe.
**Correção:** a função do módulo de Custos de Funcionários foi renomeada
para `teamCostAddMember`. Cada botão agora chama a função certa.

### 3. Campos perdendo o foco a cada tecla em Modelos de Proposta e Compras
A V6.25.1 já havia corrigido esse problema na tela de Nova Proposta (a
tabela de itens era reconstruída inteira a cada tecla digitada, tirando o
foco do campo). O mesmo padrão de código existia, sem a correção, em:
- **Modelos de Proposta** (linhas de item da tabela)
- **Pedidos de Compra** (campos de quantidade e custo unitário)

**Correção:** aplicada a mesma técnica da V6.25.1 nessas duas telas —
o valor é salvo no rascunho e apenas a célula de total da linha e o resumo
financeiro são atualizados, sem reconstruir a tabela inteira. Adição/remoção
de itens continua reconstruindo a tabela normalmente.

## Validação
- `node --check app.js` aprovado.
- Conferência manual de que não restam funções globais com nomes duplicados
  no arquivo.
- Todas as chamadas (`onclick`/`onchange`) que apontavam para as funções
  renomeadas foram atualizadas.

## Cache / PWA
- Service Worker atualizado para `vimak-crm-v6-25-2-correcao-bugs`.
- Identidade de versão no login/topo atualizada para "V6.25.2 • Correção".

## Banco de dados
Nenhuma migration SQL necessária.

## O que ainda vale testar no ambiente real
1. Filtrar a Agenda de Montagem por cada status e confirmar que a lista muda.
2. Criar/editar uma Equipe de Montagem e adicionar um integrante pelo botão
   "+ Integrante" dentro do modal da equipe.
3. Editar um Modelo de Proposta e um Pedido de Compra digitando quantidade e
   valores nos itens sem o cursor pular do campo.
