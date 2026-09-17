# VIMAK CRM V6.25 — ESTÁVEL

Versão de fechamento da arquitetura atual do CRM VIMAK.

## Fechamento aplicado
- Mantida a base funcional da V6.24.13.11.21.
- Cobrança inteligente via WhatsApp adicionada às contas a receber em aberto, com confirmação antes de abrir a conversa.
- Mensagem diferencia parcela futura de parcela vencida.
- Mantidas as permissões existentes por rota/perfil, incluindo Administrador e permissões específicas.
- Identidade de versão consolidada no login/topo como V6.25 ESTÁVEL.
- Service Worker atualizado para cache V6.25 e corrigido para usar a Central de Notificações atual (`notifications-v62420.js`).
- Cache continua restrito à mesma origem e somente GET; Supabase/CDNs não são interceptados.

## Validação estática executada
`node --check` aprovado em:
- app.js
- notifications-v62420.js
- modules/maquininhas-v6241.js
- sw.js

## Regra desta versão
A partir da V6.25, priorizar correções, estabilidade, persistência e testes de uso real. Evitar novos módulos até a homologação operacional.

## Homologação recomendada no ambiente conectado
1. Login e permissões por perfil.
2. Criar/editar/excluir registros críticos e recarregar a página para confirmar persistência.
3. Projeto 360° completo de um cliente real de teste.
4. PIX parcelado, baixa financeira e cobrança WhatsApp.
5. Maquininhas/Leozinha e cálculos já homologados.
6. Plano de corte, etiquetas e impressão.
7. PWA/cache após publicação.
8. Backup e recuperação.

Nenhuma nova migration SQL foi adicionada nesta versão.
