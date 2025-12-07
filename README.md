# Sistema de Registro de Chamados

Sistema completo de gestão de chamados técnicos com dashboard web e aplicativo desktop.

## 🚀 Funcionalidades

### Dashboard Web
- **Autenticação** de usuários (Administrador/Provedor)
- **Dashboard** com indicadores em tempo real
- **Gestão de Chamados** com filtros avançados
- **Gestão de Provedores** com configuração de franquia e valores
- **Gestão de Acessos** para usuários
- **Exportação/Importação Excel** com cálculo automático de valores
- **Gráficos** de estatísticas por provedor
- **Período de Fechamento** configurável por provedor
- **Cálculo automático** de valores com franquia mensal

### Aplicativo Desktop
- **Registro rápido** de chamados
- **Integração Firebase** em tempo real
- **Notificações Telegram** automáticas
- **Interface intuitiva** com PyQt6

## 📋 Requisitos

### Web Dashboard
- Node.js 16+
- npm ou yarn

### Desktop App
- Python 3.14+
- PyInstaller 6.17+
- PyQt6

## 🔧 Instalação

### 1. Firebase Setup
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Habilite Firestore Database
3. Baixe o arquivo de credenciais da conta de serviço
4. Renomeie para `firebase-key.json` e coloque na raiz do projeto

### 2. Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

### 3. Desktop App
```bash
# Instalar dependências
pip install pyqt6 firebase-admin requests

# Executar
python app.py

# Ou compilar para .exe
python -m PyInstaller --onefile --windowed --icon=assets/favicon.ico --add-data "firebase-key.json;." --add-data "assets;assets" --name RegistroChamados app.py
```

## 📦 Estrutura do Projeto

```
RegistroChamados/
├── app.py                    # Aplicativo desktop (PyQt6)
├── firebase-key.json         # Credenciais Firebase (não versionado)
├── assets/
│   └── favicon.ico          # Ícone do aplicativo
├── web-dashboard/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas (Dashboard, Login, etc)
│   │   └── services/        # Configuração Firebase
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔐 Segurança

- **firebase-key.json** está no .gitignore (não deve ser versionado)
- Configure as regras do Firestore conforme necessário
- Use autenticação adequada em produção

## 💰 Sistema de Cobrança

- **Franquia mensal** por provedor
- **Período de fechamento** configurável (ex: dia 17 ao dia 16)
- **Valores por nível** de atendimento
- Primeiros chamados dentro da franquia = R$ 0,00
- Chamados excedentes cobrados conforme tabela

## 🔔 Integrações

- **Telegram**: Notificações automáticas de novos chamados
- **Firebase**: Sincronização em tempo real
- **Excel**: Import/Export com cálculos automáticos

## 📝 Licença

Propriedade de PingDesk

## 👥 Suporte

Contato: contato@pingdesk.com
