# V6.24.13.6 — Conversor Promob → Cortecloud

Criado a partir da V6.24.13.5 estável.

O arquivo de referência enviado (`importar_do_excel.xls`) é internamente um workbook Office Open XML e contém na primeira linha exatamente:
Quantidade | Comprimento | Largura | Função | Fita C1 | Fita C2 | Fita L1 | Fita L2 | Material | Complemento | Girar

## Implementado
- botão `PROMOB → CORTECLOUD` em Produção → Plano de Corte;
- botão `Converter para Cortecloud` dentro do editor;
- importação TXT/CSV Promob pelo parser já validado;
- tela de revisão antes da exportação;
- C1, C2, L1 e L2 editáveis;
- quantidade, material, complemento e rotação;
- geração de Excel `.xlsx` com a mesma ordem de 11 colunas do modelo Cortecloud;
- preservado conversor LEO Plan;
- preservadas etiquetas;
- preservada impressão PRO do Plano de Corte.

Nenhuma migration ou alteração Supabase.
