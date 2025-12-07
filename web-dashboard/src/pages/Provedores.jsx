import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import './Provedores.css';

function Provedores() {
  const [provedores, setProvedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    franquia: '',
    valorFixo: '',
    valorNivel1: '',
    valorNivel2: '',
    valorMassivo: '',
    valorPreVenda: '',
    comissao: '',
    diaInicio: '',
    diaFim: '',
    usuario: '',
    senha: ''
  });

  useEffect(() => {
    loadProvedores();
  }, []);

  const loadProvedores = async () => {
    try {
      setLoading(true);
      const provedoresRef = collection(db, 'provedores');
      const snapshot = await getDocs(provedoresRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProvedores(data);
    } catch (error) {
      console.error('Erro ao carregar provedores:', error);
      alert('Erro ao carregar provedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const provedorData = {
        nome: formData.nome,
        cnpj: formData.cnpj,
        franquia: parseInt(formData.franquia) || 0,
        valorFixo: parseFloat(formData.valorFixo) || 0,
        valorNivel1: parseFloat(formData.valorNivel1) || 0,
        valorNivel2: parseFloat(formData.valorNivel2) || 0,
        valorMassivo: parseFloat(formData.valorMassivo) || 0,
        valorPreVenda: parseFloat(formData.valorPreVenda) || 0,
        comissao: parseFloat(formData.comissao) || 0,
        diaInicio: parseInt(formData.diaInicio) || 1,
        diaFim: parseInt(formData.diaFim) || 31
      };

      if (editingId) {
        // Atualizar
        const docRef = doc(db, 'provedores', editingId);
        await updateDoc(docRef, provedorData);
      } else {
        // Adicionar provedor
        await addDoc(collection(db, 'provedores'), provedorData);
        
        // Criar usuário para acesso web automaticamente
        if (formData.usuario && formData.senha) {
          const usuarioData = {
            nome: formData.usuario,
            senha: formData.senha,
            tipo: 'Provedor',
            provedor: formData.nome // Vincular ao provedor
          };
          await addDoc(collection(db, 'usuarios'), usuarioData);
        }
      }

      setShowModal(false);
      resetForm();
      loadProvedores();
    } catch (error) {
      console.error('Erro ao salvar provedor:', error);
      alert('Erro ao salvar provedor');
    }
  };
  const handleEdit = (provedor) => {
    setEditingId(provedor.id);
    setFormData({
      nome: provedor.nome || '',
      cnpj: provedor.cnpj || '',
      franquia: provedor.franquia || '',
      valorFixo: provedor.valorFixo || '',
      valorNivel1: provedor.valorNivel1 || '',
      valorNivel2: provedor.valorNivel2 || '',
      valorMassivo: provedor.valorMassivo || '',
      valorPreVenda: provedor.valorPreVenda || '',
      comissao: provedor.comissao || '',
      diaInicio: provedor.diaInicio || '',
      diaFim: provedor.diaFim || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este provedor?')) return;

    try {
      await deleteDoc(doc(db, 'provedores', id));
      loadProvedores();
    } catch (error) {
      console.error('Erro ao excluir provedor:', error);
      alert('Erro ao excluir provedor');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj: '',
      franquia: '',
      valorFixo: '',
      valorNivel1: '',
      valorNivel2: '',
      valorMassivo: '',
      valorPreVenda: '',
      comissao: '',
      diaInicio: '',
      diaFim: '',
      usuario: '',
      senha: ''
    });
    setEditingId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando provedores...</p>
      </div>
    );
  }

  return (
    <div className="provedores-page">
      <div className="page-header">
        <h2>Gestão de Provedores</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Novo Provedor
        </button>
      </div>

      <div className="provedores-grid">
        {provedores.map(provedor => (
          <div key={provedor.id} className="provedor-card">
            <div className="card-header">
              <h3>{provedor.nome}</h3>
              <div className="card-actions">
                <button className="btn-edit" onClick={() => handleEdit(provedor)}>
                  <Edit2 size={16} />
                </button>
                <button className="btn-delete" onClick={() => handleDelete(provedor.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="label">CNPJ:</span>
                <span className="value">{provedor.cnpj || '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">Franquia:</span>
                <span className="value">{provedor.franquia || 0} chamados</span>
              </div>
              <div className="info-row">
                <span className="label">Valor Fixo:</span>
                <span className="value">R$ {provedor.valorFixo?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-row">
                <span className="label">Nível 1:</span>
                <span className="value">R$ {provedor.valorNivel1?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-row">
                <span className="label">Nível 2:</span>
                <span className="value">R$ {provedor.valorNivel2?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-row">
                <span className="label">Massivo:</span>
                <span className="value">R$ {provedor.valorMassivo?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-row">
                <span className="label">Pré Venda:</span>
                <span className="value">R$ {provedor.valorPreVenda?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-row">
                <span className="label">Comissão:</span>
                <span className="value">{provedor.comissao || 0}%</span>
              </div>
              <div className="info-row">
                <span className="label">Período:</span>
                <span className="value">Dia {provedor.diaInicio || 1} a {provedor.diaFim || 31}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {provedores.length === 0 && (
        <div className="empty-state">
          <p>Nenhum provedor cadastrado</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Cadastrar Primeiro Provedor
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Provedor' : 'Novo Provedor'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nome do Provedor *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="form-group">
                  <label>Franquia (Chamados)</label>
                  <input
                    type="number"
                    value={formData.franquia}
                    onChange={(e) => setFormData({...formData, franquia: e.target.value})}
                    placeholder="0"
                  />
                  <small>Nº de chamados inclusos no valor fixo (N1, N2, Pré Vendas)</small>
                </div>

                <div className="form-group">
                  <label>Valor Fixo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorFixo}
                    onChange={(e) => setFormData({...formData, valorFixo: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Valor Atendimento Nível 1</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorNivel1}
                    onChange={(e) => setFormData({...formData, valorNivel1: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Valor Atendimento Nível 2</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorNivel2}
                    onChange={(e) => setFormData({...formData, valorNivel2: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Valor Atendimento Massivo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorMassivo}
                    onChange={(e) => setFormData({...formData, valorMassivo: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Valor Atendimento Pré Venda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorPreVenda}
                    onChange={(e) => setFormData({...formData, valorPreVenda: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Comissão (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.comissao}
                    onChange={(e) => setFormData({...formData, comissao: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Dia de Início</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.diaInicio}
                    onChange={(e) => setFormData({...formData, diaInicio: e.target.value})}
                    placeholder="1"
                  />
                </div>

                <div className="form-group">
                  <label>Dia de Finalização</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.diaFim}
                    onChange={(e) => setFormData({...formData, diaFim: e.target.value})}
                    placeholder="31"
                  />
                </div>

                {!editingId && (
                  <>
                    <div className="form-group full-width">
                      <label>Usuário para Acesso Web *</label>
                      <input
                        type="text"
                        value={formData.usuario}
                        onChange={(e) => setFormData({...formData, usuario: e.target.value})}
                        placeholder="Nome de usuário"
                        required={!editingId}
                      />
                      <small>Será criado automaticamente para acesso ao painel web</small>
                    </div>

                    <div className="form-group full-width">
                      <label>Senha *</label>
                      <input
                        type="password"
                        value={formData.senha}
                        onChange={(e) => setFormData({...formData, senha: e.target.value})}
                        placeholder="Senha de acesso"
                        required={!editingId}
                      />
                    </div>
                  </>
                )}
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

export default Provedores;
