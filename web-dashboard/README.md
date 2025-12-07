# PingDesk - Dashboard Web

Dashboard web para gerenciamento de chamados do sistema PingDesk.

## 🚀 Características

- ✅ Autenticação com Firebase
- 📊 Dashboard com estatísticas em tempo real
- 📈 Gráficos interativos (por provedor, status, nível)
- 🔍 Busca e filtros avançados
- 📥 Exportação para Excel
- ✏️ Edição de status de chamados
- 📱 Interface responsiva

## 📋 Pré-requisitos

- Node.js 16+ instalado
- NPM ou Yarn
- Acesso ao projeto Firebase (app-pingdesk)

## 🛠️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure o Firebase:
   - O arquivo `src/services/firebase.js` já está configurado com as credenciais do projeto app-pingdesk
   - Certifique-se de que o Firestore está habilitado no Firebase Console

## 🎯 Como usar

### Desenvolvimento

Execute o servidor de desenvolvimento:
```bash
npm run dev
```

O dashboard estará disponível em `http://localhost:3000`

### Build para Produção

Gere os arquivos otimizados:
```bash
npm run build
```

Os arquivos estarão na pasta `dist/`

### Preview da Build

Teste a build de produção localmente:
```bash
npm run preview
```

## 🔐 Login

Use as mesmas credenciais do aplicativo desktop:
- **Usuário padrão:** admin
- **Senha padrão:** 1234

Ou qualquer outro usuário cadastrado no sistema.

## 📊 Funcionalidades

### Dashboard Principal
- Cards com estatísticas (Total, Abertos, Em Andamento, Fechados)
- Gráfico de barras por provedor
- Gráfico de pizza por status
- Gráfico de barras por nível de atendimento

### Gerenciamento de Chamados
- Listagem completa de todos os chamados
- Busca por descrição, usuário, cliente ou provedor
- Filtros por status e provedor
- Edição de status (Aberto → Em Andamento → Fechado)
- Exportação para Excel com dados filtrados

## 🌐 Deploy

### Firebase Hosting

1. Instale o Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Faça login:
```bash
firebase login
```

3. Inicialize o projeto:
```bash
firebase init hosting
```

4. Faça o deploy:
```bash
npm run build
firebase deploy
```

### GitHub Pages

1. Atualize `vite.config.js` com a base correta:
```javascript
export default defineConfig({
  base: '/seu-repositorio/',
  // ...
})
```

2. Build e deploy:
```bash
npm run build
```

3. Suba a pasta `dist/` para o repositório

## 🔧 Estrutura do Projeto

```
web-dashboard/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── StatsCard.jsx
│   │   ├── TicketTable.jsx
│   │   └── ChartsSection.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── services/
│   │   └── firebase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── index.html
```

## 📦 Tecnologias Utilizadas

- **React 18** - Framework UI
- **Vite** - Build tool
- **Firebase/Firestore** - Banco de dados
- **Recharts** - Gráficos
- **XLSX** - Exportação Excel
- **Lucide React** - Ícones
- **React Router** - Navegação
- **date-fns** - Formatação de datas

## 🤝 Integração com Desktop App

Este dashboard consome os mesmos dados do aplicativo desktop PyQt6:
- Mesma base Firestore (`app-pingdesk`)
- Mesmas coleções: `usuarios`, `chamados`, `provedores`, `niveis`
- Sincronização em tempo real

## 📝 Notas

- O dashboard é apenas para visualização e edição de status
- Novos chamados devem ser criados pelo aplicativo desktop
- As configurações de usuários, provedores e níveis são gerenciadas no app desktop
