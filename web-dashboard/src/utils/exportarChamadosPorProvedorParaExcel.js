// Script para exportar todos os chamados de cada provedor, mostrando id, cliente, data, nivel e provedor
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as XLSX from 'xlsx';

async function exportarChamadosPorProvedorParaExcel() {
  const chamadosRef = collection(db, 'chamados');
  const chamadosSnapshot = await getDocs(chamadosRef);
  const chamados = chamadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Normalizar e preparar dados para Excel
  const data = chamados.map(c => ({
    ID: c.id,
    Provedor: (c.provedor || '').trim(),
    Cliente: c.cliente || '',
    Data: c.dataHora || '',
    Nivel: (c.nivel || '').toString().trim(),
    Descricao: c.descricao || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
  XLSX.writeFile(wb, 'relatorio_chamados_por_provedor.xlsx');
}

// Para rodar no Node.js ou no console do projeto
// exportarChamadosPorProvedorParaExcel();

export default exportarChamadosPorProvedorParaExcel;
