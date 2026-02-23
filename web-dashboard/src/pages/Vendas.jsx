import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

function Vendas() {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalChamado, setModalChamado] = useState(null);
  const [valorPlano, setValorPlano] = useState('');
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [convertendo, setConvertendo] = useState(false);
  const [provedores, setProvedores] = useState([]);

  // Carregar provedores para buscar comissão
  useEffect(() => {
    async function fetchProvedores() {
      const provedoresRef = collection(db, 'provedores');
      const snapshot = await getDocs(provedoresRef);
      setProvedores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchProvedores();
  }, []);

  useEffect(() => {
    async function fetchChamados() {
      setLoading(true);
      const chamadosRef = collection(db, 'chamados');
      const snapshot = await getDocs(chamadosRef);
      const chamadosPreVendas = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => {
          const nivel = (c.nivel || '').toLowerCase();
          return (
            nivel === 'pré venda' || nivel === 'pre venda' || nivel === 'pré-venda' || nivel === 'pre-venda'
          ) && (!c.status || c.status === 'Aberto');
        });
      setChamados(chamadosPreVendas);
      setLoading(false);
    }
    fetchChamados();
  }, [convertendo]);

  const abrirModal = chamado => {
    setModalChamado(chamado);
    setValorPlano('');
    setDataInstalacao('');
  };

  const fecharModal = () => {
    setModalChamado(null);
    setValorPlano('');
    setDataInstalacao('');
  };

  const converterVenda = async () => {
    if (!valorPlano || !dataInstalacao) {
      alert('Preencha o valor do plano e a data de instalação.');
      return;
    }
    // Aceitar vírgula como separador decimal
    let valorNumerico = valorPlano.replace(',', '.');
    if (isNaN(valorNumerico) || Number(valorNumerico) <= 0) {
      alert('Digite um valor numérico válido para o plano.');
      return;
    }
    // Buscar provedor e comissão negociada
    let comissao = 0;
    let percentualComissao = 0;
    if (modalChamado && modalChamado.provedor) {
      // Busca o provedor pelo nome, ignorando maiúsculas/minúsculas e acentos
      const normalize = str => (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      const provedor = provedores.find(p => normalize(p.nome) === normalize(modalChamado.provedor));
      percentualComissao = provedor && provedor.comissao ? Number(provedor.comissao) : 0;
      // Comissão sempre sobre o valor do plano informado na conversão
      comissao = Number(valorNumerico) * (percentualComissao / 100);
    }
    setConvertendo(true);
    try {
      await updateDoc(doc(db, 'chamados', modalChamado.id), {
        nivel: 'Venda Instalada',
        valorPlano: String(parseFloat(valorNumerico)),
        dataInstalacao: String(dataInstalacao),
        status: 'Fechado',
        comissao: Number(comissao),
        percentualComissao: Number(percentualComissao)
      });
      fecharModal();
    } catch (e) {
      alert('Erro ao converter venda.');
    }
    setConvertendo(false);
  };

  return (
    <div>
      <h2>Pré Vendas para Conversão</h2>
      {loading ? <p>Carregando...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Provedor</th>
              <th>Data/Hora</th>
              <th>Valor Plano</th>
              <th>Data Instalação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {chamados.length === 0 && (
              <tr><td colSpan={6}>Nenhuma pré-venda aberta.</td></tr>
            )}
            {chamados.map(chamado => (
              <tr key={chamado.id}>
                <td>{chamado.cliente}</td>
                <td>{chamado.provedor}</td>
                <td>{chamado.dataHora}</td>
                <td>{chamado.valorPlano ? `R$ ${chamado.valorPlano}` : '-'}</td>
                <td>{chamado.dataInstalacao || '-'}</td>
                <td>
                  <button onClick={() => abrirModal(chamado)} disabled={convertendo}>
                    Converter Venda
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modalChamado && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', padding:24, borderRadius:8, minWidth:320 }}>
            <h3>Converter para Venda Instalada</h3>
            <p><b>Cliente:</b> {modalChamado.cliente}</p>
            <p><b>Provedor:</b> {modalChamado.provedor}</p>
            <div style={{ marginBottom:12 }}>
              <label>Valor do Plano (R$):<br/>
                <input type="number" value={valorPlano} onChange={e => setValorPlano(e.target.value)} min="0" step="0.01" />
              </label>
            </div>
            <div style={{ marginBottom:12 }}>
              <label>Data de Instalação:<br/>
                <input type="date" value={dataInstalacao} onChange={e => setDataInstalacao(e.target.value)} />
              </label>
            </div>
            <button onClick={converterVenda} disabled={convertendo} style={{ marginRight:8 }}>Salvar</button>
            <button onClick={fecharModal} disabled={convertendo}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vendas;
