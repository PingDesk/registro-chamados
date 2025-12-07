import React from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import './ChartsSection.css';

function ChartsSection({ chamados }) {
  // Dados para gráfico de barras (por provedor)
  const providerData = chamados.reduce((acc, chamado) => {
    const provider = chamado.provedor || 'Sem Provedor';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(providerData).map(([name, value]) => ({
    name,
    chamados: value
  }));

  // Dados para gráfico de pizza (níveis)
  const nivelData = chamados.reduce((acc, chamado) => {
    const nivel = chamado.nivel || 'Sem Nível';
    acc[nivel] = (acc[nivel] || 0) + 1;
    return acc;
  }, {});

  const pieChartData = Object.entries(nivelData).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = {
    'Nível 1': '#f59e0b',
    'Nível 2': '#3b82f6',
    'Massivo': '#8b5cf6',
    'Pré Vendas': '#ec4899',
    'Vendas': '#10b981',
    'Sem Nível': '#6b7280'
  };

  return (
    <div className="charts-section">
      <div className="chart-card">
        <h3>Chamados por Provedor</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="chamados" fill="#667eea" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Distribuição por Nível</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartsSection;
