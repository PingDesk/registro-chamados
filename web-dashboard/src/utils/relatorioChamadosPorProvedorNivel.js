// Script para gerar relatório detalhado dos chamados por provedor e nível
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function gerarRelatorioChamadosPorProvedorNivel() {
  const chamadosRef = collection(db, 'chamados');
  const chamadosSnapshot = await getDocs(chamadosRef);
  const chamados = chamadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Agrupar por provedor e nível
  const agrupados = {};
  chamados.forEach(c => {
    const provedor = (c.provedor || 'NÃO INFORMADO').trim();
    const nivel = (c.nivel || 'NÃO INFORMADO').trim();
    if (!agrupados[provedor]) agrupados[provedor] = {};
    if (!agrupados[provedor][nivel]) agrupados[provedor][nivel] = [];
    agrupados[provedor][nivel].push(c);
  });

  // Exibir relatório no console
  Object.entries(agrupados).forEach(([provedor, niveis]) => {
    console.log(`\nProvedor: ${provedor}`);
    Object.entries(niveis).forEach(([nivel, chamados]) => {
      console.log(`  Nível: ${nivel} - ${chamados.length} chamados`);
      chamados.forEach(c => {
        console.log(`    ID: ${c.id} | Cliente: ${c.cliente || ''} | Data: ${c.dataHora || ''}`);
      });
    });
  });
}

// Para rodar no Node.js ou no console do projeto
// gerarRelatorioChamadosPorProvedorNivel();

export default gerarRelatorioChamadosPorProvedorNivel;
