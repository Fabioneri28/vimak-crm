# VIMAK CRM — Arquitetura Estável V6.24.1

Base: V6.23 Financeiro Inteligente enviada pelo usuário e confirmada como funcional.

## Estrutura
- O `app.js` principal está byte a byte idêntico à V6.23.
- `config.js` e `sw.js` também estão byte a byte idênticos.
- Novos módulos entram em `/modules/` e são registrados somente depois de o núcleo carregar.
- Se um módulo opcional der erro, o registry volta para a tela original daquele módulo em vez de derrubar login ou o CRM inteiro.
- Nenhuma migration nova.
- Nenhuma consulta nova no `refreshCore()`.

## Regra para próximas versões
Não editar login, init, loadIdentity ou refreshCore para adicionar recursos.
Novos recursos devem ser módulos isolados.
