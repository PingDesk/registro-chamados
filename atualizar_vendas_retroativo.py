from firebase_admin import credentials, firestore, initialize_app

cred = credentials.Certificate('firebase-key.json')
app = initialize_app(cred, name='update_vendas')
db = firestore.client(app)

# Carregar provedores para obter percentuais de comissão
print("Carregando provedores...")
provedores = {}
provedores_ref = db.collection('provedores').stream()
for prov in provedores_ref:
    prov_data = prov.to_dict()
    provedores[prov.id] = {
        'nome': prov_data.get('nome'),
        'comissao': prov_data.get('comissao', 10)
    }
    print(f"  {prov_data.get('nome')}: {prov_data.get('comissao', 10)}% comissão")

print(f"\nTotal de {len(provedores)} provedores carregados\n")

# Buscar vendas sem comissão
print("Buscando vendas sem comissão...")
vendas = db.collection('chamados').where('nivel', '>=', 'Venda').stream()
vendas_para_atualizar = []

for venda in vendas:
    venda_data = venda.to_dict()
    
    # Se não tem comissão calculada, precisa atualizar
    if venda_data.get('comissao') is None:
        vendas_para_atualizar.append({
            'id': venda.id,
            'provedor_id': venda_data.get('provedor'),
            'nivel': venda_data.get('nivel')
        })

print(f"Encontradas {len(vendas_para_atualizar)} vendas para atualizar\n")

# Atualizar vendas
atualizadas = 0
erros = 0

for venda_info in vendas_para_atualizar:
    try:
        provedor_id = venda_info['provedor_id']
        
        if provedor_id not in provedores:
            print(f"AVISO: Provedor {provedor_id} não encontrado para venda {venda_info['id']}")
            continue
        
        percentual_comissao = provedores[provedor_id]['comissao']
        
        # Vendas antigas não têm valorVenda, então vamos marcar como R$ 0
        # mas salvar o percentual para referência
        update_data = {
            'valorVenda': 0,
            'comissao': 0,
            'percentualComissao': percentual_comissao
        }
        
        db.collection('chamados').document(venda_info['id']).update(update_data)
        atualizadas += 1
        
        if atualizadas % 10 == 0:
            print(f"Progresso: {atualizadas}/{len(vendas_para_atualizar)} vendas atualizadas...")
        
    except Exception as e:
        print(f"ERRO ao atualizar venda {venda_info['id']}: {e}")
        erros += 1

print(f"\n✅ Processo concluído!")
print(f"   Vendas atualizadas: {atualizadas}")
print(f"   Erros: {erros}")
print(f"\n📝 Vendas antigas agora têm:")
print(f"   - valorVenda: 0 (não havia registro do valor)")
print(f"   - comissao: 0")
print(f"   - percentualComissao: baseado no provedor")
