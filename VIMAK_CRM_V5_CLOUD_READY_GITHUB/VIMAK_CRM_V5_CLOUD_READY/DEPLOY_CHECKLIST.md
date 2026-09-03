# Checklist de implantação

## GitHub
- [ ] Criar repositório privado `vimak-crm`
- [ ] Subir esta pasta
- [ ] Confirmar que `.env` não foi versionado

## Supabase
- [ ] Criar projeto
- [ ] Rodar migration 001
- [ ] Rodar storage.sql
- [ ] Criar usuário Auth
- [ ] Copiar Project URL
- [ ] Copiar anon/publishable key

## Netlify
- [ ] Importar repositório GitHub
- [ ] Publicar diretório raiz
- [ ] Configurar domínio
- [ ] Testar PWA Android

## Testes obrigatórios
- [ ] Empresa A não enxerga dados da Empresa B
- [ ] Vendedor não acessa financeiro/admin
- [ ] Upload de logo isolado por empresa
- [ ] Login/logout
- [ ] Clientes/leads/propostas persistem na nuvem
