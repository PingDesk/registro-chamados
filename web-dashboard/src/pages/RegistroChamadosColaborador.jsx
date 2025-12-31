import React, { useState } from 'react';
import ChamadoForm from '../components/ChamadoForm';
import useProvedores from '../hooks/useProvedores';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';


function RegistroChamadosColaborador({ user, onLogout }) {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const provedores = useProvedores();

  // Garante que a data/hora seja sempre atual ao abrir o formulário
  const getInitialData = () => ({ dataHora: new Date().toLocaleString('pt-BR') });

  const handleSave = async (form) => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'chamados'), {
        ...form,
        usuario: user.nome,
        dataHora: new Date().toLocaleString('pt-BR'),
        criadoEm: serverTimestamp(),
      });

      // Enviar para Telegram
      const msg = `Novo chamado registrado:%0AProvedor: ${form.provedor}%0ACliente: ${form.cliente}%0AProtocolo: ${form.protocolo}%0AEndereço: ${form.endereco}%0AWhatsApp: ${form.whatsapp}%0ANível: ${form.nivel}%0ADescrição: ${form.descricao}%0AUsuário: ${user.nome}%0AData/Hora: ${new Date().toLocaleString('pt-BR')}`;
      // Substitua abaixo pelo seu token e chat_id reais
      const TELEGRAM_TOKEN = 'COLOQUE_SEU_TOKEN_AQUI';
      const TELEGRAM_CHAT_ID = 'COLOQUE_SEU_CHAT_ID_AQUI';
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${msg}`);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setLoading(false);
      return true;
    } catch (e) {
      alert('Erro ao registrar chamado!');
      setLoading(false);
      return false;
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Registro de Chamados</h2>
        <button onClick={onLogout} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
      </div>
      {success && <div style={{ color: 'green', marginBottom: 16 }}>Chamado registrado com sucesso!</div>}
      <ChamadoForm onSave={handleSave} provedores={provedores} initialData={getInitialData()} />
      {loading && <div style={{ marginTop: 16 }}>Salvando chamado...</div>}
    </div>
  );
}

export default RegistroChamadosColaborador;
