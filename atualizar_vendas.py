from firebase_admin import credentials, firestore, initialize_app

cred = credentials.Certificate('firebase-key.json')
app = initialize_app(cred, name='update_vendas')
db = firestore.client(app)

# Carrega todos os provedores
provedores_ref = db.collection('provedores')
provedores_map = {}
for doc in provedores_ref.stream():
    provedores_map[doc.id] = doc.to_dict()

print(f"Provedores carregados: {len(provedores_map)}")
print()

# Busca vendas sem comissão
vendas_ref = db.collection('chamados')
todas_vendas = vendas_ref.stream()

atualizadas = 0
sem_valor = 0
erros = 0

for venda_doc in todas_vendas:
    venda_data = venda_doc.to_dict()
    nivel = (venda_data.get('nivel', '') or '').lower()
    
    # Verifica se é venda
    if 'venda' not in nivel:
        continue
    
    # Se já tem comissão, pula
    if venda_data.get('comissao') is not None:
        continue
    
    # Se não tem valorVenda, usa valor padrão de 0 (não atualiza)
    if venda_data.get('valorVenda') is None:
        sem_valor += 1
        print(f"Venda {venda_doc.id} sem valorVenda - pulando")
        continue
    
    try:
        provedor_id = venda_data.get('provedor')
        valor_venda = float(venda_data.get('valorVenda', 0))
        
        # Busca percentual de comissão do provedor
        percentual = 10  # Padrão
        if provedor_id in provedores_map:
            percentual = float(provedores_map[provedor_id].get('comissao', 10))
        
        # Calcula comissão
        comissao = valor_venda * (percentual / 100)
        
        # Atualiza documento
        venda_ref = db.collection('chamados').document(venda_doc.id)
        venda_ref.update({
            'comissao': comissao,
            'percentualComissao': percentual
        })
        
        atualizadas += 1
        print(f"✓ Venda {venda_doc.id}: R$ {valor_venda:.2f} → Comissão {percentual}% = R$ {comissao:.2f}")
        
    except Exception as e:
        erros += 1
        print(f"✗ Erro ao atualizar {venda_doc.id}: {e}")

print()
print("=" * 60)
print(f"RESUMO:")
print(f"  Vendas atualizadas: {atualizadas}")
print(f"  Vendas sem valor: {sem_valor}")
print(f"  Erros: {erros}")
print("=" * 60)
