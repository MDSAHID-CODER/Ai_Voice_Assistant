import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Credentials from './pages/Credentials';
import Agents from './pages/Agents';
import Campaigns from './pages/Campaigns';
import Calls from './pages/Calls';
import CrmIntegration from './pages/CrmIntegration';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('vapi_saas_token'));

  const handleLogin = (token) => {
    localStorage.setItem('vapi_saas_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('vapi_saas_token');
    setIsAuthenticated(false);
  };

  // Setup basic global axios authorization headers if token exists
  useEffect(() => {
    const token = localStorage.getItem('vapi_saas_token');
    if (token) {
      // In a real app we'd configure a shared axios instance
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        
        {/* Protected Dashboard Routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="credentials" element={<Credentials />} />
          <Route path="agents" element={<Agents />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="calls" element={<Calls />} />
          <Route path="crm" element={<CrmIntegration />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
