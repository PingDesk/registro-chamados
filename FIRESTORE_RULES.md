# Configuração das Regras do Firestore

## ⚠️ PROBLEMA IDENTIFICADO

O erro `Missing or insufficient permissions` indica que as regras do Firestore estão bloqueando o acesso web.

## 🔧 SOLUÇÃO

Acesse o Firebase Console e configure as regras:

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Selecione o projeto: **app-pingdesk**

### 2. Configure as Regras do Firestore
- No menu lateral, clique em **Firestore Database**
- Vá na aba **Regras** (Rules)
- Cole o código abaixo:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permitir leitura e escrita em todas as coleções (para desenvolvimento)
    // ⚠️ ATENÇÃO: Para produção, use regras mais restritivas
    match /{document=**} {
      allow read, write: if true;
    }
    
    /* ALTERNATIVA - Regras mais seguras (recomendado para produção):
    
    // Usuários - qualquer um pode ler para fazer login
    match /usuarios/{userId} {
      allow read: if true;
      allow write: if false; // Apenas admin do desktop pode criar/editar
    }
    
    // Chamados - qualquer um pode ler e criar
    match /chamados/{chamadoId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if false;
    }
    
    // Provedores - leitura livre
    match /provedores/{provedorId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Níveis - leitura livre
    match /niveis/{nivelId} {
      allow read: if true;
      allow write: if false;
    }
    */
  }
}
```

### 3. Publique as Regras
- Clique em **Publicar** (Publish)
- Aguarde alguns segundos

### 4. Teste o Login
- Volte para http://localhost:3001
- Faça login com: **admin** / **1234**

## 📝 Explicação das Regras

### Regra Simples (Desenvolvimento)
```javascript
allow read, write: if true;
```
✅ Permite tudo - ideal para desenvolvimento
⚠️ Não use em produção!

### Regras Recomendadas (Produção)
- **usuarios**: Qualquer um pode LER (necessário para login)
- **chamados**: Qualquer um pode LER e EDITAR status
- **provedores/niveis**: Apenas leitura (edição só no app desktop)

## 🔐 Segurança

Para máxima segurança em produção, você pode:

1. **Usar Firebase Authentication** (requer refatoração do código)
2. **Limitar por domínio** no Firebase Console
3. **Adicionar validação de campos** nas regras

## 🚀 Próximos Passos

Após configurar as regras:
1. Recarregue a página do dashboard
2. Tente fazer login novamente
3. Verifique o console (F12) - não deve haver erro de permissão
