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


      // Enviar para Telegram (dados do app.py)
      const TELEGRAM_TOKEN = '8353262305:AAG_kMgFVLGRQ8EwQjhyEUAkeOWBH-kTYhs';
      const TELEGRAM_CHAT_ID = '-1003349243615';
      const msg = `Novo chamado registrado:\nProvedor: ${form.provedor}\nCliente: ${form.cliente}\nProtocolo: ${form.protocolo}\nEndereço: ${form.endereco}\nWhatsApp: ${form.whatsapp}\nNível: ${form.nivel}\nDescrição: ${form.descricao}\nUsuário: ${user.nome}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: msg,
          parse_mode: 'HTML'
        })
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
      setLoading(false);
      // Recarregar a página para limpar tudo
      setTimeout(() => window.location.reload(), 1200);
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
