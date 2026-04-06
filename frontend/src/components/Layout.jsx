import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, LogOut, Briefcase } from 'lucide-react';

const Sidebar = ({ setToken, user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken(null);
  };

  let navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Payments', icon: <CreditCard size={20} />, path: '/payments' },
  ];

  if (user?.role !== 'customer') {
    navItems.splice(1, 0, { name: 'Pipeline', icon: <Users size={20} />, path: '/leads' });
  }

  if (user?.role === 'admin') {
    navItems.push({ name: 'Team', icon: <Users size={20} />, path: '/team' });
  }

  return (
    <div className="w-64 bg-surface/80 backdrop-blur-md border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3 border-b border-gray-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
          <Briefcase className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-accent">LendCRM</h1>
          <p className="text-xs text-text-muted capitalize">Role: {user?.role || 'Officer'}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0px_1px_4px_rgba(59,130,246,0.1)]' 
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors duration-200 font-medium"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

const Layout = ({ setToken, user }) => {
  return (
    <div className="min-h-screen bg-background text-text-main flex transition-colors duration-300">
      <Sidebar setToken={setToken} user={user} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
