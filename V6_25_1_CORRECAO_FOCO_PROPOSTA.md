# VIMAK CRM V6.25.1 — Correção de foco na Nova Proposta

## Correção
- Corrigido o comportamento dos campos dos itens da proposta que perdiam o foco a cada tecla.
- A causa era a reconstrução completa das linhas da tabela durante cada evento `input`.
- Agora a digitação mantém o foco e atualiza somente o total da linha e o resumo financeiro.
- Adição/remoção de itens continua reconstruindo a tabela normalmente.
- Cache/PWA atualizado para forçar a entrega do JavaScript corrigido.

## Banco de dados
- Nenhuma migration SQL necessária.
