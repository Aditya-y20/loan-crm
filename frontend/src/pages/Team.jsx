import { useState } from 'react';
import { registerOfficer } from '../api';
import { UserPlus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const Team = ({ token, user }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <AlertCircle size={48} className="mb-4 text-red-500/50" />
        <h2 className="text-2xl font-bold text-text-main">Access Denied</h2>
        <p className="mt-2">You do not have permission to view the team management page.</p>
      </div>
    );
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await registerOfficer(token, username, password);
      setMessage({ type: 'success', text: `Officer ${username} successfully created!` });
      setUsername('');
      setPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create officer' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <UserPlus className="text-primary" /> Team Management
          </h1>
          <p className="text-text-muted mt-1">Create new Loan Officer accounts.</p>
        </div>
      </div>

      <div className="glass-card max-w-md p-6">
        <h3 className="text-xl font-bold mb-4">Register Officer</h3>
        <form onSubmit={handleRegister} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}
          <div>
            <label className="block text-sm text-text-muted mb-1">Username</label>
            <input 
              required 
              type="text" 
              className="input-premium" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="officer1"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Temporary Password</label>
            <input 
              required 
              type="password" 
              className="input-premium" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Team;
