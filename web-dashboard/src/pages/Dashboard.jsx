import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, orderBy, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  LogOut, 
  Download, 
  Upload,
  Search, 
  Filter,
  Calendar,
  User,
  Clock,
  TrendingUp,
  AlertCircle,
  Menu,
  X,
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Package,
  ShoppingCart,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import StatsCard from '../components/StatsCard';
import TicketTable from '../components/TicketTable';
import ChartsSection from '../components/ChartsSection';
import Provedores from './Provedores';
import Acessos from './Acessos';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [chamados, setChamados] = useState([]);
  const [filteredChamados, setFilteredChamados] = useState([]);
    const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNivel, setFilterNivel] = useState('todos');
  const [filterProvider, setFilterProvider] = useState('todos');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [providers, setProviders] = useState([]);
  const [niveis, setNiveis] = useState(['N1', 'N2', 'Massivo']); // Pré Vendas removido
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [chamados, searchTerm, filterNivel, filterProvider, filterDateStart, filterDateEnd]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar chamados
      const chamadosRef = collection(db, 'chamados');
      const chamadosQuery = query(chamadosRef, orderBy('dataHora', 'desc'));
      const chamadosSnapshot = await getDocs(chamadosQuery);
      
      // Carregar provedores para conversão de IDs
      const provedoresRef = collection(db, 'provedores');
      const provedoresSnapshot = await getDocs(provedoresRef);
      const provedoresMap = {};
      provedoresSnapshot.docs.forEach(doc => {
        provedoresMap[doc.id] = doc.data().nome;
      });
      
      // (Removido carregamento de níveis antigos)
      
      // Carregar usuários para conversão de IDs
      const usuariosRef = collection(db, 'usuarios');
      const usuariosSnapshot = await getDocs(usuariosRef);
      const usuariosMap = {};
      usuariosSnapshot.docs.forEach(doc => {
        usuariosMap[doc.id] = doc.data().nome;
      });
      
      let chamadosData = chamadosSnapshot.docs.map(doc => {
        const data = doc.data();
        // Normalizar nomenclatura dos níveis antigos para os novos
        let nivel = (data.nivel || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Trata qualquer variação de "pré vendas", "pre vendas", "pré", "pre" como N1
        if (
          nivel === 'n1' ||
          nivel.includes('nivel 1') ||
          nivel.includes('pre vendas') ||
          nivel.includes('pre-vendas') ||
          nivel === 'pre' ||
          nivel === 'pre vendas'
        ) {
          nivel = 'N1';
        } else if (nivel === 'n2' || nivel.includes('nivel 2')) {
          nivel = 'N2';
        } else if (nivel.includes('massivo')) {
          nivel = 'Massivo';
        } else {
          nivel = data.nivel;
        }
        return {
          id: doc.id,
          ...data,
          provedor: provedoresMap[data.provedor] || data.provedor,
          nivel: nivel,
          usuario: usuariosMap[data.usuario] || data.usuario
        };
      });

      // Filtrar chamados se for provedor
      if (user.tipo === 'Provedor' && user.provedor) {
        chamadosData = chamadosData.filter(c => c.provedor === user.provedor);
      }

      setChamados(chamadosData);

      // Carregar provedores com dados completos
      let provedoresData = provedoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar provedores se for provedor
      if (user.tipo === 'Provedor' && user.provedor) {
        provedoresData = provedoresData.filter(p => p.nome === user.provedor);
      }

      setProviders(provedoresData);

      // (Removido carregamento de níveis antigos)

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...chamados];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(chamado =>
        chamado.descricao?.toLowerCase().includes(term) ||
        chamado.usuario?.toLowerCase().includes(term) ||
        chamado.provedor?.toLowerCase().includes(term) ||
        chamado.cliente?.toLowerCase().includes(term)
      );
    }

    // Filtro de nível
    if (filterNivel !== 'todos') {
      // Permite filtrar corretamente independente de variação de maiúsculas/minúsculas
      filtered = filtered.filter(chamado => {
        if (!chamado.nivel) return false;
           return chamado.nivel.toString().toLowerCase() === filterNivel.toLowerCase();
      });
    }

    // Filtro de provedor
    if (filterProvider !== 'todos') {
      filtered = filtered.filter(chamado => chamado.provedor === filterProvider);
    }

    // Filtro de data inicial
    if (filterDateStart) {
      filtered = filtered.filter(chamado => {
        let dataHora = chamado.dataHora;
        if (typeof dataHora !== 'string') dataHora = String(dataHora);
        const chamadoDate = dataHora.split(' ')[0]; // Extrai apenas a data (DD/MM/YYYY)
        if (!chamadoDate) return true;
        const [day, month, year] = chamadoDate.split('/');
        const chamadoDateObj = new Date(year, month - 1, day);
        const startDateObj = new Date(filterDateStart);
        return chamadoDateObj >= startDateObj;
      });
    }

    // Filtro de data final
    if (filterDateEnd) {
      filtered = filtered.filter(chamado => {
        let dataHora = chamado.dataHora;
        if (typeof dataHora !== 'string') dataHora = String(dataHora);
        const chamadoDate = dataHora.split(' ')[0];
        if (!chamadoDate) return true;
        const [day, month, year] = chamadoDate.split('/');
        const chamadoDateObj = new Date(year, month - 1, day);
        const endDateObj = new Date(filterDateEnd);
        return chamadoDateObj <= endDateObj;
      });
    }

    setFilteredChamados(filtered);
  };

  const exportToExcel = () => {
    // Função auxiliar para verificar se está no período de fechamento
    const isDentroPeriodoFechamento = (chamado, provider) => {
      if (!chamado.dataHora || !provider.diaInicio || !provider.diaFim) return true;

      try {
        const dataParts = chamado.dataHora.split(' ')[0].split('/');
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

    // Função auxiliar para calcular valor do atendimento
    const calcularValorAtendimento = (chamado, todosChamados) => {
      const provedor = providers.find(p => p.nome === chamado.provedor);
      if (!provedor) return 0;

      // Filtrar chamados do mesmo provedor no período atual de fechamento
      const chamadosDoProvedor = todosChamados.filter(c => 
        c.provedor === chamado.provedor && isDentroPeriodoFechamento(c, provedor)
      );

      // Ordenar por data/hora
      chamadosDoProvedor.sort((a, b) => {
        const dataA = typeof a.dataHora === 'string' ? a.dataHora : String(a.dataHora || '');
        const dataB = typeof b.dataHora === 'string' ? b.dataHora : String(b.dataHora || '');
        return dataA.localeCompare(dataB);
      });

      // Verificar posição do chamado atual
      const posicao = chamadosDoProvedor.findIndex(c => c.id === chamado.id) + 1;
      const franquia = parseInt(provedor.franquia) || 0;

      // Vendas sempre retornam 0 no cálculo individual (comissão já contabilizada separadamente)
      // Normalizar nível para garantir compatibilidade
      let nivel = chamado.nivel?.toLowerCase() || '';
      if (nivel === 'n1') nivel = 'nível 1 (sem acesso a equipamentos)';
      if (nivel === 'n2') nivel = 'nível 2 (com acesso aos equipamentos)';
      if (nivel === 'massivo') nivel = 'massivo (falhas na rede)';

      if (nivel.includes('venda')) {
        return 0;
      }

      // Se está dentro da franquia, valor é R$ 0,00
      if (posicao <= franquia) {
        return 0;
      }

      // Fora da franquia, calcular valor
      let valor = 0;

      if (nivel.includes('nível 1') || nivel.includes('nivel 1')) {
        valor = parseFloat(provedor.valorNivel1) || 0;
      } else if (nivel.includes('nível 2') || nivel.includes('nivel 2')) {
        valor = parseFloat(provedor.valorNivel2) || 0;
      } else if (nivel.includes('massivo')) {
        valor = parseFloat(provedor.valorMassivo) || 0;
      } else if (nivel.includes('pré') || nivel.includes('pre')) {
        valor = parseFloat(provedor.valorPreVenda) || 0;
      }
      
      return valor;
    };

    // Aba 1: Chamados
    const data = filteredChamados.map((chamado, index) => ({
      'Data/Hora': chamado.dataHora,
      'Cliente': chamado.cliente,
      'Endereço': chamado.endereco,
      'Provedor': chamado.provedor,
      'Protocolo': chamado.protocolo,
      'WhatsApp': chamado.whatsapp || chamado.numero,
      'Descrição': chamado.descricao,
      'Nível': chamado.nivel,
      'Valor do Atendimento': calcularValorAtendimento(chamado, filteredChamados)
    }));

    const ws1 = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Chamados');

    // Aba 2: Fechamento por Provedor
    const byProvider = calculateByProvider();
    const fechamentoData = [];

    Object.entries(byProvider).forEach(([nomeProvedor, data]) => {
      const { stats, valores, provider, franquia, chamadosForaFranquia } = data;

      // Cabeçalho do provedor
      fechamentoData.push({
        'Item': `PROVEDOR: ${nomeProvedor}`,
        'Quantidade': '',
        'Valor Unitário': '',
        'Valor Total': ''
      });

      // Valor Fixo
      fechamentoData.push({
        'Item': 'Valor Fixo',
        'Quantidade': '',
        'Valor Unitário': '',
        'Valor Total': valores.fixo
      });

      // Franquia
      const totalFranquia = stats.nivel1PreVendas + stats.nivel2;
      const dentroFranquia = Math.min(totalFranquia, franquia || 0);
      fechamentoData.push({
        'Item': `Franquia (${franquia || 0} chamados inclusos)`,
        'Quantidade': dentroFranquia,
        'Valor Unitário': 0,
        'Valor Total': 0
      });

      // Nível 1 (excedente)
      const nivel1Count = stats.nivel1;
      const nivel1Valor = provider.valorNivel1 || 0;
      fechamentoData.push({
        'Item': 'Nível 1 (excedente)',
        'Quantidade': nivel1Count,
        'Valor Unitário': nivel1Valor,
        'Valor Total': valores.nivel1
      });

      // Nível 2 (excedente)
      const nivel2Count = stats.nivel2;
      const nivel2Valor = provider.valorNivel2 || 0;
      fechamentoData.push({
        'Item': 'Nível 2 (excedente)',
        'Quantidade': nivel2Count,
        'Valor Unitário': nivel2Valor,
        'Valor Total': valores.nivel2
      });

      // Massivo
      const massivoCount = stats.massivo;
      const massivoValor = provider.valorMassivo || 0;
      fechamentoData.push({
        'Item': 'Massivo',
        'Quantidade': massivoCount,
        'Valor Unitário': massivoValor,
        'Valor Total': valores.massivo
      });

      // Vendas - mostra soma das comissões com percentual do provedor
      const vendasCount = stats.vendas;
      const vendasTotal = valores.vendas; // Já é a soma das comissões
      const percentualComissao = provider.comissao || 10; // Padrão 10% se não configurado
      fechamentoData.push({
        'Item': `Vendas (Comissão ${percentualComissao}%)`,
        'Quantidade': vendasCount,
        'Valor Unitário': vendasCount > 0 ? (vendasTotal / vendasCount).toFixed(2) : 0,
        'Valor Total': vendasTotal
      });

      // Total do fechamento
      fechamentoData.push({
        'Item': 'TOTAL DO FECHAMENTO',
        'Quantidade': '',
        'Valor Unitário': '',
        'Valor Total': valores.total
      });

      // Linha em branco
      fechamentoData.push({
        'Item': '',
        'Quantidade': '',
        'Valor Unitário': '',
        'Valor Total': ''
      });
    });

    const ws2 = XLSX.utils.json_to_sheet(fechamentoData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Fechamento');
    
    const fileName = `chamados_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleImportExcel = (e) => {
    // Permitir importação apenas para administradores
    if (!user || user.tipo !== 'Administrador') {
      alert('Apenas administradores podem importar planilhas.');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let importados = 0;

        for (const row of jsonData) {
          try {
            let dataHora = row['Data/Hora'] || format(new Date(), 'dd/MM/yyyy HH:mm:ss');
            // Se vier como Date, converte para string no formato brasileiro
            if (dataHora instanceof Date) {
              dataHora = format(dataHora, 'dd/MM/yyyy HH:mm:ss');
            } else {
              dataHora = String(dataHora);
            }
            const chamado = {
              dataHora,
              usuario: row['Usuário'] || row['Usuario'] || row['Colaborador'] || 'NULL',
              cliente: row['Cliente'] || 'NULL',
              protocolo: row['Protocolo'] || 'NULL',
              whatsapp: row['WhatsApp'] || row['Whatsapp'] || row['Número'] || row['Numero'] || 'NULL',
              provedor: row['Provedor'] || 'NULL',
              nivel: row['Nível'] || row['Nivel'] || 'NULL',
              descricao: row['Descrição'] || row['Descricao'] || 'NULL',
              status: row['Status'] || 'Aberto'
            };

            await addDoc(collection(db, 'chamados'), chamado);
            importados++;
          } catch (error) {
            console.error('Erro ao importar linha:', error);
          }
        }

        alert(`Importação concluída!\n✓ ${importados} chamados importados`);
        loadData(); // Recarregar dados
        e.target.value = ''; // Limpar input
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        alert('Erro ao processar arquivo Excel. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Calcular valores financeiros por provedor
  const calculateValues = () => {
    const byProvider = calculateByProvider();
    
    const valores = {
      fixo: 0,
      nivel1: 0,
      nivel2: 0,
      massivo: 0,
      preVendas: 0,
      vendas: 0,
      total: 0
    };

    Object.values(byProvider).forEach(({ valores: providerValores }) => {
      valores.fixo += providerValores.fixo;
      valores.nivel1 += providerValores.nivel1;
      valores.nivel2 += providerValores.nivel2;
      valores.massivo += providerValores.massivo;
      valores.vendas += providerValores.vendas;
    });

    valores.total = valores.fixo + valores.nivel1 + valores.nivel2 + valores.massivo + valores.vendas;

    return valores;
  };

  // Calcular indicadores por provedor
  const calculateByProvider = () => {
    const byProvider = {};

    // Função para verificar se o chamado está no período de fechamento
    const isDentroPeriodoFechamento = (chamado, provider) => {
      if (!chamado.dataHora || !provider.diaInicio || !provider.diaFim) return true;

      try {
        // Extrair data do chamado (formato: "DD/MM/YYYY HH:mm:ss")
        let dataHora = chamado.dataHora;
        if (typeof dataHora !== 'string') dataHora = String(dataHora);
        const dataParts = dataHora.split(' ')[0].split('/');
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

        // Calcular início e fim do período de fechamento
        let dataInicio, dataFim;
        if (diaInicio <= diaFim) {
          // Período dentro do mesmo mês
          dataInicio = new Date(anoAtual, mesAtual - 1, diaInicio, 0, 0, 0);
          dataFim = new Date(anoAtual, mesAtual - 1, diaFim, 23, 59, 59);
        } else {
          // Período cruza o mês
          if (diaHoje >= diaInicio) {
            // Estamos na parte inicial do período (após diaInicio até fim do mês)
            dataInicio = new Date(anoAtual, mesAtual - 1, diaInicio, 0, 0, 0);
            // Fim é no mês seguinte
            let mesFim = mesAtual === 12 ? 1 : mesAtual + 1;
            let anoFim = mesAtual === 12 ? anoAtual + 1 : anoAtual;
            dataFim = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59);
          } else {
            // Estamos na parte final do período (início do mês até diaFim)
            let mesInicio = mesAtual === 1 ? 12 : mesAtual - 1;
            let anoInicio = mesAtual === 1 ? anoAtual - 1 : anoAtual;
            dataInicio = new Date(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0);
            dataFim = new Date(anoAtual, mesAtual - 1, diaFim, 23, 59, 59);
          }
        }

        // Data do chamado
        const dataChamado = new Date(anoChamado, mesChamado - 1, diaChamado, 12, 0, 0);
        return dataChamado >= dataInicio && dataChamado <= dataFim;
      } catch (error) {
        console.error('Erro ao verificar período:', error);
        return true;
      }
    };

    providers.forEach(provider => {
      // Filtrar apenas chamados do provedor E dentro do período de fechamento
      const providerChamados = chamados.filter(c => 
        c.provedor === provider.nome && isDentroPeriodoFechamento(c, provider)
      );
      
      const stats = {
        total: providerChamados.length,
           nivel1: providerChamados.filter(c => c.nivel === 'N1').length,
        nivel2: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('nível 2') || nivel.includes('nivel 2');
        }).length,
        vendas: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('venda');
        }).length,
        massivo: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('massivo');
        }).length
      };

      // Contar chamados que estão dentro da franquia (N1, N2)
      const chamadosNaFranquia = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
           return nivel === 'n1' || nivel === 'n2';
      });

      const franquia = provider.franquia || 0;
      const chamadosForaFranquia = Math.max(0, chamadosNaFranquia.length - franquia);

      // Calcular valores considerando franquia
      const nivel1Count = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
           return nivel === 'n1';
      }).length;

      const nivel2Count = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
           return nivel === 'n2';
      }).length;

      // Distribuir chamados fora da franquia proporcionalmente (sem perder excedentes)
      const totalFranquiaTypes = nivel1Count + nivel2Count;
      let nivel1Cobrados = 0;
      let nivel2Cobrados = 0;

      if (chamadosForaFranquia > 0 && totalFranquiaTypes > 0) {
        // Distribuição proporcional, mas garantindo que a soma seja igual ao total de excedentes
        const rawNivel1 = chamadosForaFranquia * (nivel1Count / totalFranquiaTypes);
        const rawNivel2 = chamadosForaFranquia * (nivel2Count / totalFranquiaTypes);

        // Arredondar para baixo
        nivel1Cobrados = Math.floor(rawNivel1);
        nivel2Cobrados = Math.floor(rawNivel2);

        // Corrigir diferença para garantir que a soma seja igual ao total de excedentes
        let distribuido = nivel1Cobrados + nivel2Cobrados;
        let diff = chamadosForaFranquia - distribuido;
        // Distribuir o restante para os tipos com maior parte decimal
        const decimais = [
          { tipo: 'nivel1', valor: rawNivel1 - nivel1Cobrados },
          { tipo: 'nivel2', valor: rawNivel2 - nivel2Cobrados }
        ];
        decimais.sort((a, b) => b.valor - a.valor);
        for (let i = 0; i < decimais.length && diff > 0; i++) {
          if (decimais[i].tipo === 'nivel1') nivel1Cobrados++;
          if (decimais[i].tipo === 'nivel2') nivel2Cobrados++;
          diff--;
        }
      }

      const valores = {
        fixo: provider.valorFixo || 0,
        nivel1: nivel1Cobrados * (provider.valorNivel1 || 0),
        nivel2: nivel2Cobrados * (provider.valorNivel2 || 0),
        massivo: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('massivo');
        }).length * (provider.valorMassivo || 0),
        vendas: providerChamados
          .filter(c => {
            const nivel = c.nivel?.toLowerCase() || '';
            return nivel.includes('venda');
          })
          .reduce((total, chamado) => {
            // Se tiver comissão calculada, usa ela; senão, usa 0
            return total + (chamado.comissao || 0);
          }, 0)
      };

      valores.total = valores.fixo + valores.nivel1 + valores.nivel2 + valores.massivo + valores.vendas;

      byProvider[provider.nome] = { stats, valores, provider, franquia, chamadosForaFranquia };
    });

    return byProvider;
  };

  const valores = calculateValues();
  const byProvider = calculateByProvider();

  const stats = {
    total: chamados.length,
    nivel1: chamados.filter(c => {
      const nivel = c.nivel?.toLowerCase() || '';
      return nivel.includes('nível 1') || nivel.includes('nivel 1') || nivel.includes('pre');
    }).length,
    nivel2: chamados.filter(c => {
      const nivel = c.nivel?.toLowerCase() || '';
      return nivel.includes('nível 2') || nivel.includes('nivel 2');
    }).length,
    vendas: chamados.filter(c => {
      const nivel = c.nivel?.toLowerCase() || '';
      return nivel.includes('venda');
    }).length,
    massivo: chamados.filter(c => {
      const nivel = c.nivel?.toLowerCase() || '';
      return nivel.includes('massivo');
    }).length
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>PingDesk</h2>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <LayoutDashboard size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          <button 
            className={`nav-item ${currentPage === 'chamados' ? 'active' : ''}`}
            onClick={() => setCurrentPage('chamados')}
          >
            <AlertCircle size={20} />
            {sidebarOpen && <span>Chamados</span>}
          </button>
          {user.tipo === 'Administrador' && (
            <>
              <button 
                className={`nav-item ${currentPage === 'provedores' ? 'active' : ''}`}
                onClick={() => setCurrentPage('provedores')}
              >
                <Building2 size={20} />
                {sidebarOpen && <span>Provedores</span>}
              </button>
              
              <button 
                className={`nav-item ${currentPage === 'acessos' ? 'active' : ''}`}
                onClick={() => setCurrentPage('acessos')}
              >
                <Users size={20} />
                {sidebarOpen && <span>Acessos</span>}
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="dashboard-header">
          <div className="header-left">
            {!sidebarOpen && (
              <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={24} />
              </button>
            )}
            <div>
              <h1>
                {currentPage === 'dashboard' ? 'Dashboard' : 
                 currentPage === 'chamados' ? 'Chamados' :
                 currentPage === 'provedores' ? 'Provedores' : 'Acessos'}
              </h1>
              <p>Bem-vindo, {user.nome}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={20} />
            Sair
          </button>
        </header>

        <main className="dashboard-main">
          {currentPage === 'dashboard' ? (
            <>
              <div className="stats-grid">
                <StatsCard 
                  title="Total de Chamados" 
                  value={stats.total} 
                  icon={<TrendingUp />}
                  color="#667eea"
                />
                <StatsCard 
                  title="Nível 1" 
                  value={stats.nivel1} 
                  icon={<AlertCircle />}
                  color="#f59e0b"
                />
                <StatsCard 
                  title="Nível 2" 
                  value={stats.nivel2} 
                  icon={<Clock />}
                  color="#3b82f6"
                />
                <StatsCard 
                  title="Vendas" 
                  value={stats.vendas} 
                  icon={<ShoppingCart />}
                  color="#10b981"
                />
                <StatsCard 
                  title="Massivos" 
                  value={stats.massivo} 
                  icon={<Zap />}
                  color="#8b5cf6"
                />
              </div>

              {/* Indicadores de Valores */}
              <div className="values-section">
                <h3>Indicadores Financeiros</h3>
                <div className="stats-grid">
                  <StatsCard 
                    title="Valor Fixo" 
                    value={`R$ ${valores.fixo.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#6366f1"
                  />
                  <StatsCard 
                    title="Nível 1" 
                    value={`R$ ${valores.nivel1.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#f59e0b"
                  />
                  <StatsCard 
                    title="Nível 2" 
                    value={`R$ ${valores.nivel2.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#3b82f6"
                  />
                  <StatsCard 
                    title="Massivo" 
                    value={`R$ ${valores.massivo.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#8b5cf6"
                  />

                  <StatsCard 
                    title="Vendas" 
                    value={`R$ ${valores.vendas.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#10b981"
                  />
                  <StatsCard 
                    title="Total Geral" 
                    value={`R$ ${valores.total.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#667eea"
                  />
                </div>
              </div>

              {/* Indicadores por Provedor */}
              {Object.keys(byProvider).map(providerName => {
                const data = byProvider[providerName];
                return (
                  <div key={providerName} className="provider-section">
                    <h3 className="provider-title">
                      <Building2 size={24} />
                      {providerName}
                    </h3>
                    
                    <div className="provider-content">
                      {/* Indicadores de Chamados */}
                      <div className="stats-subsection">
                        <h4>Chamados</h4>
                        <div className="stats-grid-compact">
                          <StatsCard 
                            title="Total" 
                            value={data.stats.total} 
                            icon={<TrendingUp />}
                            color="#667eea"
                          />
                          <StatsCard 
                            title="Nível 1" 
                            value={data.stats.nivel1} 
                            icon={<AlertCircle />}
                            color="#f59e0b"
                          />
                          <StatsCard 
                            title="Nível 2" 
                            value={data.stats.nivel2} 
                            icon={<Clock />}
                            color="#3b82f6"
                          />
                          <StatsCard 
                            title="Vendas" 
                            value={data.stats.vendas} 
                            icon={<ShoppingCart />}
                            color="#10b981"
                          />
                          <StatsCard 
                            title="Massivos" 
                            value={data.stats.massivo} 
                            icon={<Zap />}
                            color="#8b5cf6"
                          />
                        </div>
                      </div>

                      {/* Indicadores Financeiros */}
                      <div className="stats-subsection">
                        <h4>Valores Financeiros</h4>
                        <div className="stats-grid-compact">
                          <StatsCard 
                            title="Valor Fixo" 
                            value={`R$ ${data.valores.fixo.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#6366f1"
                          />
                          <StatsCard 
                            title="Nível 1" 
                            value={`R$ ${data.valores.nivel1.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#f59e0b"
                          />
                          <StatsCard 
                            title="Nível 2" 
                            value={`R$ ${data.valores.nivel2.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#3b82f6"
                          />
                          <StatsCard 
                            title="Massivo" 
                            value={`R$ ${data.valores.massivo.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#8b5cf6"
                          />

                          <StatsCard 
                            title="Vendas" 
                            value={`R$ ${data.valores.vendas.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#10b981"
                          />
                          <StatsCard 
                            title="Total" 
                            value={`R$ ${data.valores.total.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#667eea"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <ChartsSection chamados={chamados} />
            </>
          ) : currentPage === 'chamados' ? (
            <>
              <div className="filters-section">
                <div className="search-box">
                  <Search size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por descrição, usuário, cliente ou provedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="filters">
                  <div className="filter-group">
                    <Filter size={18} />
                    <select value={filterNivel} onChange={(e) => setFilterNivel(e.target.value)}>
                      <option value="todos">Todos os Níveis</option>
                      <option value="N1">Nível 1</option>
                      <option value="N2">Nível 2</option>
                      <option value="Massivo">Massivo</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <User size={18} />
                    <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
                      <option value="todos">Todos os Provedores</option>
                      {providers.map(provider => (
                        <option key={provider.id} value={provider.nome}>{provider.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      placeholder="Data inicial"
                    />
                  </div>

                  <div className="filter-group">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      placeholder="Data final"
                    />
                  </div>

                  <button className="export-btn" onClick={exportToExcel}>
                    <Download size={20} />
                    Exportar Excel
                  </button>
                  {/* Importar Excel só para Administrador */}
                  {user.tipo === 'Administrador' && (
                    <>
                      <button className="export-btn" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={20} />
                        Importar Excel
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleImportExcel}
                      />
                    </>
                  )}
                </div>
              </div>

              <TicketTable chamados={filteredChamados} onRefresh={loadData} userTipo={user.tipo} />
            </>
          ) : currentPage === 'provedores' ? (
            <Provedores />
          ) : currentPage === 'acessos' ? (
            <Acessos />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
