from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QLabel, QLineEdit, QPushButton, QComboBox, QTextEdit, QMessageBox, QTabWidget, QListWidget, QListWidgetItem, QHBoxLayout, QInputDialog
from PyQt6.QtGui import QIcon
from PyQt6.QtCore import QTimer, QThread, pyqtSignal
import sys
import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import requests

# Função para obter o caminho correto dos arquivos (funciona tanto em dev quanto em .exe)
def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller cria uma pasta temporária e armazena o caminho em _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Configurações do Telegram
TELEGRAM_TOKEN = "8353262305:AAG_kMgFVLGRQ8EwQjhyEUAkeOWBH-kTYhs"
TELEGRAM_CHAT_ID = "-1003349243615"

def enviar_telegram(mensagem):
    """Envia mensagem para o Telegram"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        dados = {
            "chat_id": int(TELEGRAM_CHAT_ID),
            "text": mensagem,
            "parse_mode": "HTML"
        }
        print(f"[DEBUG] Enviando para Telegram - Chat ID: {TELEGRAM_CHAT_ID}")
        print(f"[DEBUG] URL: {url}")
        print(f"[DEBUG] Dados: {dados}")
        
        # Tenta com JSON
        response = requests.post(url, json=dados, timeout=10)
        print(f"[DEBUG] Status Code: {response.status_code}")
        print(f"[DEBUG] Response: {response.text}")
        
        if response.status_code == 200:
            return True
        else:
            return False
    except Exception as e:
        print(f"[DEBUG] Erro ao enviar para Telegram: {e}")
        import traceback
        traceback.print_exc()
        return False

# Inicializa Firebase
cred = credentials.Certificate(resource_path('firebase-key.json'))
firebase_admin.initialize_app(cred)
db = firestore.client()

# Função removida - coleções já existem no Firebase
# As verificações consumiam muita quota do Firebase

# Thread para carregar dados do Firebase em background
class FirebaseLoaderThread(QThread):
    dados_carregados = pyqtSignal(list, str)  # lista de dados, tipo (provedores/niveis)
    erro = pyqtSignal(str, str)  # mensagem de erro, tipo
    
    def __init__(self, collection_name, tipo):
        super().__init__()
        self.collection_name = collection_name
        self.tipo = tipo
    
    def run(self):
        try:
            ref = db.collection(self.collection_name)
            docs = list(ref.stream())
            
            if self.tipo == 'provedores':
                dados = [doc.get('nome') for doc in docs]
            elif self.tipo == 'niveis':
                dados = [doc.get('nivel') for doc in docs]
            else:
                dados = []
            
            self.dados_carregados.emit(dados, self.tipo)
        except Exception as e:
            self.erro.emit(str(e), self.tipo)

# Thread para autenticação
class LoginThread(QThread):
    login_sucesso = pyqtSignal(str, str)  # usuario_id, tipo
    login_falhou = pyqtSignal(str)  # mensagem de erro
    
    def __init__(self, nome, senha):
        super().__init__()
        self.nome = nome
        self.senha = senha
    
    def run(self):
        try:
            usuarios_ref = db.collection('usuarios')
            docs = list(usuarios_ref.where(filter=FieldFilter('nome', '==', self.nome)).where(filter=FieldFilter('senha', '==', self.senha)).limit(1).stream())
            
            if docs:
                doc = docs[0]
                usuario_id = doc.id
                usuario_data = doc.to_dict()
                usuario_tipo = usuario_data.get('tipo', 'Colaborador')
                self.login_sucesso.emit(usuario_id, usuario_tipo)
            else:
                self.login_falhou.emit("Usuário ou senha inválidos")
        except Exception as e:
            self.login_falhou.emit(f"Erro ao conectar ao Firebase.\n\nDetalhes: {str(e)}")

class Login(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Login")
        self.setWindowIcon(QIcon(resource_path("assets/favicon.ico")))
        layout = QVBoxLayout()
        self.usuario = QLineEdit()
        self.usuario.setPlaceholderText("Usuário")
        layout.addWidget(self.usuario)
        self.senha = QLineEdit()
        self.senha.setPlaceholderText("Senha")
        self.senha.setEchoMode(QLineEdit.EchoMode.Password)
        layout.addWidget(self.senha)
        self.botao = QPushButton("Login")
        self.botao.clicked.connect(self.checar_login)
        layout.addWidget(self.botao)
        self.setLayout(layout)
        self.login_thread = None

    def checar_login(self):
        nome = self.usuario.text()
        senha = self.senha.text()
        
        if not nome or not senha:
            QMessageBox.warning(self, "Erro", "Preencha usuário e senha")
            return
        
        # Desabilita botão durante autenticação
        self.botao.setEnabled(False)
        self.botao.setText("Autenticando...")
        
        # Inicia thread de login
        self.login_thread = LoginThread(nome, senha)
        self.login_thread.login_sucesso.connect(self.on_login_sucesso)
        self.login_thread.login_falhou.connect(self.on_login_falhou)
        self.login_thread.start()
    
    def on_login_sucesso(self, usuario_id, usuario_tipo):
        """Callback quando login é bem sucedido"""
        # Bloquear Provedores de acessar o aplicativo
        if usuario_tipo == 'Provedor':
            QMessageBox.warning(self, "Acesso Negado", "Provedores têm acesso apenas ao site web")
            self.botao.setEnabled(True)
            self.botao.setText("Login")
            return
        
        self.hide()
        self.app_chamado = ChamadoApp(usuario_id)
        self.app_chamado.show()
    
    def on_login_falhou(self, mensagem):
        """Callback quando login falha"""
        if "Erro ao conectar" in mensagem:
            QMessageBox.critical(self, "Erro de Conexão", mensagem)
        else:
            QMessageBox.warning(self, "Erro", mensagem)
        
        self.botao.setEnabled(True)
        self.botao.setText("Login")

class AdminUsuarios(QWidget):
    def __init__(self, usuario_id):
        super().__init__()
        self.usuario_id = usuario_id
        self.setWindowTitle("Painel de Administração")
        self.setWindowIcon(QIcon(resource_path("assets/favicon.ico")))
        self.setGeometry(100, 100, 600, 500)
        
        layout = QVBoxLayout()
        
        # Cria abas
        self.tabs = QTabWidget()
        # Conectar evento de mudança de aba para atualizar listas
        self.tabs.currentChanged.connect(self.atualizar_aba_atual)
        
        # Aba de Usuários
        self.aba_usuarios = QWidget()
        layout_usuarios = QVBoxLayout()
        
        layout_usuarios.addWidget(QLabel("Adicionar Novo Usuário"))
        self.novo_usuario = QLineEdit()
        self.novo_usuario.setPlaceholderText("Nome do usuário")
        layout_usuarios.addWidget(self.novo_usuario)
        
        self.nova_senha = QLineEdit()
        self.nova_senha.setPlaceholderText("Senha")
        self.nova_senha.setEchoMode(QLineEdit.EchoMode.Password)
        layout_usuarios.addWidget(self.nova_senha)
        
        layout_usuarios.addWidget(QLabel("Tipo de Usuário"))
        self.tipo_usuario = QComboBox()
        self.tipo_usuario.addItems(["Colaborador", "Administrador", "Provedor"])
        layout_usuarios.addWidget(self.tipo_usuario)
        
        self.botao_adicionar_usuario = QPushButton("Adicionar Usuário")
        self.botao_adicionar_usuario.clicked.connect(self.adicionar_usuario)
        layout_usuarios.addWidget(self.botao_adicionar_usuario)
        
        layout_usuarios.addWidget(QLabel("\nAlterar Senha do Admin"))
        self.nova_senha_admin = QLineEdit()
        self.nova_senha_admin.setPlaceholderText("Nova senha para admin")
        self.nova_senha_admin.setEchoMode(QLineEdit.EchoMode.Password)
        layout_usuarios.addWidget(self.nova_senha_admin)
        
        self.botao_alterar_admin = QPushButton("Alterar Senha do Admin")
        self.botao_alterar_admin.clicked.connect(self.alterar_senha_admin)
        layout_usuarios.addWidget(self.botao_alterar_admin)
        
        layout_usuarios.addWidget(QLabel("\nUsuários Cadastrados:"))
        self.lista_usuarios = QListWidget()
        self.carregar_usuarios()
        layout_usuarios.addWidget(self.lista_usuarios)
        
        # Botões de ação para usuários
        layout_botoes_usuarios = QHBoxLayout()
        self.botao_editar_usuario = QPushButton("Editar")
        self.botao_editar_usuario.clicked.connect(self.editar_usuario)
        layout_botoes_usuarios.addWidget(self.botao_editar_usuario)
        
        self.botao_excluir_usuario = QPushButton("Excluir")
        self.botao_excluir_usuario.clicked.connect(self.excluir_usuario)
        layout_botoes_usuarios.addWidget(self.botao_excluir_usuario)
        layout_usuarios.addLayout(layout_botoes_usuarios)
        
        layout_usuarios.addStretch()
        self.aba_usuarios.setLayout(layout_usuarios)
        self.tabs.addTab(self.aba_usuarios, "Usuários")
        
        # Aba de Provedores
        self.aba_provedores = QWidget()
        layout_provedores = QVBoxLayout()
        
        layout_provedores.addWidget(QLabel("Adicionar Novo Provedor"))
        self.novo_provedor = QLineEdit()
        self.novo_provedor.setPlaceholderText("Nome do provedor")
        layout_provedores.addWidget(self.novo_provedor)
        
        self.botao_adicionar_provedor = QPushButton("Adicionar Provedor")
        self.botao_adicionar_provedor.clicked.connect(self.adicionar_provedor)
        layout_provedores.addWidget(self.botao_adicionar_provedor)
        
        layout_provedores.addWidget(QLabel("\nProvedores Cadastrados:"))
        self.lista_provedores = QListWidget()
        self.carregar_provedores()
        layout_provedores.addWidget(self.lista_provedores)
        
        # Botões de ação para provedores
        layout_botoes_provedores = QHBoxLayout()
        self.botao_editar_provedor = QPushButton("Editar")
        self.botao_editar_provedor.clicked.connect(self.editar_provedor)
        layout_botoes_provedores.addWidget(self.botao_editar_provedor)
        
        self.botao_excluir_provedor = QPushButton("Excluir")
        self.botao_excluir_provedor.clicked.connect(self.excluir_provedor)
        layout_botoes_provedores.addWidget(self.botao_excluir_provedor)
        layout_provedores.addLayout(layout_botoes_provedores)
        
        layout_provedores.addStretch()
        self.aba_provedores.setLayout(layout_provedores)
        self.tabs.addTab(self.aba_provedores, "Provedores")
        
        # Aba de Níveis
        self.aba_niveis = QWidget()
        layout_niveis = QVBoxLayout()
        
        layout_niveis.addWidget(QLabel("Adicionar Novo Nível de Atendimento"))
        self.novo_nivel = QLineEdit()
        self.novo_nivel.setPlaceholderText("Nome do nível")
        layout_niveis.addWidget(self.novo_nivel)
        
        self.botao_adicionar_nivel = QPushButton("Adicionar Nível")
        self.botao_adicionar_nivel.clicked.connect(self.adicionar_nivel)
        layout_niveis.addWidget(self.botao_adicionar_nivel)
        
        layout_niveis.addWidget(QLabel("\nNíveis Cadastrados:"))
        self.lista_niveis = QListWidget()
        self.carregar_niveis()
        layout_niveis.addWidget(self.lista_niveis)
        
        # Botões de ação para níveis
        layout_botoes_niveis = QHBoxLayout()
        self.botao_editar_nivel = QPushButton("Editar")
        self.botao_editar_nivel.clicked.connect(self.editar_nivel)
        layout_botoes_niveis.addWidget(self.botao_editar_nivel)
        
        self.botao_excluir_nivel = QPushButton("Excluir")
        self.botao_excluir_nivel.clicked.connect(self.excluir_nivel)
        layout_botoes_niveis.addWidget(self.botao_excluir_nivel)
        layout_niveis.addLayout(layout_botoes_niveis)
        
        layout_niveis.addStretch()
        self.aba_niveis.setLayout(layout_niveis)
        self.tabs.addTab(self.aba_niveis, "Níveis de Atendimento")
        
        # Aba de Configuração Telegram
        self.aba_telegram = QWidget()
        layout_telegram = QVBoxLayout()
        
        layout_telegram.addWidget(QLabel("Configuração do Telegram"))
        layout_telegram.addWidget(QLabel("Chat ID do Grupo:"))
        
        self.chat_id_telegram = QLineEdit()
        self.chat_id_telegram.setPlaceholderText("ID do chat do Telegram")
        self.chat_id_telegram.setText(TELEGRAM_CHAT_ID)
        layout_telegram.addWidget(self.chat_id_telegram)
        
        self.botao_salvar_telegram = QPushButton("Salvar Configuração")
        self.botao_salvar_telegram.clicked.connect(self.salvar_config_telegram)
        layout_telegram.addWidget(self.botao_salvar_telegram)
        
        self.botao_testar_telegram = QPushButton("Testar Conexão")
        self.botao_testar_telegram.clicked.connect(self.testar_telegram)
        layout_telegram.addWidget(self.botao_testar_telegram)
        
        layout_telegram.addWidget(QLabel("\nNota: O Chat ID pode ser obtido acessando:\nhttps://api.telegram.org/bot{TOKEN}/getUpdates\n\nProcure por 'chat' -> 'id'"))
        
        layout_telegram.addStretch()
        self.aba_telegram.setLayout(layout_telegram)
        self.tabs.addTab(self.aba_telegram, "Telegram")
        
        layout.addWidget(self.tabs)
        self.setLayout(layout)
        
        # Timer para atualização automática a cada 30 segundos
        self.timer_atualizacao = QTimer()
        self.timer_atualizacao.timeout.connect(self.atualizar_aba_atual)
        self.timer_atualizacao.start(30000)  # 30 segundos
        
        # Carregar dados iniciais
        self.carregar_usuarios()
        self.carregar_provedores()
        self.carregar_niveis()
    
    def carregar_usuarios(self):
        self.lista_usuarios.clear()
        try:
            usuarios_ref = db.collection('usuarios')
            docs = list(usuarios_ref.stream())
            for doc in docs:
                nome = doc.get('nome')
                item = QListWidgetItem(nome)
                item.setData(1, doc.id)
                self.lista_usuarios.addItem(item)
        except Exception as e:
            print(f"Erro ao carregar usuários: {e}")
            self.lista_usuarios.addItem("Erro ao carregar")
    
    def carregar_provedores(self):
        self.lista_provedores.clear()
        try:
            provedores_ref = db.collection('provedores')
            docs = list(provedores_ref.stream())
            for doc in docs:
                nome = doc.get('nome')
                item = QListWidgetItem(nome)
                item.setData(1, doc.id)
                self.lista_provedores.addItem(item)
        except Exception as e:
            print(f"Erro ao carregar provedores: {e}")
            self.lista_provedores.addItem("Erro ao carregar")
    
    def atualizar_aba_atual(self):
        """Atualiza a lista da aba atual"""
        try:
            current_index = self.tabs.currentIndex()
            if current_index == 0:  # Aba Usuários
                self.carregar_usuarios()
            elif current_index == 1:  # Aba Provedores
                self.carregar_provedores()
            elif current_index == 2:  # Aba Níveis
                self.carregar_niveis()
        except Exception as e:
            print(f"Erro ao atualizar aba: {e}")
    
    def carregar_niveis(self):
        self.lista_niveis.clear()
        try:
            niveis_ref = db.collection('niveis')
            docs = list(niveis_ref.stream())
            for doc in docs:
                nivel = doc.get('nivel')
                item = QListWidgetItem(nivel)
                item.setData(1, doc.id)
                self.lista_niveis.addItem(item)
        except Exception as e:
            print(f"Erro ao carregar níveis: {e}")
            self.lista_niveis.addItem("Erro ao carregar")
    
    def editar_usuario(self):
        item = self.lista_usuarios.currentItem()
        if not item:
            QMessageBox.warning(self, "Erro", "Selecione um usuário para editar")
            return
        
        usuario_id = item.data(1)
        nome_atual = item.text()
        
        nova_senha, ok = QInputDialog.getText(self, "Editar Usuário", f"Nova senha para '{nome_atual}':")
        if ok and nova_senha:
            usuarios_ref = db.collection('usuarios')
            usuarios_ref.document(usuario_id).update({'senha': nova_senha})
            QMessageBox.information(self, "Sucesso", "Senha alterada com sucesso")
            self.carregar_usuarios()
    
    def excluir_usuario(self):
        item = self.lista_usuarios.currentItem()
        if not item:
            QMessageBox.warning(self, "Erro", "Selecione um usuário para excluir")
            return
        
        usuario_id = item.data(1)
        nome = item.text()
        
        if nome == 'admin':
            QMessageBox.warning(self, "Erro", "Não é possível excluir o usuário admin")
            return
        
        reply = QMessageBox.question(self, "Confirmar", f"Deseja realmente excluir o usuário '{nome}'?")
        if reply == QMessageBox.StandardButton.Yes:
            usuarios_ref = db.collection('usuarios')
            usuarios_ref.document(usuario_id).delete()
            QMessageBox.information(self, "Sucesso", "Usuário excluído com sucesso")
            self.carregar_usuarios()
    
    def editar_provedor(self):
        item = self.lista_provedores.currentItem()
        if not item:
            QMessageBox.warning(self, "Erro", "Selecione um provedor para editar")
            return
        
        provedor_id = item.data(1)
        nome_atual = item.text()
        
        novo_nome, ok = QInputDialog.getText(self, "Editar Provedor", "Novo nome do provedor:", text=nome_atual)
        if ok and novo_nome:
            # Verifica se já existe provedor com esse nome
            provedores_ref = db.collection('provedores')
            docs = provedores_ref.where('nome', '==', novo_nome).stream()
            if any(docs):
                QMessageBox.warning(self, "Erro", "Já existe um provedor com esse nome")
                return
            
            provedores_ref.document(provedor_id).update({'nome': novo_nome})
            QMessageBox.information(self, "Sucesso", "Provedor alterado com sucesso")
            self.carregar_provedores()
    
    def excluir_provedor(self):
        item = self.lista_provedores.currentItem()
        if not item:
            QMessageBox.warning(self, "Erro", "Selecione um provedor para excluir")
            return
        
        provedor_id = item.data(1)
        nome = item.text()
        
        reply = QMessageBox.question(self, "Confirmar", f"Deseja realmente excluir o provedor '{nome}'?")
        if reply == QMessageBox.StandardButton.Yes:
            provedores_ref = db.collection('provedores')
            provedores_ref.document(provedor_id).delete()
            QMessageBox.information(self, "Sucesso", "Provedor excluído com sucesso")
            self.carregar_provedores()
    
    def editar_nivel(self):
        item = self.lista_niveis.currentItem()
        if not item:
            QMessageBox.warning(self, "Erro", "Selecione um nível para editar")
            return
        
        nivel_id = item.data(1)
        nome_atual = item.text()
        
        novo_nome, ok = QInputDialog.getText(self, "Editar Nível", "Novo nome do nível:", text=nome_atual)
        if ok and novo_nome:
            # Verifica se já existe nível com esse nome
            niveis_ref = db.collection('niveis')
            docs = niveis_ref.where('nivel', '==', novo_nome).stream()
            if any(docs):
                QMessageBox.warning(self, "Erro", "Já existe um nível com esse nome")
                return
            
            niveis_ref.document(nivel_id).update({'nivel': novo_nome})
            QMessageBox.information(self, "Sucesso", "Nível alterado com sucesso")
            self.carregar_niveis()
    
    def excluir_nivel(self):
        item = self.lista_niveis.currentItem()
        if not item:
            QMessageBox.warning(self, "Erro", "Selecione um nível para excluir")
            return
        
        nivel_id = item.data(1)
        nome = item.text()
        
        reply = QMessageBox.question(self, "Confirmar", f"Deseja realmente excluir o nível '{nome}'?")
        if reply == QMessageBox.StandardButton.Yes:
            niveis_ref = db.collection('niveis')
            niveis_ref.document(nivel_id).delete()
            QMessageBox.information(self, "Sucesso", "Nível excluído com sucesso")
            self.carregar_niveis()
    
    def adicionar_usuario(self):
        nome = self.novo_usuario.text()
        senha = self.nova_senha.text()
        tipo = self.tipo_usuario.currentText()
        
        if not nome or not senha:
            QMessageBox.warning(self, "Erro", "Nome e senha são obrigatórios")
            return
        
        # Verifica se usuário já existe
        usuarios_ref = db.collection('usuarios')
        docs = usuarios_ref.where('nome', '==', nome).stream()
        if any(docs):
            QMessageBox.warning(self, "Erro", "Este usuário já existe")
            return
        
        # Adiciona novo usuário com tipo
        usuarios_ref.add({
            'nome': nome,
            'senha': senha,
            'tipo': tipo
        })
        
        QMessageBox.information(self, "Sucesso", f"Usuário '{nome}' ({tipo}) adicionado com sucesso")
        self.novo_usuario.clear()
        self.nova_senha.clear()
        self.tipo_usuario.setCurrentIndex(0)
        self.carregar_usuarios()
    
    def alterar_senha_admin(self):
        nova_senha = self.nova_senha_admin.text()
        
        if not nova_senha:
            QMessageBox.warning(self, "Erro", "Nova senha é obrigatória")
            return
        
        # Encontra e atualiza o usuário admin
        usuarios_ref = db.collection('usuarios')
        docs = usuarios_ref.where('nome', '==', 'admin').stream()
        for doc in docs:
            usuarios_ref.document(doc.id).update({'senha': nova_senha})
            QMessageBox.information(self, "Sucesso", "Senha do admin alterada com sucesso")
            self.nova_senha_admin.clear()
            return
    
    def adicionar_provedor(self):
        nome = self.novo_provedor.text()
        
        if not nome:
            QMessageBox.warning(self, "Erro", "Nome do provedor é obrigatório")
            return
        
        # Verifica se provedor já existe
        provedores_ref = db.collection('provedores')
        docs = provedores_ref.where('nome', '==', nome).stream()
        if any(docs):
            QMessageBox.warning(self, "Erro", "Este provedor já existe")
            return
        
        # Adiciona novo provedor
        provedores_ref.add({'nome': nome})
        
        QMessageBox.information(self, "Sucesso", f"Provedor '{nome}' adicionado com sucesso")
        self.novo_provedor.clear()
        self.carregar_provedores()
    
    def adicionar_nivel(self):
        nome = self.novo_nivel.text()
        
        if not nome:
            QMessageBox.warning(self, "Erro", "Nome do nível é obrigatório")
            return
        
        # Verifica se nível já existe
        niveis_ref = db.collection('niveis')
        docs = niveis_ref.where('nivel', '==', nome).stream()
        if any(docs):
            QMessageBox.warning(self, "Erro", "Este nível já existe")
            return
        
        # Adiciona novo nível
        niveis_ref.add({'nivel': nome})
        
        QMessageBox.information(self, "Sucesso", f"Nível '{nome}' adicionado com sucesso")
        self.novo_nivel.clear()
        self.carregar_niveis()
    
    def salvar_config_telegram(self):
        global TELEGRAM_CHAT_ID
        novo_chat_id = self.chat_id_telegram.text()
        
        if not novo_chat_id:
            QMessageBox.warning(self, "Erro", "Chat ID é obrigatório")
            return
        
        TELEGRAM_CHAT_ID = novo_chat_id
        QMessageBox.information(self, "Sucesso", "Configuração do Telegram salva com sucesso")
    
    def testar_telegram(self):
        mensagem = "<b>Teste de Conexão</b>\n\nSe recebeu esta mensagem, a integração está funcionando!"
        if enviar_telegram(mensagem):
            QMessageBox.information(self, "Sucesso", "Mensagem enviada para o Telegram com sucesso!")
        else:
            QMessageBox.warning(self, "Erro", "Falha ao enviar mensagem. Verifique o Chat ID e a conexão com a internet.")

class ChamadoApp(QWidget):
    def __init__(self, usuario_id):
        super().__init__()
        self.usuario_id = usuario_id
        self.setWindowTitle("Registro de Chamados")
        self.setWindowIcon(QIcon(resource_path("assets/favicon.ico")))
        layout = QVBoxLayout()

        # Exibe data e hora atual
        self.data_hora_label = QLabel()
        self.atualizar_data_hora()
        layout.addWidget(self.data_hora_label)

        # Timer para atualizar data/hora a cada 1 segundo
        self.timer = QTimer()
        self.timer.timeout.connect(self.atualizar_data_hora)
        self.timer.start(1000)  # 1000 ms = 1 segundo

        self.provedor = QComboBox()
        self.provedor.addItem("Carregando...")
        layout.addWidget(QLabel("Provedor"))
        layout.addWidget(self.provedor)

        self.nome = QLineEdit()
        layout.addWidget(QLabel("Nome do Cadastro"))
        layout.addWidget(self.nome)

        self.protocolo = QLineEdit()
        layout.addWidget(QLabel("Protocolo"))
        layout.addWidget(self.protocolo)

        self.whatsapp = QLineEdit()
        layout.addWidget(QLabel("WhatsApp"))
        layout.addWidget(self.whatsapp)

        self.descricao = QTextEdit()
        layout.addWidget(QLabel("Descrição"))
        layout.addWidget(self.descricao)

        self.nivel = QComboBox()
        self.nivel.addItem("Carregando...")
        self.nivel.currentTextChanged.connect(self.nivel_mudou)
        layout.addWidget(QLabel("Nível de Atendimento"))
        layout.addWidget(self.nivel)

        # Campo de valor de venda (inicialmente oculto)
        self.valor_venda_label = QLabel("Valor da Venda (R$)")
        self.valor_venda = QLineEdit()
        self.valor_venda.setPlaceholderText("Ex: 150.00")
        self.valor_venda_label.hide()
        self.valor_venda.hide()
        layout.addWidget(self.valor_venda_label)
        layout.addWidget(self.valor_venda)

        self.botao_salvar = QPushButton("Salvar Chamado")
        self.botao_salvar.clicked.connect(self.salvar)
        layout.addWidget(self.botao_salvar)

        # Verifica se é admin e adiciona botão de administração
        try:
            usuarios_ref = db.collection('usuarios')
            doc = usuarios_ref.document(usuario_id).get(timeout=5)
            if doc.exists and doc.get('nome') == 'admin':
                self.botao_admin = QPushButton("Gerenciar Usuários")
                self.botao_admin.clicked.connect(self.abrir_admin)
                layout.addWidget(self.botao_admin)
        except Exception as e:
            print(f"Erro ao verificar admin: {e}")

        self.botao_sair = QPushButton("Sair")
        self.botao_sair.clicked.connect(self.sair)
        layout.addWidget(self.botao_sair)

        self.setLayout(layout)
        
        # Carrega provedores e níveis em background
        self.carregar_dados_background()
    
    def carregar_dados_background(self):
        """Carrega provedores e níveis usando threads"""
        # Thread para provedores
        self.thread_provedores = FirebaseLoaderThread('provedores', 'provedores')
        self.thread_provedores.dados_carregados.connect(self.on_dados_carregados)
        self.thread_provedores.erro.connect(self.on_erro_carregamento)
        self.thread_provedores.start()
        
        # Thread para níveis
        self.thread_niveis = FirebaseLoaderThread('niveis', 'niveis')
        self.thread_niveis.dados_carregados.connect(self.on_dados_carregados)
        self.thread_niveis.erro.connect(self.on_erro_carregamento)
        self.thread_niveis.start()
    
    def on_dados_carregados(self, dados, tipo):
        """Callback quando dados são carregados com sucesso"""
        if tipo == 'provedores':
            self.provedor.clear()
            self.provedor.addItems(dados)
        elif tipo == 'niveis':
            self.nivel.clear()
            self.nivel.addItems(dados)
    
    def on_erro_carregamento(self, erro, tipo):
        """Callback quando ocorre erro ao carregar"""
        print(f"Erro ao carregar {tipo}: {erro}")
        if tipo == 'provedores':
            self.provedor.clear()
            self.provedor.addItem("Erro ao carregar")
        elif tipo == 'niveis':
            self.nivel.clear()
            self.nivel.addItem("Erro ao carregar")

    def abrir_admin(self):
        # Verifica se o usuário logado é admin
        try:
            usuarios_ref = db.collection('usuarios')
            doc = usuarios_ref.document(self.usuario_id).get(timeout=5)
            
            if doc.exists and doc.get('nome') == 'admin':
                self.admin_window = AdminUsuarios(self.usuario_id)
                self.admin_window.show()
            else:
                QMessageBox.warning(self, "Acesso Negado", "Apenas o usuário admin pode acessar esta funcionalidade")
        except Exception as e:
            QMessageBox.warning(self, "Erro", f"Erro ao verificar permissões: {str(e)}")

    def atualizar_data_hora(self):
        data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        self.data_hora_label.setText(f"Data e Hora: {data_hora}")

    def nivel_mudou(self, texto):
        """Mostra/oculta campo de valor quando selecionar Venda"""
        if 'venda' in texto.lower():
            self.valor_venda_label.show()
            self.valor_venda.show()
        else:
            self.valor_venda_label.hide()
            self.valor_venda.hide()
            self.valor_venda.clear()

    def sair(self):
        self.timer.stop()
        self.hide()
        global login
        login = Login()
        login.show()

    def closeEvent(self, event):
        self.timer.stop()
        event.accept()

    def salvar(self):
        provedor = self.provedor.currentText()
        nome = self.nome.text()
        protocolo = self.protocolo.text()
        whatsapp = self.whatsapp.text()
        descricao = self.descricao.toPlainText()
        nivel = self.nivel.currentText()
        data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        if not nome or not protocolo or not whatsapp or not descricao:
            QMessageBox.warning(self, "Erro", "Todos os campos são obrigatórios")
            return

        # Validação para Venda - verifica se valor foi preenchido
        valor_venda_num = None
        comissao = None
        percentual_comissao = 10  # Padrão 10%
        
        if 'venda' in nivel.lower():
            valor_venda_text = self.valor_venda.text().strip()
            if not valor_venda_text:
                QMessageBox.warning(self, "Erro", "Para vendas, o valor deve ser preenchido")
                return
            try:
                valor_venda_num = float(valor_venda_text.replace(',', '.'))
                
                # Busca porcentagem de comissão do provedor
                provedor_nome = self.provedor.currentText()
                provedores_ref = db.collection('provedores')
                docs = provedores_ref.where('nome', '==', provedor_nome).stream()
                for doc in docs:
                    provedor_data = doc.to_dict()
                    percentual_comissao = float(provedor_data.get('comissao', 10))
                    break
                
                # Calcula comissão baseada no percentual do provedor
                comissao = valor_venda_num * (percentual_comissao / 100)
            except ValueError:
                QMessageBox.warning(self, "Erro", "Valor inválido. Use apenas números (ex: 150.00)")
                return

        # Busca IDs no Firestore
        provedor_id = None
        provedores_ref = db.collection('provedores')
        docs = provedores_ref.where('nome', '==', provedor).stream()
        for doc in docs:
            provedor_id = doc.id
            break
        
        nivel_id = None
        niveis_ref = db.collection('niveis')
        docs = niveis_ref.where('nivel', '==', nivel).stream()
        for doc in docs:
            nivel_id = doc.id
            break

        print(f"[DEBUG] Salvando chamado:")
        print(f"  - Usuario ID: {self.usuario_id}")
        print(f"  - Provedor: {provedor} -> ID: {provedor_id}")
        print(f"  - Nivel: {nivel} -> ID: {nivel_id}")
        print(f"  - Data/Hora: {data_hora}")
        if valor_venda_num:
            print(f"  - Valor Venda: R$ {valor_venda_num:.2f}")
            print(f"  - Comissão ({percentual_comissao}%): R$ {comissao:.2f}")

        # Prepara dados do chamado
        chamado_data = {
            'usuario': self.usuario_id,
            'provedor': provedor_id if provedor_id else provedor,
            'cliente': nome,
            'protocolo': protocolo,
            'numero': whatsapp,
            'descricao': descricao,
            'dataHora': data_hora,
            'nivel': nivel_id if nivel_id else nivel
        }
        
        # Adiciona valor de venda e comissão se for venda
        if valor_venda_num is not None:
            chamado_data['valorVenda'] = valor_venda_num
            chamado_data['comissao'] = comissao
            chamado_data['percentualComissao'] = percentual_comissao  # Salva o percentual usado

        # Insere chamado no Firestore
        db.collection('chamados').add(chamado_data)
        
        # Envia mensagem para Telegram
        mensagem = (
            f"<b>📞 Novo Chamado Aberto</b>\n\n"
            f"<b>Provedor:</b> {provedor}\n"
            f"<b>Data/Hora:</b> {data_hora}\n"
            f"<b>Nome do Cliente:</b> {nome}\n"
            f"<b>Protocolo:</b> {protocolo}\n"
            f"<b>WhatsApp:</b> {whatsapp}\n"
            f"<b>Nível:</b> {nivel}\n"
        )
        
        # Adiciona informações de venda na mensagem do Telegram
        if valor_venda_num is not None:
            mensagem += f"<b>Valor da Venda:</b> R$ {valor_venda_num:.2f}\n"
            mensagem += f"<b>Comissão ({percentual_comissao}%):</b> R$ {comissao:.2f}\n"
        
        mensagem += f"<b>Descrição:</b> {descricao}"
        
        enviar_telegram(mensagem)
        
        QMessageBox.information(self, "Sucesso", "Chamado salvo com sucesso")
        self.nome.clear()
        self.protocolo.clear()
        self.whatsapp.clear()
        self.descricao.clear()
        self.valor_venda.clear()

app = QApplication(sys.argv)
login = Login()
login.show()
sys.exit(app.exec())
