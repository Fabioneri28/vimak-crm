# V6.24.10 — Excluir Leads

Adicionado botão **Excluir lead** na ficha detalhada do lead.

Fluxo:
1. abre a ficha do lead;
2. clica em `Excluir lead`;
3. confirma a exclusão;
4. remove o lead do Supabase;
5. notificações relacionadas são removidas por `ON DELETE CASCADE`;
6. se houver anexo no bucket `lead-attachments`, o sistema tenta removê-lo;
7. atualiza imediatamente o CRM.

Segurança:
- confirmação obrigatória;
- não altera login, init, identidade ou refreshCore;
- não precisa de migration nova;
- service worker apenas recebeu novo identificador de cache.
