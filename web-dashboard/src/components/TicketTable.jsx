import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Edit2, Trash2, X, Save, Trash } from 'lucide-react';
import './TicketTable.css';

function TicketTable({ chamados, onRefresh, userTipo }) {
    const [filterColaborador, setFilterColaborador] = useState('todos');
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    usuario: '',
    cliente: '',
    endereco: '',
    provedor: '',
    nivel: '',
    descricao: '',
    numero: '',
    protocolo: ''
  });
  const [provedores, setProvedores] = useState([]);
  const [provedoresData, setProvedoresData] = useState([]);
  const [niveis, setNiveis] = useState([]);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      // Carregar provedores
      const provedoresSnapshot = await getDocs(collection(db, 'provedores'));
      const provedoresNomes = provedoresSnapshot.docs.map(doc => doc.data().nome);
      const provedoresCompletos = provedoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProvedores(provedoresNomes);
      setProvedoresData(provedoresCompletos);

      // Carregar níveis
      const niveisSnapshot = await getDocs(collection(db, 'niveis'));
      const niveisData = niveisSnapshot.docs.map(doc => doc.data().nivel);
      setNiveis(niveisData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const calcularValorAtendimento = (chamado, todosChamados) => {
    const provedor = provedoresData.find(p => p.nome === chamado.provedor);
    if (!provedor) {
      return 'R$ 0,00';
    }

    // Verificar se o chamado está dentro do período de fechamento
    const isDentroPeriodo = (chamadoData, provider) => {
      if (!chamadoData.dataHora || !provider.diaInicio || !provider.diaFim) return true;

      try {
        const dataParts = chamadoData.dataHora.split(' ')[0].split('/');
        if (dataParts.length !== 3) return true;

        const diaChamado = parseInt(dataParts[0]);
        const mesChamado = parseInt(dataParts[1]);
        const anoChamado = parseInt(dataParts[2]);

        const hoje = new Date();
        const diaHoje = hoje.getDate();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        const diaInicio = parseInt(provider.diaInicio);
        const diaFim = parseInt(provider.diaFim);

        // Determinar o período atual baseado na data de hoje
        let periodoMesInicio, periodoAnoInicio, periodoMesFim, periodoAnoFim;

        if (diaInicio <= diaFim) {
          // Período dentro do mesmo mês (ex: dia 1 ao 30)
          if (diaHoje >= diaInicio && diaHoje <= diaFim) {
            // Estamos no período atual
            periodoMesInicio = mesAtual;
            periodoAnoInicio = anoAtual;
            periodoMesFim = mesAtual;
            periodoAnoFim = anoAtual;
          } else {
            // Fora do período, usar mês anterior
            periodoMesInicio = mesAtual === 1 ? 12 : mesAtual - 1;
            periodoAnoInicio = mesAtual === 1 ? anoAtual - 1 : anoAtual;
            periodoMesFim = periodoMesInicio;
            periodoAnoFim = periodoAnoInicio;
          }
        } else {
          // Período cruza mês (ex: dia 17 ao dia 16 do próximo)
          // SEMPRE considerar período do mês anterior ao fim
          periodoMesInicio = mesAtual === 1 ? 12 : mesAtual - 1;
          periodoAnoInicio = mesAtual === 1 ? anoAtual - 1 : anoAtual;
          periodoMesFim = mesAtual;
          periodoAnoFim = anoAtual;
        }

        // Verificar se o chamado está no período atual
        if (diaInicio <= diaFim) {
          // Período no mesmo mês
          return mesChamado === periodoMesInicio && anoChamado === periodoAnoInicio &&
                 diaChamado >= diaInicio && diaChamado <= diaFim;
        } else {
          // Período cruza mês
          if (mesChamado === periodoMesInicio && anoChamado === periodoAnoInicio) {
            return diaChamado >= diaInicio;
          } else if (mesChamado === periodoMesFim && anoChamado === periodoAnoFim) {
            return diaChamado <= diaFim;
          }
          return false;
        }
      } catch (error) {
        return true;
      }
    };

    // Filtrar chamados do mesmo provedor no período atual de fechamento
    const chamadosDoProvedor = todosChamados.filter(c => 
      c.provedor === chamado.provedor && isDentroPeriodo(c, provedor)
    );

    // Ordenar por data/hora
    chamadosDoProvedor.sort((a, b) => {
      const dataA = a.dataHora || '';
      const dataB = b.dataHora || '';
      return dataA.localeCompare(dataB);
    });

    // Verificar posição do chamado atual
    const posicao = chamadosDoProvedor.findIndex(c => c.id === chamado.id) + 1;
    const franquia = parseInt(provedor.franquia) || 0;

    // Verificar se é uma venda instalada - exibe comissão negociada
    const nivel = (chamado.nivel || '').toLowerCase().trim();
    if (nivel.includes('venda')) {
      // Comissão: usa campo salvo ou calcula na hora
      let comissao = Number(chamado.comissao);
      if (!comissao || comissao === 0) {
        let percentual = provedor.comissao ? Number(provedor.comissao) : 0;
        let valorPlanoStr = chamado.valorPlano ? String(chamado.valorPlano).replace(/\s/g, '') : '0';
        if (valorPlanoStr.includes(',')) valorPlanoStr = valorPlanoStr.replace(',', '.');
        let valorPlano = Number(valorPlanoStr);
        comissao = valorPlano * (percentual / 100);
      }
      return `R$ ${comissao.toFixed(2)}`;
    }

    // Se está dentro da franquia, valor é R$ 0,00
    if (posicao <= franquia) {
      return 'R$ 0,00';
    }

    // Fora da franquia, calcular valor baseado no nível
    let valor = 0;

    // Detectar o nível e buscar o valor correspondente
    if ((nivel.includes('1') && !nivel.includes('2')) || nivel.includes('pré') || nivel.includes('pre')) {
      // Nível 1 ou Pré Vendas
      valor = parseFloat(provedor.valorNivel1) || 0;
    } else if (nivel.includes('2')) {
      // Nível 2
      valor = parseFloat(provedor.valorNivel2) || 0;
    } else if (nivel.includes('massivo')) {
      // Massivo
      valor = parseFloat(provedor.valorMassivo) || 0;
    }

    return `R$ ${valor.toFixed(2)}`;
  };

  const handleEditStart = (chamado) => {
    setEditingId(chamado.id);
    setEditFormData({
      usuario: chamado.usuario || '',
      cliente: chamado.cliente || '',
      endereco: chamado.endereco || '',
      provedor: chamado.provedor || '',
      nivel: chamado.nivel || '',
      descricao: chamado.descricao || '',
      numero: chamado.numero || '',
      protocolo: chamado.protocolo || ''
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    try {
      const docRef = doc(db, 'chamados', editingId);
      await updateDoc(docRef, editFormData);
      setShowEditModal(false);
      setEditingId(null);
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      alert('Erro ao atualizar o chamado');
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditFormData({
      usuario: '',
      cliente: '',
      endereco: '',
      provedor: '',
      nivel: '',
      descricao: '',
      numero: '',
      protocolo: ''
    });
                <div className="form-group">
                  <label>Endereço</label>
                  <input
                    type="text"
                    value={editFormData.endereco}
                    onChange={(e) => setEditFormData({...editFormData, endereco: e.target.value})}
                    placeholder="Endereço do cliente"
                  />
                </div>
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este chamado?')) return;

    try {
      await deleteDoc(doc(db, 'chamados', id));
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      alert('Erro ao excluir o chamado');
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um chamado para excluir');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} chamado(s)?`)) return;

    try {
      await Promise.all(
        selectedIds.map(id => deleteDoc(doc(db, 'chamados', id)))
      );
      setSelectedIds([]);
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir chamados:', error);
      alert('Erro ao excluir os chamados');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(chamados.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aberto': return '#f59e0b';
      case 'Em Andamento': return '#3b82f6';
      case 'Fechado': return '#10b981';
      default: return '#666';
    }
  };

  if (chamados.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhum chamado encontrado</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      {/* Filtro por colaborador */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>Filtrar por colaborador:</label>
        <select value={filterColaborador} onChange={e => setFilterColaborador(e.target.value)}>
          <option value="todos">Todos</option>
          {[...new Set(chamados.map(c => c.usuario))].filter(Boolean).map(usuario => (
            <option key={usuario} value={usuario}>{usuario}</option>
          ))}
        </select>
      </div>
      {userTipo === 'Administrador' && selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedIds.length} chamado(s) selecionado(s)</span>
          <button className="delete-multiple-btn" onClick={handleDeleteMultiple}>
            <Trash size={16} />
            Excluir Selecionados
          </button>
        </div>
      )}
      <table className="tickets-table">
        <thead>
          <tr>
            {userTipo === 'Administrador' && (
              <th>
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === chamados.length && chamados.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            <th>Protocolo</th>
            <th>WhatsApp</th>
            <th>Data/Hora</th>
            {userTipo === 'Administrador' && <th>Colaborador</th>}
            <th>Cliente</th>
            <th>Endereço</th>
            <th>Provedor</th>
            <th>Nível</th>
            <th>Valor</th>
            <th>Descrição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {chamados
            .filter(c => filterColaborador === 'todos' || c.usuario === filterColaborador)
            .sort((a, b) => {
              // Ordena por data/hora decrescente (mais recente primeiro)
              const parseDateTime = (dataHora) => {
                if (!dataHora || typeof dataHora !== 'string') return -Infinity;
                const [datePart, timePart] = dataHora.split(' ');
                if (!/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) return -Infinity;
                const [day, month, year] = datePart.split('/');
                let hours = 0, minutes = 0, seconds = 0;
                if (timePart && /^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
                  const [h, m, s] = timePart.split(':');
                  hours = Number(h);
                  minutes = Number(m);
                  seconds = Number(s);
                } else if (timePart && /^\d{2}:\d{2}$/.test(timePart)) {
                  const [h, m] = timePart.split(':');
                  hours = Number(h);
                  minutes = Number(m);
                }
                // Fallback para garantir ordenação correta
                const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day), hours, minutes, seconds);
                return isNaN(timestamp) ? -Infinity : timestamp;
              };
              const aTime = parseDateTime(a.dataHora);
              const bTime = parseDateTime(b.dataHora);
              if (aTime === bTime) return 0;
              if (aTime < bTime) return 1;
              return -1;
            })
            .map((chamado, index) => (
            <tr key={chamado.id}>
              {userTipo === 'Administrador' && (
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(chamado.id)}
                    onChange={() => handleSelectOne(chamado.id)}
                  />
                </td>
              )}
              <td className="protocolo-cell">{chamado.protocolo}</td>
              <td>{chamado.whatsapp || chamado.numero}</td>
              <td>{chamado.dataHora}</td>
              {userTipo === 'Administrador' && <td>{chamado.usuario}</td>}
              <td>{chamado.cliente}</td>
              <td>{chamado.endereco}</td>
              <td>{chamado.provedor}</td>
              <td>{chamado.nivel}</td>
              <td className="valor-cell">{calcularValorAtendimento(chamado, chamados)}</td>
              <td className="description-cell">{chamado.descricao}</td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditStart(chamado)}
                    title={userTipo === 'Administrador' ? 'Editar chamado' : 'Visualizar chamado'}
                  >
                    {userTipo === 'Administrador' ? <Edit2 size={16} /> : 'Visualizar'}
                  </button>
                  {userTipo === 'Administrador' && (
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(chamado.id)}
                      title="Excluir chamado"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Edição */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{userTipo === 'Administrador' ? 'Editar Chamado' : 'Visualizar Chamado'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Usuário</label>
                <input
                  type="text"
                  value={editFormData.usuario}
                  onChange={(e) => setEditFormData({...editFormData, usuario: e.target.value})}
                  placeholder="Nome do usuário"
                  disabled={userTipo !== 'Administrador'}
                />
              </div>

              <div className="form-group">
                <label>Cliente</label>
                <input
                  type="text"
                  value={editFormData.cliente}
                  onChange={(e) => setEditFormData({...editFormData, cliente: e.target.value})}
                  placeholder="Nome do cliente"
                  disabled={userTipo !== 'Administrador'}
                />
              </div>

              <div className="form-group">
                <label>Endereço</label>
                <input
                  type="text"
                  value={editFormData.endereco}
                  onChange={(e) => setEditFormData({...editFormData, endereco: e.target.value})}
                  placeholder="Endereço do cliente"
                  disabled={userTipo !== 'Administrador'}
                />
              </div>

              <div className="form-group">
                <label>Provedor</label>
                <select
                  value={editFormData.provedor}
                  onChange={(e) => setEditFormData({...editFormData, provedor: e.target.value})}
                  disabled={userTipo !== 'Administrador'}
                >
                  <option value="">Selecione um provedor</option>
                  {provedores.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nível</label>
                <select
                  value={editFormData.nivel}
                  onChange={(e) => setEditFormData({...editFormData, nivel: e.target.value})}
                  disabled={userTipo !== 'Administrador'}
                >
                  <option value="">Selecione um nível</option>
                  <option value="N1">N1</option>
                  <option value="N2">N2</option>
                  <option value="Massivo">Massivo</option>
                  <option value="Pré Venda">Pré Venda</option>
                  <option value="Venda Instalada">Venda Instalada</option>
                </select>
              </div>

              <div className="form-group">
                {/* Campo Número removido */}
                {editFormData.nivel === 'Venda Instalada' && (
                  <div className="form-group">
                    <label>Valor do Plano Contratado</label>
                    <input
                      type="text"
                      value={editFormData.valorPlano || ''}
                      onChange={(e) => {
                        const valorPlano = e.target.value;
                        let comissao = editFormData.comissao || 0;
                        // Atualiza comissão automaticamente
                        if (provedoresData.length > 0) {
                          const provedor = provedoresData.find(p => p.nome === editFormData.provedor);
                          if (provedor && provedor.comissao) {
                            let percentual = Number(provedor.comissao);
                            let valorPlanoNum = Number(valorPlano.replace(',', '.'));
                            comissao = valorPlanoNum * (percentual / 100);
                          }
                        }
                        setEditFormData({ ...editFormData, valorPlano, comissao });
                      }}
                      placeholder="Valor do plano"
                      disabled={userTipo !== 'Administrador'}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Protocolo</label>
                <input
                  type="text"
                  value={editFormData.protocolo}
                  onChange={(e) => setEditFormData({...editFormData, protocolo: e.target.value})}
                  placeholder="Protocolo da plataforma"
                  disabled={userTipo !== 'Administrador'}
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                  placeholder="Descrição do chamado"
                  rows="4"
                  disabled={userTipo !== 'Administrador'}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModal}>
                Fechar
              </button>
              {userTipo === 'Administrador' && (
                <button className="btn-primary" onClick={handleEditSave}>
                  <Save size={16} />
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketTable;
