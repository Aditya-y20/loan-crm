import { useState, useEffect } from 'react';
import { fetchLeads, fetchLoans } from '../api';
import { Users, CreditCard, TrendingUp, Activity, IndianRupee, Bell, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

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
    totalLeads: 0,
    totalLoans: 0,
    activeLoans: 0,
    totalDisbursed: 0,
    totalCollected: 0,
    overduePayments: 0
  });
  const [chartData, setChartData] = useState({ leads: [], collections: [] });
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leads, loans] = await Promise.all([
          fetchLeads(token),
          fetchLoans(token)
        ]);
        
        const activeLoans = loans.filter(l => l.status === 'active');
        const totalDisbursed = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
        
        // Aggregate collections from payments
        let collected = 0;
        let overdueCount = 0;
        const collectionsMap = {};
        const todayStr = new Date().toISOString().split('T')[0];

        loans.forEach(loan => {
           loan.payments.forEach(p => {
               collected += p.amount_paid;
               
               const dueDateStr = new Date(p.due_date).toISOString().split('T')[0];
               if (p.status === 'late' || (p.status !== 'paid' && dueDateStr < todayStr)) {
                   overdueCount++;
               }

               if (p.amount_paid > 0 && p.paid_at) {
                   const dateKey = new Date(p.paid_at).toISOString().split('T')[0];
                   collectionsMap[dateKey] = (collectionsMap[dateKey] || 0) + p.amount_paid;
               }
           });
        });
        
        const statusMap = {};
        leads.forEach(l => {
           const s = l.lead_status || 'new';
           statusMap[s] = (statusMap[s] || 0) + 1;
        });

        const formattedLeadsData = Object.entries(statusMap)
            .map(([name, value]) => ({ name: name.replace('_', ' ').toUpperCase(), value }));

        const formattedCollectionsData = Object.entries(collectionsMap)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        setStats({
          totalLeads: leads.length,
          totalLoans: loans.length,
          activeLoans: activeLoans.length,
          totalDisbursed: totalDisbursed,
          totalCollected: collected,
          overduePayments: overdueCount
        });
        setChartData({ leads: formattedLeadsData, collections: formattedCollectionsData });

        // Aggregate alerts securely from leads
        let allAlerts = [];
        leads.forEach(lead => {
            if (lead.notifications) {
                allAlerts = [...allAlerts, ...lead.notifications];
            }
        });
        
        // Ensure chronological sorting (newest first)
        allAlerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(allAlerts.slice(0, 10)); // Keep top 10

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial Load
    loadData();

    // Polling Strategy for live feed
    const intervalId = setInterval(loadData, 30000);

    // Cleanup on unmount to prevent stale state and memory leaks
    return () => clearInterval(intervalId);
  }, [token]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Activity className="animate-spin text-primary" size={32} /></div>;
  }

  // Helper for INR currency
  const formatINR = (amount) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-main">
            {user?.role === 'customer' ? 'My Dashboard' : 'Dashboard Overview'}
          </h1>
          <p className="text-text-muted mt-1">
            {user?.role === 'customer' ? 'Welcome back. Here is the status of your applications.' : "Welcome back. Here's what's happening globally."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full ring-1 ring-green-400/20">
             <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Live Sync Active
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {user?.role !== 'customer' && (
          <StatCard 
            title="Total Prospects (Leads)" 
            value={stats.totalLeads} 
            icon={<Users size={24} className="text-blue-400" />} 
            colorClass="border border-blue-500/20 shadow-[inset_0px_0px_8px_rgba(59,130,246,0.2)]"
          />
        )}
        <StatCard 
          title="Active Loans" 
          value={stats.activeLoans} 
          icon={<CreditCard size={24} className="text-purple-400" />} 
          colorClass="border border-purple-500/20 shadow-[inset_0px_0px_8px_rgba(168,85,247,0.2)]"
        />
        <StatCard 
          title="Gross Disbursed" 
          value={formatINR(stats.totalDisbursed)} 
          icon={<IndianRupee size={24} className="text-yellow-400" />} 
          colorClass="border border-yellow-500/20 shadow-[inset_0px_0px_8px_rgba(234,179,8,0.2)]"
        />
        <StatCard 
          title="EMI Collections" 
          value={formatINR(stats.totalCollected)} 
          icon={<Activity size={24} className="text-emerald-400" />} 
          colorClass="border border-emerald-500/20 shadow-[inset_0px_0px_8px_rgba(16,185,129,0.2)]"
        />
        <StatCard 
          title="Overdue Payments" 
          value={stats.overduePayments} 
          icon={<AlertCircle size={24} className="text-red-400" />} 
          colorClass="border border-red-500/20 shadow-[inset_0px_0px_8px_rgba(239,68,68,0.2)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 min-h-[300px] flex flex-col">
               <h3 className="font-semibold text-text-main mb-4">Pipeline Distribution</h3>
               <div className="flex-1 min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={chartData.leads}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {chartData.leads.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip 
                       contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                       itemStyle={{ color: '#fff' }}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="glass-card p-6 min-h-[300px] flex flex-col">
               <h3 className="font-semibold text-text-main mb-4">EMI Collections Over Time</h3>
               <div className="flex-1 min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData.collections}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                     <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                     <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                     <Tooltip 
                       contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                       formatter={(value) => [`₹${value}`, 'Collection']}
                     />
                     <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#111827' }} activeDot={{ r: 6 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
        </div>
        
        {/* Notification Feed */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                <Bell size={20} className="text-primary" />
                <h3 className="font-semibold text-text-main">Live Alert Feed</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {notifications.length === 0 ? (
                    <p className="text-sm text-text-muted text-center mt-10">No recent alerts.</p>
                ) : (
                    notifications.map(notif => {
                        let dotColor = "bg-blue-400";
                        if (notif.type === 'success') dotColor = "bg-emerald-400";
                        if (notif.type === 'warning') dotColor = "bg-yellow-400";
                        if (notif.type === 'danger') dotColor = "bg-red-400";
                        
                        return (
                            <div key={notif.id} className="flex gap-3 items-start p-3 rounded-lg hover:bg-white/5 transition-colors">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`}></div>
                                <div>
                                    <p className="text-sm text-text-main">{notif.message}</p>
                                    <span className="text-xs text-text-muted mt-1 block">
                                        {new Date(notif.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
