import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchUserProfile } from './api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadProfile from './pages/LeadProfile';
import Payments from './pages/Payments';
import Team from './pages/Team';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile(token).then(setUser).catch(() => {
        setToken(null);
        setUser(null);
      });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  if (!token) {
    return <Login setToken={setToken} />;
  }

  if (!user) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a] text-white">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout setToken={setToken} user={user} />}>
          <Route index element={<Dashboard token={token} user={user} />} />
          <Route path="leads" element={<Leads token={token} user={user} />} />
          <Route path="leads/:id" element={<LeadProfile token={token} user={user} />} />
          <Route path="payments" element={<Payments token={token} user={user} />} />
          <Route path="team" element={<Team token={token} user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
