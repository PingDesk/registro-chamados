import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Edit2, Trash2, Save, X, Mail, Lock, Shield, Building2, User } from 'lucide-react';
import './Acessos.css';

function Acessos() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    senha: '',
    tipo: 'Colaborador'
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const usuariosRef = collection(db, 'usuarios');
      const snapshot = await getDocs(usuariosRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const usuarioData = {
        nome: formData.nome,
        senha: formData.senha,
        tipo: formData.tipo
      };

      if (editingId) {
        // Atualizar
        const docRef = doc(db, 'usuarios', editingId);
        await updateDoc(docRef, usuarioData);
      } else {
        // Adicionar
        await addDoc(collection(db, 'usuarios'), usuarioData);
      }

      setShowModal(false);
      resetForm();
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    }
  };

  const handleEdit = (usuario) => {
    setEditingId(usuario.id);
    setFormData({
      nome: usuario.nome || '',
      senha: usuario.senha || '',
      tipo: usuario.tipo || 'Provedor'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await deleteDoc(doc(db, 'usuarios', id));
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      senha: '',
      tipo: 'Colaborador'
    });
    setEditingId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'Administrador': return '#667eea';
      case 'Provedor': return '#10b981';
      case 'Colaborador': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'Administrador': return <Shield size={20} />;
      case 'Provedor': return <Building2 size={20} />;
      default: return <User size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="acessos-page">
      <div className="page-header">
        <div>
          <h2>Gestão de Acessos</h2>
          <p className="subtitle">Gerencie os usuários com acesso ao sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      <div className="usuarios-table-container">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>Email / Usuário</th>
              <th>Perfil</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id}>
                <td>
                  <div className="user-info">
                    <Mail size={18} />
                    <span>{usuario.nome}</span>
                  </div>
                </td>
                <td>
                  <span 
                    className="tipo-badge" 
                    style={{ backgroundColor: getTipoColor(usuario.tipo) }}
                  >
                    {usuario.tipo || 'Não definido'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit" onClick={() => handleEdit(usuario)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(usuario.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usuarios.length === 0 && (
        <div className="empty-state">
          <p>Nenhum usuário cadastrado</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Cadastrar Primeiro Usuário
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-body">
                <div className="form-group">
                  <label>Email / Usuário *</label>
                  <div className="input-with-icon">
                    <Mail size={18} />
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      placeholder="usuario@exemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Senha *</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData({...formData, senha: e.target.value})}
                      placeholder="Digite a senha"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Perfil de Acesso *</label>
                  <div className="input-with-icon">
                    <Shield size={18} />
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      required
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Provedor">Provedor (Acesso Web)</option>
                      <option value="Colaborador">Colaborador (Acesso App)</option>
                    </select>
                  </div>
                </div>

                <div className="info-box">
                  <p><strong>Perfis de Acesso:</strong></p>
                  <ul>
                    <li><strong>Administrador:</strong> Acesso total ao site e aplicativo</li>
                    <li><strong>Provedor:</strong> Acesso ao site (sem acesso ao aplicativo)</li>
                    <li><strong>Colaborador:</strong> Acesso apenas ao aplicativo (bloqueado no site)</li>
                  </ul>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={20} />
                  {editingId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Acessos;
