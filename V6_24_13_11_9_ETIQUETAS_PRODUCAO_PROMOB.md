# V6.24.13.11.9 — Etiquetas de Produção Promob

- Corrige a impressão das etiquetas usando iframe interno, evitando bloqueio de pop-up.
- Mantém 100x70, 90x50 e 80x50; padrão agora 90x50 mm.
- Adiciona desenho técnico da peça na etiqueta.
- Destaca visualmente Cima/Baixo/Esquerda/Direita quando o arquivo de origem fornece fita por lado.
- Mostra texto detalhado das fitas por lado.
- Quando só existe fita genérica, informa “FITA • LADO NÃO DEFINIDO” para não inventar informação de produção.
- Preserva Plano de Corte, importadores, otimizador, auditoria e demais módulos.
- Nenhuma migration SQL nova.
