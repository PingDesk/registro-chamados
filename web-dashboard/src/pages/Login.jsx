import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LogIn } from 'lucide-react';
import './Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Tentando login com usuário:', username);
      const usuariosRef = collection(db, 'usuarios');
      console.log('Collection ref criada');
      
      // Buscar TODOS os usuários (sem query/where)
      const querySnapshot = await getDocs(usuariosRef);
      console.log('Total de documentos na coleção:', querySnapshot.size);

      if (querySnapshot.empty) {
        setError('Nenhum usuário cadastrado no sistema');
        setLoading(false);
        return;
      }

      // Filtrar manualmente no código
      let userDoc = null;
      let userData = null;

      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Documento completo:', JSON.stringify(data));
        
        // O campo é "nome", não "usuario"
        const userField = data.nome || data.usuario || data.email || data.user || '';
        console.log('Campo de usuário encontrado:', userField);
        
        // Comparar com o campo "nome"
        if (userField === username) {
          userDoc = doc;
          userData = data;
        }
      });

      if (!userDoc) {
        console.log('Usuário não encontrado após busca manual');
        setError('Usuário não encontrado');
        setLoading(false);
        return;
      }

      console.log('Dados do usuário encontrado:', { ...userData, senha: '***' });

      if (userData.senha === password) {
        console.log('Login bem-sucedido!');
        
        // Bloquear Colaboradores de acessar o site
        if (userData.tipo === 'Colaborador') {
          console.log('Acesso negado: Colaborador não tem acesso ao site');
          setError('Colaboradores têm acesso apenas ao aplicativo desktop');
          setLoading(false);
          return;
        }
        
        onLogin({
          id: userDoc.id,
          usuario: userData.nome || userData.usuario || userData.email,
          nome: userData.nome,
          tipo: userData.tipo || 'usuario',
          provedor: userData.provedor || null // Adicionar provedor vinculado
        });
      } else {
        console.log('Senha incorreta');
        setError('Senha incorreta');
      }
    } catch (err) {
      console.error('Erro completo ao fazer login:', err);
      console.error('Código do erro:', err.code);
      console.error('Mensagem do erro:', err.message);
      setError(`Erro: ${err.message || 'Erro ao conectar com o servidor'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogIn size={48} />
          <h1>PingDesk</h1>
          <p>Gerenciamento de Chamados</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
