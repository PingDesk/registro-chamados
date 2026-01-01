import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegistroChamadosColaborador from './pages/RegistroChamadosColaborador';

function App() {
    // Função utilitária para decidir rota inicial
    const rotaInicial = () => {
      if (!user) return '/login';
      if (user.tipo === 'Colaborador') return '/registro-chamado';
      return '/dashboard';
    };
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? (user.tipo === 'Colaborador' ? <Navigate to="/registro-chamado" /> : <Navigate to="/dashboard" />) : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/dashboard" 
          element={
            user
              ? user.tipo === 'Colaborador'
                ? <Navigate to="/registro-chamado" replace />
                : <Dashboard user={user} onLogout={handleLogout} />
              : <Navigate to="/login" />
          }
        />
        <Route 
          path="/registro-chamado" 
          element={
            user
              ? user.tipo === 'Colaborador'
                ? <RegistroChamadosColaborador user={user} onLogout={handleLogout} />
                : <Navigate to="/dashboard" />
              : <Navigate to="/login" />
          }
        />
        {/* Rota raiz: só redireciona se não estiver na rota correta */}
        <Route
          path="/"
          element={
            user ? (
              user.tipo === 'Colaborador' ? <Navigate to="/registro-chamado" replace /> : <Navigate to="/dashboard" replace />
            ) : <Navigate to="/login" replace />
          }
        />
        {/* Rota catch-all: nunca renderiza componentes, só redireciona para rota limpa */}
        <Route
          path="*"
          element={
            user ? (
              user.tipo === 'Colaborador'
                ? <Navigate to="/registro-chamado" replace />
                : <Navigate to="/dashboard" replace />
            ) : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
