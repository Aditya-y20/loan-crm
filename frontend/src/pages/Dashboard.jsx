import { useState, useEffect } from 'react';
import { fetchClients, fetchLoans } from '../api';
import { Users, CreditCard, TrendingUp, Activity, DollarSign } from 'lucide-react';

const StatCard = ({ title, value, icon, trend, colorClass }) => (
  <div className="glass-card p-6 flex flex-col group hover:border-gray-600 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-surface ${colorClass}`}>
        {icon}
      </div>
      {trend && (
        <span className="flex items-center text-sm font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
          <TrendingUp size={14} className="mr-1" />
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-text-muted text-sm font-medium">{title}</h3>
    <h2 className="text-3xl font-bold text-text-main mt-1">{value}</h2>
  </div>
);

const Dashboard = ({ token, user }) => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalLoans: 0,
    activeLoans: 0,
    totalAmount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clients, loans] = await Promise.all([
          fetchClients(token),
          fetchLoans(token)
        ]);
        
        const activeLoans = loans.filter(l => l.status === 'active');
        const totalAmount = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);

        setStats({
          totalClients: clients.length,
          totalLoans: loans.length,
          activeLoans: activeLoans.length,
          totalAmount: totalAmount
        });
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [token]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Activity className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-main">
          {user?.role === 'customer' ? 'My Dashboard' : 'Dashboard Overview'}
        </h1>
        <p className="text-text-muted mt-1">
          {user?.role === 'customer' ? 'Welcome back. Here is the status of your loans.' : "Welcome back. Here's what's happening today."}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role !== 'customer' && (
          <StatCard 
            title="Total Clients" 
            value={stats.totalClients} 
            icon={<Users size={24} className="text-blue-400" />} 
            colorClass="border border-blue-500/20 shadow-[inset_0px_0px_8px_rgba(59,130,246,0.2)]"
            trend="+12%"
          />
        )}
        <StatCard 
          title={user?.role === 'customer' ? "My Total Loans" : "Total Loans"} 
          value={stats.totalLoans} 
          icon={<CreditCard size={24} className="text-purple-400" />} 
          colorClass="border border-purple-500/20 shadow-[inset_0px_0px_8px_rgba(168,85,247,0.2)]"
        />
        <StatCard 
          title="Active Loans" 
          value={stats.activeLoans} 
          icon={<Activity size={24} className="text-emerald-400" />} 
          colorClass="border border-emerald-500/20 shadow-[inset_0px_0px_8px_rgba(16,185,129,0.2)]"
          trend="+5%"
        />
        <StatCard 
          title="Total Active Amount" 
          value={`$${stats.totalAmount.toLocaleString()}`} 
          icon={<DollarSign size={24} className="text-yellow-400" />} 
          colorClass="border border-yellow-500/20 shadow-[inset_0px_0px_8px_rgba(234,179,8,0.2)]"
        />
      </div>

      <div className="glass-card mt-8 p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
           <Activity size={48} className="text-primary/30 mx-auto mb-4" />
           <p className="text-text-muted">Activity charts will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
