# V6.24.13.2 — Upload de anexos da captação

- Corrigido upload para o bucket privado `lead-attachments`.
- Limite: 20 MB.
- Formatos: JPG/JPEG, PNG, WEBP, HEIC/HEIF, PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, DWG, DXF e ZIP.
- Mensagens de erro agora mostram a causa real ao cliente.
- Caminhos continuam gravados no lead via `p_attachment_url`.
- Nova migration: `011_lead_attachment_upload_formats.sql`.
- Nenhuma alteração no login ou nas rotinas principais do CRM.
