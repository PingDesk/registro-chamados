// Script para listar todos os chamados com nivel 'Venda Instalada' agrupados por provedor
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function listarChamadosVendaInstalada() {
  const chamadosRef = collection(db, 'chamados');
  const chamadosSnapshot = await getDocs(chamadosRef);
  const chamados = chamadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Agrupar por provedor
  const vendasPorProvedor = {};
  chamados.forEach(c => {
    const provedor = (c.provedor || 'NÃO INFORMADO').trim();
    const nivel = (c.nivel || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    if (nivel === 'venda instalada') {
      if (!vendasPorProvedor[provedor]) vendasPorProvedor[provedor] = [];
      vendasPorProvedor[provedor].push(c);
    }
  });

  // Exibir relatório no console
  Object.entries(vendasPorProvedor).forEach(([provedor, chamados]) => {
    console.log(`\nProvedor: ${provedor} - ${chamados.length} vendas instaladas`);
    chamados.forEach(c => {
      console.log(`  ID: ${c.id} | Cliente: ${c.cliente || ''} | Data: ${c.dataHora || ''}`);
    });
  });
}

// Para rodar no Node.js ou no console do projeto
// listarChamadosVendaInstalada();

export default listarChamadosVendaInstalada;
