import React, { useState } from 'react';
import ChamadoForm from '../components/ChamadoForm';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

function RegistroChamadosColaborador({ user, onLogout }) {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (form) => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'chamados'), {
        ...form,
        usuario: user.nome,
        dataHora: form.dataHora || new Date().toLocaleString('pt-BR'),
        criadoEm: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert('Erro ao registrar chamado!');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Registro de Chamados</h2>
        <button onClick={onLogout} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
      </div>
      {success && <div style={{ color: 'green', marginBottom: 16 }}>Chamado registrado com sucesso!</div>}
      <ChamadoForm onSave={handleSave} />
      {loading && <div style={{ marginTop: 16 }}>Salvando chamado...</div>}
    </div>
  );
}

export default RegistroChamadosColaborador;
