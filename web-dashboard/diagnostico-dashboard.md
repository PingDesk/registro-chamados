# Diagnóstico de vendas indevidas na Dashboard

## O que foi verificado
- O código só conta como venda se o nível do chamado for exatamente "Venda Instalada" (case insensitive, com trim).
- O campo `nivel` é normalizado no carregamento dos chamados, mas pode haver inconsistências no banco de dados.
- O nome do provedor é normalizado para comparar corretamente.
- O filtro de vendas por provedor e o total de vendas usam a mesma lógica.

## Próximos passos sugeridos
1. **Verificar dados reais no Firestore:**
   - Pode haver chamados com nível "Venda Instalada" (ou variações) para Call VIP ou Saber Telecom.
   - Pode haver erros de digitação, espaços extras ou letras maiúsculas/minúsculas diferentes.
2. **Exportar chamados para Excel:**
   - Use o botão "Exportar Excel" na Dashboard.
   - Filtre no Excel por provedor e por nível para ver se há registros inesperados.
3. **Corrigir dados inconsistentes:**
   - Se encontrar chamados com nível incorreto, corrija no Firestore ou pelo sistema.

## Como posso ajudar mais?
- Se quiser, posso criar um relatório que mostre todos os chamados de cada provedor com o campo `nivel` para facilitar a auditoria.
- Posso sugerir um script para corrigir chamados com nível errado.

---
Se desejar, me peça para gerar o relatório detalhado dos chamados por provedor e nível!