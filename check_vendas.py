from firebase_admin import credentials, firestore, initialize_app

cred = credentials.Certificate('firebase-key.json')
app = initialize_app(cred, name='check_vendas')
db = firestore.client(app)

vendas = db.collection('chamados').where('nivel', '>=', 'Venda').stream()
vendas_list = list(vendas)

print(f'Total vendas encontradas: {len(vendas_list)}')
print()

for v in vendas_list[:10]:
    data = v.to_dict()
    print(f"ID: {v.id}")
    print(f"  Provedor: {data.get('provedor')}")
    print(f"  Valor Venda: {data.get('valorVenda')}")
    print(f"  Comissão: {data.get('comissao')}")
    print(f"  Percentual: {data.get('percentualComissao')}%")
    print()
