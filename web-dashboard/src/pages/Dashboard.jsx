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
  const [niveis, setNiveis] = useState([]);
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
      
      // Carregar níveis para conversão de IDs
      const niveisRef = collection(db, 'niveis');
      const niveisSnapshot = await getDocs(niveisRef);
      const niveisMap = {};
      niveisSnapshot.docs.forEach(doc => {
        niveisMap[doc.id] = doc.data().nivel;
      });
      
      // Carregar usuários para conversão de IDs
      const usuariosRef = collection(db, 'usuarios');
      const usuariosSnapshot = await getDocs(usuariosRef);
      const usuariosMap = {};
      usuariosSnapshot.docs.forEach(doc => {
        usuariosMap[doc.id] = doc.data().nome;
      });
      
      let chamadosData = chamadosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Converter IDs para nomes se necessário
          provedor: provedoresMap[data.provedor] || data.provedor,
          nivel: niveisMap[data.nivel] || data.nivel,
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

      // Carregar níveis
      const niveisData = niveisSnapshot.docs.map(doc => doc.data().nivel);
      setNiveis(niveisData);

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
      filtered = filtered.filter(chamado => chamado.nivel === filterNivel);
    }

    // Filtro de provedor
    if (filterProvider !== 'todos') {
      filtered = filtered.filter(chamado => chamado.provedor === filterProvider);
    }

    // Filtro de data inicial
    if (filterDateStart) {
      filtered = filtered.filter(chamado => {
        const chamadoDate = chamado.dataHora?.split(' ')[0]; // Extrai apenas a data (DD/MM/YYYY)
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
        const chamadoDate = chamado.dataHora?.split(' ')[0];
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
        const dataA = a.dataHora || '';
        const dataB = b.dataHora || '';
        return dataA.localeCompare(dataB);
      });

      // Verificar posição do chamado atual
      const posicao = chamadosDoProvedor.findIndex(c => c.id === chamado.id) + 1;
      const franquia = parseInt(provedor.franquia) || 0;

      // Se está dentro da franquia, valor é R$ 0,00
      if (posicao <= franquia) {
        return 0;
      }

      // Verificar se é uma venda com comissão
      if (chamado.valorVenda && chamado.comissao) {
        return chamado.comissao;
      }

      // Fora da franquia, calcular valor
      const nivel = chamado.nivel?.toLowerCase() || '';
      let valor = 0;
      
      if (nivel.includes('nível 1') || nivel.includes('nivel 1')) {
        valor = parseFloat(provedor.valorNivel1) || 0;
      } else if (nivel.includes('nível 2') || nivel.includes('nivel 2')) {
        valor = parseFloat(provedor.valorNivel2) || 0;
      } else if (nivel.includes('massivo')) {
        valor = parseFloat(provedor.valorMassivo) || 0;
      } else if (nivel.includes('pré') || nivel.includes('pre')) {
        valor = parseFloat(provedor.valorPreVenda) || 0;
      } else if (nivel.includes('venda')) {
        // Se for venda mas não tiver comissão, usa valor padrão
        valor = parseFloat(provedor.valorPreVenda) || 0;
      }
      
      return valor;
    };

    // Aba 1: Chamados
    const data = filteredChamados.map((chamado, index) => ({
      'Data/Hora': chamado.dataHora,
      'Cliente': chamado.cliente,
      'Provedor': chamado.provedor,
      'Protocolo': chamado.protocolo,
      'Número': chamado.numero,
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

      // Nível 1 + Pré Vendas (excedente)
      const nivel1PreVendasCount = stats.nivel1PreVendas;
      const nivel1PreVendasValor = provider.valorNivel1 || 0;
      fechamentoData.push({
        'Item': 'Nível 1 + Pré Vendas (excedente)',
        'Quantidade': nivel1PreVendasCount,
        'Valor Unitário': nivel1PreVendasValor,
        'Valor Total': valores.nivel1 + valores.preVendas
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

      // Vendas
      const vendasCount = stats.vendas;
      const vendasValorUnitario = provider.valorPreVenda || 0;
      const vendasTotal = valores.vendas;
      const comissao = (vendasTotal * (provider.comissao || 0)) / 100;
      fechamentoData.push({
        'Item': 'Vendas',
        'Quantidade': vendasCount,
        'Valor Unitário': vendasValorUnitario,
        'Valor Total': vendasTotal
      });
      fechamentoData.push({
        'Item': 'Comissão sobre Vendas',
        'Quantidade': `${provider.comissao || 0}%`,
        'Valor Unitário': '',
        'Valor Total': comissao
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
            const chamado = {
              dataHora: row['Data/Hora'] || format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
              usuario: row['Usuário'] || row['Usuario'] || row['Colaborador'] || 'NULL',
              cliente: row['Cliente'] || 'NULL',
              protocolo: row['Protocolo'] || 'NULL',
              numero: row['Número'] || row['Numero'] || 'NULL',
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
      valores.preVendas += providerValores.preVendas;
      valores.vendas += providerValores.vendas;
    });

    valores.total = valores.fixo + valores.nivel1 + valores.nivel2 + valores.massivo + valores.preVendas + valores.vendas;

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
        const dataParts = chamado.dataHora.split(' ')[0].split('/');
        if (dataParts.length !== 3) return true;

        const diaChamado = parseInt(dataParts[0]);
        const mesChamado = parseInt(dataParts[1]);
        const anoChamado = parseInt(dataParts[2]);

        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        const diaInicio = provider.diaInicio;
        const diaFim = provider.diaFim;

        // Se o período não cruza o mês (ex: 01/12 a 31/12)
        if (diaInicio <= diaFim) {
          // Deve estar no mês atual e dentro do período
          return mesChamado === mesAtual && 
                 anoChamado === anoAtual && 
                 diaChamado >= diaInicio && 
                 diaChamado <= diaFim;
        } else {
          // Período cruza o mês (ex: 28/11 a 28/12)
          // Pode estar no mês anterior (a partir do dia início) ou mês atual (até o dia fim)
          const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
          const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

          return (
            (mesChamado === mesAnterior && anoChamado === anoMesAnterior && diaChamado >= diaInicio) ||
            (mesChamado === mesAtual && anoChamado === anoAtual && diaChamado <= diaFim)
          );
        }
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
        nivel1PreVendas: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('nível 1') || nivel.includes('nivel 1') || nivel.includes('pré') || nivel.includes('pre');
        }).length,
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

      // Contar chamados que estão dentro da franquia (N1, N2, Pré Vendas)
      const chamadosNaFranquia = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
        return nivel.includes('nível 1') || nivel.includes('nivel 1') || 
               nivel.includes('nível 2') || nivel.includes('nivel 2') ||
               nivel.includes('pré') || nivel.includes('pre');
      });

      const franquia = provider.franquia || 0;
      const chamadosForaFranquia = Math.max(0, chamadosNaFranquia.length - franquia);

      // Calcular valores considerando franquia
      const nivel1Count = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
        return nivel.includes('nível 1') || nivel.includes('nivel 1');
      }).length;

      const nivel2Count = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
        return nivel.includes('nível 2') || nivel.includes('nivel 2');
      }).length;

      const preVendasCount = providerChamados.filter(c => {
        const nivel = c.nivel?.toLowerCase() || '';
        return nivel.includes('pré') || nivel.includes('pre');
      }).length;

      // Distribuir chamados fora da franquia proporcionalmente
      const totalFranquiaTypes = nivel1Count + nivel2Count + preVendasCount;
      let nivel1Cobrados = 0;
      let nivel2Cobrados = 0;
      let preVendasCobrados = 0;

      if (totalFranquiaTypes > franquia) {
        // Calcular proporção de cada tipo
        const propNivel1 = nivel1Count / totalFranquiaTypes;
        const propNivel2 = nivel2Count / totalFranquiaTypes;
        const propPreVendas = preVendasCount / totalFranquiaTypes;

        nivel1Cobrados = Math.floor(chamadosForaFranquia * propNivel1);
        nivel2Cobrados = Math.floor(chamadosForaFranquia * propNivel2);
        preVendasCobrados = Math.floor(chamadosForaFranquia * propPreVendas);
      }

      const valores = {
        fixo: provider.valorFixo || 0,
        nivel1: nivel1Cobrados * (provider.valorNivel1 || 0),
        nivel2: nivel2Cobrados * (provider.valorNivel2 || 0),
        massivo: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('massivo');
        }).length * (provider.valorMassivo || 0),
        preVendas: preVendasCobrados * (provider.valorPreVenda || 0),
        vendas: providerChamados.filter(c => {
          const nivel = c.nivel?.toLowerCase() || '';
          return nivel.includes('venda');
        }).length * (provider.valorPreVenda || 0)
      };

      valores.total = valores.fixo + valores.nivel1 + valores.nivel2 + valores.massivo + valores.preVendas + valores.vendas;

      byProvider[provider.nome] = { stats, valores, provider, franquia, chamadosForaFranquia };
    });

    return byProvider;
  };

  const valores = calculateValues();
  const byProvider = calculateByProvider();

  const stats = {
    total: chamados.length,
    nivel1PreVendas: chamados.filter(c => {
      const nivel = c.nivel?.toLowerCase() || '';
      return nivel.includes('nível 1') || nivel.includes('nivel 1') || nivel.includes('pré') || nivel.includes('pre');
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
                  title="Nível 1 + Pré Vendas" 
                  value={stats.nivel1PreVendas} 
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
                    title="Pré Vendas" 
                    value={`R$ ${valores.preVendas.toFixed(2)}`} 
                    icon={<DollarSign />}
                    color="#ec4899"
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
                            title="N1 + Pré Vendas" 
                            value={data.stats.nivel1PreVendas} 
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
                            title="Pré Vendas" 
                            value={`R$ ${data.valores.preVendas.toFixed(2)}`} 
                            icon={<DollarSign />}
                            color="#ec4899"
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
                      {niveis.map(nivel => (
                        <option key={nivel} value={nivel}>{nivel}</option>
                      ))}
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
