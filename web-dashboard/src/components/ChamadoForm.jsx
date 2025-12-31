import React, { useState, useEffect, useRef } from 'react';
import './ChamadoForm.css';


function ChamadoForm({ onSave, onExit, initialData = {}, provedores = [], niveis = [] }) {
  const emptyForm = {
    dataHora: '',
    provedor: '',
    cliente: '',
    protocolo: '',
    endereco: '',
    whatsapp: '',
    nivel: '',
    descricao: '',
  };
  const [form, setForm] = useState(emptyForm);


  // Atualiza dataHora em tempo real
  useEffect(() => {
    setForm(f => ({ ...emptyForm, ...initialData, dataHora: new Date().toLocaleString('pt-BR') }));
    const intervalId = setInterval(() => {
      setForm(f => ({ ...f, dataHora: new Date().toLocaleString('pt-BR') }));
    }, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, [JSON.stringify(initialData)]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleNivelChange = e => {
    setForm(f => ({ ...f, nivel: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const result = await onSave(form);
    if (result !== false) {
      setForm(f => ({ ...emptyForm, dataHora: new Date().toLocaleString('pt-BR') }));
    }
  };

  return (
    <form className="chamado-form" onSubmit={handleSubmit}>
      <div className="row">
        <div className="cell">
          <label>Data e Hora</label>
          <input name="dataHora" value={form.dataHora} onChange={handleChange} readOnly />
        </div>
        <div className="cell">
          <label>Provedor</label>
          <select name="provedor" value={form.provedor} onChange={handleChange} required>
            <option value="">Selecione</option>
            {provedores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="row">
        <div className="cell">
          <label>Cliente</label>
          <input name="cliente" value={form.cliente} onChange={handleChange} required />
        </div>
        <div className="cell">
          <label>Protocolo</label>
          <input name="protocolo" value={form.protocolo} onChange={handleChange} required />
        </div>
      </div>
      <div className="row">
        <div className="cell">
          <label>Endereço</label>
          <input name="endereco" value={form.endereco} onChange={handleChange} />
        </div>
        <div className="cell">
          <label>WhatsApp</label>
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange} required />
        </div>
      </div>
      <div className="row nivel-row">
        <label>Nível</label>
        <div className="nivel-options">
          <label><input type="radio" name="nivel" value="N1" checked={form.nivel === 'N1'} onChange={handleNivelChange} /> N1</label>
          <label><input type="radio" name="nivel" value="N2" checked={form.nivel === 'N2'} onChange={handleNivelChange} /> N2</label>
          <label><input type="radio" name="nivel" value="Massivo" checked={form.nivel === 'Massivo'} onChange={handleNivelChange} /> Massivo</label>
        </div>
      </div>
      <div className="row">
        <label>Descrição</label>
        <textarea name="descricao" value={form.descricao} onChange={handleChange} rows={5} required />
      </div>
      <div className="row">
        <button type="submit">Salvar Chamado</button>
      </div>
      <div className="row">
        <button type="button" onClick={onExit}>Sair</button>
      </div>
    </form>
  );
}

export default ChamadoForm;
